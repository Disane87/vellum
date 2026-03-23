import { Injectable, signal, computed } from '@angular/core';
import type { MessageEnvelope, MessageFull, MessageFilter, Thread, ListMode, GroupBy, Tag } from '@vellum/shared';
import { SortField, SortOrder, MessageFlag } from '@vellum/shared';

export interface MessageGroup {
  label: string;
  messages: MessageEnvelope[];
}

@Injectable({ providedIn: 'root' })
export class MessageState {
  // --- Raw data from API ---
  readonly messages = signal<MessageEnvelope[]>([]);
  readonly selectedMessage = signal<MessageFull | null>(null);
  readonly selectedUids = signal<Set<number>>(new Set());
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);

  // --- Client-side sort/filter ---
  readonly sortField = signal<SortField>(SortField.Date);
  readonly sortOrder = signal<SortOrder>(SortOrder.Desc);
  readonly filter = signal<MessageFilter>({});
  readonly threaded = signal(false);
  readonly threads = signal<Thread[]>([]);

  // --- List mode & grouping ---
  readonly listMode = signal<ListMode>('infinite');
  readonly groupBy = signal<GroupBy>('date');

  // --- Tags ---
  readonly tags = signal<Tag[]>([]);
  readonly messageTags = signal<Record<number, string[]>>({});

  // --- Derived ---
  readonly totalPages = computed(() =>
    Math.ceil(this.total() / this.pageSize()),
  );

  readonly hasSelection = computed(() => this.selectedUids().size > 0 || this.selectedMessage() !== null);

  readonly hasMore = computed(() =>
    this.messages().length < this.total(),
  );

  /** Messages after client-side filter + sort */
  readonly displayMessages = computed(() => {
    let msgs = [...this.messages()];
    const f = this.filter();

    // Apply client-side filters
    if (f.unseen) {
      msgs = msgs.filter((m) => !m.flags.includes(MessageFlag.Seen));
    }
    if (f.flagged) {
      msgs = msgs.filter((m) => m.flags.includes(MessageFlag.Flagged));
    }
    if (f.hasAttachment) {
      msgs = msgs.filter((m) => m.hasAttachments);
    }
    if (f.from) {
      const term = f.from.toLowerCase();
      msgs = msgs.filter((m) =>
        m.from.some((a) =>
          a.address?.toLowerCase().includes(term) || a.name?.toLowerCase().includes(term),
        ),
      );
    }
    if (f.tagId) {
      const mt = this.messageTags();
      msgs = msgs.filter((m) => mt[m.uid]?.includes(f.tagId!));
    }

    // Sort
    const field = this.sortField();
    const order = this.sortOrder() === SortOrder.Asc ? 1 : -1;

    msgs.sort((a, b) => {
      switch (field) {
        case SortField.Date:
          return order * (new Date(a.date).getTime() - new Date(b.date).getTime());
        case SortField.From:
          return order * (a.from[0]?.name || a.from[0]?.address || '').localeCompare(b.from[0]?.name || b.from[0]?.address || '');
        case SortField.Subject:
          return order * a.subject.localeCompare(b.subject);
        case SortField.Size:
          return order * (a.size - b.size);
        default:
          return 0;
      }
    });

    return msgs;
  });

  /** Messages grouped by date or sender */
  readonly groupedMessages = computed((): MessageGroup[] => {
    const msgs = this.displayMessages();
    const grouping = this.groupBy();

    if (grouping === 'none') {
      return [{ label: '', messages: msgs }];
    }

    const groups = new Map<string, MessageEnvelope[]>();

    for (const msg of msgs) {
      const key = grouping === 'date'
        ? this.getDateGroup(msg.date)
        : (msg.from[0]?.name || msg.from[0]?.address || 'Unbekannt');

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(msg);
    }

    return Array.from(groups.entries()).map(([label, messages]) => ({ label, messages }));
  });

  /** Active filter count for badge display */
  readonly activeFilterCount = computed(() => {
    const f = this.filter();
    let count = 0;
    if (f.unseen) count++;
    if (f.flagged) count++;
    if (f.hasAttachment) count++;
    if (f.from) count++;
    if (f.tagId) count++;
    return count;
  });

  // --- Mutations ---

  setMessages(messages: MessageEnvelope[], total: number): void {
    this.messages.set(messages);
    this.total.set(total);
  }

  appendMessages(messages: MessageEnvelope[], total: number): void {
    this.messages.update((prev) => {
      const existingUids = new Set(prev.map((m) => m.uid));
      const newMsgs = messages.filter((m) => !existingUids.has(m.uid));
      return [...prev, ...newMsgs];
    });
    this.total.set(total);
  }

  setSelectedMessage(message: MessageFull | null): void {
    this.selectedMessage.set(message);
  }

  toggleSelection(uid: number): void {
    this.selectedUids.update((set) => {
      const next = new Set(set);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }

  selectAll(): void {
    const uids = new Set(this.messages().map((m) => m.uid));
    this.selectedUids.set(uids);
  }

  clearSelection(): void {
    this.selectedUids.set(new Set());
  }

  setPage(page: number): void {
    this.page.set(page);
  }

  removeMessages(uids: number[]): void {
    const uidSet = new Set(uids);
    this.messages.update((list) => list.filter((m) => !uidSet.has(m.uid)));
    this.total.update((t) => Math.max(0, t - uids.length));
  }

  updateFlags(uid: number, flags: string[]): void {
    this.messages.update((list) =>
      list.map((m) => (m.uid === uid ? { ...m, flags: flags as MessageEnvelope['flags'] } : m)),
    );
  }

  prependMessage(message: MessageEnvelope): void {
    this.messages.update((list) => [message, ...list]);
    this.total.update((t) => t + 1);
  }

  setFilter(filter: MessageFilter): void {
    this.filter.set(filter);
  }

  toggleFilter(key: keyof Pick<MessageFilter, 'unseen' | 'flagged' | 'hasAttachment'>): void {
    this.filter.update((f) => ({ ...f, [key]: !f[key] }));
  }

  clearFilters(): void {
    this.filter.set({});
  }

  setSortField(field: SortField): void {
    if (this.sortField() === field) {
      // Toggle order
      this.sortOrder.update((o) => o === SortOrder.Asc ? SortOrder.Desc : SortOrder.Asc);
    } else {
      this.sortField.set(field);
      this.sortOrder.set(SortOrder.Desc);
    }
  }

  setThreaded(threaded: boolean): void {
    this.threaded.set(threaded);
  }

  setListMode(mode: ListMode): void {
    this.listMode.set(mode);
  }

  setGroupBy(groupBy: GroupBy): void {
    this.groupBy.set(groupBy);
  }

  setTags(tags: Tag[]): void {
    this.tags.set(tags);
  }

  setMessageTags(messageTags: Record<number, string[]>): void {
    this.messageTags.set(messageTags);
  }

  updateMessageTag(uid: number, tagId: string, action: 'add' | 'remove'): void {
    this.messageTags.update((mt) => {
      const copy = { ...mt };
      const current = copy[uid] || [];
      copy[uid] = action === 'add'
        ? [...current, tagId]
        : current.filter((t) => t !== tagId);
      return copy;
    });
  }

  reset(): void {
    this.messages.set([]);
    this.total.set(0);
    this.page.set(1);
    this.selectedMessage.set(null);
    this.selectedUids.set(new Set());
    this.threads.set([]);
    this.messageTags.set({});
  }

  private getDateGroup(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86_400_000);
    const weekAgo = new Date(today.getTime() - 7 * 86_400_000);
    const monthAgo = new Date(today.getTime() - 30 * 86_400_000);

    if (date >= today) return 'Heute';
    if (date >= yesterday) return 'Gestern';
    if (date >= weekAgo) return 'Diese Woche';
    if (date >= monthAgo) return 'Diesen Monat';
    return 'Älter';
  }
}
