import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiState } from './core/state/ui.state';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  host: {
    '[class.dark]': 'uiState.theme() === "dark"',
  },
})
export class App implements OnInit {
  protected readonly uiState = inject(UiState);

  ngOnInit(): void {
    if (this.uiState.theme() === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }
}
