import { Injectable, signal, computed } from '@angular/core';
import type { MessageEnvelope, MessageFull } from '@vellum/shared';

@Injectable({ providedIn: 'root' })
export class MessageState {
  readonly messages = signal<MessageEnvelope[]>([]);
  readonly selectedMessage = signal<MessageFull | null>(null);
  readonly selectedUids = signal<Set<number>>(new Set());
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);

  readonly totalPages = computed(() =>
    Math.ceil(this.total() / this.pageSize()),
  );

  readonly hasSelection = computed(() => this.selectedUids().size > 0);

  setMessages(messages: MessageEnvelope[], total: number): void {
    this.messages.set(messages);
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
}
