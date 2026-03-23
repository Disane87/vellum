import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="animate-pulse" [class]="containerClass()">
      <ng-content />
    </div>
  `,
})
export class SkeletonComponent {
  containerClass = input('');
}

@Component({
  selector: 'app-skeleton-line',
  standalone: true,
  template: `
    <div class="rounded bg-muted" [style.width]="width()" [style.height]="height()"></div>
  `,
})
export class SkeletonLineComponent {
  width = input('100%');
  height = input('0.75rem');
}

@Component({
  selector: 'app-message-skeleton',
  standalone: true,
  imports: [SkeletonComponent, SkeletonLineComponent],
  template: `
    @for (i of items; track i) {
      <div class="flex items-start gap-3 border-b border-border px-4 py-3">
        <app-skeleton containerClass="shrink-0">
          <div class="h-4 w-4 rounded bg-muted"></div>
        </app-skeleton>
        <div class="flex-1 space-y-2">
          <div class="flex justify-between">
            <app-skeleton-line width="40%" height="0.75rem" />
            <app-skeleton-line width="3rem" height="0.625rem" />
          </div>
          <app-skeleton-line width="70%" height="0.75rem" />
          <app-skeleton-line width="90%" height="0.625rem" />
        </div>
      </div>
    }
  `,
})
export class MessageSkeletonComponent {
  count = input(8);
  get items() {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
