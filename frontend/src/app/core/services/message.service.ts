import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AccountState } from '../state/account.state';
import { MailboxState } from '../state/mailbox.state';
import { MessageState } from '../state/message.state';
import type {
  MessageListResponse,
  MessageFull,
  MessageFlag,
} from '@imap-mail/shared';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly api = inject(ApiService);
  private readonly accountState = inject(AccountState);
  private readonly mailboxState = inject(MailboxState);
  private readonly messageState = inject(MessageState);

  async loadMessages(): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    const mailbox = this.mailboxState.activeMailboxPath();
    if (!accountId) return;

    this.messageState.loading.set(true);
    try {
      const page = this.messageState.page();
      const pageSize = this.messageState.pageSize();
      const result = await firstValueFrom(
        this.api.get<MessageListResponse>(
          `/accounts/${accountId}/mailboxes/${encodeURIComponent(mailbox)}/messages?page=${page}&pageSize=${pageSize}`,
        ),
      );
      this.messageState.setMessages(result.messages, result.total);
    } finally {
      this.messageState.loading.set(false);
    }
  }

  async loadMessage(uid: number): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    const mailbox = this.mailboxState.activeMailboxPath();
    if (!accountId) return;

    const message = await firstValueFrom(
      this.api.get<MessageFull>(
        `/accounts/${accountId}/mailboxes/${encodeURIComponent(mailbox)}/messages/${uid}`,
      ),
    );
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
    }
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
}
