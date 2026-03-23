import { MessageFlag } from '../enums/message-flag';
import { Address } from './contact';
import { Attachment } from './attachment';

export interface MessageEnvelope {
  uid: number;
  seq: number;
  messageId: string;
  subject: string;
  from: Address[];
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
  replyTo?: Address[];
  date: string;
  flags: MessageFlag[];
  size: number;
  hasAttachments: boolean;
  preview: string;
  threadId?: string;
}

export interface MessageFull extends MessageEnvelope {
  bodyHtml?: string;
  bodyText?: string;
  attachments: Attachment[];
  headers: Record<string, string>;
  inReplyTo?: string;
  references?: string[];
}

export interface MessageListResponse {
  messages: MessageEnvelope[];
  total: number;
  page: number;
  pageSize: number;
  mailbox: string;
}

export interface MessageMoveDto {
  uids: number[];
  destination: string;
}

export interface MessageCopyDto {
  uids: number[];
  destination: string;
}

export interface MessageFlagDto {
  uids: number[];
  flags: MessageFlag[];
  action: 'add' | 'remove';
}
