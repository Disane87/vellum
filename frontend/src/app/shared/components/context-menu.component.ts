import { Component, input, output, signal, HostListener, ElementRef, inject } from '@angular/core';
import { IconComponent } from './icon.component';

export interface ContextMenuItem {
  label: string;
  icon: string;
  action: string;
  danger?: boolean;
  dividerAfter?: boolean;
}

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (visible()) {
      <div
        class="fixed z-[200] min-w-48 rounded-lg border border-border bg-card py-1 shadow-xl"
        [style.left.px]="x()"
        [style.top.px]="y()"
      >
        @for (item of items(); track item.action) {
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-accent"
            [class.text-destructive]="item.danger"
            (click)="onAction(item.action)"
          >
            <app-icon [name]="item.icon" [size]="14" class="text-muted-foreground" />
            {{ item.label }}
          </button>
          @if (item.dividerAfter) {
            <div class="my-1 border-t border-border"></div>
          }
        }
      </div>
    }
  `,
})
export class ContextMenuComponent {
  items = input.required<ContextMenuItem[]>();
  actionSelected = output<string>();

  visible = signal(false);
  x = signal(0);
  y = signal(0);

  open(event: MouseEvent): void {
    event.preventDefault();
    this.x.set(event.clientX);
    this.y.set(event.clientY);
    this.visible.set(true);
  }

  @HostListener('document:click')
  @HostListener('document:contextmenu')
  close(): void {
    if (this.visible()) {
      this.visible.set(false);
    }
  }

  onAction(action: string): void {
    this.actionSelected.emit(action);
    this.visible.set(false);
  }
}
