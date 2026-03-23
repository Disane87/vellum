import { Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <app-icon [name]="icon()" [size]="28" class="text-muted-foreground" />
      </div>
      <h3 class="text-base font-medium mb-1">{{ title() }}</h3>
      <p class="text-sm text-muted-foreground max-w-xs">{{ description() }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  icon = input('inbox');
  title = input('Nichts hier');
  description = input('');
}
