import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { CacheService } from './cache.service';
import { CacheKeys, CacheTTL } from './cache-keys';
import { AccountState } from '../state/account.state';
import { MailboxState } from '../state/mailbox.state';
import type { Mailbox } from '@vellum/shared';

@Injectable({ providedIn: 'root' })
export class MailboxService {
  private readonly api = inject(ApiService);
  private readonly cache = inject(CacheService);
  private readonly accountState = inject(AccountState);
  private readonly mailboxState = inject(MailboxState);

  async loadMailboxes(forceRefresh = false): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) return;

    const cacheKey = CacheKeys.mailboxes(accountId);

    if (!forceRefresh) {
      const cached = this.cache.get<Mailbox[]>(cacheKey);
      if (cached) {
        this.mailboxState.setMailboxes(cached);
        return;
      }
    }

    this.mailboxState.loading.set(true);
    try {
      // Step 1: Get mailbox list fast (no status calls on server)
      const mailboxes = await firstValueFrom(
        this.api.get<Mailbox[]>(`/accounts/${accountId}/mailboxes`),
      );
      this.cache.set(cacheKey, mailboxes, CacheTTL.mailboxes);
      this.mailboxState.setMailboxes(mailboxes);
      this.mailboxState.loading.set(false);

      // Step 2: Lazy-load unread counts for important folders in background
      this.loadMailboxCounts(accountId, mailboxes);
    } catch (err) {
      console.error('[MailboxService] Failed to load mailboxes:', err);
      this.mailboxState.loading.set(false);
    }
  }

  private async loadMailboxCounts(accountId: string, mailboxes: Mailbox[]): Promise<void> {
    const priorityUses = ['\\Inbox', '\\Sent', '\\Drafts', '\\Trash', '\\Junk', '\\Archive'];
    const paths = mailboxes
      .filter((m) => m.specialUse && priorityUses.includes(m.specialUse))
      .map((m) => m.path);

    if (paths.length === 0) return;

    try {
      // Single batch call — uses ONE IMAP connection for all status checks
      const statuses = await firstValueFrom(
        this.api.post<Record<string, { messages: number; unseen: number }>>(
          `/accounts/${accountId}/mailboxes/status-batch`,
          { paths },
        ),
      );

      for (const [path, status] of Object.entries(statuses)) {
        this.mailboxState.updateMailboxCounts(path, status.messages, status.unseen);
      }
    } catch {
      // Ignore batch status errors
    }
  }

  async createMailbox(path: string): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) return;
    await firstValueFrom(this.api.post(`/accounts/${accountId}/mailboxes`, { path }));
    this.cache.invalidate(CacheKeys.mailboxes(accountId));
    await this.loadMailboxes(true);
  }

  async renameMailbox(oldPath: string, newPath: string): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) return;
    await firstValueFrom(
      this.api.put(`/accounts/${accountId}/mailboxes/${encodeURIComponent(oldPath)}`, { newPath }),
    );
    this.cache.invalidate(CacheKeys.mailboxes(accountId));
    await this.loadMailboxes(true);
  }

  async deleteMailbox(path: string): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) return;
    await firstValueFrom(
      this.api.delete(`/accounts/${accountId}/mailboxes/${encodeURIComponent(path)}`),
    );
    this.cache.invalidate(CacheKeys.mailboxes(accountId));
    await this.loadMailboxes(true);
  }

  invalidateCache(): void {
    const accountId = this.accountState.activeAccountId();
    if (accountId) {
      this.cache.invalidate(CacheKeys.mailboxes(accountId));
    }
  }
}
