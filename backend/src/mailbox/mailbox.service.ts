import { Injectable } from '@nestjs/common';
import { ImapService } from '../imap/imap.service';
import type { Mailbox } from '@vellum/shared';

@Injectable()
export class MailboxService {
  constructor(private readonly imapService: ImapService) {}

  async list(accountId: string): Promise<Mailbox[]> {
    return this.imapService.listMailboxes(accountId);
  }

  async getStatus(accountId: string, path: string): Promise<{ messages: number; unseen: number }> {
    return this.imapService.getMailboxStatus(accountId, path);
  }

  async getStatusBatch(
    accountId: string,
    paths: string[],
  ): Promise<Record<string, { messages: number; unseen: number }>> {
    return this.imapService.getMailboxStatusBatch(accountId, paths);
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
