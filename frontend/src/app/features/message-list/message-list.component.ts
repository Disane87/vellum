import { Component, OnInit, OnDestroy, inject, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageState } from '../../core/state/message.state';
import { MailboxState } from '../../core/state/mailbox.state';
import { MessageService } from '../../core/services/message.service';
import { NotificationService } from '../../core/services/notification.service';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';
import { IconComponent } from '../../shared/components/icon.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { BimiBadgeComponent } from '../../shared/components/bimi-badge.component';
import { ContextMenuComponent, type ContextMenuItem } from '../../shared/components/context-menu.component';
import { UiState } from '../../core/state/ui.state';
import { SortField, MessageFlag } from '@vellum/shared';

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
    BimiBadgeComponent, ContextMenuComponent,
  ],
  template: `
    <div class="flex flex-col h-full">
      <!-- Header with mailbox name + refresh -->
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

      <!-- Filter & Sort Bar -->
      <div class="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-card/50 flex-wrap">
        <!-- Filters -->
        <button
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border"
          [class]="messageState.filter().unseen ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'"
          (click)="messageState.toggleFilter('unseen')"
          title="Ungelesen"
        >
          <app-icon name="mail" [size]="14" />
          Ungelesen
        </button>
        <button
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border"
          [class]="messageState.filter().flagged ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'"
          (click)="messageState.toggleFilter('flagged')"
          title="Markiert"
        >
          <app-icon name="star" [size]="14" />
          Markiert
        </button>
        <button
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border"
          [class]="messageState.filter().hasAttachment ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'"
          (click)="messageState.toggleFilter('hasAttachment')"
          title="Mit Anhang"
        >
          <app-icon name="paperclip" [size]="14" />
          Anhang
        </button>

        @if (messageState.activeFilterCount() > 0) {
          <button
            class="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-border"
            (click)="messageState.clearFilters()"
            title="Filter zurücksetzen"
          >
            <app-icon name="x" [size]="14" />
          </button>
        }

        <div class="flex-1"></div>

        <!-- Thread toggle -->
        <button
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border"
          [class]="messageState.threaded() ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'"
          (click)="toggleThreaded()"
          title="Konversationen gruppieren"
        >
          <app-icon name="messages-square" [size]="14" />
          Threads
        </button>

        <!-- Sort dropdown -->
        <div class="relative">
          <button
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-border"
            (click)="sortMenuOpen = !sortMenuOpen"
            title="Sortierung"
          >
            <app-icon name="arrow-up-down" [size]="14" />
            {{ sortLabel() }}
          </button>
          @if (sortMenuOpen) {
            <div class="absolute right-0 top-full mt-1 z-20 w-40 rounded-md border border-border bg-popover py-1 shadow-lg">
              @for (opt of sortOptions; track opt.field) {
                <button
                  class="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                  [class.text-primary]="messageState.sortField() === opt.field"
                  (click)="setSort(opt.field)"
                >
                  <app-icon [name]="opt.icon" [size]="14" class="shrink-0" />
                  {{ opt.label }}
                  @if (messageState.sortField() === opt.field) {
                    <app-icon
                      [name]="messageState.sortOrder() === 'asc' ? 'arrow-up' : 'arrow-down'"
                      [size]="12"
                      class="ml-auto"
                    />
                  }
                </button>
              }
              <div class="border-t border-border my-1"></div>
              <button
                class="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                [class.text-primary]="messageState.listMode() === 'infinite'"
                (click)="toggleListMode()"
              >
                <app-icon [name]="messageState.listMode() === 'infinite' ? 'check' : 'square'" [size]="12" />
                Infinite Scroll
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Message List -->
      @if (messageState.loading() && messageState.messages().length === 0) {
        <div class="flex items-center justify-center py-12">
          <div class="flex gap-1">
            <span class="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]"></span>
            <span class="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></span>
            <span class="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></span>
          </div>
        </div>
      } @else if (messageState.displayMessages().length === 0) {
        <app-empty-state
          icon="inbox"
          [title]="messageState.activeFilterCount() > 0 ? 'Keine Treffer' : 'Keine Nachrichten'"
          [description]="messageState.activeFilterCount() > 0 ? 'Versuche andere Filter.' : 'Dieser Ordner ist leer.'"
        />
      } @else {
        <div #scrollContainer class="flex-1 overflow-y-auto" (scroll)="onScroll()">
          @if (messageState.threaded() && messageState.threads().length > 0) {
            <!-- Threaded view -->
            @for (thread of messageState.threads(); track thread.id) {
              <div class="border-b border-border">
                <div
                  class="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-accent"
                  (click)="selectMessage(thread.messages[thread.messages.length - 1].uid)"
                >
                  <app-bimi-badge
                    [email]="thread.messages[0].from[0]?.address || ''"
                    [name]="thread.messages[0].from[0]?.name || thread.messages[0].from[0]?.address || '?'"
                    class="mt-0.5 shrink-0"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2 truncate">
                        <span class="truncate text-sm" [class.font-semibold]="thread.unreadCount > 0">
                          {{ thread.participants.length > 1 ? thread.participants.length + ' Teilnehmer' : (thread.messages[0].from[0]?.name || thread.messages[0].from[0]?.address || 'Unbekannt') }}
                        </span>
                        @if (thread.messages.length > 1) {
                          <span class="inline-flex items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground shrink-0">
                            {{ thread.messages.length }}
                          </span>
                        }
                      </div>
                      <span class="shrink-0 text-xs text-muted-foreground">
                        {{ thread.lastDate | relativeTime }}
                      </span>
                    </div>
                    <div class="flex items-center gap-1 truncate text-sm">
                      @if (thread.unreadCount > 0) {
                        <span class="h-2 w-2 rounded-full bg-primary shrink-0"></span>
                      }
                      <span class="truncate" [class.font-semibold]="thread.unreadCount > 0">{{ thread.subject }}</span>
                    </div>
                    <div class="truncate text-xs text-muted-foreground">
                      {{ thread.messages[thread.messages.length - 1].preview | truncate:120 }}
                    </div>
                  </div>
                </div>
              </div>
            }
          } @else {
            <!-- Grouped flat message list -->
            @for (group of messageState.groupedMessages(); track group.label) {
              <!-- Group header -->
              @if (group.label) {
                <div class="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-1.5">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{{ group.label }}</span>
                </div>
              }

              @for (msg of group.messages; track msg.uid) {
                <div
                  class="flex cursor-pointer items-start gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-accent group relative"
                  [class.bg-accent/50]="messageState.selectedMessage()?.uid === msg.uid"
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

                  <div class="min-w-0 flex-1" [class.opacity-60]="isSeen(msg.flags)">
                    <div class="flex items-center justify-between gap-2">
                      <span class="truncate text-sm" [class.font-semibold]="!isSeen(msg.flags)">
                        {{ msg.from[0]?.name || msg.from[0]?.address || 'Unbekannt' }}
                      </span>
                      <span class="shrink-0 text-xs text-muted-foreground">
                        {{ msg.date | relativeTime }}
                      </span>
                    </div>
                    <div class="flex items-center gap-1 truncate text-sm">
                      @if (!isSeen(msg.flags)) {
                        <span class="h-2 w-2 rounded-full bg-primary shrink-0"></span>
                      }
                      @if (isFlagged(msg.flags)) {
                        <app-icon name="star" [size]="14" class="shrink-0 text-yellow-500" />
                      }
                      @if (msg.hasAttachments) {
                        <app-icon name="paperclip" [size]="14" class="shrink-0 text-muted-foreground" />
                      }
                      <span class="truncate" [class.font-semibold]="!isSeen(msg.flags)">{{ msg.subject }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span class="truncate text-xs text-muted-foreground flex-1">
                        {{ msg.preview | truncate:120 }}
                      </span>
                      <!-- Tags -->
                      @for (tagId of getMessageTagIds(msg.uid); track tagId) {
                        <span
                          class="inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                          [style.background-color]="getTagColor(tagId)"
                        >{{ getTagName(tagId) }}</span>
                      }
                    </div>
                  </div>
                </div>
              }
            }
          }

          <!-- Loading more indicator (infinite scroll) -->
          @if (messageState.loadingMore()) {
            <div class="flex items-center justify-center py-4">
              <app-icon name="loader-2" [size]="20" class="animate-spin text-muted-foreground" />
            </div>
          }

          <!-- End of list indicator -->
          @if (!messageState.hasMore() && messageState.messages().length > 0 && messageState.listMode() === 'infinite') {
            <div class="py-3 text-center text-xs text-muted-foreground">
              Alle {{ messageState.total() }} Nachrichten geladen
            </div>
          }
        </div>

        <!-- Pagination (only in paged mode) -->
        @if (messageState.listMode() === 'paged' && messageState.totalPages() > 1) {
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
export class MessageListComponent implements OnInit, OnDestroy {
  protected readonly messageState = inject(MessageState);
  protected readonly mailboxState = inject(MailboxState);
  private readonly uiState = inject(UiState);
  private readonly messageService = inject(MessageService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  private scrollContainer = viewChild<ElementRef>('scrollContainer');
  private contextMenuRef = viewChild<ContextMenuComponent>('contextMenu');
  contextMenuItems = MESSAGE_CONTEXT_MENU;
  private contextUid: number | null = null;
  sortMenuOpen = false;

  sortOptions = [
    { field: SortField.Date, label: 'Datum', icon: 'calendar' },
    { field: SortField.From, label: 'Absender', icon: 'user' },
    { field: SortField.Subject, label: 'Betreff', icon: 'text' },
    { field: SortField.Size, label: 'Größe', icon: 'hard-drive' },
  ];

  // Touch/swipe tracking
  private touchStartX = 0;
  private touchDeltaX = 0;

  // Click-outside handler for sort menu
  private outsideClickHandler = (event: MouseEvent) => {
    if (this.sortMenuOpen) {
      this.sortMenuOpen = false;
    }
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const mailbox = params.get('mailbox');
      if (mailbox) {
        this.mailboxState.setActiveMailbox(mailbox);
        this.messageState.reset();
        this.messageService.loadMessages();
      }
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.outsideClickHandler);
  }

  sortLabel(): string {
    const opt = this.sortOptions.find((o) => o.field === this.messageState.sortField());
    return opt?.label || 'Datum';
  }

  setSort(field: SortField): void {
    this.messageState.setSortField(field);
    this.sortMenuOpen = false;
  }

  toggleThreaded(): void {
    const next = !this.messageState.threaded();
    this.messageState.setThreaded(next);
    this.messageState.reset();
    this.messageService.loadMessages();
  }

  toggleListMode(): void {
    const next = this.messageState.listMode() === 'infinite' ? 'paged' : 'infinite';
    this.messageState.setListMode(next as any);
    this.sortMenuOpen = false;
    if (next === 'paged') {
      // Reset to page 1
      this.messageState.reset();
      this.messageService.loadMessages();
    }
  }

  // --- Infinite scroll ---

  onScroll(): void {
    if (this.messageState.listMode() !== 'infinite') return;

    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;

    const threshold = 200;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    if (nearBottom && this.messageState.hasMore() && !this.messageState.loadingMore()) {
      this.messageService.loadMoreMessages();
    }
  }

  // --- Actions ---

  selectMessage(uid: number): void {
    this.messageService.loadMessage(uid);
    const msg = this.messageState.messages().find((m) => m.uid === uid);
    if (msg && !this.isSeen(msg.flags)) {
      this.messageService.setFlags([uid], [MessageFlag.Seen], 'add');
      this.messageState.updateFlags(uid, [...msg.flags, MessageFlag.Seen]);
    }
  }

  refresh(): void {
    this.messageState.reset();
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
      case 'toggleStar': {
        const msg = this.messageState.messages().find((m) => m.uid === uid);
        if (msg) {
          const flagged = msg.flags.includes(MessageFlag.Flagged);
          this.messageService.setFlags([uid], [MessageFlag.Flagged], flagged ? 'remove' : 'add');
        }
        break;
      }
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

  // --- Touch/Swipe ---

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
        this.messageService.moveMessages([uid], 'Archive');
        this.notifications.success('Archiviert');
      } else {
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

  getMessageTagIds(uid: number): string[] {
    return this.messageState.messageTags()[uid] || [];
  }

  getTagColor(tagId: string): string {
    return this.messageState.tags().find((t) => t.id === tagId)?.color || '#6366f1';
  }

  getTagName(tagId: string): string {
    return this.messageState.tags().find((t) => t.id === tagId)?.name || '';
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
