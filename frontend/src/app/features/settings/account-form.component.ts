import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../core/services/account.service';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="mx-auto max-w-lg p-6">
      <h1 class="text-xl font-semibold mb-6">Neues E-Mail-Konto</h1>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Name</label>
          <input
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            [(ngModel)]="name"
            placeholder="Mein iCloud Mail"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">E-Mail-Adresse</label>
          <input
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            [(ngModel)]="email"
            type="email"
            placeholder="user@icloud.com"
          />
        </div>

        <fieldset class="rounded-lg border border-border p-4">
          <legend class="text-sm font-medium px-2">IMAP-Server</legend>
          <div class="space-y-3">
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block text-xs text-muted-foreground mb-1">Host</label>
                <input class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" [(ngModel)]="imapHost" placeholder="imap.mail.me.com" />
              </div>
              <div class="w-20">
                <label class="block text-xs text-muted-foreground mb-1">Port</label>
                <input class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" [(ngModel)]="imapPort" type="number" />
              </div>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" [(ngModel)]="imapSecure" class="rounded border-input" />
              SSL/TLS
            </label>
          </div>
        </fieldset>

        <fieldset class="rounded-lg border border-border p-4">
          <legend class="text-sm font-medium px-2">SMTP-Server</legend>
          <div class="space-y-3">
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block text-xs text-muted-foreground mb-1">Host</label>
                <input class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" [(ngModel)]="smtpHost" placeholder="smtp.mail.me.com" />
              </div>
              <div class="w-20">
                <label class="block text-xs text-muted-foreground mb-1">Port</label>
                <input class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" [(ngModel)]="smtpPort" type="number" />
              </div>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" [(ngModel)]="smtpSecure" class="rounded border-input" />
              SSL/TLS
            </label>
          </div>
        </fieldset>

        <fieldset class="rounded-lg border border-border p-4">
          <legend class="text-sm font-medium px-2">Anmeldedaten</legend>
          <div class="space-y-3">
            <div>
              <label class="block text-xs text-muted-foreground mb-1">Benutzername</label>
              <input class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" [(ngModel)]="username" />
            </div>
            <div>
              <label class="block text-xs text-muted-foreground mb-1">Passwort</label>
              <input class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" [(ngModel)]="password" type="password" />
            </div>
          </div>
        </fieldset>

        @if (error()) {
          <div class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ error() }}
          </div>
        }

        <div class="flex justify-end gap-3 pt-2">
          <button
            class="rounded-md px-4 py-2 text-sm hover:bg-accent transition-colors border border-border"
            (click)="cancel()"
          >
            Abbrechen
          </button>
          <button
            class="rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            [disabled]="saving()"
            (click)="save()"
          >
            {{ saving() ? 'Speichern...' : 'Konto hinzufügen' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AccountFormComponent {
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  imapHost = '';
  imapPort = 993;
  imapSecure = true;
  smtpHost = '';
  smtpPort = 587;
  smtpSecure = false;
  username = '';
  password = '';

  saving = signal(false);
  error = signal('');

  cancel(): void {
    this.router.navigate(['/settings']);
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');

    try {
      await this.accountService.createAccount({
        name: this.name,
        email: this.email,
        imap: {
          host: this.imapHost,
          port: this.imapPort,
          secure: this.imapSecure,
          auth: { type: 'password', user: this.username, pass: this.password },
        },
        smtp: {
          host: this.smtpHost,
          port: this.smtpPort,
          secure: this.smtpSecure,
          auth: { type: 'password', user: this.username, pass: this.password },
        },
      });
      this.router.navigate(['/']);
    } catch (e) {
      this.error.set((e as Error).message || 'Fehler beim Speichern');
    } finally {
      this.saving.set(false);
    }
  }
}
