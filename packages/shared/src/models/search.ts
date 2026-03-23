import { MessageEnvelope } from './message';

export interface SearchQuery {
  text?: string;
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  since?: string;
  before?: string;
  hasAttachment?: boolean;
  flagged?: boolean;
  unseen?: boolean;
  mailbox?: string;
}

export interface SearchResult {
  messages: MessageEnvelope[];
  total: number;
  query: SearchQuery;
}
