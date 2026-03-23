import { Component, inject } from '@angular/core';
import { MailboxState } from '../../../core/state/mailbox.state';
import { MessageState } from '../../../core/state/message.state';
import { AccountState } from '../../../core/state/account.state';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  template: `
    <div class="flex items-center justify-between border-t border-border px-4 py-1 text-xs text-muted-foreground bg-card">
      <span>
        {{ accountState.activeAccount()?.email || 'Kein Account' }}
      </span>
      <span>
        {{ messageState.total() }} Nachrichten
        @if (mailboxState.activeMailbox()?.unseenMessages; as unseen) {
          · {{ unseen }} ungelesen
        }
      </span>
    </div>
  `,
})
export class StatusBarComponent {
  protected readonly mailboxState = inject(MailboxState);
  protected readonly messageState = inject(MessageState);
  protected readonly accountState = inject(AccountState);
}
