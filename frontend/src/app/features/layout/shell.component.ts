import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { StatusBarComponent } from './status-bar/status-bar.component';
import { MessageViewerComponent } from '../message-viewer/message-viewer.component';
import { ComposerComponent } from '../composer/composer.component';
import { SearchBarComponent } from '../search/search-bar.component';
import { AccountService } from '../../core/services/account.service';
import { MailboxService } from '../../core/services/mailbox.service';
import { WebSocketService } from '../../core/services/websocket.service';
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
  ],
  template: `
    <div class="flex h-screen flex-col bg-background text-foreground">
      <app-toolbar />

      <div class="flex flex-1 overflow-hidden">
        @if (!uiState.sidebarCollapsed()) {
          <app-sidebar class="w-56 shrink-0 border-r border-border" />
        }

        <div class="flex flex-1 overflow-hidden">
          <div class="w-[400px] shrink-0 border-r border-border overflow-y-auto">
            <router-outlet />
          </div>

          <div class="flex-1 overflow-y-auto">
            @if (messageState.selectedMessage()) {
              <app-message-viewer />
            } @else {
              <div class="flex h-full items-center justify-center text-muted-foreground">
                <p>Wähle eine Nachricht aus</p>
              </div>
            }
          </div>
        </div>
      </div>

      <app-status-bar />
      <app-composer />
      <app-search-bar />
    </div>
  `,
})
export class ShellComponent implements OnInit {
  protected readonly uiState = inject(UiState);
  protected readonly messageState = inject(MessageState);
  private readonly accountService = inject(AccountService);
  private readonly mailboxService = inject(MailboxService);
  private readonly wsService = inject(WebSocketService);

  async ngOnInit(): Promise<void> {
    await this.accountService.loadAccounts();
    await this.mailboxService.loadMailboxes();
    this.wsService.connect();
  }
}
