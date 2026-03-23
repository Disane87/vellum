import { Injectable, signal, computed } from '@angular/core';
import type { Mailbox } from '@imap-mail/shared';

@Injectable({ providedIn: 'root' })
export class MailboxState {
  readonly mailboxes = signal<Mailbox[]>([]);
  readonly activeMailboxPath = signal<string>('INBOX');
  readonly loading = signal(false);

  readonly activeMailbox = computed(() => {
    const path = this.activeMailboxPath();
    return this.mailboxes().find((m) => m.path === path) ?? null;
  });

  readonly totalUnread = computed(() =>
    this.mailboxes().reduce((sum, m) => sum + m.unseenMessages, 0),
  );

  setMailboxes(mailboxes: Mailbox[]): void {
    this.mailboxes.set(mailboxes);
  }

  setActiveMailbox(path: string): void {
    this.activeMailboxPath.set(path);
  }

  updateMailboxCounts(path: string, total: number, unseen: number): void {
    this.mailboxes.update((list) =>
      list.map((m) =>
        m.path === path ? { ...m, totalMessages: total, unseenMessages: unseen } : m,
      ),
    );
  }
}
