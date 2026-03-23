import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../core/services/account.service';
import { AccountState } from '../../core/state/account.state';
import { IconComponent } from '../../shared/components/icon.component';

interface MailProvider {
  id: string;
  name: string;
  icon: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  hint?: string;
}

const PROVIDERS: MailProvider[] = [
  {
    id: 'icloud',
    name: 'iCloud Mail',
    icon: 'mail',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
    smtpSecure: false,
    hint: 'Nutze ein App-spezifisches Passwort von appleid.apple.com',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: 'mail',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    hint: 'Nutze ein App-Passwort von myaccount.google.com/apppasswords',
  },
  {
    id: 'outlook',
    name: 'Outlook / Hotmail',
    icon: 'mail',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpSecure: false,
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    icon: 'mail',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
    smtpSecure: false,
    hint: 'Aktiviere "Weniger sichere Apps" oder nutze ein App-Passwort',
  },
  {
    id: 'custom',
    name: 'Anderer Anbieter',
    icon: 'settings',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
  },
];

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="flex min-h-screen items-start justify-center bg-background py-12">
      <div class="mx-auto w-full max-w-lg px-6">

        <!-- Header -->
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <svg class="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 7L13.03 12.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h1 class="text-xl font-semibold">E-Mail-Konto einrichten</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ step() === 'provider' ? 'Wähle deinen E-Mail-Anbieter' : 'Gib deine Zugangsdaten ein' }}
          </p>
        </div>

        <!-- Step indicator -->
        <div class="mb-6 flex items-center justify-center gap-2">
          <div class="h-1.5 w-12 rounded-full" [class]="step() === 'provider' ? 'bg-primary' : 'bg-primary/30'"></div>
          <div class="h-1.5 w-12 rounded-full" [class]="step() === 'credentials' ? 'bg-primary' : 'bg-primary/30'"></div>
          <div class="h-1.5 w-12 rounded-full" [class]="step() === 'test' ? 'bg-primary' : 'bg-primary/30'"></div>
        </div>

        <!-- Step 1: Provider Selection -->
        @if (step() === 'provider') {
          <div class="space-y-2">
            @for (provider of providers; track provider.id) {
              <button
                class="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-accent"
                [class.border-primary]="selectedProvider()?.id === provider.id"
                [class.ring-1]="selectedProvider()?.id === provider.id"
                [class.ring-primary]="selectedProvider()?.id === provider.id"
                (click)="selectProvider(provider)"
              >
                <app-icon [name]="provider.icon" [size]="24" class="text-muted-foreground" />
                <div>
                  <div class="text-sm font-medium">{{ provider.name }}</div>
                  @if (provider.id !== 'custom') {
                    <div class="text-xs text-muted-foreground">{{ provider.imapHost }}</div>
                  } @else {
                    <div class="text-xs text-muted-foreground">Manuelle Konfiguration</div>
                  }
                </div>
                @if (selectedProvider()?.id === provider.id) {
                  <app-icon name="check" [size]="16" class="ml-auto text-primary" />
                }
              </button>
            }
          </div>

          <button
            class="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            [disabled]="!selectedProvider()"
            (click)="goToCredentials()"
          >
            Weiter <app-icon name="chevron-right" [size]="16" class="inline" />
          </button>
        }

        <!-- Step 2: Credentials -->
        @if (step() === 'credentials') {
          <div class="space-y-4">
            <!-- Provider hint -->
            @if (selectedProvider()?.hint) {
              <div class="flex gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5">
                <app-icon name="info" [size]="16" class="shrink-0 text-yellow-500 mt-0.5" />
                <p class="text-xs text-yellow-200/80">{{ selectedProvider()?.hint }}</p>
              </div>
            }

            <div>
              <label class="mb-1 block text-sm font-medium">Anzeigename</label>
              <input
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                [(ngModel)]="name"
                placeholder="z.B. Privat, Arbeit, ..."
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium">E-Mail-Adresse</label>
              <input
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                [(ngModel)]="email"
                type="email"
                placeholder="deine@email.de"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium">Passwort</label>
              <input
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                [(ngModel)]="password"
                type="password"
                placeholder="App-spezifisches Passwort"
              />
            </div>

            <!-- Advanced: Custom server fields -->
            @if (selectedProvider()?.id === 'custom') {
              <div class="space-y-3 rounded-lg border border-border p-4">
                <h3 class="text-xs font-medium uppercase tracking-wider text-muted-foreground">IMAP-Server</h3>
                <div class="flex gap-3">
                  <input class="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" [(ngModel)]="imapHost" placeholder="imap.example.com" />
                  <input class="w-20 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" [(ngModel)]="imapPort" type="number" />
                </div>
                <label class="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" [(ngModel)]="imapSecure" class="rounded" /> SSL/TLS
                </label>
              </div>

              <div class="space-y-3 rounded-lg border border-border p-4">
                <h3 class="text-xs font-medium uppercase tracking-wider text-muted-foreground">SMTP-Server</h3>
                <div class="flex gap-3">
                  <input class="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" [(ngModel)]="smtpHost" placeholder="smtp.example.com" />
                  <input class="w-20 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" [(ngModel)]="smtpPort" type="number" />
                </div>
                <label class="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" [(ngModel)]="smtpSecure" class="rounded" /> SSL/TLS
                </label>
              </div>
            }

            @if (error()) {
              <div class="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <app-icon name="x-circle" [size]="16" class="shrink-0 mt-0.5" />
                <p class="text-sm text-destructive">{{ error() }}</p>
              </div>
            }

            <div class="flex gap-3 pt-2">
              <button
                class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm transition-colors hover:bg-accent"
                (click)="step.set('provider')"
              >
                <app-icon name="chevron-left" [size]="16" class="inline" /> Zurück
              </button>
              <button
                class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                [disabled]="saving() || !canSave()"
                (click)="save()"
              >
                {{ saving() ? 'Verbinde...' : 'Verbinden & Testen' }}
              </button>
            </div>
          </div>
        }

        <!-- Step 3: Connection test result -->
        @if (step() === 'test') {
          <div class="space-y-4">
            @if (testResult()) {
              <div class="rounded-lg border border-border bg-card p-6 text-center">
                @if (testResult()!.imap.success && testResult()!.smtp.success) {
                  <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                    <app-icon name="check-circle" [size]="32" class="text-green-500" />
                  </div>
                  <h3 class="text-lg font-semibold">Verbindung erfolgreich!</h3>
                  <p class="mt-1 text-sm text-muted-foreground">Dein Konto wurde eingerichtet und ist einsatzbereit.</p>
                } @else {
                  <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <app-icon name="alert-triangle" [size]="32" class="text-destructive" />
                  </div>
                  <h3 class="text-lg font-semibold">Verbindungsproblem</h3>
                  <p class="mt-1 text-sm text-muted-foreground">Bitte prüfe deine Zugangsdaten.</p>
                }

                <div class="mt-4 space-y-2 text-left">
                  <div class="flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                       [class]="testResult()!.imap.success ? 'bg-green-500/10 text-green-400' : 'bg-destructive/10 text-destructive'">
                    <app-icon [name]="testResult()!.imap.success ? 'check-circle' : 'x-circle'" [size]="16" />
                    <span>IMAP (Empfangen)</span>
                    @if (testResult()!.imap.error) {
                      <span class="ml-auto text-xs opacity-70">{{ testResult()!.imap.error }}</span>
                    }
                  </div>
                  <div class="flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                       [class]="testResult()!.smtp.success ? 'bg-green-500/10 text-green-400' : 'bg-destructive/10 text-destructive'">
                    <app-icon [name]="testResult()!.smtp.success ? 'check-circle' : 'x-circle'" [size]="16" />
                    <span>SMTP (Senden)</span>
                    @if (testResult()!.smtp.error) {
                      <span class="ml-auto text-xs opacity-70">{{ testResult()!.smtp.error }}</span>
                    }
                  </div>
                </div>
              </div>
            }

            <div class="flex gap-3">
              @if (!testResult()?.imap?.success || !testResult()?.smtp?.success) {
                <button
                  class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm transition-colors hover:bg-accent"
                  (click)="step.set('credentials')"
                >
                  <app-icon name="chevron-left" [size]="16" class="inline" /> Zurück bearbeiten
                </button>
              }
              <button
                class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                (click)="finish()"
              >
                {{ (testResult()?.imap?.success && testResult()?.smtp?.success) ? 'Zum Posteingang' : 'Trotzdem fortfahren' }}
              </button>
            </div>
          </div>
        }

        <!-- Back to app link (if accounts exist) -->
        @if (accountState.hasAccounts()) {
          <div class="mt-6 text-center">
            <button class="text-xs text-muted-foreground hover:text-foreground transition-colors" (click)="cancel()">
              <app-icon name="chevron-left" [size]="14" class="inline" /> Zurück zur Übersicht
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class AccountFormComponent {
  private readonly accountService = inject(AccountService);
  protected readonly accountState = inject(AccountState);
  private readonly router = inject(Router);

  readonly providers = PROVIDERS;

  step = signal<'provider' | 'credentials' | 'test'>('provider');
  selectedProvider = signal<MailProvider | null>(null);
  testResult = signal<{ imap: { success: boolean; error?: string }; smtp: { success: boolean; error?: string } } | null>(null);

  name = '';
  email = '';
  password = '';
  imapHost = '';
  imapPort = 993;
  imapSecure = true;
  smtpHost = '';
  smtpPort = 587;
  smtpSecure = false;

  saving = signal(false);
  error = signal('');

  selectProvider(provider: MailProvider): void {
    this.selectedProvider.set(provider);
    if (provider.id !== 'custom') {
      this.imapHost = provider.imapHost;
      this.imapPort = provider.imapPort;
      this.imapSecure = provider.imapSecure;
      this.smtpHost = provider.smtpHost;
      this.smtpPort = provider.smtpPort;
      this.smtpSecure = provider.smtpSecure;
    }
  }

  goToCredentials(): void {
    this.step.set('credentials');
  }

  canSave(): boolean {
    return (
      this.email.trim().length > 0 &&
      this.password.trim().length > 0 &&
      this.imapHost.trim().length > 0 &&
      this.smtpHost.trim().length > 0
    );
  }

  cancel(): void {
    if (this.accountState.hasAccounts()) {
      this.router.navigate(['/settings']);
    } else {
      this.router.navigate(['/welcome']);
    }
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');

    try {
      const account = await this.accountService.createAccount({
        name: this.name || this.selectedProvider()?.name || 'Mail',
        email: this.email,
        imap: {
          host: this.imapHost,
          port: this.imapPort,
          secure: this.imapSecure,
          auth: { type: 'password', user: this.email, pass: this.password },
        },
        smtp: {
          host: this.smtpHost,
          port: this.smtpPort,
          secure: this.smtpSecure,
          auth: { type: 'password', user: this.email, pass: this.password },
        },
      });

      // Test connection
      this.step.set('test');
      try {
        const result = await this.accountService.testConnection(account.id);
        this.testResult.set(result);
      } catch {
        this.testResult.set({
          imap: { success: false, error: 'Verbindungstest fehlgeschlagen' },
          smtp: { success: false, error: 'Verbindungstest fehlgeschlagen' },
        });
      }
    } catch (e) {
      this.error.set((e as Error).message || 'Fehler beim Speichern');
    } finally {
      this.saving.set(false);
    }
  }

  finish(): void {
    this.router.navigate(['/']);
  }
}
