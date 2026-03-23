import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountState } from '../../core/state/account.state';
import { UiState } from '../../core/state/ui.state';
import { AccountService } from '../../core/services/account.service';
import { NotificationService } from '../../core/services/notification.service';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="mx-auto max-w-2xl p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-semibold">Einstellungen</h1>
        <button
          class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm hover:bg-accent transition-colors border border-border"
          (click)="goBack()"
        >
          <app-icon name="chevron-left" [size]="14" />
          Zurück
        </button>
      </div>

      <div class="rounded-lg border border-border bg-card">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-medium">E-Mail-Konten</h2>
        </div>

        @for (account of accountState.accounts(); track account.id) {
          <div class="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
            <div class="flex items-center gap-3">
              <app-icon name="mail" [size]="18" class="text-muted-foreground" />
              <div>
                <div class="text-sm font-medium">{{ account.name }}</div>
                <div class="text-xs text-muted-foreground">{{ account.email }}</div>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors border border-border"
                (click)="testConnection(account.id)"
              >
                <app-icon name="wifi" [size]="12" />
                Testen
              </button>
              <button
                class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors border border-border"
                (click)="deleteAccount(account.id)"
              >
                <app-icon name="trash" [size]="12" />
                Löschen
              </button>
            </div>
          </div>
        }

        @if (accountState.accounts().length === 0) {
          <div class="flex flex-col items-center gap-2 p-8 text-center">
            <app-icon name="user" [size]="32" class="text-muted-foreground opacity-40" />
            <p class="text-sm text-muted-foreground">Noch keine Konten konfiguriert</p>
          </div>
        }

        <div class="px-4 py-3">
          <button
            class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            (click)="addAccount()"
          >
            <app-icon name="plus" [size]="14" />
            Konto hinzufügen
          </button>
        </div>
      </div>
      <!-- Update -->
      <div class="rounded-lg border border-border bg-card mt-6">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-medium">Updates</h2>
        </div>
        <div class="px-4 py-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm">Version {{ currentVersion() }}</div>
              @if (updateChecking()) {
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <span class="flex gap-0.5">
                    <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]"></span>
                    <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]"></span>
                    <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]"></span>
                  </span>
                  Suche nach Updates…
                </div>
              } @else if (updateInfo()?.hasUpdate) {
                <div class="text-xs text-primary mt-1">
                  Version {{ updateInfo()?.latestVersion }} verfügbar!
                </div>
              } @else if (updateInfo() && !updateInfo()?.hasUpdate) {
                <div class="text-xs text-muted-foreground mt-1">
                  <app-icon name="check" [size]="12" class="inline-flex text-green-500" />
                  Du bist auf dem neuesten Stand
                </div>
              }
            </div>
            <div class="flex gap-2">
              @if (updateInfo()?.hasUpdate) {
                <button
                  class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  (click)="openRelease()"
                >
                  <app-icon name="download" [size]="12" />
                  Herunterladen
                </button>
              }
              <button
                class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs hover:bg-accent transition-colors border border-border"
                [disabled]="updateChecking()"
                (click)="checkForUpdate()"
              >
                <app-icon name="rotate-cw" [size]="12" [class.animate-spin]="updateChecking()" />
                Prüfen
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Debug -->
      <div class="rounded-lg border border-border bg-card mt-6">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-medium">Entwickler</h2>
        </div>
        <div class="px-4 py-3 flex items-center justify-between">
          <div>
            <div class="text-sm">Debug-Modus</div>
            <div class="text-xs text-muted-foreground">Öffnet DevTools und zeigt zusätzliche Informationen</div>
          </div>
          <button
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            [class]="uiState.debugMode() ? 'bg-primary' : 'bg-muted'"
            (click)="uiState.toggleDebugMode()"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              [class.translate-x-6]="uiState.debugMode()"
              [class.translate-x-1]="!uiState.debugMode()"
            ></span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  protected readonly accountState = inject(AccountState);
  protected readonly uiState = inject(UiState);
  private readonly accountService = inject(AccountService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  currentVersion = signal('0.0.0');
  updateChecking = signal(false);
  updateInfo = signal<{ hasUpdate: boolean; latestVersion: string; releaseUrl: string } | null>(null);

  constructor() {
    window.electronAPI?.getVersion().then((v) => this.currentVersion.set(v));
  }

  async checkForUpdate(): Promise<void> {
    this.updateChecking.set(true);
    this.updateInfo.set(null);
    try {
      const info = await window.electronAPI?.checkForUpdate();
      this.updateInfo.set(info ?? null);
    } finally {
      this.updateChecking.set(false);
    }
  }

  openRelease(): void {
    const url = this.updateInfo()?.releaseUrl;
    if (url) window.electronAPI?.openRelease(url);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  addAccount(): void {
    this.router.navigate(['/setup']);
  }

  async testConnection(id: string): Promise<void> {
    try {
      const result = await this.accountService.testConnection(id);
      if (result.imap.success && result.smtp.success) {
        this.notifications.success('Verbindung erfolgreich', 'Verbindungstest');
      } else {
        const errors = [];
        if (!result.imap.success) errors.push(`IMAP: ${result.imap.error}`);
        if (!result.smtp.success) errors.push(`SMTP: ${result.smtp.error}`);
        this.notifications.error(errors.join(' | '), 'Verbindungsfehler');
      }
    } catch {
      this.notifications.error('Verbindungstest fehlgeschlagen');
    }
  }

  async deleteAccount(id: string): Promise<void> {
    if (confirm('Konto wirklich löschen?')) {
      await this.accountService.deleteAccount(id);
      this.notifications.success('Konto gelöscht');
    }
  }
}
