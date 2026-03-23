import { Component, inject, signal, viewChild, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiState } from '../../core/state/ui.state';
import { MessageState } from '../../core/state/message.state';
import { AccountState } from '../../core/state/account.state';
import { ComposeService } from '../../core/services/compose.service';
import { NotificationService } from '../../core/services/notification.service';
import { IconComponent } from '../../shared/components/icon.component';
import { RichEditorComponent } from '../../shared/components/rich-editor.component';
import type { Address, MessageFull } from '@vellum/shared';

@Component({
  selector: 'app-composer',
  standalone: true,
  imports: [FormsModule, IconComponent, RichEditorComponent],
  template: `
    @if (uiState.composerOpen()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <div class="fixed inset-0 bg-black/50" (click)="close()"></div>

        <div class="relative z-50 w-full max-w-3xl rounded-t-lg sm:rounded-lg border border-border bg-card shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h3 class="inline-flex items-center gap-2 text-sm font-semibold">
              <app-icon [name]="getTitleIcon()" [size]="16" class="text-muted-foreground" />
              {{ getTitle() }}
            </h3>
            <div class="flex items-center gap-1">
              <button
                class="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground"
                (click)="showBcc.set(!showBcc())"
                title="BCC anzeigen"
              >
                <app-icon name="eye" [size]="14" />
              </button>
              <button
                class="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground"
                (click)="close()"
              >
                <app-icon name="x" [size]="16" />
              </button>
            </div>
          </div>

          <!-- Recipient Fields -->
          <div class="border-b border-border px-4 py-1">
            <div class="flex items-center gap-2 py-1">
              <label class="w-10 shrink-0 text-xs text-muted-foreground text-right">An</label>
              <input
                class="flex-1 bg-transparent text-sm focus:outline-none"
                [(ngModel)]="toField"
                placeholder="empfaenger@example.com"
              />
            </div>
            <div class="flex items-center gap-2 py-1 border-t border-border/50">
              <label class="w-10 shrink-0 text-xs text-muted-foreground text-right">CC</label>
              <input
                class="flex-1 bg-transparent text-sm focus:outline-none"
                [(ngModel)]="ccField"
                placeholder="optional"
              />
            </div>
            @if (showBcc()) {
              <div class="flex items-center gap-2 py-1 border-t border-border/50">
                <label class="w-10 shrink-0 text-xs text-muted-foreground text-right">BCC</label>
                <input
                  class="flex-1 bg-transparent text-sm focus:outline-none"
                  [(ngModel)]="bccField"
                  placeholder="optional"
                />
              </div>
            }
            <div class="flex items-center gap-2 py-1 border-t border-border/50">
              <label class="w-10 shrink-0 text-xs text-muted-foreground text-right">Betr.</label>
              <input
                class="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                [(ngModel)]="subjectField"
                placeholder="Betreff"
              />
            </div>
          </div>

          <!-- Priority / Importance -->
          <div class="flex items-center gap-3 px-4 py-1.5 border-b border-border text-xs text-muted-foreground">
            <label class="inline-flex items-center gap-1 cursor-pointer">
              <app-icon name="flag" [size]="12" />
              Priorität:
              <select
                class="bg-transparent text-xs focus:outline-none cursor-pointer"
                [(ngModel)]="priority"
              >
                <option value="normal">Normal</option>
                <option value="high">Hoch</option>
                <option value="low">Niedrig</option>
              </select>
            </label>
            <label class="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" class="rounded border-input" [(ngModel)]="requestReadReceipt" />
              Lesebestätigung anfordern
            </label>
          </div>

          <!-- Rich Text Editor -->
          <app-rich-editor
            #editor
            [initialContent]="initialBodyHtml"
            placeholder="Nachricht schreiben..."
            (contentChange)="bodyHtml = $event"
          />

          <!-- Attachments -->
          <div class="border-t border-border px-4 py-2">
            <div class="flex items-center gap-2">
              <label class="inline-flex items-center gap-1.5 cursor-pointer rounded-md px-2.5 py-1 text-xs hover:bg-accent transition-colors border border-border">
                <app-icon name="paperclip" [size]="14" />
                Anhang
                <input type="file" class="hidden" multiple (change)="onFileSelect($event)" />
              </label>
              @if (attachments().length > 0) {
                <div class="flex flex-wrap gap-1">
                  @for (file of attachments(); track file.name) {
                    <span class="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs">
                      <app-icon name="file-text" [size]="12" />
                      {{ file.name }}
                      <button (click)="removeAttachment(file.name)" class="text-destructive hover:text-destructive/80">
                        <app-icon name="x" [size]="12" />
                      </button>
                    </span>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-border px-4 py-2.5">
            <button
              class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-accent transition-colors border border-border"
              (click)="saveDraft()"
              [disabled]="sending()"
            >
              <app-icon name="file-text" [size]="14" />
              Entwurf
            </button>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground">
                Cmd+Enter
              </span>
              <button
                class="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                (click)="send()"
                [disabled]="sending() || !canSend()"
              >
                <app-icon name="send" [size]="14" />
                {{ sending() ? 'Sende...' : 'Senden' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ComposerComponent {
  protected readonly uiState = inject(UiState);
  private readonly messageState = inject(MessageState);
  private readonly accountState = inject(AccountState);
  private readonly composeService = inject(ComposeService);
  private readonly notifications = inject(NotificationService);

  private editorRef = viewChild<RichEditorComponent>('editor');

  toField = '';
  ccField = '';
  bccField = '';
  subjectField = '';
  bodyHtml = '';
  initialBodyHtml = '';
  priority = 'normal';
  requestReadReceipt = false;
  showBcc = signal(false);
  attachments = signal<File[]>([]);
  sending = signal(false);

  // In-Reply-To and References for threading (RFC 2822)
  private inReplyTo: string | undefined;
  private references: string[] | undefined;

  constructor() {
    // React to composer opening
    effect(() => {
      if (this.uiState.composerOpen()) {
        this.prefill();
      }
    });
  }

  getTitle(): string {
    switch (this.uiState.composerMode()) {
      case 'reply': return 'Antworten';
      case 'replyAll': return 'Allen antworten';
      case 'forward': return 'Weiterleiten';
      default: return 'Neue Nachricht';
    }
  }

  getTitleIcon(): string {
    switch (this.uiState.composerMode()) {
      case 'reply': return 'reply';
      case 'replyAll': return 'reply-all';
      case 'forward': return 'forward';
      default: return 'mail-plus';
    }
  }

  canSend(): boolean {
    return this.toField.trim().length > 0 && this.subjectField.trim().length > 0;
  }

  close(): void {
    this.uiState.closeComposer();
    this.reset();
  }

  async send(): Promise<void> {
    this.sending.set(true);
    try {
      const editorText = this.editorRef()?.getText() || '';

      await this.composeService.send({
        to: this.parseAddresses(this.toField),
        cc: this.ccField ? this.parseAddresses(this.ccField) : undefined,
        bcc: this.bccField ? this.parseAddresses(this.bccField) : undefined,
        subject: this.subjectField,
        bodyHtml: this.bodyHtml || undefined,
        bodyText: editorText || undefined,
        inReplyTo: this.inReplyTo,
        references: this.references,
        replyType: (['reply', 'replyAll', 'forward'] as const).includes(this.uiState.composerMode() as any)
          ? (this.uiState.composerMode() as 'reply' | 'replyAll' | 'forward')
          : undefined,
      });
      this.notifications.success('Nachricht gesendet');
      this.close();
    } catch (e) {
      this.notifications.error((e as Error).message || 'Fehler beim Senden');
    } finally {
      this.sending.set(false);
    }
  }

  async saveDraft(): Promise<void> {
    try {
      await this.composeService.saveDraft({
        to: this.parseAddresses(this.toField),
        cc: this.ccField ? this.parseAddresses(this.ccField) : undefined,
        bcc: this.bccField ? this.parseAddresses(this.bccField) : undefined,
        subject: this.subjectField,
        bodyHtml: this.bodyHtml || undefined,
        bodyText: this.editorRef()?.getText() || undefined,
        inReplyTo: this.inReplyTo,
        references: this.references,
      });
      this.notifications.success('Entwurf gespeichert');
    } catch {
      this.notifications.error('Fehler beim Speichern');
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.attachments.update((list) => [...list, ...Array.from(input.files!)]);
    }
  }

  removeAttachment(name: string): void {
    this.attachments.update((list) => list.filter((f) => f.name !== name));
  }

  private prefill(): void {
    this.reset();
    const mode = this.uiState.composerMode();
    const msg = this.messageState.selectedMessage();
    if (!msg || mode === 'new') return;

    const account = this.accountState.activeAccount();
    const myEmail = account?.email || '';

    if (mode === 'reply' || mode === 'replyAll') {
      // RFC 5322: Reply-To has priority over From
      const replyTo = msg.replyTo && msg.replyTo.length > 0 ? msg.replyTo : msg.from;
      this.toField = this.formatAddresses(replyTo);

      if (mode === 'replyAll') {
        // CC = all original To + CC, minus ourselves
        const allRecipients = [...(msg.to || []), ...(msg.cc || [])];
        const ccAddresses = allRecipients.filter((a) => a.address !== myEmail);
        // Don't duplicate the primary reply-to address
        const replyToAddr = replyTo[0]?.address;
        const filtered = ccAddresses.filter((a) => a.address !== replyToAddr);
        if (filtered.length > 0) {
          this.ccField = this.formatAddresses(filtered);
        }
      }

      // RFC 5322: Subject with Re: prefix (avoid double-prefixing)
      this.subjectField = this.addPrefix(msg.subject, 'Re:');

      // RFC 2822: In-Reply-To and References headers for threading
      this.inReplyTo = msg.messageId;
      this.references = [
        ...(msg.references || []),
        msg.messageId,
      ].filter(Boolean);

      // Build quoted HTML body
      this.initialBodyHtml = this.buildQuotedHtml(msg, 'reply');
    } else if (mode === 'forward') {
      this.subjectField = this.addPrefix(msg.subject, 'Fwd:');

      // RFC 2822: References for forwarded messages
      this.references = [
        ...(msg.references || []),
        msg.messageId,
      ].filter(Boolean);

      this.initialBodyHtml = this.buildQuotedHtml(msg, 'forward');
    }
  }

  private buildQuotedHtml(msg: MessageFull, type: 'reply' | 'forward'): string {
    const date = new Date(msg.date).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const from = msg.from.map((a) => a.name ? `${a.name} &lt;${a.address}&gt;` : a.address).join(', ');
    const to = msg.to.map((a) => a.name ? `${a.name} &lt;${a.address}&gt;` : a.address).join(', ');

    const headerBlock = type === 'forward'
      ? `<p><strong>---------- Weitergeleitete Nachricht ----------</strong><br/>
         <strong>Von:</strong> ${from}<br/>
         <strong>Datum:</strong> ${date}<br/>
         <strong>An:</strong> ${to}<br/>
         <strong>Betreff:</strong> ${msg.subject}</p>`
      : `<p>Am ${date} schrieb ${from}:</p>`;

    const originalBody = msg.bodyHtml || `<pre>${msg.bodyText || ''}</pre>`;

    return `<br/><br/>${headerBlock}<blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">${originalBody}</blockquote>`;
  }

  private addPrefix(subject: string, prefix: string): string {
    const stripped = subject.replace(/^(Re|Fwd|Fw|AW|WG):\s*/gi, '');
    return `${prefix} ${stripped}`;
  }

  private formatAddresses(addresses: Address[]): string {
    return addresses.map((a) => a.name ? `${a.name} <${a.address}>` : a.address).join(', ');
  }

  private reset(): void {
    this.toField = '';
    this.ccField = '';
    this.bccField = '';
    this.subjectField = '';
    this.bodyHtml = '';
    this.initialBodyHtml = '';
    this.priority = 'normal';
    this.requestReadReceipt = false;
    this.inReplyTo = undefined;
    this.references = undefined;
    this.attachments.set([]);
    this.showBcc.set(false);
  }

  private parseAddresses(input: string): Address[] {
    // Parse "Name <email>" and plain "email" formats
    return input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => {
        const match = s.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
          return { name: match[1].trim(), address: match[2].trim() };
        }
        return { address: s };
      });
  }
}
