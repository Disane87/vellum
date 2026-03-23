import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ImapService } from '../../../src/imap/imap.service';
import { ConnectionPoolService } from '../../../src/imap/connection-pool.service';
import { AccountService } from '../../../src/account/account.service';
import { createMockImapFlow } from '../../mocks/imap-flow.mock';

describe('ImapService', () => {
  let service: ImapService;
  let poolService: { acquire: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> };
  let accountService: { findById: ReturnType<typeof vi.fn> };
  let mockClient: ReturnType<typeof createMockImapFlow>;

  const testAccount = {
    id: 'acc-1',
    name: 'Test Account',
    email: 'user@example.com',
    imap: {
      host: 'imap.example.com',
      port: 993,
      secure: true,
      auth: { type: 'password' as const, user: 'user@example.com', pass: 'enc-pass' },
    },
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { type: 'password' as const, user: 'user@example.com', pass: 'enc-pass' },
    },
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockClient = createMockImapFlow();

    poolService = {
      acquire: vi.fn().mockResolvedValue(mockClient),
      release: vi.fn().mockResolvedValue(undefined),
    };

    accountService = {
      findById: vi.fn().mockResolvedValue(testAccount),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImapService,
        { provide: ConnectionPoolService, useValue: poolService },
        { provide: AccountService, useValue: accountService },
      ],
    }).compile();

    service = module.get<ImapService>(ImapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listMailboxes', () => {
    it('should list mailboxes from IMAP server', async () => {
      mockClient.list.mockResolvedValue([
        {
          path: 'INBOX',
          name: 'INBOX',
          delimiter: '/',
          flags: new Set(['\\HasNoChildren']),
          specialUse: '\\Inbox',
          listed: true,
          subscribed: true,
        },
        {
          path: 'Sent',
          name: 'Sent',
          delimiter: '/',
          flags: new Set([]),
          specialUse: '\\Sent',
          listed: true,
          subscribed: true,
        },
      ]);

      mockClient.status.mockResolvedValue({ messages: 42, unseen: 5 });

      const result = await service.listMailboxes('acc-1');

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('INBOX');
      expect(result[0].totalMessages).toBe(42);
      expect(result[0].unseenMessages).toBe(5);
      expect(poolService.acquire).toHaveBeenCalled();
      expect(poolService.release).toHaveBeenCalled();
    });
  });

  describe('listMessages', () => {
    it('should list messages with pagination', async () => {
      mockClient.mailboxOpen.mockResolvedValue({ exists: 25, path: 'INBOX' });

      const messages = [
        {
          uid: 100,
          seq: 25,
          envelope: {
            messageId: '<msg1@example.com>',
            subject: 'Test Subject',
            from: [{ name: 'Alice', address: 'alice@example.com' }],
            to: [{ address: 'user@example.com' }],
            date: new Date('2026-03-22T10:00:00Z'),
          },
          flags: new Set(['\\Seen']),
          size: 1024,
          bodyStructure: {},
        },
      ];

      mockClient.fetch.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const msg of messages) {
            yield msg;
          }
        },
      });

      const result = await service.listMessages('acc-1', 'INBOX', 1, 20);

      expect(result.total).toBe(25);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].subject).toBe('Test Subject');
      expect(result.messages[0].uid).toBe(100);
      expect(result.page).toBe(1);
    });
  });

  describe('getMessage', () => {
    it('should get a single full message', async () => {
      mockClient.fetchOne.mockResolvedValue({
        uid: 100,
        seq: 25,
        envelope: {
          messageId: '<msg1@example.com>',
          subject: 'Test Subject',
          from: [{ name: 'Alice', address: 'alice@example.com' }],
          to: [{ address: 'user@example.com' }],
          date: new Date('2026-03-22T10:00:00Z'),
          inReplyTo: undefined,
        },
        flags: new Set(['\\Seen']),
        size: 1024,
        source: Buffer.from('From: alice@example.com\r\nSubject: Test\r\n\r\nHello World'),
        bodyStructure: { childNodes: [] },
      });

      const result = await service.getMessage('acc-1', 'INBOX', 100);

      expect(result).toBeDefined();
      expect(result!.uid).toBe(100);
      expect(result!.subject).toBe('Test Subject');
    });

    it('should return null for non-existent message', async () => {
      mockClient.fetchOne.mockResolvedValue(null);

      const result = await service.getMessage('acc-1', 'INBOX', 999);
      expect(result).toBeNull();
    });
  });

  describe('setFlags', () => {
    it('should add flags to messages', async () => {
      await service.setFlags('acc-1', 'INBOX', [1, 2, 3], ['\\Seen'], 'add');

      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(
        { uid: [1, 2, 3] },
        ['\\Seen'],
      );
    });

    it('should remove flags from messages', async () => {
      await service.setFlags('acc-1', 'INBOX', [1], ['\\Flagged'], 'remove');

      expect(mockClient.messageFlagsRemove).toHaveBeenCalledWith(
        { uid: [1] },
        ['\\Flagged'],
      );
    });
  });

  describe('moveMessages', () => {
    it('should move messages to destination', async () => {
      await service.moveMessages('acc-1', 'INBOX', [1, 2], 'Trash');

      expect(mockClient.messageMove).toHaveBeenCalledWith(
        { uid: [1, 2] },
        'Trash',
      );
    });
  });

  describe('copyMessages', () => {
    it('should copy messages to destination', async () => {
      await service.copyMessages('acc-1', 'INBOX', [1, 2], 'Archive');

      expect(mockClient.messageCopy).toHaveBeenCalledWith(
        { uid: [1, 2] },
        'Archive',
      );
    });
  });

  describe('deleteMessages', () => {
    it('should delete messages', async () => {
      await service.deleteMessages('acc-1', 'INBOX', [1, 2]);

      expect(mockClient.messageDelete).toHaveBeenCalledWith({ uid: [1, 2] });
    });
  });

  describe('createMailbox', () => {
    it('should create a mailbox', async () => {
      await service.createMailbox('acc-1', 'NewFolder');

      expect(mockClient.mailboxCreate).toHaveBeenCalledWith('NewFolder');
    });
  });

  describe('deleteMailbox', () => {
    it('should delete a mailbox', async () => {
      await service.deleteMailbox('acc-1', 'OldFolder');

      expect(mockClient.mailboxDelete).toHaveBeenCalledWith('OldFolder');
    });
  });

  describe('renameMailbox', () => {
    it('should rename a mailbox', async () => {
      await service.renameMailbox('acc-1', 'OldName', 'NewName');

      expect(mockClient.mailboxRename).toHaveBeenCalledWith('OldName', 'NewName');
    });
  });

  describe('connection management', () => {
    it('should always release connections even on error', async () => {
      mockClient.list.mockRejectedValue(new Error('Network error'));

      await expect(service.listMailboxes('acc-1')).rejects.toThrow('Network error');
      expect(poolService.release).toHaveBeenCalled();
    });
  });
});
