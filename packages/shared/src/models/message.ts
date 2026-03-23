import { MessageFlag } from '../enums/message-flag';
import { SortField, SortOrder } from '../enums/sort-field';
import { Address } from './contact';
import { Attachment } from './attachment';

export type ListMode = 'paged' | 'infinite';
export type GroupBy = 'none' | 'date' | 'sender';

export interface Tag {
  id: string;
  name: string;
  color: string; // hex color
}

export interface MessageTag {
  accountId: string;
  mailbox: string;
  uid: number;
  tagId: string;
}

export interface MessageFilter {
  unseen?: boolean;
  flagged?: boolean;
  hasAttachment?: boolean;
  from?: string;
  since?: string;
  before?: string;
  tagId?: string;
}

export interface MessageListQuery {
  page?: number;
  pageSize?: number;
  sortField?: SortField;
  sortOrder?: SortOrder;
  filter?: MessageFilter;
  threaded?: boolean;
}

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

export interface Thread {
  id: string;
  subject: string;
  messages: MessageEnvelope[];
  lastDate: string;
  unreadCount: number;
  participants: string[];
}

export interface ThreadedMessageListResponse {
  threads: Thread[];
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
