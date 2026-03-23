import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionPoolService } from '../../../src/imap/connection-pool.service';
import { CredentialService } from '../../../src/imap/credential.service';
import { ConfigService } from '@nestjs/config';

vi.mock('imapflow', () => {
  return {
    ImapFlow: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      authenticated: true,
      usable: true,
    })),
  };
});

describe('ConnectionPoolService', () => {
  let service: ConnectionPoolService;
  let credentialService: CredentialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionPoolService,
        {
          provide: CredentialService,
          useValue: {
            decrypt: vi.fn((v: string) => v),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ConnectionPoolService>(ConnectionPoolService);
    credentialService = module.get<CredentialService>(CredentialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should acquire and release a connection', async () => {
    const config = {
      host: 'imap.example.com',
      port: 993,
      secure: true,
      auth: { type: 'password' as const, user: 'user@example.com', pass: 'secret' },
    };

    const client = await service.acquire('test-account', config);
    expect(client).toBeDefined();
    expect(client.connect).toHaveBeenCalled();

    await service.release('test-account', client);
  });

  it('should reuse connections for the same account', async () => {
    const config = {
      host: 'imap.example.com',
      port: 993,
      secure: true,
      auth: { type: 'password' as const, user: 'user@example.com', pass: 'secret' },
    };

    const client1 = await service.acquire('test-account', config);
    await service.release('test-account', client1);

    const client2 = await service.acquire('test-account', config);
    expect(client2).toBeDefined();
    await service.release('test-account', client2);
  });

  it('should destroy pool for an account', async () => {
    const config = {
      host: 'imap.example.com',
      port: 993,
      secure: true,
      auth: { type: 'password' as const, user: 'user@example.com', pass: 'secret' },
    };

    const acquired = await service.acquire('test-account', config);
    await service.release('test-account', acquired);
    await service.destroyPool('test-account');

    // Pool should be removed, next acquire creates a new one
    const client = await service.acquire('test-account', config);
    expect(client).toBeDefined();
    await service.release('test-account', client);
  });

  it('should decrypt password credentials', async () => {
    const config = {
      host: 'imap.example.com',
      port: 993,
      secure: true,
      auth: { type: 'password' as const, user: 'user@example.com', pass: 'encrypted-pass' },
    };

    await service.acquire('test-account', config);
    expect(credentialService.decrypt).toHaveBeenCalledWith('encrypted-pass');
  });
});
