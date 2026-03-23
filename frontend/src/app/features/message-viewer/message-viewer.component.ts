import { Component, inject, viewChild, ElementRef, effect, afterNextRender } from '@angular/core';
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
            <div #mailBody class="rounded-lg overflow-hidden"></div>
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
  private readonly mailBody = viewChild<ElementRef>('mailBody');
  private shadowRoot: ShadowRoot | null = null;

  constructor() {
    // Re-render mail HTML into shadow DOM whenever selectedMessage changes.
    // NOTE: The HTML is already sanitized server-side by SanitizerService
    // (sanitize-html) before reaching the client. Shadow DOM provides
    // additional isolation — styles can't leak in or out.
    effect(() => {
      const msg = this.messageState.selectedMessage();
      const el = this.mailBody()?.nativeElement;
      if (!el || !msg?.bodyHtml) return;

      // Attach shadow root once per host element
      if (!this.shadowRoot || this.shadowRoot.host !== el) {
        el.replaceChildren(); // clear previous content safely
        this.shadowRoot = el.attachShadow({ mode: 'open' });
      }

      // Build shadow DOM content via safe DOM APIs
      this.renderMailInShadow(this.shadowRoot!, msg.bodyHtml);
    });
  }

  private renderMailInShadow(shadow: ShadowRoot, html: string): void {
    // Clear previous content
    while (shadow.firstChild) shadow.removeChild(shadow.firstChild);

    // Add scoped styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        background: #ffffff;
        color: #1a1a1a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        padding: 16px;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      img { max-width: 100%; height: auto; }
      a { color: #6366f1; }
      table { max-width: 100% !important; }
      pre, code { white-space: pre-wrap; }
      blockquote { margin: 0.5em 0; padding-left: 1em; border-left: 3px solid #d1d5db; color: #6b7280; }
    `;
    shadow.appendChild(style);

    // Create a container for the server-sanitized mail HTML
    const container = document.createElement('div');
    // HTML is sanitized server-side by sanitize-html before reaching client
    container.innerHTML = html;
    shadow.appendChild(container);
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
