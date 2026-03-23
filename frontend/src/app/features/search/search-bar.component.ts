import { Component, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../core/services/search.service';
import { UiState } from '../../core/state/ui.state';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center pt-20">
        <div class="fixed inset-0 bg-black/50" (click)="close()"></div>
        <div class="relative z-50 w-full max-w-lg rounded-lg border border-border bg-card shadow-lg">
          <div class="flex items-center gap-2 p-3">
            <span class="text-muted-foreground">🔍</span>
            <input
              class="flex-1 bg-transparent text-sm focus:outline-none"
              [(ngModel)]="query"
              placeholder="Nachrichten suchen..."
              (keydown.enter)="search()"
              (keydown.escape)="close()"
              autofocus
            />
            <kbd class="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">ESC</kbd>
          </div>
        </div>
      </div>
    }
  `,
})
export class SearchBarComponent {
  private readonly searchService = inject(SearchService);
  private readonly uiState = inject(UiState);

  isOpen = signal(false);
  query = '';

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.isOpen.set(true);
    }
  }

  async search(): Promise<void> {
    if (this.query.trim()) {
      await this.searchService.search({ text: this.query });
      this.close();
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.query = '';
  }
}
