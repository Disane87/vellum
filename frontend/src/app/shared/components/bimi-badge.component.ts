import { Component, input, computed, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Shared cache + in-flight dedup across all badge instances
const bimiCache = new Map<string, string | null>();
const bimiPending = new Map<string, Promise<string | null>>();

@Component({
  selector: 'app-bimi-badge',
  standalone: true,
  template: `
    @if (logoUrl() && !imgError()) {
      <img
        [src]="logoUrl()"
        [alt]="name()"
        class="h-8 w-8 rounded-full object-cover bg-muted"
        (error)="imgError.set(true)"
      />
    } @else {
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium"
        [style.background-color]="bgColor()"
        [style.color]="'white'"
      >
        {{ initial() }}
      </div>
    }
  `,
  host: { class: 'inline-block shrink-0' },
})
export class BimiBadgeComponent {
  email = input.required<string>();
  name = input.required<string>();

  private readonly http = inject(HttpClient);

  logoUrl = signal<string | null>(null);
  imgError = signal(false);

  initial = computed(() => {
    const n = this.name();
    return n ? n.charAt(0).toUpperCase() : '?';
  });

  bgColor = computed(() => {
    const str = this.email();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 45%, 45%)`;
  });

  constructor() {
    effect(() => {
      const email = this.email();
      if (!email || !email.includes('@')) return;

      const domain = email.split('@')[1];
      if (!domain) return;

      // Instant cache hit
      if (bimiCache.has(domain)) {
        this.logoUrl.set(bimiCache.get(domain) ?? null);
        return;
      }

      // Deduplicate: reuse in-flight request for same domain
      this.resolveBimi(email, domain);
    });
  }

  private async resolveBimi(email: string, domain: string): Promise<void> {
    let pending = bimiPending.get(domain);
    if (!pending) {
      pending = this.fetchBimi(email, domain);
      bimiPending.set(domain, pending);
    }

    const logoUrl = await pending;
    this.logoUrl.set(logoUrl);
  }

  private async fetchBimi(email: string, domain: string): Promise<string | null> {
    try {
      const result = await firstValueFrom(
        this.http.get<{ email: string; logoUrl: string | null }>(
          `/api/v1/bimi/lookup?email=${encodeURIComponent(email)}`,
        ),
      );
      bimiCache.set(domain, result.logoUrl);
      return result.logoUrl;
    } catch {
      bimiCache.set(domain, null);
      return null;
    } finally {
      bimiPending.delete(domain);
    }
  }
}
