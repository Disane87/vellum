import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageState } from '../../core/state/message.state';
import { MailboxState } from '../../core/state/mailbox.state';
import { MessageService } from '../../core/services/message.service';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';
import { MessageFlag } from '@imap-mail/shared';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [RelativeTimePipe, TruncatePipe],
  template: `
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border">
        <h3 class="text-sm font-medium">
          {{ mailboxState.activeMailbox()?.name || 'Nachrichten' }}
        </h3>
        <span class="text-xs text-muted-foreground">
          {{ messageState.total() }} gesamt
        </span>
      </div>

      @if (messageState.loading()) {
        <div class="flex-1 flex items-center justify-center">
          <div class="animate-pulse text-muted-foreground">Laden...</div>
        </div>
      } @else if (messageState.messages().length === 0) {
        <div class="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Keine Nachrichten</p>
        </div>
      } @else {
        <div class="flex-1 overflow-y-auto">
          @for (msg of messageState.messages(); track msg.uid) {
            <div
              class="flex cursor-pointer items-start gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-accent"
              [class.bg-accent/50]="messageState.selectedMessage()?.uid === msg.uid"
              [class.font-semibold]="!isSeen(msg.flags)"
              (click)="selectMessage(msg.uid)"
            >
              <input
                type="checkbox"
                class="mt-1 shrink-0 rounded border-input"
                [checked]="messageState.selectedUids().has(msg.uid)"
                (click)="$event.stopPropagation(); messageState.toggleSelection(msg.uid)"
              />

              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between">
                  <span class="truncate text-sm">
                    {{ msg.from[0]?.name || msg.from[0]?.address || 'Unbekannt' }}
                  </span>
                  <span class="ml-2 shrink-0 text-xs text-muted-foreground">
                    {{ msg.date | relativeTime }}
                  </span>
                </div>
                <div class="truncate text-sm">
                  @if (isFlagged(msg.flags)) { <span>⭐</span> }
                  @if (msg.hasAttachments) { <span>📎</span> }
                  {{ msg.subject }}
                </div>
                <div class="truncate text-xs text-muted-foreground">
                  {{ msg.preview | truncate:120 }}
                </div>
              </div>
            </div>
          }
        </div>

        @if (messageState.totalPages() > 1) {
          <div class="flex items-center justify-center gap-2 border-t border-border px-4 py-2">
            <button
              class="rounded px-2 py-1 text-sm hover:bg-accent disabled:opacity-50"
              [disabled]="messageState.page() <= 1"
              (click)="prevPage()"
            >
              ← Zurück
            </button>
            <span class="text-xs text-muted-foreground">
              Seite {{ messageState.page() }} / {{ messageState.totalPages() }}
            </span>
            <button
              class="rounded px-2 py-1 text-sm hover:bg-accent disabled:opacity-50"
              [disabled]="messageState.page() >= messageState.totalPages()"
              (click)="nextPage()"
            >
              Weiter →
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class MessageListComponent implements OnInit {
  protected readonly messageState = inject(MessageState);
  protected readonly mailboxState = inject(MailboxState);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const mailbox = params.get('mailbox');
      if (mailbox) {
        this.mailboxState.setActiveMailbox(mailbox);
        this.messageState.setPage(1);
        this.messageService.loadMessages();
      }
    });
  }

  selectMessage(uid: number): void {
    this.messageService.loadMessage(uid);
  }

  isSeen(flags: string[]): boolean {
    return flags.includes(MessageFlag.Seen);
  }

  isFlagged(flags: string[]): boolean {
    return flags.includes(MessageFlag.Flagged);
  }

  prevPage(): void {
    this.messageState.setPage(this.messageState.page() - 1);
    this.messageService.loadMessages();
  }

  nextPage(): void {
    this.messageState.setPage(this.messageState.page() + 1);
    this.messageService.loadMessages();
  }
}
