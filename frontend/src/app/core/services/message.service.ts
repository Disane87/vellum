import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { CacheService } from './cache.service';
import { CacheKeys, CacheTTL } from './cache-keys';
import { AccountState } from '../state/account.state';
import { MailboxState } from '../state/mailbox.state';
import { MessageState } from '../state/message.state';
import type {
  MessageListResponse,
  MessageFull,
  MessageFlag,
} from '@vellum/shared';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly api = inject(ApiService);
  private readonly cache = inject(CacheService);
  private readonly accountState = inject(AccountState);
  private readonly mailboxState = inject(MailboxState);
  private readonly messageState = inject(MessageState);

  async loadMessages(forceRefresh = false): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    const mailbox = this.mailboxState.activeMailboxPath();
    if (!accountId) return;

    const page = this.messageState.page();
    const cacheKey = CacheKeys.messageList(accountId, mailbox, page);

    if (!forceRefresh) {
      const cached = this.cache.get<MessageListResponse>(cacheKey);
      if (cached) {
        this.messageState.setMessages(cached.messages, cached.total);
        return;
      }
    }

    this.messageState.loading.set(true);
    try {
      const pageSize = this.messageState.pageSize();
      const result = await firstValueFrom(
        this.api.get<MessageListResponse>(
          `/accounts/${accountId}/mailboxes/${encodeURIComponent(mailbox)}/messages?page=${page}&pageSize=${pageSize}`,
        ),
      );
      this.cache.set(cacheKey, result, CacheTTL.messageList);
      this.messageState.setMessages(result.messages, result.total);
    } finally {
      this.messageState.loading.set(false);
    }
  }

  async loadMessage(uid: number): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    const mailbox = this.mailboxState.activeMailboxPath();
    if (!accountId) return;

    const cacheKey = CacheKeys.messageFull(accountId, mailbox, uid);
    const cached = this.cache.get<MessageFull>(cacheKey);
    if (cached) {
      this.messageState.setSelectedMessage(cached);
      return;
    }

    const message = await firstValueFrom(
      this.api.get<MessageFull>(
        `/accounts/${accountId}/mailboxes/${encodeURIComponent(mailbox)}/messages/${uid}`,
      ),
    );
    this.cache.set(cacheKey, message, CacheTTL.messageFull);
    this.messageState.setSelectedMessage(message);
  }

  async deleteMessages(uids: number[]): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    const mailbox = this.mailboxState.activeMailboxPath();
    if (!accountId) return;

    for (const uid of uids) {
      await firstValueFrom(
        this.api.delete(
          `/accounts/${accountId}/mailboxes/${encodeURIComponent(mailbox)}/messages/${uid}`,
        ),
      );
      this.cache.invalidate(CacheKeys.messageFull(accountId, mailbox, uid));
    }
    // Invalidate list caches for this mailbox (all pages)
    this.cache.invalidateByPrefix(CacheKeys.messageListPrefix(accountId, mailbox));
    this.messageState.removeMessages(uids);
  }

  async moveMessages(uids: number[], destination: string): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    const mailbox = this.mailboxState.activeMailboxPath();
    if (!accountId) return;

    await firstValueFrom(
      this.api.post(
        `/accounts/${accountId}/mailboxes/${encodeURIComponent(mailbox)}/messages/move`,
        { uids, destination },
      ),
    );

    // Invalidate source and destination mailbox caches
    for (const uid of uids) {
      this.cache.invalidate(CacheKeys.messageFull(accountId, mailbox, uid));
    }
    this.cache.invalidateByPrefix(CacheKeys.messageListPrefix(accountId, mailbox));
    this.cache.invalidateByPrefix(CacheKeys.messageListPrefix(accountId, destination));
    this.messageState.removeMessages(uids);
  }

  async setFlags(
    uids: number[],
    flags: MessageFlag[],
    action: 'add' | 'remove',
  ): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    const mailbox = this.mailboxState.activeMailboxPath();
    if (!accountId) return;

    await firstValueFrom(
      this.api.post(
        `/accounts/${accountId}/mailboxes/${encodeURIComponent(mailbox)}/messages/flags`,
        { uids, flags, action },
      ),
    );

    // Invalidate affected message caches
    for (const uid of uids) {
      this.cache.invalidate(CacheKeys.messageFull(accountId, mailbox, uid));
    }
    this.cache.invalidateByPrefix(CacheKeys.messageListPrefix(accountId, mailbox));
  }

  async downloadAttachment(uid: number, partId: string, filename: string): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    const mailbox = this.mailboxState.activeMailboxPath();
    if (!accountId) return;

    const blob = await firstValueFrom(
      this.api.getBlob(
        `/accounts/${accountId}/mailboxes/${encodeURIComponent(mailbox)}/messages/${uid}/attachments/${partId}`,
      ),
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  invalidateMailboxCache(mailbox?: string): void {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) return;
    const mb = mailbox || this.mailboxState.activeMailboxPath();
    this.cache.invalidateByPrefix(CacheKeys.messageListPrefix(accountId, mb));
  }
}
