import { Injectable } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { ConnectionPoolService } from './connection-pool.service';
import { AccountService } from '../account/account.service';
import type {
  Mailbox,
  MessageEnvelope,
  MessageFull,
  MessageListResponse,
  Address,
} from '@imap-mail/shared';

@Injectable()
export class ImapService {
  constructor(
    private readonly pool: ConnectionPoolService,
    private readonly accountService: AccountService,
  ) {}

  async listMailboxes(accountId: string): Promise<Mailbox[]> {
    return this.withClient(accountId, async (client) => {
      const list = await client.list();

      const mailboxes: Mailbox[] = [];
      for (const item of list) {
        const status = await client.status(item.path, { messages: true, unseen: true });
        mailboxes.push({
          path: item.path,
          name: item.name,
          delimiter: item.delimiter || '/',
          flags: Array.from(item.flags || []),
          specialUse: item.specialUse as Mailbox['specialUse'],
          totalMessages: status.messages ?? 0,
          unseenMessages: status.unseen ?? 0,
          subscribed: item.subscribed !== false,
        });
      }

      return mailboxes;
    });
  }

  async listMessages(
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

      // Fetch newest messages first using sequence numbers
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
        messages.push(this.mapEnvelope(msg));
      }

      // Sort by date descending
      messages.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      await client.mailboxClose();
      return { messages, total, page, pageSize, mailbox: mailboxPath };
    });
  }

  async getMessage(
    accountId: string,
    mailboxPath: string,
    uid: number,
  ): Promise<MessageFull | null> {
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

      const envelope = this.mapEnvelope(msg);
      const bodyText = msg.source ? msg.source.toString('utf-8') : '';

      return {
        ...envelope,
        bodyHtml: undefined,
        bodyText,
        attachments: [],
        headers: {},
        inReplyTo: msg.envelope?.inReplyTo || undefined,
        references: undefined,
      };
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

      if (action === 'add') {
        await client.messageFlagsAdd({ uid: uids }, flags);
      } else {
        await client.messageFlagsRemove({ uid: uids }, flags);
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
      await client.messageMove({ uid: uids }, destination);
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
      await client.messageCopy({ uid: uids }, destination);
      await client.mailboxClose();
    });
  }

  async deleteMessages(
    accountId: string,
    mailboxPath: string,
    uids: number[],
  ): Promise<void> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxOpen(mailboxPath);
      await client.messageDelete({ uid: uids });
      await client.mailboxClose();
    });
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
      // Note: don't close mailbox here, stream is still active
      return result;
    });
  }

  async search(
    accountId: string,
    mailboxPath: string,
    criteria: Record<string, unknown>,
  ): Promise<number[]> {
    return this.withClient(accountId, async (client) => {
      await client.mailboxOpen(mailboxPath);
      const results = await client.search(criteria, { uid: true });
      await client.mailboxClose();
      return results;
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
}
