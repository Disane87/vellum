import { Injectable, inject, OnDestroy } from '@angular/core';
import { MessageState } from '../state/message.state';
import { MailboxState } from '../state/mailbox.state';
import type { WsEvent, MessageEnvelope } from '@imap-mail/shared';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;

  private readonly messageState = inject(MessageState);
  private readonly mailboxState = inject(MailboxState);

  connect(): void {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/api/v1/ws`;

    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
    };
    this.ws.onmessage = (event) => this.handleMessage(event);
    this.ws.onclose = () => this.scheduleReconnect();
    this.ws.onerror = () => this.ws?.close();
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

    switch (data.type) {
      case 'new_message':
        this.messageState.prependMessage(
          (data.payload as { envelope: MessageEnvelope }).envelope,
        );
        break;
      case 'mailbox_updated': {
        const payload = data.payload as { path: string; totalMessages: number; unseenMessages: number };
        this.mailboxState.updateMailboxCounts(payload.path, payload.totalMessages, payload.unseenMessages);
        break;
      }
      case 'message_flags_changed': {
        const flagPayload = data.payload as { uid: number; flags: string[] };
        this.messageState.updateFlags(flagPayload.uid, flagPayload.flags);
        break;
      }
    }
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
