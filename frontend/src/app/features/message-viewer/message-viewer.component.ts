import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MessageState } from '../../core/state/message.state';
import { MessageService } from '../../core/services/message.service';
import { UiState } from '../../core/state/ui.state';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';
import { IconComponent } from '../../shared/components/icon.component';
import { BimiBadgeComponent } from '../../shared/components/bimi-badge.component';

@Component({
  selector: 'app-message-viewer',
  standalone: true,
  imports: [RelativeTimePipe, FileSizePipe, IconComponent, BimiBadgeComponent],
  template: `
    @if (messageState.selectedMessage(); as msg) {
      <div class="flex h-full flex-col">
        <div class="border-b border-border p-4">
          <h2 class="text-lg font-semibold mb-2">{{ msg.subject }}</h2>

          <div class="flex items-center gap-3 text-sm">
            <app-bimi-badge
              [email]="msg.from[0]?.address || ''"
              [name]="msg.from[0]?.name || msg.from[0]?.address || '?'"
            />
            <div class="min-w-0 flex-1">
              <div class="font-medium">
                {{ msg.from[0]?.name || msg.from[0]?.address }}
              </div>
              <div class="text-xs text-muted-foreground">
                An: {{ formatRecipients(msg.to) }}
                @if (msg.cc && msg.cc.length > 0) {
                  · CC: {{ formatRecipients(msg.cc) }}
                }
              </div>
            </div>
            <div class="text-xs text-muted-foreground shrink-0">
              {{ msg.date | relativeTime }}
            </div>
          </div>

          <div class="mt-3 flex gap-2">
            <button
              class="inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs hover:bg-accent transition-colors border border-border"
              (click)="reply()"
            >
              <app-icon name="reply" [size]="14" />
              Antworten
            </button>
            <button
              class="inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs hover:bg-accent transition-colors border border-border"
              (click)="replyAll()"
            >
              <app-icon name="reply-all" [size]="14" />
              Allen antworten
            </button>
            <button
              class="inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs hover:bg-accent transition-colors border border-border"
              (click)="forward()"
            >
              <app-icon name="forward" [size]="14" />
              Weiterleiten
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          @if (msg.bodyHtml) {
            <div [innerHTML]="sanitizeHtml(msg.bodyHtml)" class="prose prose-sm max-w-none dark:prose-invert"></div>
          } @else if (msg.bodyText) {
            <pre class="whitespace-pre-wrap text-sm font-sans">{{ msg.bodyText }}</pre>
          }
        </div>

        @if (msg.attachments && msg.attachments.length > 0) {
          <div class="border-t border-border p-4">
            <h4 class="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
              <app-icon name="paperclip" [size]="12" />
              {{ msg.attachments.length }} {{ msg.attachments.length === 1 ? 'Anhang' : 'Anhänge' }}
            </h4>
            <div class="flex flex-wrap gap-2">
              @for (att of msg.attachments; track att.id) {
                <button
                  class="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  (click)="downloadAttachment(msg.uid, att.id, att.filename)"
                >
                  <app-icon name="download" [size]="14" class="text-muted-foreground" />
                  {{ att.filename }}
                  <span class="text-xs text-muted-foreground">({{ att.size | fileSize }})</span>
                </button>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class MessageViewerComponent {
  protected readonly messageState = inject(MessageState);
  private readonly messageService = inject(MessageService);
  private readonly uiState = inject(UiState);
  private readonly sanitizer = inject(DomSanitizer);

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  formatRecipients(recipients: { name?: string; address: string }[]): string {
    return recipients.map((r) => r.name || r.address).join(', ');
  }

  reply(): void { this.uiState.openComposer('reply'); }
  replyAll(): void { this.uiState.openComposer('replyAll'); }
  forward(): void { this.uiState.openComposer('forward'); }

  downloadAttachment(uid: number, partId: string, filename: string): void {
    this.messageService.downloadAttachment(uid, partId, filename);
  }
}
