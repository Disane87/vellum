import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'relativeTime', standalone: true, pure: false })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) return '';

    const now = Date.now();
    const diff = now - date.getTime();

    // Future dates (clock skew) — show as "Gerade eben"
    if (diff < 0) return 'Gerade eben';

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return 'Gestern';
    if (days < 7) return `${days}d`;

    // Same year: show day + month
    const now_ = new Date();
    if (date.getFullYear() === now_.getFullYear()) {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    }

    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
