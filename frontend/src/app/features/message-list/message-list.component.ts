import { Component, OnInit, inject, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageState } from '../../core/state/message.state';
import { MailboxState } from '../../core/state/mailbox.state';
import { MessageService } from '../../core/services/message.service';
import { NotificationService } from '../../core/services/notification.service';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';
import { IconComponent } from '../../shared/components/icon.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { MessageSkeletonComponent } from '../../shared/components/skeleton.component';
import { BimiBadgeComponent } from '../../shared/components/bimi-badge.component';
import { ContextMenuComponent, type ContextMenuItem } from '../../shared/components/context-menu.component';
import { UiState } from '../../core/state/ui.state';
import { MessageFlag } from '@vellum/shared';

const MESSAGE_CONTEXT_MENU: ContextMenuItem[] = [
  { label: 'Antworten', icon: 'reply', action: 'reply' },
  { label: 'Allen antworten', icon: 'reply-all', action: 'replyAll' },
  { label: 'Weiterleiten', icon: 'forward', action: 'forward', dividerAfter: true },
  { label: 'Als ungelesen markieren', icon: 'mail', action: 'markUnread' },
  { label: 'Stern umschalten', icon: 'star', action: 'toggleStar' },
  { label: 'Archivieren', icon: 'archive', action: 'archive', dividerAfter: true },
  { label: 'Löschen', icon: 'trash', action: 'delete', danger: true },
];

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [
    RelativeTimePipe, TruncatePipe, IconComponent, EmptyStateComponent,
    MessageSkeletonComponent, BimiBadgeComponent, ContextMenuComponent,
  ],
  template: `
    <div class="flex flex-col h-full">
      <!-- Header with refresh -->
      <div class="flex items-center justify-between px-4 py-2 border-b border-border">
        <h3 class="text-sm font-medium">
          {{ mailboxState.activeMailbox()?.name || 'Nachrichten' }}
        </h3>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">{{ messageState.total() }}</span>
          <button
            class="rounded-md p-1 hover:bg-accent transition-colors text-muted-foreground"
            (click)="refresh()"
            title="Aktualisieren"
          >
            <app-icon name="rotate-cw" [size]="14" [class.animate-spin]="messageState.loading()" />
          </button>
        </div>
      </div>

      @if (messageState.loading() && messageState.messages().length === 0) {
        <app-message-skeleton [count]="10" />
      } @else if (messageState.messages().length === 0) {
        <app-empty-state icon="inbox" title="Keine Nachrichten" description="Dieser Ordner ist leer." />
      } @else {
        <div class="flex-1 overflow-y-auto">
          @for (msg of messageState.messages(); track msg.uid) {
            <div
              class="flex cursor-pointer items-start gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-accent group"
              [class.bg-accent/50]="messageState.selectedMessage()?.uid === msg.uid"
              [class.font-semibold]="!isSeen(msg.flags)"
              [draggable]="true"
              (click)="selectMessage(msg.uid)"
              (contextmenu)="onContextMenu($event, msg.uid)"
              (dragstart)="onDragStart($event, msg.uid)"
              (touchstart)="onTouchStart($event, msg.uid)"
              (touchmove)="onTouchMove($event)"
              (touchend)="onTouchEnd($event, msg.uid)"
            >
              <input
                type="checkbox"
                class="mt-1.5 shrink-0 rounded border-input"
                [checked]="messageState.selectedUids().has(msg.uid)"
                (click)="$event.stopPropagation(); messageState.toggleSelection(msg.uid)"
              />

              <app-bimi-badge
                [email]="msg.from[0]?.address || ''"
                [name]="msg.from[0]?.name || msg.from[0]?.address || '?'"
                class="mt-0.5 shrink-0"
              />

              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate text-sm">
                    {{ msg.from[0]?.name || msg.from[0]?.address || 'Unbekannt' }}
                  </span>
                  <span class="shrink-0 text-xs text-muted-foreground">
                    {{ msg.date | relativeTime }}
                  </span>
                </div>
                <div class="flex items-center gap-1 truncate text-sm">
                  @if (isFlagged(msg.flags)) {
                    <app-icon name="star" [size]="14" class="shrink-0 text-yellow-500" />
                  }
                  @if (msg.hasAttachments) {
                    <app-icon name="paperclip" [size]="14" class="shrink-0 text-muted-foreground" />
                  }
                  <span class="truncate">{{ msg.subject }}</span>
                </div>
                <div class="truncate text-xs text-muted-foreground">
                  {{ msg.preview | truncate:120 }}
                </div>
              </div>

              <!-- Swipe action indicators (mobile) -->
              <div class="swipe-action-left absolute left-0 top-0 bottom-0 flex items-center bg-green-500 px-4 text-white rounded-r-lg opacity-0 pointer-events-none">
                <app-icon name="archive" [size]="20" />
              </div>
              <div class="swipe-action-right absolute right-0 top-0 bottom-0 flex items-center bg-destructive px-4 text-white rounded-l-lg opacity-0 pointer-events-none">
                <app-icon name="trash" [size]="20" />
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (messageState.totalPages() > 1) {
          <div class="flex items-center justify-center gap-2 border-t border-border px-4 py-2">
            <button
              class="inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-accent disabled:opacity-50"
              [disabled]="messageState.page() <= 1"
              (click)="prevPage()"
            >
              <app-icon name="chevron-left" [size]="14" />
              Zurück
            </button>
            <span class="text-xs text-muted-foreground">
              {{ messageState.page() }} / {{ messageState.totalPages() }}
            </span>
            <button
              class="inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-accent disabled:opacity-50"
              [disabled]="messageState.page() >= messageState.totalPages()"
              (click)="nextPage()"
            >
              Weiter
              <app-icon name="chevron-right" [size]="14" />
            </button>
          </div>
        }
      }
    </div>

    <!-- Context Menu -->
    <app-context-menu
      #contextMenu
      [items]="contextMenuItems"
      (actionSelected)="onContextAction($event)"
    />
  `,
  styles: [`
    :host { display: block; height: 100%; position: relative; }
  `],
})
export class MessageListComponent implements OnInit {
  protected readonly messageState = inject(MessageState);
  protected readonly mailboxState = inject(MailboxState);
  private readonly uiState = inject(UiState);
  private readonly messageService = inject(MessageService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  private contextMenuRef = viewChild<ContextMenuComponent>('contextMenu');
  contextMenuItems = MESSAGE_CONTEXT_MENU;
  private contextUid: number | null = null;

  // Touch/swipe tracking
  private touchStartX = 0;
  private touchDeltaX = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const mailbox = params.get('mailbox');
      if (mailbox) {
        this.mailboxState.setActiveMailbox(mailbox);
        this.messageState.setPage(1);
        this.messageService.loadMessages();
      }
    });
  }

  selectMessage(uid: number): void {
    this.messageService.loadMessage(uid);
    // Auto-mark as read
    const msg = this.messageState.messages().find((m) => m.uid === uid);
    if (msg && !this.isSeen(msg.flags)) {
      this.messageService.setFlags([uid], [MessageFlag.Seen], 'add');
      this.messageState.updateFlags(uid, [...msg.flags, MessageFlag.Seen]);
    }
  }

  refresh(): void {
    this.messageService.loadMessages(true);
    this.notifications.info('Aktualisiert');
  }

  // --- Context Menu ---

  onContextMenu(event: MouseEvent, uid: number): void {
    this.contextUid = uid;
    this.contextMenuRef()?.open(event);
  }

  onContextAction(action: string): void {
    if (!this.contextUid) return;
    const uid = this.contextUid;

    switch (action) {
      case 'reply':
        this.messageService.loadMessage(uid).then(() => {
          this.uiState.openComposer('reply');
        }).catch(() => {});
        break;
      case 'replyAll':
        this.messageService.loadMessage(uid).then(() => {
          this.uiState.openComposer('replyAll');
        }).catch(() => {});
        break;
      case 'forward':
        this.messageService.loadMessage(uid).then(() => {
          this.uiState.openComposer('forward');
        }).catch(() => {});
        break;
      case 'markUnread':
        this.messageService.setFlags([uid], [MessageFlag.Seen], 'remove');
        break;
      case 'toggleStar':
        const msg = this.messageState.messages().find((m) => m.uid === uid);
        if (msg) {
          const isFlagged = msg.flags.includes(MessageFlag.Flagged);
          this.messageService.setFlags([uid], [MessageFlag.Flagged], isFlagged ? 'remove' : 'add');
        }
        break;
      case 'archive':
        this.messageService.moveMessages([uid], 'Archive');
        break;
      case 'delete':
        this.messageService.deleteMessages([uid]);
        break;
    }
    this.contextUid = null;
  }

  // --- Drag & Drop ---

  onDragStart(event: DragEvent, uid: number): void {
    const uids = this.messageState.selectedUids().size > 0
      ? Array.from(this.messageState.selectedUids())
      : [uid];
    event.dataTransfer?.setData('application/vellum-uids', JSON.stringify(uids));
    event.dataTransfer?.setData('text/plain', `${uids.length} message(s)`);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  // --- Touch/Swipe (Mobile) ---

  onTouchStart(event: TouchEvent, _uid: number): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchDeltaX = 0;
  }

  onTouchMove(event: TouchEvent): void {
    this.touchDeltaX = event.touches[0].clientX - this.touchStartX;
  }

  onTouchEnd(_event: TouchEvent, uid: number): void {
    if (Math.abs(this.touchDeltaX) > 100) {
      if (this.touchDeltaX > 0) {
        // Swipe right → Archive
        this.messageService.moveMessages([uid], 'Archive');
        this.notifications.success('Archiviert');
      } else {
        // Swipe left → Delete
        this.messageService.deleteMessages([uid]);
        this.notifications.success('Gelöscht');
      }
    }
    this.touchDeltaX = 0;
  }

  // --- Helpers ---

  isSeen(flags: string[]): boolean {
    return flags.includes(MessageFlag.Seen);
  }

  isFlagged(flags: string[]): boolean {
    return flags.includes(MessageFlag.Flagged);
  }

  prevPage(): void {
    this.messageState.setPage(this.messageState.page() - 1);
    this.messageService.loadMessages();
  }

  nextPage(): void {
    this.messageState.setPage(this.messageState.page() + 1);
    this.messageService.loadMessages();
  }
}
