import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { IdleService } from './idle.service';
import type { WsEvent, WsEventType } from '@imap-mail/shared';

interface ClientInfo {
  accountId?: string;
  subscribedMailboxes: Set<string>;
}

@WebSocketGateway({ path: '/api/v1/ws' })
export class MailGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private clients = new Map<WebSocket, ClientInfo>();

  constructor(private readonly idleService: IdleService) {}

  handleConnection(client: WebSocket): void {
    this.clients.set(client, { subscribedMailboxes: new Set() });
  }

  handleDisconnect(client: WebSocket): void {
    const info = this.clients.get(client);
    if (info?.accountId) {
      for (const mailbox of info.subscribedMailboxes) {
        this.idleService.unsubscribe(info.accountId, mailbox);
      }
    }
    this.clients.delete(client);
  }

  @SubscribeMessage('subscribe_mailbox')
  handleSubscribe(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { accountId: string; mailbox: string },
  ): void {
    const info = this.clients.get(client);
    if (info) {
      info.accountId = data.accountId;
      info.subscribedMailboxes.add(data.mailbox);
      this.idleService.subscribe(data.accountId, data.mailbox, (event) => {
        this.sendToClient(client, event);
      });
    }
  }

  @SubscribeMessage('unsubscribe_mailbox')
  handleUnsubscribe(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { accountId: string; mailbox: string },
  ): void {
    const info = this.clients.get(client);
    if (info) {
      info.subscribedMailboxes.delete(data.mailbox);
      this.idleService.unsubscribe(data.accountId, data.mailbox);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: WebSocket): void {
    this.sendToClient(client, {
      type: 'connection_status' as WsEventType,
      accountId: '',
      payload: { connected: true },
      timestamp: new Date().toISOString(),
    });
  }

  broadcast(accountId: string, mailbox: string, event: WsEvent): void {
    for (const [client, info] of this.clients) {
      if (
        info.accountId === accountId &&
        info.subscribedMailboxes.has(mailbox) &&
        client.readyState === WebSocket.OPEN
      ) {
        this.sendToClient(client, event);
      }
    }
  }

  private sendToClient(client: WebSocket, event: WsEvent): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  }
}
