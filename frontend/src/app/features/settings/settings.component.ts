import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountState } from '../../core/state/account.state';
import { UiState } from '../../core/state/ui.state';
import { AccountService } from '../../core/services/account.service';
import { NotificationService } from '../../core/services/notification.service';
import { IconComponent } from '../../shared/components/icon.component';

interface AppSettings {
  minimizeToTray: boolean;
  launchOnStartup: boolean;
  notificationsEnabled: boolean;
  startMinimized: boolean;
}

interface AccountSignature {
  accountId: string;
  html: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [IconComponent, FormsModule],
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

      <!-- Accounts -->
      <div class="rounded-lg border border-border bg-card">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-medium">E-Mail-Konten</h2>
        </div>

        @for (account of accountState.accounts(); track account.id) {
          <div class="border-b border-border last:border-0">
            <div class="flex items-center justify-between px-4 py-3">
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
                  (click)="toggleSignature(account.id)"
                >
                  <app-icon name="pen-line" [size]="12" />
                  Signatur
                </button>
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

            <!-- Signature editor (collapsible) -->
            @if (editingSignatureFor() === account.id) {
              <div class="px-4 pb-3">
                <label class="text-xs text-muted-foreground mb-1 block">HTML-Signatur</label>
                <textarea
                  class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono resize-y min-h-[80px]"
                  rows="4"
                  [ngModel]="getSignature(account.id)"
                  (ngModelChange)="updateSignature(account.id, $event)"
                  placeholder="<p>Mit freundlichen Grüßen<br>Name</p>"
                ></textarea>
                <div class="flex justify-end mt-1">
                  <button
                    class="text-xs text-primary hover:underline"
                    (click)="saveSignatures()"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            }
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

      <!-- App Behavior -->
      <div class="rounded-lg border border-border bg-card mt-6">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-medium">Verhalten</h2>
        </div>

        <!-- Minimize to tray -->
        <div class="px-4 py-3 flex items-center justify-between border-b border-border">
          <div>
            <div class="text-sm">In Tray minimieren</div>
            <div class="text-xs text-muted-foreground">Beim Schließen in den System-Tray minimieren</div>
          </div>
          @if (appSettings(); as s) {
            <button
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              [class]="s.minimizeToTray ? 'bg-primary' : 'bg-muted'"
              (click)="toggleSetting('minimizeToTray')"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                [class.translate-x-6]="s.minimizeToTray"
                [class.translate-x-1]="!s.minimizeToTray"
              ></span>
            </button>
          }
        </div>

        <!-- Autostart -->
        <div class="px-4 py-3 flex items-center justify-between border-b border-border">
          <div>
            <div class="text-sm">Mit Windows starten</div>
            <div class="text-xs text-muted-foreground">Vellum beim Systemstart automatisch öffnen</div>
          </div>
          @if (appSettings(); as s) {
            <button
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              [class]="s.launchOnStartup ? 'bg-primary' : 'bg-muted'"
              (click)="toggleSetting('launchOnStartup')"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                [class.translate-x-6]="s.launchOnStartup"
                [class.translate-x-1]="!s.launchOnStartup"
              ></span>
            </button>
          }
        </div>

        <!-- Start minimized -->
        <div class="px-4 py-3 flex items-center justify-between border-b border-border">
          <div>
            <div class="text-sm">Minimiert starten</div>
            <div class="text-xs text-muted-foreground">Beim Autostart direkt in den Tray minimieren</div>
          </div>
          @if (appSettings(); as s) {
            <button
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              [class]="s.startMinimized ? 'bg-primary' : 'bg-muted'"
              [disabled]="!s.launchOnStartup"
              [class.opacity-50]="!s.launchOnStartup"
              (click)="toggleSetting('startMinimized')"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                [class.translate-x-6]="s.startMinimized"
                [class.translate-x-1]="!s.startMinimized"
              ></span>
            </button>
          }
        </div>

        <!-- Desktop notifications -->
        <div class="px-4 py-3 flex items-center justify-between">
          <div>
            <div class="text-sm">Desktop-Benachrichtigungen</div>
            <div class="text-xs text-muted-foreground">Bei neuen E-Mails eine Benachrichtigung anzeigen</div>
          </div>
          @if (appSettings(); as s) {
            <button
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              [class]="s.notificationsEnabled ? 'bg-primary' : 'bg-muted'"
              (click)="toggleSetting('notificationsEnabled')"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                [class.translate-x-6]="s.notificationsEnabled"
                [class.translate-x-1]="!s.notificationsEnabled"
              ></span>
            </button>
          }
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

      <!-- Keyboard shortcuts reference -->
      <div class="rounded-lg border border-border bg-card mt-6">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-medium">Tastenkürzel</h2>
        </div>
        <div class="px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-6 text-xs">
          @for (shortcut of shortcuts; track shortcut.key) {
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">{{ shortcut.label }}</span>
              <kbd class="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">{{ shortcut.key }}</kbd>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  protected readonly accountState = inject(AccountState);
  protected readonly uiState = inject(UiState);
  private readonly accountService = inject(AccountService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  currentVersion = signal('0.0.0');
  updateChecking = signal(false);
  updateInfo = signal<{ hasUpdate: boolean; latestVersion: string; releaseUrl: string } | null>(null);
  appSettings = signal<AppSettings | null>(null);
  editingSignatureFor = signal<string | null>(null);
  signatures = signal<AccountSignature[]>([]);

  shortcuts = [
    { key: 'J / K', label: 'Nächste / Vorherige' },
    { key: 'R', label: 'Antworten' },
    { key: 'A', label: 'Allen antworten' },
    { key: 'F', label: 'Weiterleiten' },
    { key: 'E', label: 'Archivieren' },
    { key: 'Del / #', label: 'Löschen' },
    { key: 'U', label: 'Als ungelesen markieren' },
    { key: 'S', label: 'Stern umschalten' },
    { key: 'Ctrl+N', label: 'Neue E-Mail' },
    { key: 'Ctrl+K', label: 'Suche' },
    { key: 'Ctrl+Enter', label: 'Senden' },
    { key: 'Esc', label: 'Schließen / Abbrechen' },
  ];

  async ngOnInit(): Promise<void> {
    const api = (window as any).electronAPI;
    if (api) {
      api.getVersion().then((v: string) => this.currentVersion.set(v));
      const s = await api.getSettings();
      this.appSettings.set(s);
    }
  }

  async toggleSetting(key: keyof AppSettings): Promise<void> {
    const current = this.appSettings();
    if (!current) return;
    const updated = { ...current, [key]: !current[key] };
    const saved = await (window as any).electronAPI?.saveSettings(updated);
    this.appSettings.set(saved ?? updated);
  }

  toggleSignature(accountId: string): void {
    this.editingSignatureFor.set(
      this.editingSignatureFor() === accountId ? null : accountId,
    );
  }

  getSignature(accountId: string): string {
    return this.signatures().find((s) => s.accountId === accountId)?.html || '';
  }

  updateSignature(accountId: string, html: string): void {
    this.signatures.update((list) => {
      const existing = list.find((s) => s.accountId === accountId);
      if (existing) {
        return list.map((s) => (s.accountId === accountId ? { ...s, html } : s));
      }
      return [...list, { accountId, html }];
    });
  }

  saveSignatures(): void {
    // Persist signatures via electron settings
    (window as any).electronAPI?.saveSettings({ signatures: this.signatures() });
    this.notifications.success('Signatur gespeichert');
    this.editingSignatureFor.set(null);
  }

  async checkForUpdate(): Promise<void> {
    this.updateChecking.set(true);
    this.updateInfo.set(null);
    try {
      const info = await (window as any).electronAPI?.checkForUpdate();
      this.updateInfo.set(info ?? null);
    } finally {
      this.updateChecking.set(false);
    }
  }

  openRelease(): void {
    const url = this.updateInfo()?.releaseUrl;
    if (url) (window as any).electronAPI?.openRelease(url);
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
