import { Injectable } from '@nestjs/common';
import { ImapService } from '../imap/imap.service';
import type { Mailbox } from '@imap-mail/shared';

@Injectable()
export class MailboxService {
  constructor(private readonly imapService: ImapService) {}

  async list(accountId: string): Promise<Mailbox[]> {
    return this.imapService.listMailboxes(accountId);
  }

  async create(accountId: string, path: string): Promise<void> {
    await this.imapService.createMailbox(accountId, path);
  }

  async rename(accountId: string, oldPath: string, newPath: string): Promise<void> {
    await this.imapService.renameMailbox(accountId, oldPath, newPath);
  }

  async remove(accountId: string, path: string): Promise<void> {
    await this.imapService.deleteMailbox(accountId, path);
  }
}
