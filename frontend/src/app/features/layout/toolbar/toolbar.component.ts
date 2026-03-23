import { Component, inject } from '@angular/core';
import { UiState } from '../../../core/state/ui.state';
import { MessageState } from '../../../core/state/message.state';
import { MessageService } from '../../../core/services/message.service';
import { IconComponent } from '../../../shared/components/icon.component';
import { MessageFlag } from '@vellum/shared';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="flex items-center gap-1 border-b border-border px-4 py-2 bg-card">
      <button
        class="rounded-md p-1.5 hover:bg-accent transition-colors mr-1"
        (click)="uiState.toggleSidebar()"
        title="Sidebar ein-/ausblenden"
      >
        <app-icon name="menu" [size]="18" />
      </button>

      <button
        class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        (click)="compose()"
      >
        <app-icon name="mail-plus" [size]="16" />
        Neue Nachricht
      </button>

      <div class="flex-1"></div>

      @if (messageState.hasSelection()) {
        <button
          class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
          (click)="reply()"
          title="Antworten"
        >
          <app-icon name="reply" [size]="16" />
          <span class="hidden sm:inline">Antworten</span>
        </button>

        <button
          class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
          (click)="forward()"
          title="Weiterleiten"
        >
          <app-icon name="forward" [size]="16" />
          <span class="hidden sm:inline">Weiterleiten</span>
        </button>

        <button
          class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors text-destructive"
          (click)="deleteSelected()"
          title="Löschen"
        >
          <app-icon name="trash" [size]="16" />
          <span class="hidden sm:inline">Löschen</span>
        </button>

        <button
          class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
          (click)="markRead()"
          title="Als gelesen markieren"
        >
          <app-icon name="mail-open" [size]="16" />
          <span class="hidden sm:inline">Gelesen</span>
        </button>
      }
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
