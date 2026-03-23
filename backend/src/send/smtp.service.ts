import { Injectable } from '@nestjs/common';
import { AccountService } from '../account/account.service';
import { CredentialService } from '../imap/credential.service';
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import type { ComposeMessage } from '@vellum/shared';

// Extended compose DTO with RFC fields (accepted from frontend)
interface ComposeMessageExtended extends ComposeMessage {
  priority?: 'normal' | 'high' | 'low';
  requestReadReceipt?: boolean;
}

@Injectable()
export class SmtpService {
  constructor(
    private readonly accountService: AccountService,
    private readonly credentialService: CredentialService,
  ) {}

  async testConnection(accountId: string): Promise<boolean> {
    const account = await this.accountService.findById(accountId);
    const transporter = this.createTransporter(account.smtp);

    try {
      await transporter.verify();
      return true;
    } finally {
      transporter.close();
    }
  }

  async send(dto: ComposeMessageExtended): Promise<{ messageId: string }> {
    const account = await this.accountService.findById(dto.accountId);
    const transporter = this.createTransporter(account.smtp);

    // RFC 5322: Generate proper Message-ID
    const domain = account.email.split('@')[1] || 'localhost';
    const messageId = `<${uuidv4()}@${domain}>`;

    // Build RFC-compliant headers
    const headers: Record<string, string> = {};

    // RFC 2822: Message-ID
    headers['Message-ID'] = messageId;

    // RFC 2156 / RFC 2421: X-Priority and Importance
    if (dto.priority === 'high') {
      headers['X-Priority'] = '1';
      headers['Importance'] = 'high';
      headers['X-MSMail-Priority'] = 'High';
    } else if (dto.priority === 'low') {
      headers['X-Priority'] = '5';
      headers['Importance'] = 'low';
      headers['X-MSMail-Priority'] = 'Low';
    }

    // RFC 8098: Message Disposition Notification (Read Receipt)
    if (dto.requestReadReceipt) {
      headers['Disposition-Notification-To'] = account.email;
    }

    // RFC 2076: User-Agent
    headers['User-Agent'] = 'Vellum Mail/1.0';
    headers['X-Mailer'] = 'Vellum Mail/1.0';

    try {
      const result = await transporter.sendMail({
        from: `${account.name} <${account.email}>`,
        to: this.formatAddresses(dto.to),
        cc: dto.cc ? this.formatAddresses(dto.cc) : undefined,
        bcc: dto.bcc ? this.formatAddresses(dto.bcc) : undefined,
        subject: dto.subject,
        html: dto.bodyHtml,
        text: dto.bodyText,
        messageId,
        inReplyTo: dto.inReplyTo,
        references: dto.references?.join(' '),
        headers,
        attachments: dto.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, 'base64'),
          contentType: a.contentType,
        })),
      });

      return { messageId: result.messageId };
    } finally {
      transporter.close();
    }
  }

  async saveDraft(dto: ComposeMessage): Promise<{ uid: number }> {
    // TODO: Implement IMAP APPEND to Drafts folder
    return { uid: dto.draftUid || 0 };
  }

  private formatAddresses(addresses: { name?: string; address: string }[]): string {
    return addresses
      .map((a) => (a.name ? `"${a.name}" <${a.address}>` : a.address))
      .join(', ');
  }

  private createTransporter(smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    auth: { type: string; user: string; pass?: string; accessToken?: string };
  }) {
    const auth =
      smtpConfig.auth.type === 'oauth2'
        ? {
            type: 'OAuth2' as const,
            user: smtpConfig.auth.user,
            accessToken: smtpConfig.auth.accessToken,
          }
        : {
            user: smtpConfig.auth.user,
            pass: smtpConfig.auth.pass
              ? this.credentialService.decrypt(smtpConfig.auth.pass)
              : '',
          };

    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth,
    });
  }
}
