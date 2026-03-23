import { Address } from './contact';

export interface ComposeMessage {
  accountId: string;
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: ComposeAttachment[];
  inReplyTo?: string;
  references?: string[];
  replyType?: 'reply' | 'replyAll' | 'forward';
  draftUid?: number;
}

export interface ComposeAttachment {
  filename: string;
  contentType: string;
  content: string; // base64
  size: number;
}
