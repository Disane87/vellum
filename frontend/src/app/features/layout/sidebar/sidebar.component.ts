import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountState } from '../../../core/state/account.state';
import { MailboxState } from '../../../core/state/mailbox.state';
import { UiState } from '../../../core/state/ui.state';
import { MessageService } from '../../../core/services/message.service';
import { MailboxService } from '../../../core/services/mailbox.service';
import { NotificationService } from '../../../core/services/notification.service';
import { IconComponent } from '../../../shared/components/icon.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="flex h-full flex-col p-3">
      <!-- Account Switcher -->
      <div class="mb-3">
        @if (accountState.accounts().length > 1) {
          <button
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
            (click)="accountMenuOpen.set(!accountMenuOpen())"
          >
            <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {{ accountState.activeAccount()?.name?.charAt(0) || '?' }}
            </div>
            <span class="flex-1 truncate text-left font-medium">{{ accountState.activeAccount()?.name || 'Mail' }}</span>
            <app-icon name="chevron-down" [size]="14" class="text-muted-foreground" />
          </button>

          @if (accountMenuOpen()) {
            <div class="mt-1 rounded-md border border-border bg-card p-1">
              @for (account of accountState.accounts(); track account.id) {
                <button
                  class="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                  [class.bg-accent]="account.id === accountState.activeAccountId()"
                  (click)="switchAccount(account.id)"
                >
                  <div
                    class="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium text-white"
                    [style.background-color]="account.color || 'var(--primary)'"
                  >
                    {{ account.name.charAt(0) }}
                  </div>
                  <span class="truncate">{{ account.name }}</span>
                  @if (account.id === accountState.activeAccountId()) {
                    <app-icon name="check" [size]="14" class="ml-auto text-primary" />
                  }
                </button>
              }
            </div>
          }
        } @else {
          <h2 class="px-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {{ accountState.activeAccount()?.name || 'Mail' }}
          </h2>
        }
      </div>

      <!-- Mailbox Tree -->
      <nav class="flex-1 space-y-0.5 overflow-y-auto">
        @for (mailbox of mailboxState.mailboxes(); track mailbox.path) {
          <button
            class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent"
            [class.bg-accent]="mailboxState.activeMailboxPath() === mailbox.path"
            [class.font-medium]="mailboxState.activeMailboxPath() === mailbox.path"
            [class.ring-1]="dropTarget() === mailbox.path"
            [class.ring-primary]="dropTarget() === mailbox.path"
            (click)="selectMailbox(mailbox.path)"
            (dragover)="onDragOver($event, mailbox.path)"
            (dragleave)="dropTarget.set(null)"
            (drop)="onDrop($event, mailbox.path)"
          >
            <app-icon [name]="getMailboxIcon(mailbox.specialUse)" [size]="16" class="shrink-0 text-muted-foreground" />
            <span class="flex-1 truncate text-left">{{ mailbox.name }}</span>
            @if (mailbox.unseenMessages > 0) {
              <span class="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {{ mailbox.unseenMessages }}
              </span>
            }
          </button>
        }
      </nav>

      <!-- Footer -->
      <div class="mt-auto space-y-0.5 pt-3 border-t border-border">
        <button
          class="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
          (click)="toggleTheme()"
        >
          <app-icon [name]="uiState.theme() === 'dark' ? 'sun' : 'moon'" [size]="16" />
          {{ uiState.theme() === 'dark' ? 'Light Mode' : 'Dark Mode' }}
        </button>
        <button
          class="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
          (click)="goToSettings()"
        >
          <app-icon name="settings" [size]="16" />
          Einstellungen
        </button>
      </div>
    </div>
  `,
})
export class SidebarComponent {
  protected readonly accountState = inject(AccountState);
  protected readonly mailboxState = inject(MailboxState);
  protected readonly uiState = inject(UiState);
  private readonly messageService = inject(MessageService);
  private readonly mailboxService = inject(MailboxService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  accountMenuOpen = signal(false);
  dropTarget = signal<string | null>(null);

  selectMailbox(path: string): void {
    this.mailboxState.setActiveMailbox(path);
    this.router.navigate(['/', path]);
    this.messageService.loadMessages();
  }

  switchAccount(id: string): void {
    this.accountState.setActiveAccount(id);
    this.accountMenuOpen.set(false);
    this.mailboxService.loadMailboxes(true);
    this.router.navigate(['/INBOX']);
  }

  toggleTheme(): void {
    this.uiState.toggleTheme();
    document.documentElement.classList.toggle('dark');
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  // --- Drag & Drop targets ---

  onDragOver(event: DragEvent, mailboxPath: string): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dropTarget.set(mailboxPath);
  }

  onDrop(event: DragEvent, mailboxPath: string): void {
    event.preventDefault();
    this.dropTarget.set(null);

    const data = event.dataTransfer?.getData('application/vellum-uids');
    if (!data) return;

    try {
      const uids: number[] = JSON.parse(data);
      if (uids.length > 0) {
        this.messageService.moveMessages(uids, mailboxPath);
        this.notifications.success(`${uids.length} Nachricht(en) verschoben nach ${mailboxPath}`);
      }
    } catch { /* invalid data */ }
  }

  getMailboxIcon(specialUse?: string): string {
    switch (specialUse) {
      case '\\Inbox': return 'inbox';
      case '\\Sent': return 'send';
      case '\\Drafts': return 'file-text';
      case '\\Trash': return 'trash';
      case '\\Junk': return 'alert-triangle';
      case '\\Archive': return 'archive';
      default: return 'folder';
    }
  }
}
