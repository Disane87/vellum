import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="flex h-screen items-center justify-center bg-background">
      <div class="mx-auto max-w-md text-center px-6">
        <div class="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <app-icon name="mail" [size]="40" [strokeWidth]="1.5" class="text-primary" />
        </div>

        <h1 class="text-3xl font-bold tracking-tight mb-3">
          Willkommen bei Vellum
        </h1>

        <p class="text-muted-foreground mb-8 text-base leading-relaxed">
          Dein persönlicher E-Mail-Client. Verbinde dich mit deinem IMAP-Konto
          und behalte den Überblick über alle deine Nachrichten.
        </p>

        <div class="mb-10 grid grid-cols-3 gap-4 text-left">
          <div class="rounded-lg border border-border bg-card p-3">
            <app-icon name="inbox" [size]="20" class="mb-2 text-primary" />
            <div class="text-xs font-medium">Empfangen & Lesen</div>
            <div class="text-xs text-muted-foreground mt-0.5">IMAP-Sync in Echtzeit</div>
          </div>
          <div class="rounded-lg border border-border bg-card p-3">
            <app-icon name="send" [size]="20" class="mb-2 text-primary" />
            <div class="text-xs font-medium">Senden & Antworten</div>
            <div class="text-xs text-muted-foreground mt-0.5">SMTP mit Anhängen</div>
          </div>
          <div class="rounded-lg border border-border bg-card p-3">
            <app-icon name="shield" [size]="20" class="mb-2 text-primary" />
            <div class="text-xs font-medium">Sicher & Privat</div>
            <div class="text-xs text-muted-foreground mt-0.5">Verschlüsselte Daten</div>
          </div>
        </div>

        <button
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          (click)="startSetup()"
        >
          E-Mail-Konto einrichten
          <app-icon name="chevron-right" [size]="16" />
        </button>

        <p class="mt-4 text-xs text-muted-foreground">
          Du brauchst deine IMAP/SMTP-Zugangsdaten.
          <br />
          Unterstützt iCloud, Gmail, Outlook und mehr.
        </p>
      </div>
    </div>
  `,
})
export class WelcomeComponent {
  private readonly router = inject(Router);

  startSetup(): void {
    this.router.navigate(['/setup']);
  }
}
