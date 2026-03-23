import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from '../../../src/account/account.controller';
import { AccountService } from '../../../src/account/account.service';
import { ImapService } from '../../../src/imap/imap.service';
import { SmtpService } from '../../../src/send/smtp.service';

describe('AccountController', () => {
  let controller: AccountController;
  let accountService: Record<string, ReturnType<typeof vi.fn>>;
  let imapService: Record<string, ReturnType<typeof vi.fn>>;
  let smtpService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    accountService = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue({
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        imap: { host: 'h', port: 993, secure: true, auth: { type: 'password', user: 'u', pass: 'enc' } },
        smtp: { host: 'h', port: 587, secure: false, auth: { type: 'password', user: 'u', pass: 'enc' } },
        createdAt: new Date().toISOString(),
      }),
      create: vi.fn().mockResolvedValue({ id: 'new-id', name: 'New' }),
      update: vi.fn().mockResolvedValue({ id: '1', name: 'Updated' }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    imapService = {
      testConnection: vi.fn().mockResolvedValue(true),
    };

    smtpService = {
      testConnection: vi.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        { provide: AccountService, useValue: accountService },
        { provide: ImapService, useValue: imapService },
        { provide: SmtpService, useValue: smtpService },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
  });

  it('should list all accounts', async () => {
    const result = await controller.findAll();
    expect(accountService.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should get one account with redacted password', async () => {
    const result = await controller.findOne('1');
    expect(result.imap.auth.pass).toBeUndefined();
    expect(result.smtp.auth.pass).toBeUndefined();
  });

  it('should create an account', async () => {
    const dto = {
      name: 'New',
      email: 'new@test.com',
      imap: { host: 'h', port: 993, secure: true, auth: { type: 'password' as const, user: 'u', pass: 'p' } },
      smtp: { host: 'h', port: 587, secure: false, auth: { type: 'password' as const, user: 'u', pass: 'p' } },
    };
    await controller.create(dto);
    expect(accountService.create).toHaveBeenCalledWith(dto);
  });

  it('should update an account', async () => {
    await controller.update('1', { name: 'Updated' });
    expect(accountService.update).toHaveBeenCalledWith('1', { name: 'Updated' });
  });

  it('should delete an account', async () => {
    await controller.remove('1');
    expect(accountService.delete).toHaveBeenCalledWith('1');
  });

  it('should test connection successfully', async () => {
    const result = await controller.testConnection('1');
    expect(result.imap.success).toBe(true);
    expect(result.smtp.success).toBe(true);
  });

  it('should handle IMAP connection failure', async () => {
    imapService.testConnection.mockRejectedValue(new Error('Connection refused'));
    const result = await controller.testConnection('1');
    expect(result.imap.success).toBe(false);
    expect(result.imap.error).toBe('Connection refused');
    expect(result.smtp.success).toBe(true);
  });
});
