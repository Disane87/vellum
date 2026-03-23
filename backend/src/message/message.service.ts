import { Injectable, NotFoundException } from '@nestjs/common';
import { ImapService } from '../imap/imap.service';
import { SanitizerService } from './sanitizer.service';
import { ThreadingService } from './threading.service';
import type {
  MessageListResponse,
  MessageFull,
  MessageFlag,
  ThreadedMessageListResponse,
} from '@vellum/shared';

@Injectable()
export class MessageService {
  constructor(
    private readonly imapService: ImapService,
    private readonly sanitizerService: SanitizerService,
    private readonly threadingService: ThreadingService,
  ) {}

  async list(
    accountId: string,
    mailbox: string,
    page: number,
    pageSize: number,
    threaded = false,
    fresh = false,
  ): Promise<MessageListResponse | ThreadedMessageListResponse> {
    const result = await this.imapService.listMessages(accountId, mailbox, page, pageSize, fresh);

    if (threaded) {
      const threads = this.threadingService.buildThreads(result.messages);
      return {
        threads,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        mailbox: result.mailbox,
      } as ThreadedMessageListResponse;
    }

    return result;
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
