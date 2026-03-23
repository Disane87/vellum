import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccountState } from '../../core/state/account.state';
import { AccountService } from '../../core/services/account.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div class="mx-auto max-w-2xl p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-semibold">Einstellungen</h1>
        <button
          class="rounded-md px-3 py-1.5 text-sm hover:bg-accent transition-colors border border-border"
          (click)="goBack()"
        >
          ← Zurück
        </button>
      </div>

      <div class="rounded-lg border border-border bg-card">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-medium">E-Mail-Konten</h2>
        </div>

        @for (account of accountState.accounts(); track account.id) {
          <div class="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
            <div>
              <div class="text-sm font-medium">{{ account.name }}</div>
              <div class="text-xs text-muted-foreground">{{ account.email }}</div>
            </div>
            <div class="flex gap-2">
              <button
                class="rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors border border-border"
                (click)="testConnection(account.id)"
              >
                Testen
              </button>
              <button
                class="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors border border-border"
                (click)="deleteAccount(account.id)"
              >
                Löschen
              </button>
            </div>
          </div>
        }

        @if (accountState.accounts().length === 0) {
          <div class="p-8 text-center text-muted-foreground text-sm">
            Noch keine Konten konfiguriert
          </div>
        }

        <div class="px-4 py-3">
          <button
            class="rounded-md px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            (click)="addAccount()"
          >
            + Konto hinzufügen
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  protected readonly accountState = inject(AccountState);
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);

  goBack(): void {
    this.router.navigate(['/']);
  }

  addAccount(): void {
    this.router.navigate(['/setup']);
  }

  async testConnection(id: string): Promise<void> {
    const result = await this.accountService.testConnection(id);
    const msg = `IMAP: ${result.imap.success ? '✓' : '✗ ' + result.imap.error}\nSMTP: ${result.smtp.success ? '✓' : '✗ ' + result.smtp.error}`;
    alert(msg);
  }

  async deleteAccount(id: string): Promise<void> {
    if (confirm('Konto wirklich löschen?')) {
      await this.accountService.deleteAccount(id);
    }
  }
}
