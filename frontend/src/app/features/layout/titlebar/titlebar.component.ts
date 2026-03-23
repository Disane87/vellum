import { Component, signal, OnInit, NgZone, inject } from '@angular/core';

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximizedChange: (callback: (maximized: boolean) => void) => void;
      openDevTools: () => void;
      platform: string;
    };
  }
}

@Component({
  selector: 'app-titlebar',
  standalone: true,
  template: `
    @if (isElectron()) {
      <div class="titlebar flex items-center h-9 bg-card border-b border-border select-none">
        <!-- macOS: traffic lights are native, just leave drag space -->
        @if (isMac()) {
          <div class="w-20 shrink-0"></div>
        }

        <!-- Drag region (fills available space) -->
        <div class="drag-region flex-1 h-full flex items-center px-3">
          <span class="text-xs font-medium text-muted-foreground tracking-wide">Vellum</span>
        </div>

        <!-- Windows/Linux: custom window controls -->
        @if (!isMac()) {
          <div class="flex items-center h-full shrink-0">
            <button
              class="window-control h-full px-3.5 hover:bg-accent/80 transition-colors inline-flex items-center"
              (click)="minimize()"
              title="Minimieren"
            >
              <svg width="10" height="1" viewBox="0 0 10 1" class="fill-foreground">
                <rect width="10" height="1" />
              </svg>
            </button>
            <button
              class="window-control h-full px-3.5 hover:bg-accent/80 transition-colors inline-flex items-center"
              (click)="maximize()"
              [title]="isMaximized() ? 'Wiederherstellen' : 'Maximieren'"
            >
              @if (isMaximized()) {
                <!-- Restore icon -->
                <svg width="10" height="10" viewBox="0 0 10 10" class="fill-none stroke-foreground" stroke-width="1">
                  <rect x="0" y="2" width="8" height="8" rx="0.5" />
                  <polyline points="2,2 2,0.5 9.5,0.5 9.5,8 8,8" />
                </svg>
              } @else {
                <!-- Maximize icon -->
                <svg width="10" height="10" viewBox="0 0 10 10" class="fill-none stroke-foreground" stroke-width="1">
                  <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
                </svg>
              }
            </button>
            <button
              class="window-control h-full px-3.5 hover:bg-destructive hover:text-white transition-colors inline-flex items-center"
              (click)="close()"
              title="Schließen"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" class="stroke-current" stroke-width="1.2">
                <line x1="0" y1="0" x2="10" y2="10" />
                <line x1="10" y1="0" x2="0" y2="10" />
              </svg>
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .drag-region {
      -webkit-app-region: drag;
      app-region: drag;
    }

    .window-control {
      -webkit-app-region: no-drag;
      app-region: no-drag;
    }

    .titlebar button {
      -webkit-app-region: no-drag;
      app-region: no-drag;
    }
  `,
})
export class TitlebarComponent implements OnInit {
  private readonly zone = inject(NgZone);

  isElectron = signal(!!window.electronAPI);
  isMac = signal(window.electronAPI?.platform === 'darwin');
  isMaximized = signal(false);

  ngOnInit(): void {
    if (!window.electronAPI) return;

    window.electronAPI.isMaximized().then((maximized) => {
      this.isMaximized.set(maximized);
    });

    window.electronAPI.onMaximizedChange((maximized) => {
      this.zone.run(() => this.isMaximized.set(maximized));
    });
  }

  minimize(): void {
    window.electronAPI?.minimize();
  }

  maximize(): void {
    window.electronAPI?.maximize();
  }

  close(): void {
    window.electronAPI?.close();
  }
}
