import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SmtpService } from '../../../src/send/smtp.service';
import { AccountService } from '../../../src/account/account.service';
import { CredentialService } from '../../../src/imap/credential.service';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({
        messageId: '<test@mock.local>',
        accepted: ['bob@example.com'],
        rejected: [],
      }),
      verify: vi.fn().mockResolvedValue(true),
      close: vi.fn(),
    }),
  },
  createTransport: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({
      messageId: '<test@mock.local>',
      accepted: ['bob@example.com'],
      rejected: [],
    }),
    verify: vi.fn().mockResolvedValue(true),
    close: vi.fn(),
  }),
}));

describe('SmtpService', () => {
  let service: SmtpService;
  const testAccount = {
    id: 'acc-1',
    name: 'Test',
    email: 'user@example.com',
    imap: { host: 'h', port: 993, secure: true, auth: { type: 'password', user: 'u', pass: 'enc' } },
    smtp: { host: 'smtp.example.com', port: 587, secure: false, auth: { type: 'password', user: 'u', pass: 'enc' } },
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmtpService,
        { provide: AccountService, useValue: { findById: vi.fn().mockResolvedValue(testAccount) } },
        { provide: CredentialService, useValue: { decrypt: vi.fn((v: string) => v) } },
      ],
    }).compile();

    service = module.get<SmtpService>(SmtpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should test SMTP connection', async () => {
    const result = await service.testConnection('acc-1');
    expect(result).toBe(true);
  });

  it('should send an email', async () => {
    const result = await service.send({
      accountId: 'acc-1',
      to: [{ address: 'bob@example.com' }],
      subject: 'Hello',
      bodyText: 'World',
    });
    expect(result.messageId).toBeDefined();
  });

  it('should send with attachments', async () => {
    const result = await service.send({
      accountId: 'acc-1',
      to: [{ name: 'Bob', address: 'bob@example.com' }],
      cc: [{ address: 'cc@example.com' }],
      subject: 'With attachment',
      bodyHtml: '<p>Hello</p>',
      attachments: [
        {
          filename: 'test.txt',
          contentType: 'text/plain',
          content: btoa('Hello World'),
          size: 11,
        },
      ],
    });
    expect(result.messageId).toBeDefined();
  });

  it('should save a draft', async () => {
    const result = await service.saveDraft({
      accountId: 'acc-1',
      to: [{ address: 'bob@example.com' }],
      subject: 'Draft',
      bodyText: 'In progress',
    });
    expect(result.uid).toBeDefined();
  });
});
