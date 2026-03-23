import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { AccountService } from '../account/account.service';
import { ConnectionPoolService } from '../imap/connection-pool.service';
import type { WsEvent } from '@vellum/shared';

type EventCallback = (event: WsEvent) => void;

interface IdleSubscription {
  accountId: string;
  mailbox: string;
  callbacks: Set<EventCallback>;
  client: ImapFlow | null;
  active: boolean;
}

@Injectable()
export class IdleService implements OnModuleDestroy {
  private readonly logger = new Logger(IdleService.name);
  private subscriptions = new Map<string, IdleSubscription>();

  constructor(
    private readonly pool: ConnectionPoolService,
    private readonly accountService: AccountService,
  ) {}

  async subscribe(
    accountId: string,
    mailbox: string,
    callback: EventCallback,
  ): Promise<void> {
    const key = `${accountId}:${mailbox}`;
    let sub = this.subscriptions.get(key);

    if (!sub) {
      sub = { accountId, mailbox, callbacks: new Set(), client: null, active: false };
      this.subscriptions.set(key, sub);
    }

    sub.callbacks.add(callback);

    // Start IDLE if not already active
    if (!sub.active) {
      this.startIdle(key, sub).catch((err) => {
        this.logger.warn(`Failed to start IDLE for ${key}: ${err.message}`);
      });
    }
  }

  unsubscribe(accountId: string, mailbox: string): void {
    const key = `${accountId}:${mailbox}`;
    const sub = this.subscriptions.get(key);
    if (sub) {
      sub.active = false;
      if (sub.client) {
        try { sub.client.close(); } catch {}
        sub.client = null;
      }
      this.subscriptions.delete(key);
    }
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
    for (const sub of this.subscriptions.values()) {
      sub.active = false;
      if (sub.client) {
        try { sub.client.close(); } catch {}
      }
    }
    this.subscriptions.clear();
  }

  private async startIdle(key: string, sub: IdleSubscription): Promise<void> {
    sub.active = true;

    try {
      const account = await this.accountService.findById(sub.accountId);
      const client = await this.pool.acquire(sub.accountId, account.imap);
      sub.client = client;

      await client.mailboxOpen(sub.mailbox);
      this.logger.log(`IDLE started for ${key}`);

      // Listen for mailbox events — cast to EventEmitter for events
      // not typed in ImapFlow's .d.ts but emitted at runtime
      const emitter = client as any;

      emitter.on('exists', (data: { path: string; count: number; prevCount: number }) => {
        if (!sub.active) return;
        this.logger.debug(`New message(s) in ${data.path}: ${data.prevCount} → ${data.count}`);

        const event: WsEvent = {
          type: 'mailbox_updated' as any,
          accountId: sub.accountId,
          mailbox: sub.mailbox,
          payload: {
            path: sub.mailbox,
            totalMessages: data.count,
            unseenMessages: 0,
          },
          timestamp: new Date().toISOString(),
        };
        this.emit(sub.accountId, sub.mailbox, event);
      });

      emitter.on('flags', (data: { path: string; uid: number; flags: Set<string> }) => {
        if (!sub.active) return;
        const event: WsEvent = {
          type: 'message_flags_changed' as any,
          accountId: sub.accountId,
          mailbox: sub.mailbox,
          payload: {
            uid: data.uid,
            flags: Array.from(data.flags),
          },
          timestamp: new Date().toISOString(),
        };
        this.emit(sub.accountId, sub.mailbox, event);
      });

      emitter.on('expunge', (data: { path: string; seq: number }) => {
        if (!sub.active) return;
        const event: WsEvent = {
          type: 'message_deleted' as any,
          accountId: sub.accountId,
          mailbox: sub.mailbox,
          payload: { seq: data.seq },
          timestamp: new Date().toISOString(),
        };
        this.emit(sub.accountId, sub.mailbox, event);
      });

      // Keep connection alive — ImapFlow handles IDLE internally
      // when mailbox is open and no other commands are running
      client.on('close', () => {
        this.logger.debug(`IDLE connection closed for ${key}`);
        if (sub.active) {
          // Reconnect after a delay
          setTimeout(() => {
            if (sub.active) {
              sub.client = null;
              this.startIdle(key, sub).catch(() => {});
            }
          }, 5000);
        }
      });

    } catch (err) {
      this.logger.warn(`IDLE setup failed for ${key}: ${(err as Error).message}`);
      sub.client = null;
      // Retry after delay
      if (sub.active) {
        setTimeout(() => {
          if (sub.active) {
            this.startIdle(key, sub).catch(() => {});
          }
        }, 10000);
      }
    }
  }
}
