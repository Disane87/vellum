import { Component, inject } from '@angular/core';
import { UiState } from '../../../core/state/ui.state';
import { MessageState } from '../../../core/state/message.state';
import { MessageService } from '../../../core/services/message.service';
import { MessageFlag } from '@imap-mail/shared';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  template: `
    <div class="flex items-center gap-2 border-b border-border px-4 py-2 bg-card">
      <button
        class="rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        (click)="compose()"
      >
        ✉ Neue Nachricht
      </button>

      <div class="mx-2 h-5 w-px bg-border"></div>

      <button
        class="rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
        [disabled]="!messageState.hasSelection()"
        (click)="reply()"
      >
        ↩ Antworten
      </button>

      <button
        class="rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
        [disabled]="!messageState.hasSelection()"
        (click)="forward()"
      >
        ↪ Weiterleiten
      </button>

      <button
        class="rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50 text-destructive"
        [disabled]="!messageState.hasSelection()"
        (click)="deleteSelected()"
      >
        🗑 Löschen
      </button>

      <button
        class="rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
        [disabled]="!messageState.hasSelection()"
        (click)="markRead()"
      >
        ✓ Gelesen
      </button>

      <div class="flex-1"></div>

      <button
        class="rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
        (click)="uiState.toggleSidebar()"
      >
        ☰
      </button>
    </div>
  `,
})
export class ToolbarComponent {
  protected readonly uiState = inject(UiState);
  protected readonly messageState = inject(MessageState);
  private readonly messageService = inject(MessageService);

  compose(): void {
    this.uiState.openComposer('new');
  }

  reply(): void {
    this.uiState.openComposer('reply');
  }

  forward(): void {
    this.uiState.openComposer('forward');
  }

  async deleteSelected(): Promise<void> {
    const uids = Array.from(this.messageState.selectedUids());
    if (uids.length > 0) {
      await this.messageService.deleteMessages(uids);
      this.messageState.clearSelection();
    }
  }

  async markRead(): Promise<void> {
    const uids = Array.from(this.messageState.selectedUids());
    if (uids.length > 0) {
      await this.messageService.setFlags(uids, [MessageFlag.Seen], 'add');
      this.messageState.clearSelection();
    }
  }
}
