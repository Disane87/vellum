import { Injectable, NotFoundException } from '@nestjs/common';
import { ImapService } from '../imap/imap.service';
import { SanitizerService } from './sanitizer.service';
import type { MessageListResponse, MessageFull, MessageFlag } from '@vellum/shared';

@Injectable()
export class MessageService {
  constructor(
    private readonly imapService: ImapService,
    private readonly sanitizerService: SanitizerService,
  ) {}

  async list(
    accountId: string,
    mailbox: string,
    page: number,
    pageSize: number,
  ): Promise<MessageListResponse> {
    return this.imapService.listMessages(accountId, mailbox, page, pageSize);
  }

  async getOne(
    accountId: string,
    mailbox: string,
    uid: number,
  ): Promise<MessageFull> {
    const message = await this.imapService.getMessage(accountId, mailbox, uid);
    if (!message) {
      throw new NotFoundException(`Message ${uid} not found in ${mailbox}`);
    }

    // Sanitize HTML body
    if (message.bodyHtml) {
      message.bodyHtml = this.sanitizerService.sanitize(message.bodyHtml);
    }

    return message;
  }

  async delete(accountId: string, mailbox: string, uid: number): Promise<void> {
    await this.imapService.deleteMessages(accountId, mailbox, [uid]);
  }

  async move(
    accountId: string,
    mailbox: string,
    uids: number[],
    destination: string,
  ): Promise<void> {
    await this.imapService.moveMessages(accountId, mailbox, uids, destination);
  }

  async copy(
    accountId: string,
    mailbox: string,
    uids: number[],
    destination: string,
  ): Promise<void> {
    await this.imapService.copyMessages(accountId, mailbox, uids, destination);
  }

  async setFlags(
    accountId: string,
    mailbox: string,
    uids: number[],
    flags: MessageFlag[],
    action: 'add' | 'remove',
  ): Promise<void> {
    await this.imapService.setFlags(accountId, mailbox, uids, flags, action);
  }
}
