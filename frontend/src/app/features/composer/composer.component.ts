import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiState } from '../../core/state/ui.state';
import { MessageState } from '../../core/state/message.state';
import { ComposeService } from '../../core/services/compose.service';
import type { Address } from '@imap-mail/shared';

@Component({
  selector: 'app-composer',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (uiState.composerOpen()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50" (click)="close()"></div>

        <!-- Dialog -->
        <div class="relative z-50 w-full max-w-2xl rounded-t-lg sm:rounded-lg border border-border bg-card shadow-lg">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-sm font-semibold">
              {{ getTitle() }}
            </h3>
            <button
              class="rounded-md p-1 hover:bg-accent transition-colors text-muted-foreground"
              (click)="close()"
            >
              ✕
            </button>
          </div>

          <!-- Form -->
          <div class="p-4 space-y-3">
            <div class="flex items-center gap-2">
              <label class="w-12 text-xs text-muted-foreground text-right">An:</label>
              <input
                class="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                [(ngModel)]="toField"
                placeholder="empfaenger@example.com"
              />
            </div>

            <div class="flex items-center gap-2">
              <label class="w-12 text-xs text-muted-foreground text-right">CC:</label>
              <input
                class="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                [(ngModel)]="ccField"
                placeholder="optional"
              />
            </div>

            <div class="flex items-center gap-2">
              <label class="w-12 text-xs text-muted-foreground text-right">Betreff:</label>
              <input
                class="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                [(ngModel)]="subjectField"
              />
            </div>

            <textarea
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[200px] resize-y"
              [(ngModel)]="bodyField"
              placeholder="Nachricht schreiben..."
            ></textarea>

            <!-- Attachment area -->
            <div
              class="rounded-md border border-dashed border-input p-3 text-center text-xs text-muted-foreground"
            >
              Dateien hierher ziehen oder
              <label class="cursor-pointer text-primary underline">
                auswählen
                <input type="file" class="hidden" multiple (change)="onFileSelect($event)" />
              </label>
              @if (attachments().length > 0) {
                <div class="mt-2 flex flex-wrap gap-1">
                  @for (file of attachments(); track file.name) {
                    <span class="rounded bg-accent px-2 py-0.5 text-xs">
                      📎 {{ file.name }}
                      <button (click)="removeAttachment(file.name)" class="ml-1 text-destructive">✕</button>
                    </span>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-border px-4 py-3">
            <button
              class="rounded-md px-3 py-1.5 text-sm hover:bg-accent transition-colors border border-border"
              (click)="saveDraft()"
              [disabled]="sending()"
            >
              Entwurf speichern
            </button>
            <button
              class="rounded-md px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              (click)="send()"
              [disabled]="sending() || !canSend()"
            >
              {{ sending() ? 'Wird gesendet...' : 'Senden' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ComposerComponent implements OnInit {
  protected readonly uiState = inject(UiState);
  private readonly messageState = inject(MessageState);
  private readonly composeService = inject(ComposeService);

  toField = '';
  ccField = '';
  subjectField = '';
  bodyField = '';
  attachments = signal<File[]>([]);
  sending = signal(false);

  ngOnInit(): void {
    this.prefill();
  }

  getTitle(): string {
    switch (this.uiState.composerMode()) {
      case 'reply': return 'Antworten';
      case 'replyAll': return 'Allen antworten';
      case 'forward': return 'Weiterleiten';
      default: return 'Neue Nachricht';
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
      await this.composeService.send({
        to: this.parseAddresses(this.toField),
        cc: this.ccField ? this.parseAddresses(this.ccField) : undefined,
        subject: this.subjectField,
        bodyText: this.bodyField,
      });
      this.close();
    } finally {
      this.sending.set(false);
    }
  }

  async saveDraft(): Promise<void> {
    await this.composeService.saveDraft({
      to: this.parseAddresses(this.toField),
      cc: this.ccField ? this.parseAddresses(this.ccField) : undefined,
      subject: this.subjectField,
      bodyText: this.bodyField,
    });
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
    const mode = this.uiState.composerMode();
    const msg = this.messageState.selectedMessage();
    if (!msg || mode === 'new') return;

    if (mode === 'reply' || mode === 'replyAll') {
      this.toField = msg.from[0]?.address || '';
      if (mode === 'replyAll' && msg.to) {
        const others = msg.to.map((a) => a.address).join(', ');
        if (others) this.ccField = others;
      }
      this.subjectField = msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`;
      this.bodyField = `\n\n--- Ursprüngliche Nachricht ---\n${msg.bodyText || ''}`;
    } else if (mode === 'forward') {
      this.subjectField = msg.subject.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`;
      this.bodyField = `\n\n--- Weitergeleitete Nachricht ---\n${msg.bodyText || ''}`;
    }
  }

  private reset(): void {
    this.toField = '';
    this.ccField = '';
    this.subjectField = '';
    this.bodyField = '';
    this.attachments.set([]);
  }

  private parseAddresses(input: string): Address[] {
    return input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => ({ address: s }));
  }
}
