import { Injectable } from '@nestjs/common';
import { ImapService } from '../imap/imap.service';
import { Readable } from 'stream';

export interface AttachmentDownloadResult {
  stream: Readable;
  contentType: string;
  filename: string;
}

@Injectable()
export class AttachmentService {
  constructor(private readonly imapService: ImapService) {}

  async download(
    accountId: string,
    mailbox: string,
    uid: number,
    partId: string,
  ): Promise<AttachmentDownloadResult> {
    // Get full message to find attachment metadata
    const message = await this.imapService.getMessage(accountId, mailbox, uid);
    if (!message) {
      throw new Error(`Message ${uid} not found`);
    }

    const attachment = message.attachments.find((a) => a.id === partId);
    const contentType = attachment?.contentType || 'application/octet-stream';
    const filename = attachment?.filename || `attachment-${partId}`;

    // Use the IMAP download stream
    const downloadResult = await this.imapService.downloadAttachment(
      accountId,
      mailbox,
      uid,
      partId,
    );

    return {
      stream: downloadResult.content,
      contentType,
      filename,
    };
  }
}
