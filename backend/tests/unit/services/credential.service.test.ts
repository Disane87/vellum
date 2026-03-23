import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CredentialService } from '../../../src/imap/credential.service';

describe('CredentialService', () => {
  let service: CredentialService;
  const testKey = 'a'.repeat(64); // 32 bytes hex

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'CREDENTIAL_KEY') return testKey;
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get<CredentialService>(CredentialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt and decrypt a password', () => {
    const password = 'my-secret-password';
    const encrypted = service.encrypt(password);

    expect(encrypted).not.toBe(password);
    expect(encrypted).toContain(':'); // iv:authTag:encrypted format

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(password);
  });

  it('should produce different ciphertexts for the same plaintext', () => {
    const password = 'same-password';
    const encrypted1 = service.encrypt(password);
    const encrypted2 = service.encrypt(password);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should handle empty string', () => {
    const encrypted = service.encrypt('');
    expect(service.decrypt(encrypted)).toBe('');
  });

  it('should handle unicode characters', () => {
    const password = 'pässwörd-日本語-🔐';
    const encrypted = service.encrypt(password);
    expect(service.decrypt(encrypted)).toBe(password);
  });

  it('should throw on invalid encrypted data', () => {
    expect(() => service.decrypt('invalid-data')).toThrow();
  });

  it('should throw on tampered ciphertext', () => {
    const encrypted = service.encrypt('test');
    const parts = encrypted.split(':');
    parts[2] = 'tampered' + parts[2];
    expect(() => service.decrypt(parts.join(':'))).toThrow();
  });
});
