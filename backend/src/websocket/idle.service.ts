import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { WsEvent } from '@imap-mail/shared';

type EventCallback = (event: WsEvent) => void;

interface IdleSubscription {
  accountId: string;
  mailbox: string;
  callbacks: Set<EventCallback>;
}

@Injectable()
export class IdleService implements OnModuleDestroy {
  private subscriptions = new Map<string, IdleSubscription>();

  subscribe(
    accountId: string,
    mailbox: string,
    callback: EventCallback,
  ): void {
    const key = `${accountId}:${mailbox}`;
    let sub = this.subscriptions.get(key);
    if (!sub) {
      sub = { accountId, mailbox, callbacks: new Set() };
      this.subscriptions.set(key, sub);
    }
    sub.callbacks.add(callback);
  }

  unsubscribe(accountId: string, mailbox: string): void {
    const key = `${accountId}:${mailbox}`;
    this.subscriptions.delete(key);
  }

  emit(accountId: string, mailbox: string, event: WsEvent): void {
    const key = `${accountId}:${mailbox}`;
    const sub = this.subscriptions.get(key);
    if (sub) {
      for (const cb of sub.callbacks) {
        cb(event);
      }
    }
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  onModuleDestroy(): void {
    this.subscriptions.clear();
  }
}
