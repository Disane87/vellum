import { Injectable, NotFoundException } from '@nestjs/common';
import { ImapService } from '../imap/imap.service';
import { simpleParser } from 'mailparser';
import { Readable } from 'stream';

export interface AttachmentDownloadResult {
  buffer: Buffer;
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
    // Fetch the full message source and parse it to extract the attachment
    // We can't use imapflow's client.download() because our attachment IDs
    // are mailparser checksums/contentIds, not MIME part numbers.
    const source = await this.imapService.getMessageSource(accountId, mailbox, uid);
    if (!source) {
      throw new NotFoundException(`Message ${uid} not found`);
    }

    const parsed = await simpleParser(source);
    if (!parsed.attachments || parsed.attachments.length === 0) {
      throw new NotFoundException(`No attachments in message ${uid}`);
    }

    // Match by contentId, checksum, or index (same logic as getMessage)
    const attachment = parsed.attachments.find((att, index) => {
      const id = att.contentId || att.checksum || String(index);
      return id === partId;
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment ${partId} not found in message ${uid}`);
    }

    return {
      buffer: attachment.content,
      contentType: attachment.contentType || 'application/octet-stream',
      filename: attachment.filename || `attachment-${partId}`,
    };
  }
}
