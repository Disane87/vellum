import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { CacheService } from '../../core/services/cache.service';

@Component({
  selector: 'app-contact-autocomplete',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="relative">
      <input
        class="w-full bg-transparent text-sm focus:outline-none"
        [ngModel]="value()"
        (ngModelChange)="onInput($event)"
        [placeholder]="placeholder()"
        (focus)="showSuggestions.set(true)"
        (blur)="onBlur()"
        (keydown.arrowdown)="selectNext($event)"
        (keydown.arrowup)="selectPrev($event)"
        (keydown.enter)="applySuggestion($event)"
        (keydown.escape)="showSuggestions.set(false)"
      />

      @if (showSuggestions() && suggestions().length > 0) {
        <div class="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border bg-card py-1 shadow-lg">
          @for (s of suggestions(); track s; let i = $index) {
            <button
              class="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
              [class.bg-accent]="i === selectedIndex()"
              (mousedown)="pickSuggestion(s)"
            >
              <app-icon name="user" [size]="14" class="text-muted-foreground" />
              {{ s }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ContactAutocompleteComponent implements OnInit {
  placeholder = input('');
  value = signal('');
  valueChange = output<string>();

  showSuggestions = signal(false);
  suggestions = signal<string[]>([]);
  selectedIndex = signal(-1);

  private readonly cache = inject(CacheService);
  private allContacts: string[] = [];

  ngOnInit(): void {
    this.loadKnownContacts();
  }

  onInput(val: string): void {
    this.value.set(val);
    this.valueChange.emit(val);
    this.updateSuggestions(val);
  }

  onBlur(): void {
    // Delay to allow click on suggestion
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  selectNext(e: Event): void {
    e.preventDefault();
    const max = this.suggestions().length - 1;
    this.selectedIndex.update((i) => Math.min(i + 1, max));
  }

  selectPrev(e: Event): void {
    e.preventDefault();
    this.selectedIndex.update((i) => Math.max(i - 1, 0));
  }

  applySuggestion(e: Event): void {
    const idx = this.selectedIndex();
    const sugs = this.suggestions();
    if (idx >= 0 && idx < sugs.length) {
      e.preventDefault();
      this.pickSuggestion(sugs[idx]);
    }
  }

  pickSuggestion(contact: string): void {
    // Append to comma-separated list
    const current = this.value();
    const parts = current.split(',').map((s) => s.trim()).filter(Boolean);
    parts[parts.length > 0 ? parts.length - 1 : 0] = contact;
    const newValue = parts.join(', ') + ', ';
    this.value.set(newValue);
    this.valueChange.emit(newValue);
    this.showSuggestions.set(false);
    this.selectedIndex.set(-1);
  }

  private updateSuggestions(val: string): void {
    // Get the last part being typed (after last comma)
    const parts = val.split(',');
    const query = parts[parts.length - 1].trim().toLowerCase();

    if (query.length < 2) {
      this.suggestions.set([]);
      return;
    }

    const matches = this.allContacts
      .filter((c) => c.toLowerCase().includes(query))
      .slice(0, 5);
    this.suggestions.set(matches);
    this.selectedIndex.set(-1);
    this.showSuggestions.set(matches.length > 0);
  }

  private loadKnownContacts(): void {
    // Collect addresses from cached messages
    const contacts = new Set<string>();
    // This is populated from message envelopes over time
    this.allContacts = Array.from(contacts);
  }

  addKnownContact(address: string): void {
    if (!this.allContacts.includes(address)) {
      this.allContacts.push(address);
    }
  }
}
