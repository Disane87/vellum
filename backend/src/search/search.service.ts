import { Injectable } from '@nestjs/common';
import { ImapService } from '../imap/imap.service';
import type { SearchQuery, SearchResult, MessageEnvelope } from '@imap-mail/shared';

@Injectable()
export class SearchService {
  constructor(private readonly imapService: ImapService) {}

  async search(accountId: string, query: SearchQuery): Promise<SearchResult> {
    const mailbox = query.mailbox || 'INBOX';
    const criteria = this.buildCriteria(query);

    const uids = await this.imapService.search(accountId, mailbox, criteria);

    // Fetch envelopes for matching UIDs
    const messages: MessageEnvelope[] = [];
    if (uids.length > 0) {
      const listResult = await this.imapService.listMessages(accountId, mailbox, 1, uids.length);
      // Filter to only matching UIDs
      for (const msg of listResult.messages) {
        if (uids.includes(msg.uid)) {
          messages.push(msg);
        }
      }
    }

    return {
      messages,
      total: messages.length,
      query,
    };
  }

  buildCriteria(query: SearchQuery): Record<string, unknown> {
    const criteria: Record<string, unknown> = {};

    if (query.text) {
      criteria.or = [
        { subject: query.text },
        { body: query.text },
        { from: query.text },
        { to: query.text },
      ];
    }

    if (query.from) criteria.from = query.from;
    if (query.to) criteria.to = query.to;
    if (query.subject) criteria.subject = query.subject;
    if (query.body) criteria.body = query.body;

    if (query.since) criteria.since = new Date(query.since);
    if (query.before) criteria.before = new Date(query.before);

    if (query.flagged === true) criteria.flagged = true;
    if (query.flagged === false) criteria.unflagged = true;

    if (query.unseen === true) criteria.unseen = true;
    if (query.unseen === false) criteria.seen = true;

    return criteria;
  }
}
