import { Injectable, inject, OnDestroy } from '@angular/core';
import { MessageState } from '../state/message.state';
import { MailboxState } from '../state/mailbox.state';
import { UiState } from '../state/ui.state';
import { MessageService } from './message.service';
import { MessageFlag } from '@vellum/shared';

@Injectable({ providedIn: 'root' })
export class KeyboardService implements OnDestroy {
  private readonly messageState = inject(MessageState);
  private readonly mailboxState = inject(MailboxState);
  private readonly uiState = inject(UiState);
  private readonly messageService = inject(MessageService);

  private handler = (e: KeyboardEvent) => this.onKeydown(e);
  private enabled = false;

  enable(): void {
    if (this.enabled) return;
    document.addEventListener('keydown', this.handler);
    this.enabled = true;
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handler);
  }

  private onKeydown(e: KeyboardEvent): void {
    // Don't capture when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
      // Only handle Cmd+Enter in inputs (for send)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        // Handled by composer
        return;
      }
      return;
    }

    // Cmd/Ctrl combinations
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          this.uiState.openComposer('new');
          return;
        case 'k':
        case 'K':
          // Handled by SearchBarComponent
          return;
      }
    }

    // Don't capture if composer or search is open
    if (this.uiState.composerOpen()) return;

    // Single-key shortcuts
    switch (e.key) {
      case 'j': // Next message
        e.preventDefault();
        this.navigateMessage(1);
        break;
      case 'k': // Previous message
        e.preventDefault();
        this.navigateMessage(-1);
        break;
      case 'r': // Reply
        if (this.messageState.selectedMessage()) {
          e.preventDefault();
          this.uiState.openComposer('reply');
        }
        break;
      case 'a': // Reply all
        if (this.messageState.selectedMessage()) {
          e.preventDefault();
          this.uiState.openComposer('replyAll');
        }
        break;
      case 'f': // Forward
        if (this.messageState.selectedMessage()) {
          e.preventDefault();
          this.uiState.openComposer('forward');
        }
        break;
      case 'e': // Archive
        this.archiveSelected();
        break;
      case '#': // Delete
      case 'Delete':
        this.deleteSelected();
        break;
      case 'u': // Mark unread
        this.toggleReadSelected();
        break;
      case 's': // Star/flag toggle
        this.toggleStarSelected();
        break;
      case 'Escape':
        this.messageState.setSelectedMessage(null);
        this.messageState.clearSelection();
        break;
      case 'x': // Toggle selection on current
        if (this.messageState.selectedMessage()) {
          this.messageState.toggleSelection(this.messageState.selectedMessage()!.uid);
        }
        break;
    }
  }

  private navigateMessage(direction: number): void {
    const messages = this.messageState.messages();
    const current = this.messageState.selectedMessage();

    if (messages.length === 0) return;

    if (!current) {
      // Select first message
      this.messageService.loadMessage(messages[0].uid);
      return;
    }

    const currentIndex = messages.findIndex((m) => m.uid === current.uid);
    const nextIndex = currentIndex + direction;

    if (nextIndex >= 0 && nextIndex < messages.length) {
      this.messageService.loadMessage(messages[nextIndex].uid);
    }
  }

  private async deleteSelected(): Promise<void> {
    const uids = this.getActionUids();
    if (uids.length > 0) {
      await this.messageService.deleteMessages(uids);
      this.messageState.clearSelection();
      this.messageState.setSelectedMessage(null);
    }
  }

  private async archiveSelected(): Promise<void> {
    const uids = this.getActionUids();
    if (uids.length > 0) {
      await this.messageService.moveMessages(uids, 'Archive');
      this.messageState.clearSelection();
      this.messageState.setSelectedMessage(null);
    }
  }

  private async toggleReadSelected(): Promise<void> {
    const msg = this.messageState.selectedMessage();
    if (!msg) return;
    const isSeen = msg.flags.includes(MessageFlag.Seen);
    await this.messageService.setFlags(
      [msg.uid],
      [MessageFlag.Seen],
      isSeen ? 'remove' : 'add',
    );
  }

  private async toggleStarSelected(): Promise<void> {
    const msg = this.messageState.selectedMessage();
    if (!msg) return;
    const isFlagged = msg.flags.includes(MessageFlag.Flagged);
    await this.messageService.setFlags(
      [msg.uid],
      [MessageFlag.Flagged],
      isFlagged ? 'remove' : 'add',
    );
  }

  private getActionUids(): number[] {
    const selected = Array.from(this.messageState.selectedUids());
    if (selected.length > 0) return selected;
    const msg = this.messageState.selectedMessage();
    return msg ? [msg.uid] : [];
  }
}
