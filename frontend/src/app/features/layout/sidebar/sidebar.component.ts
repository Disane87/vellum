import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccountState } from '../../../core/state/account.state';
import { MailboxState } from '../../../core/state/mailbox.state';
import { MessageService } from '../../../core/services/message.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  template: `
    <div class="flex h-full flex-col p-3">
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {{ accountState.activeAccount()?.name || 'Mail' }}
        </h2>
      </div>

      <nav class="flex-1 space-y-0.5">
        @for (mailbox of mailboxState.mailboxes(); track mailbox.path) {
          <button
            class="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent"
            [class.bg-accent]="mailboxState.activeMailboxPath() === mailbox.path"
            [class.font-medium]="mailboxState.activeMailboxPath() === mailbox.path"
            (click)="selectMailbox(mailbox.path)"
          >
            <span class="truncate">{{ getMailboxIcon(mailbox.specialUse) }} {{ mailbox.name }}</span>
            @if (mailbox.unseenMessages > 0) {
              <span class="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {{ mailbox.unseenMessages }}
              </span>
            }
          </button>
        }
      </nav>

      <div class="mt-auto pt-3 border-t border-border">
        <button
          class="flex w-full items-center px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
          (click)="goToSettings()"
        >
          ⚙ Einstellungen
        </button>
      </div>
    </div>
  `,
})
export class SidebarComponent {
  protected readonly accountState = inject(AccountState);
  protected readonly mailboxState = inject(MailboxState);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  selectMailbox(path: string): void {
    this.mailboxState.setActiveMailbox(path);
    this.router.navigate(['/', path]);
    this.messageService.loadMessages();
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  getMailboxIcon(specialUse?: string): string {
    switch (specialUse) {
      case '\\Inbox': return '📥';
      case '\\Sent': return '📤';
      case '\\Drafts': return '📝';
      case '\\Trash': return '🗑';
      case '\\Junk': return '⚠';
      case '\\Archive': return '📦';
      default: return '📁';
    }
  }
}
