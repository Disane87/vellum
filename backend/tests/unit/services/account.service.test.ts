import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from '../../../src/account/account.service';
import { CredentialService } from '../../../src/imap/credential.service';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('[]'),
    writeFileSync: vi.fn(),
  };
});

describe('AccountService', () => {
  let service: AccountService;
  let credentialService: { encrypt: ReturnType<typeof vi.fn>; decrypt: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    credentialService = {
      encrypt: vi.fn((v: string) => `enc:${v}`),
      decrypt: vi.fn((v: string) => v.replace('enc:', '')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: CredentialService, useValue: credentialService },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an account', async () => {
    const dto = {
      name: 'Test Account',
      email: 'user@example.com',
      imap: {
        host: 'imap.example.com',
        port: 993,
        secure: true,
        auth: { type: 'password' as const, user: 'user@example.com', pass: 'secret' },
      },
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { type: 'password' as const, user: 'user@example.com', pass: 'secret' },
      },
    };

    const result = await service.create(dto);

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test Account');
    expect(result.email).toBe('user@example.com');
    expect(result.imap.auth.pass).toBe('enc:secret');
    expect(result.smtp.auth.pass).toBe('enc:secret');
    expect(credentialService.encrypt).toHaveBeenCalledWith('secret');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should list all accounts', async () => {
    const accounts = [
      {
        id: '1',
        name: 'Account 1',
        email: 'a@b.com',
        imap: { host: 'h', port: 993, secure: true, auth: { type: 'password', user: 'u', pass: 'p' } },
        smtp: { host: 'h', port: 587, secure: false, auth: { type: 'password', user: 'u', pass: 'p' } },
        createdAt: new Date().toISOString(),
      },
    ];
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(accounts));
    vi.mocked(fs.existsSync).mockReturnValue(true);

    // Recreate service to reload data
    const module = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: CredentialService, useValue: credentialService },
      ],
    }).compile();
    const svc = module.get<AccountService>(AccountService);

    const result = await svc.findAll();
    expect(result).toHaveLength(1);
    // Passwords should be redacted in list
    expect(result[0].imap.auth.pass).toBeUndefined();
  });

  it('should find an account by id', async () => {
    const accounts = [
      {
        id: 'abc',
        name: 'Account',
        email: 'a@b.com',
        imap: { host: 'h', port: 993, secure: true, auth: { type: 'password', user: 'u', pass: 'enc:secret' } },
        smtp: { host: 'h', port: 587, secure: false, auth: { type: 'password', user: 'u', pass: 'enc:secret' } },
        createdAt: new Date().toISOString(),
      },
    ];
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(accounts));
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const module = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: CredentialService, useValue: credentialService },
      ],
    }).compile();
    const svc = module.get<AccountService>(AccountService);

    const result = await svc.findById('abc');
    expect(result.id).toBe('abc');
    // findById returns full account with encrypted pass (for internal use)
    expect(result.imap.auth.pass).toBe('enc:secret');
  });

  it('should throw NotFoundException for non-existent account', async () => {
    await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should update an account', async () => {
    const accounts = [
      {
        id: 'abc',
        name: 'Old Name',
        email: 'a@b.com',
        imap: { host: 'h', port: 993, secure: true, auth: { type: 'password', user: 'u', pass: 'enc:old' } },
        smtp: { host: 'h', port: 587, secure: false, auth: { type: 'password', user: 'u', pass: 'enc:old' } },
        createdAt: new Date().toISOString(),
      },
    ];
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(accounts));
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const module = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: CredentialService, useValue: credentialService },
      ],
    }).compile();
    const svc = module.get<AccountService>(AccountService);

    const result = await svc.update('abc', { name: 'New Name' });
    expect(result.name).toBe('New Name');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should delete an account', async () => {
    const accounts = [
      {
        id: 'abc',
        name: 'Account',
        email: 'a@b.com',
        imap: { host: 'h', port: 993, secure: true, auth: { type: 'password', user: 'u', pass: 'p' } },
        smtp: { host: 'h', port: 587, secure: false, auth: { type: 'password', user: 'u', pass: 'p' } },
        createdAt: new Date().toISOString(),
      },
    ];
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(accounts));
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const module = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: CredentialService, useValue: credentialService },
      ],
    }).compile();
    const svc = module.get<AccountService>(AccountService);

    await svc.delete('abc');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should throw when deleting non-existent account', async () => {
    await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
  });
});
