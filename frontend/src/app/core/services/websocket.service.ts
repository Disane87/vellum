import { Injectable, inject, OnDestroy, effect } from '@angular/core';
import { MessageState } from '../state/message.state';
import { MailboxState } from '../state/mailbox.state';
import { AccountState } from '../state/account.state';
import { CacheService } from './cache.service';
import { CacheKeys } from './cache-keys';
import type { WsEvent, MessageEnvelope } from '@vellum/shared';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private currentSubscription: { accountId: string; mailbox: string } | null = null;

  private readonly messageState = inject(MessageState);
  private readonly mailboxState = inject(MailboxState);
  private readonly accountState = inject(AccountState);
  private readonly cache = inject(CacheService);

  constructor() {
    // Auto-subscribe when active mailbox changes
    effect(() => {
      const accountId = this.accountState.activeAccountId();
      const mailbox = this.mailboxState.activeMailboxPath();
      if (accountId && mailbox && this.ws?.readyState === WebSocket.OPEN) {
        this.syncSubscription(accountId, mailbox);
      }
    });

    // Track total unread count across all mailboxes and push to Electron
    effect(() => {
      const mailboxes = this.mailboxState.mailboxes();
      const totalUnread = mailboxes.reduce((sum, m) => sum + (m.unseenMessages ?? 0), 0);
      (window as any).electronAPI?.setUnreadCount?.(totalUnread);
    });

  }

  connect(): void {
    const port = (window as any).electronAPI?.backendPort;
    const url = port
      ? `ws://localhost:${port}/api/v1/ws`
      : `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/v1/ws`;

    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      // Re-subscribe to active mailbox on reconnect
      const accountId = this.accountState.activeAccountId();
      const mailbox = this.mailboxState.activeMailboxPath();
      if (accountId && mailbox) {
        this.syncSubscription(accountId, mailbox);
      }
    };
    this.ws.onmessage = (event) => this.handleMessage(event);
    this.ws.onclose = () => this.scheduleReconnect();
    this.ws.onerror = () => this.ws?.close();
  }

  private syncSubscription(accountId: string, mailbox: string): void {
    // Unsubscribe from previous mailbox
    if (this.currentSubscription) {
      if (this.currentSubscription.accountId === accountId && this.currentSubscription.mailbox === mailbox) {
        return; // Already subscribed
      }
      this.send({
        type: 'unsubscribe_mailbox',
        payload: { accountId: this.currentSubscription.accountId, mailbox: this.currentSubscription.mailbox },
      });
    }

    // Subscribe to new mailbox
    this.send({ type: 'subscribe_mailbox', payload: { accountId, mailbox } });
    this.currentSubscription = { accountId, mailbox };
  }

  subscribeMailbox(accountId: string, mailbox: string): void {
    this.send({ type: 'subscribe_mailbox', payload: { accountId, mailbox } });
  }

  unsubscribeMailbox(accountId: string, mailbox: string): void {
    this.send({ type: 'unsubscribe_mailbox', payload: { accountId, mailbox } });
  }

  ngOnDestroy(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  private handleMessage(event: MessageEvent): void {
    const data: WsEvent = JSON.parse(event.data);
    const accountId = data.accountId || this.accountState.activeAccountId() || '';

    switch (data.type) {
      case 'new_message': {
        const envelope = (data.payload as { envelope: MessageEnvelope }).envelope;
        this.messageState.prependMessage(envelope);
        // Invalidate list cache for this mailbox — new message means stale pages
        if (data.mailbox) {
          this.cache.invalidateByPrefix(
            CacheKeys.messageListPrefix(accountId, data.mailbox),
          );
        }
        // Invalidate mailbox tree cache (unread counts changed)
        this.cache.invalidate(CacheKeys.mailboxes(accountId));

        // Send desktop notification
        this.sendDesktopNotification(envelope, accountId, data.mailbox);
        break;
      }
      case 'mailbox_updated': {
        const payload = data.payload as { path: string; totalMessages: number; unseenMessages: number };
        this.mailboxState.updateMailboxCounts(payload.path, payload.totalMessages, payload.unseenMessages);
        // Update cached mailbox tree
        this.cache.invalidate(CacheKeys.mailboxes(accountId));
        break;
      }
      case 'message_flags_changed': {
        const flagPayload = data.payload as { uid: number; flags: string[] };
        this.messageState.updateFlags(flagPayload.uid, flagPayload.flags);
        // Invalidate the full message cache for this UID
        if (data.mailbox) {
          this.cache.invalidate(
            CacheKeys.messageFull(accountId, data.mailbox, flagPayload.uid),
          );
          this.cache.invalidateByPrefix(
            CacheKeys.messageListPrefix(accountId, data.mailbox),
          );
        }
        break;
      }
      case 'message_deleted': {
        const deletePayload = data.payload as { uid: number };
        this.messageState.removeMessages([deletePayload.uid]);
        if (data.mailbox) {
          this.cache.invalidate(
            CacheKeys.messageFull(accountId, data.mailbox, deletePayload.uid),
          );
          this.cache.invalidateByPrefix(
            CacheKeys.messageListPrefix(accountId, data.mailbox),
          );
        }
        break;
      }
    }
  }

  private sendDesktopNotification(envelope: MessageEnvelope, accountId: string, mailbox?: string): void {
    const from = envelope.from?.[0];
    if (!from) return;

    const senderName = from.name || from.address;
    (window as any).electronAPI?.notify?.({
      title: senderName,
      body: envelope.subject || '(Kein Betreff)',
      accountId,
      mailbox,
    });
  }

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      this.connect();
    }, this.reconnectDelay);
  }
}
