import { Injectable } from '@nestjs/common';
import { AccountService } from '../account/account.service';
import { CredentialService } from '../imap/credential.service';
import * as nodemailer from 'nodemailer';
import type { ComposeMessage } from '@imap-mail/shared';

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

  async send(dto: ComposeMessage): Promise<{ messageId: string }> {
    const account = await this.accountService.findById(dto.accountId);
    const transporter = this.createTransporter(account.smtp);

    try {
      const result = await transporter.sendMail({
        from: account.email,
        to: dto.to.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(', '),
        cc: dto.cc?.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(', '),
        bcc: dto.bcc?.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(', '),
        subject: dto.subject,
        html: dto.bodyHtml,
        text: dto.bodyText,
        inReplyTo: dto.inReplyTo,
        references: dto.references?.join(' '),
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
    // For now, return a placeholder
    return { uid: dto.draftUid || 0 };
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
