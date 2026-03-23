import { Component, inject } from '@angular/core';
import { NotificationService, type Toast } from '../../core/services/notification.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      @for (toast of notifications.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg min-w-[300px] max-w-[420px]"
          [class]="getToastClasses(toast)"
        >
          <app-icon [name]="getIcon(toast)" [size]="18" class="shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            @if (toast.title) {
              <div class="text-sm font-medium">{{ toast.title }}</div>
            }
            <div class="text-sm" [class.text-muted-foreground]="toast.title">{{ toast.message }}</div>
          </div>
          <button
            class="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
            (click)="notifications.dismiss(toast.id)"
          >
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly notifications = inject(NotificationService);

  getToastClasses(toast: Toast): string {
    switch (toast.type) {
      case 'success':
        return 'border-green-500/30 bg-green-500/10 text-green-300';
      case 'error':
        return 'border-destructive/30 bg-destructive/10 text-destructive';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
      default:
        return 'border-border bg-card text-foreground';
    }
  }

  getIcon(toast: Toast): string {
    switch (toast.type) {
      case 'success': return 'check-circle';
      case 'error': return 'x-circle';
      case 'warning': return 'alert-triangle';
      default: return 'info';
    }
  }
}
