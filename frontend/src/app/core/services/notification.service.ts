import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  title?: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'info', title?: string, duration = 4000): void {
    const id = crypto.randomUUID();
    const toast: Toast = { id, type, title, message };

    this.toasts.update((list) => [...list, toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string, title?: string): void {
    this.show(message, 'success', title);
  }

  error(message: string, title?: string): void {
    this.show(message, 'error', title, 6000);
  }

  warning(message: string, title?: string): void {
    this.show(message, 'warning', title);
  }

  info(message: string, title?: string): void {
    this.show(message, 'info', title);
  }

  dismiss(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
