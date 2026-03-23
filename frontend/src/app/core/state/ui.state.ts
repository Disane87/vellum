import { Injectable, signal } from '@angular/core';
import type { SearchQuery } from '@imap-mail/shared';

export type ComposerMode = 'new' | 'reply' | 'replyAll' | 'forward';

@Injectable({ providedIn: 'root' })
export class UiState {
  readonly sidebarCollapsed = signal(false);
  readonly composerOpen = signal(false);
  readonly composerMode = signal<ComposerMode>('new');
  readonly searchQuery = signal<SearchQuery | null>(null);
  readonly theme = signal<'light' | 'dark'>('dark');

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  openComposer(mode: ComposerMode = 'new'): void {
    this.composerMode.set(mode);
    this.composerOpen.set(true);
  }

  closeComposer(): void {
    this.composerOpen.set(false);
  }

  setSearchQuery(query: SearchQuery | null): void {
    this.searchQuery.set(query);
  }

  toggleTheme(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
