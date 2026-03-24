import { Injectable, Logger } from '@nestjs/common';
import { ImapFlow, type FetchMessageObject } from 'imapflow';
import { simpleParser, type ParsedMail, type Attachment as ParsedAttachment } from 'mailparser';
import { ConnectionPoolService } from './connection-pool.service';
import { AccountService } from '../account/account.service';
import { CacheDbService } from '../cache/cache-db.service';
import type {
  Mailbox,
  MessageEnvelope,
  MessageFull,
  MessageListResponse,
  Address,
  Attachment,
} from '@vellum/shared';

@Injectable()
export class ImapService {
  private readonly logger = new Logger(ImapService.name);

  constructor(
    private readonly pool: ConnectionPoolService,
    private readonly accountService: AccountService,
    private readonly cacheDb: CacheDbService,
  ) {}

  async listMailboxes(accountId: string): Promise<Mailbox[]> {
    // Cache-first: return cached mailboxes instantly, refresh in background
    const cached = this.cacheDb.getMailboxes(accountId);
    if (cached) {
      this.logger.debug(`Mailboxes served from cache for ${accountId}`);
      // Trigger background refresh (don't await)
      this.refreshMailboxes(accountId).catch(() => {});
      return cached;
    }

    // No cache — must fetch from IMAP
    return this.refreshMailboxes(accountId);
  }

  private async refreshMailboxes(accountId: string): Promise<Mailbox[]> {
    return this.withClient(accountId, async (client) => {
      const list = await client.list();

      const mailboxes: Mailbox[] = list.map((item) => ({
        path: item.path,
        name: item.name,
        delimiter: item.delimiter || '/',
        flags: Array.from(item.flags || []),
        specialUse: item.specialUse as Mailbox['specialUse'],
        totalMessages: 0,
        unseenMessages: 0,
        subscribed: item.subscribed !== false,
      }));

      this.cacheDb.setMailboxes(accountId, mailboxes);
      return mailboxes;
    });
  }

  async getMailboxStatus(
    accountId: string,
    mailboxPath: string,
  ): Promise<{ messages: number; unseen: number }> {
    return this.withClient(accountId, async (client) => {
      try {
        const status = await client.status(mailboxPath, { messages: true, unseen: true });
        return { messages: status.messages ?? 0, unseen: status.unseen ?? 0 };
      } catch {
        return { messages: 0, unseen: 0 };
      }
    });
  }

  async getMailboxStatusBatch(
    accountId: string,
    paths: string[],
  ): Promise<Record<string, { messages: number; unseen: number }>> {
    return this.withClient(accountId, async (client) => {
      const result: Record<string, { messages: number; unseen: number }> = {};
      // Sequentially on ONE connection — no extra connections needed
      for (const path of paths) {
        try {
          const status = await client.status(path, { messages: true, unseen: true });
          result[path] = { messages: status.messages ?? 0, unseen: status.unseen ?? 0 };
        } catch {
          result[path] = { messages: 0, unseen: 0 };
        }
      }
      return result;
    });
  }

  async listMessages(
    accountId: string,
    mailboxPath: string,
    page: number,
    pageSize: number,
    fresh = false,
  ): Promise<MessageListResponse> {
    if (!fresh && page === 1) {
      // Page 1: always check IMAP for real total + new messages
      // Return cached messages immediately but sync in foreground first
      const cached = this.cacheDb.getMessageList(accountId, mailboxPath, page, pageSize);
      if (cached && cached.messages.length >= pageSize) {
        // Sync new messages in background, return cached for speed
        this.syncMessages(accountId, mailboxPath).catch(() => {});
        return { ...cached, page, pageSize, mailbox: mailboxPath };
      }
    } else if (!fresh && page > 1) {
      // Subsequent pages: serve from cache if available
      const cached = this.cacheDb.getMessageList(accountId, mailboxPath, page, pageSize);
      if (cached && cached.messages.length > 0) {
        return { ...cached, page, pageSize, mailbox: mailboxPath };
      }
    }

    // Fetch from IMAP
    this.logger.log(`Fetching page ${page} from IMAP for ${mailboxPath} (fresh=${fresh})`);
    return this.fetchAndCacheMessages(accountId, mailboxPath, page, pageSize);
  }

  private async fetchAndCacheMessages(
    accountId: string,
    mailboxPath: string,
    page: number,
    pageSize: number,
  ): Promise<MessageListResponse> {
    return this.withClient(accountId, async (client) => {
      const mailbox = await client.mailboxOpen(mailboxPath);
      const total = mailbox.exists ?? 0;

      if (total === 0) {
        await client.mailboxClose();
        return { messages: [], total: 0, page, pageSize, mailbox: mailboxPath };
      }

      const start = Math.max(1, total - (page * pageSize) + 1);
      const end = Math.max(1, total - ((page - 1) * pageSize));
      const range = `${start}:${end}`;

      const messages: MessageEnvelope[] = [];
      const fetchIterator = client.fetch(range, {
        uid: true,
        envelope: true,
        flags: true,
        size: true,
        bodyStructure: true,
      });

      for await (const msg of fetchIterator) {
        messages.push(this.mapEnvelope(msg as any));
      }

      messages.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      await client.mailboxClose();

      // Cache the fetched messages + store real mailbox total + collect contacts
      this.cacheDb.upsertMessages(accountId, mailboxPath, messages);
      this.cacheDb.setMailboxTotal(accountId, mailboxPath, total);
      this.cacheDb.setLastSync(accountId, mailboxPath);
      this.collectContacts(accountId, messages);

      // Prefetch bodies for the first few messages in background
      this.prefetchBodies(accountId, mailboxPath, messages.slice(0, 5)).catch(() => {});

      return { messages, total, page, pageSize, mailbox: mailboxPath };
    });
  }

  private async prefetchBodies(
    accountId: string,
    mailboxPath: string,
    messages: MessageEnvelope[],
  ): Promise<void> {
    for (const msg of messages) {
      // Skip if already cached
      if (this.cacheDb.getFullMessage(accountId, mailboxPath, msg.uid)) continue;

      try {
        await this.getMessage(accountId, mailboxPath, msg.uid);
        this.logger.debug(`Prefetched body for UID ${msg.uid}`);
      } catch {
        // Non-critical — skip silently
      }
    }
  }

  private async syncMessages(accountId: string, mailboxPath: string): Promise<void> {
    try {
      const highestUid = this.cacheDb.getHighestUid(accountId, mailboxPath);

      await this.withClient(accountId, async (client) => {
        const mailbox = await client.mailboxOpen(mailboxPath);
        const total = mailbox.exists ?? 0;

        // Always update the real total
        this.cacheDb.setMailboxTotal(accountId, mailboxPath, total);

        if (total === 0) {
          await client.mailboxClose();
          return;
        }

        // Fetch only messages newer than what we have cached
        if (highestUid > 0) {
          const range = `${highestUid + 1}:*`;
          const newMessages: MessageEnvelope[] = [];

          try {
            const fetchIterator = client.fetch(range, {
              uid: true,
              envelope: true,
              flags: true,
              size: true,
              bodyStructure: true,
            }, { uid: true }); // IMPORTANT: search by UID, not sequence number

            for await (const msg of fetchIterator) {
              if ((msg as any).uid > highestUid) {
                newMessages.push(this.mapEnvelope(msg as any));
              }
            }
          } catch {
            // Range might be invalid if no new messages
          }

          if (newMessages.length > 0) {
            this.logger.log(`Synced ${newMessages.length} new messages in ${mailboxPath}`);
            this.cacheDb.upsertMessages(accountId, mailboxPath, newMessages);
            this.collectContacts(accountId, newMessages);
          }
        }

        this.cacheDb.setLastSync(accountId, mailboxPath);
        await client.mailboxClose();
      });
    } catch (err) {
      this.logger.warn(`Background sync failed for ${mailboxPath}: ${(err as Error).message}`);
    }
  }

  async getMessage(
    accountId: string,
    mailboxPath: string,
    uid: number,
  ): Promise<MessageFull | null> {
    // Cache-first for full messages (body is expensive to parse)
    const cached = this.cacheDb.getFullMessage(accountId, mailboxPath, uid);
    if (cached) {
      this.logger.debug(`Message ${uid} served from cache`);
      return cached;
    }

    return this.withClient(accountId, async (client) => {
      await client.mailboxOpen(mailboxPath);

      const msg = await client.fetchOne(
        String(uid),
        {
          uid: true,
          envelope: true,
          flags: true,
          size: true,
          source: true,
          bodyStructure: true,
        },
        { uid: true },
      );

      await client.mailboxClose();

      if (!msg) return null;

      const envelope = this.mapEnvelope(msg as any);

      // Parse the MIME source with mailparser
      let bodyHtml: string | undefined;
      let bodyText: string | undefined;
      let attachments: Attachment[] = [];
      let headers: Record<string, string> = {};
      let inReplyTo: string | undefined;
      let references: string[] | undefined;

      if (msg.source) {
        const parsed: ParsedMail = await simpleParser(msg.source);

        bodyHtml = parsed.html || undefined;
        bodyText = parsed.text || undefined;

        // Extract attachments metadata
        if (parsed.attachments && parsed.attachments.length > 0) {
          attachments = parsed.attachments.map((att: ParsedAttachment, index: number) => ({
            id: att.contentId || att.checksum || String(index),
            filename: att.filename || `attachment-${index}`,
            contentType: att.contentType || 'application/octet-stream',
            size: att.size || 0,
            contentDisposition: (att.contentDisposition as 'attachment' | 'inline') || 'attachment',
            cid: att.contentId || undefined,
          }));
        }

        // Extract headers
        if (parsed.headers) {
          for (const [key, value] of parsed.headers) {
            if (typeof value === 'string') {
              headers[key] = value;
            } else if (value && typeof value === 'object' && 'text' in value) {
              headers[key] = (value as { text: string }).text;
            }
          }
        }

        inReplyTo = parsed.inReplyTo
          ? (typeof parsed.inReplyTo === 'string' ? parsed.inReplyTo : undefined)
          : undefined;

        if (parsed.references) {
          references = Array.isArray(parsed.references)
            ? parsed.references
            : [parsed.references];
        }
      }

      // Build preview from text body if not already set
      const preview = bodyText
        ? bodyText.substring(0, 200).replace(/\s+/g, ' ').trim()
        : '';

      const fullMessage: MessageFull = {
        ...envelope,
        preview: preview || envelope.preview,
        bodyHtml,
        bodyText,
        attachments,
        headers,
        inReplyTo,
        references,
      };

      // Cache the full message
      this.cacheDb.setFullMessage(accountId, mailboxPath, uid, fullMessage);

      return fullMessage;
    });
  }

  async setFlags(
    accountId: string,
    mailboxPath: string,
    uids: number[],
    flags: string[],
    action: 'add' | 'remove',
  ): Promise<void> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxOpen(mailboxPath);

      const range = uids.join(',');
      if (action === 'add') {
        await client.messageFlagsAdd(range, flags, { uid: true });
      } else {
        await client.messageFlagsRemove(range, flags, { uid: true });
      }

      await client.mailboxClose();
    });
  }

  async moveMessages(
    accountId: string,
    mailboxPath: string,
    uids: number[],
    destination: string,
  ): Promise<void> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxOpen(mailboxPath);
      await client.messageMove(uids.join(','), destination, { uid: true });
      await client.mailboxClose();
    });
  }

  async copyMessages(
    accountId: string,
    mailboxPath: string,
    uids: number[],
    destination: string,
  ): Promise<void> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxOpen(mailboxPath);
      await client.messageCopy(uids.join(','), destination, { uid: true });
      await client.mailboxClose();
    });
  }

  async deleteMessages(
    accountId: string,
    mailboxPath: string,
    uids: number[],
  ): Promise<void> {
    await this.withClient(accountId, async (client) => {
      await client.mailboxOpen(mailboxPath);
      await client.messageDelete(uids.join(','), { uid: true });
      await client.mailboxClose();
    });
    this.cacheDb.deleteMessages(accountId, mailboxPath, uids);
  }

  async createMailbox(accountId: string, path: string): Promise<void> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxCreate(path);
    });
  }

  async deleteMailbox(accountId: string, path: string): Promise<void> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxDelete(path);
    });
  }

  async renameMailbox(
    accountId: string,
    oldPath: string,
    newPath: string,
  ): Promise<void> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxRename(oldPath, newPath);
    });
  }

  async downloadAttachment(
    accountId: string,
    mailboxPath: string,
    uid: number,
    partId: string,
  ): Promise<{ content: any; meta: any }> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxOpen(mailboxPath);
      const result = await client.download(String(uid), partId, { uid: true });
      return result;
    });
  }

  async getMessageSource(
    accountId: string,
    mailboxPath: string,
    uid: number,
  ): Promise<Buffer | null> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxOpen(mailboxPath);
      const fetchIterator = client.fetch(
        String(uid),
        { source: true },
        { uid: true },
      );

      for await (const msg of fetchIterator) {
        if (msg.source) {
          await client.mailboxClose();
          return msg.source as Buffer;
        }
      }

      await client.mailboxClose();
      return null;
    });
  }

  async search(
    accountId: string,
    mailboxPath: string,
    criteria: Record<string, unknown>,
  ): Promise<number[]> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxOpen(mailboxPath);
      const results = await client.search(criteria as any, { uid: true });
      await client.mailboxClose();
      return results || [];
    });
  }

  async testConnection(accountId: string): Promise<boolean> {
    return this.withClient(accountId, async (client) => {
      return client.authenticated === true;
    });
  }

  private async withClient<T>(
    accountId: string,
    fn: (client: ImapFlow) => Promise<T>,
  ): Promise<T> {
    const account = await this.accountService.findById(accountId);
    const client = await this.pool.acquire(accountId, account.imap);
    try {
      return await fn(client);
    } finally {
      await this.pool.release(accountId, client);
    }
  }

  private mapEnvelope(msg: Record<string, unknown>): MessageEnvelope {
    const envelope = msg.envelope as Record<string, unknown>;
    const flags = msg.flags as Set<string>;

    return {
      uid: msg.uid as number,
      seq: msg.seq as number || 0,
      messageId: (envelope?.messageId as string) || '',
      subject: (envelope?.subject as string) || '(No Subject)',
      from: this.mapAddresses(envelope?.from),
      to: this.mapAddresses(envelope?.to),
      cc: envelope?.cc ? this.mapAddresses(envelope.cc) : undefined,
      replyTo: envelope?.replyTo ? this.mapAddresses(envelope.replyTo) : undefined,
      date: envelope?.date
        ? new Date(envelope.date as string | Date).toISOString()
        : new Date().toISOString(),
      flags: Array.from(flags || []) as MessageEnvelope['flags'],
      size: (msg.size as number) || 0,
      hasAttachments: this.checkAttachments(msg.bodyStructure),
      preview: '',
    };
  }

  private mapAddresses(
    addrs: unknown,
  ): Address[] {
    if (!addrs || !Array.isArray(addrs)) return [];
    return addrs.map((a: { name?: string; address?: string }) => ({
      name: a.name || undefined,
      address: a.address || '',
    }));
  }

  private checkAttachments(bodyStructure: unknown): boolean {
    if (!bodyStructure || typeof bodyStructure !== 'object') return false;
    const bs = bodyStructure as { childNodes?: { disposition?: string }[] };
    return (
      bs.childNodes?.some(
        (node) => node.disposition === 'attachment',
      ) ?? false
    );
  }

  private collectContacts(accountId: string, messages: MessageEnvelope[]): void {
    for (const msg of messages) {
      for (const addr of msg.from) {
        if (addr.address) {
          this.cacheDb.addKnownContact(accountId, addr.address, addr.name);
        }
      }
      for (const addr of msg.to || []) {
        if (addr.address) {
          this.cacheDb.addKnownContact(accountId, addr.address, addr.name);
        }
      }
    }
  }
}
