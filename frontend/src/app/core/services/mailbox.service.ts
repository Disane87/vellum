import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AccountState } from '../state/account.state';
import { MailboxState } from '../state/mailbox.state';
import type { Mailbox } from '@imap-mail/shared';

@Injectable({ providedIn: 'root' })
export class MailboxService {
  private readonly api = inject(ApiService);
  private readonly accountState = inject(AccountState);
  private readonly mailboxState = inject(MailboxState);

  async loadMailboxes(): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) return;

    this.mailboxState.loading.set(true);
    try {
      const mailboxes = await firstValueFrom(
        this.api.get<Mailbox[]>(`/accounts/${accountId}/mailboxes`),
      );
      this.mailboxState.setMailboxes(mailboxes);
    } finally {
      this.mailboxState.loading.set(false);
    }
  }

  async createMailbox(path: string): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) return;
    await firstValueFrom(this.api.post(`/accounts/${accountId}/mailboxes`, { path }));
    await this.loadMailboxes();
  }

  async renameMailbox(oldPath: string, newPath: string): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) return;
    await firstValueFrom(
      this.api.put(`/accounts/${accountId}/mailboxes/${encodeURIComponent(oldPath)}`, { newPath }),
    );
    await this.loadMailboxes();
  }

  async deleteMailbox(path: string): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) return;
    await firstValueFrom(
      this.api.delete(`/accounts/${accountId}/mailboxes/${encodeURIComponent(path)}`),
    );
    await this.loadMailboxes();
  }
}
