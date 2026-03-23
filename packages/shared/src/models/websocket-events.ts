import { MessageEnvelope } from './message';

export enum WsEventType {
  NewMessage = 'new_message',
  MessageDeleted = 'message_deleted',
  MessageFlagsChanged = 'message_flags_changed',
  MailboxUpdated = 'mailbox_updated',
  ConnectionStatus = 'connection_status',
  Error = 'error',
}

export enum WsClientEventType {
  SubscribeMailbox = 'subscribe_mailbox',
  UnsubscribeMailbox = 'unsubscribe_mailbox',
  Ping = 'ping',
}

export interface WsEvent<T = unknown> {
  type: WsEventType;
  accountId: string;
  mailbox?: string;
  payload: T;
  timestamp: string;
}

export interface WsClientEvent<T = unknown> {
  type: WsClientEventType;
  payload: T;
}

export interface WsNewMessagePayload {
  envelope: MessageEnvelope;
}

export interface WsMessageDeletedPayload {
  uid: number;
}

export interface WsMessageFlagsChangedPayload {
  uid: number;
  flags: string[];
}

export interface WsMailboxUpdatePayload {
  path: string;
  totalMessages: number;
  unseenMessages: number;
}

export interface WsConnectionStatusPayload {
  connected: boolean;
  error?: string;
}
