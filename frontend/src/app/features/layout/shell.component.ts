import { Component, OnInit, inject, HostListener, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { StatusBarComponent } from './status-bar/status-bar.component';
import { MessageViewerComponent } from '../message-viewer/message-viewer.component';
import { ComposerComponent } from '../composer/composer.component';
import { SearchBarComponent } from '../search/search-bar.component';
import { ToastContainerComponent } from '../../shared/components/toast.component';
import { IconComponent } from '../../shared/components/icon.component';
import { AccountService } from '../../core/services/account.service';
import { MailboxService } from '../../core/services/mailbox.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { KeyboardService } from '../../core/services/keyboard.service';
import { TabTitleService } from '../../core/services/tab-title.service';
import { AccountState } from '../../core/state/account.state';
import { UiState } from '../../core/state/ui.state';
import { MessageState } from '../../core/state/message.state';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    ToolbarComponent,
    StatusBarComponent,
    MessageViewerComponent,
    ComposerComponent,
    SearchBarComponent,
    ToastContainerComponent,
    IconComponent,
  ],
  template: `
    <div class="flex h-screen flex-col bg-background text-foreground">
      <app-toolbar />

      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar: drawer on mobile, fixed on desktop -->
        @if (!uiState.sidebarCollapsed()) {
          @if (isMobile()) {
            <!-- Mobile: overlay sidebar -->
            <div class="fixed inset-0 z-30 bg-black/50" (click)="uiState.toggleSidebar()"></div>
            <div class="fixed inset-y-0 left-0 z-40 w-64 bg-background shadow-xl">
              <app-sidebar />
            </div>
          } @else {
            <!-- Desktop: inline sidebar -->
            <div class="w-56 shrink-0 border-r border-border h-full">
              <app-sidebar />
            </div>
          }
        }

        <div class="flex flex-1 overflow-hidden">
          <!-- Message list: full width on mobile, fixed on desktop -->
          <div
            class="border-r border-border overflow-y-auto"
            [class]="messageState.selectedMessage() && isMobile() ? 'hidden' : 'w-full md:w-[400px] md:shrink-0'"
          >
            <router-outlet />
          </div>

          <!-- Viewer: full width on mobile -->
          <div
            class="flex-1 overflow-y-auto"
            [class.hidden]="!messageState.selectedMessage() && isMobile()"
          >
            @if (messageState.selectedMessage()) {
              <!-- Mobile back button -->
              @if (isMobile()) {
                <button
                  class="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border-b border-border w-full"
                  (click)="messageState.setSelectedMessage(null)"
                >
                  <app-icon name="chevron-left" [size]="16" />
                  Zurück zur Liste
                </button>
              }
              <app-message-viewer />
            } @else if (!isMobile()) {
              <div class="flex h-full flex-col items-center justify-center text-muted-foreground">
                <app-icon name="mail-open" [size]="48" [strokeWidth]="1" class="mb-4 opacity-30" />
                <p class="text-sm">Wähle eine Nachricht aus</p>
                <div class="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs opacity-60">
                  <span><kbd class="rounded border border-border px-1 py-0.5">J</kbd>/<kbd class="rounded border border-border px-1 py-0.5">K</kbd> Navigieren</span>
                  <span><kbd class="rounded border border-border px-1 py-0.5">R</kbd> Antworten</span>
                  <span><kbd class="rounded border border-border px-1 py-0.5">Cmd+N</kbd> Neue Mail</span>
                  <span><kbd class="rounded border border-border px-1 py-0.5">Cmd+K</kbd> Suche</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <app-status-bar />
      <app-composer />
      <app-search-bar />
      <app-toast-container />
    </div>
  `,
})
export class ShellComponent implements OnInit {
  protected readonly uiState = inject(UiState);
  protected readonly messageState = inject(MessageState);
  private readonly accountState = inject(AccountState);
  private readonly accountService = inject(AccountService);
  private readonly mailboxService = inject(MailboxService);
  private readonly wsService = inject(WebSocketService);
  private readonly keyboard = inject(KeyboardService);
  private readonly tabTitle = inject(TabTitleService);

  isMobile = signal(false);

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }

  async ngOnInit(): Promise<void> {
    this.isMobile.set(window.innerWidth < 768);
    this.keyboard.enable();
    // TabTitleService runs its effect in the constructor — just inject to activate

    if (!this.accountState.hasAccounts()) {
      await this.accountService.loadAccounts();
    }
    this.mailboxService.loadMailboxes();
    this.wsService.connect();
  }
}
