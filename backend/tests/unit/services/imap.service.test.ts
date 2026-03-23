import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ImapService } from '../../../src/imap/imap.service';
import { ConnectionPoolService } from '../../../src/imap/connection-pool.service';
import { AccountService } from '../../../src/account/account.service';
import { CacheDbService } from '../../../src/cache/cache-db.service';
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
        {
          provide: CacheDbService,
          useValue: {
            getMailboxes: vi.fn().mockReturnValue(null),
            setMailboxes: vi.fn(),
            getMessageList: vi.fn().mockReturnValue(null),
            upsertMessages: vi.fn(),
            getFullMessage: vi.fn().mockReturnValue(null),
            setFullMessage: vi.fn(),
            deleteMessages: vi.fn(),
            setLastSync: vi.fn(),
            getHighestUid: vi.fn().mockReturnValue(0),
            updateMailboxCounts: vi.fn(),
            addKnownContact: vi.fn(),
          },
        },
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

      const result = await service.listMailboxes('acc-1');

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('INBOX');
      // listMailboxes no longer fetches status — counts are 0
      expect(result[0].totalMessages).toBe(0);
      expect(result[0].unseenMessages).toBe(0);
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
        source: Buffer.from(
          'From: alice@example.com\r\n' +
          'To: user@example.com\r\n' +
          'Subject: Test\r\n' +
          'Content-Type: text/plain; charset=utf-8\r\n' +
          '\r\n' +
          'Hello World, this is the email body.',
        ),
        bodyStructure: { childNodes: [] },
      });

      const result = await service.getMessage('acc-1', 'INBOX', 100);

      expect(result).toBeDefined();
      expect(result!.uid).toBe(100);
      expect(result!.subject).toBe('Test Subject');
      expect(result!.bodyText).toContain('Hello World');
      expect(result!.preview).toContain('Hello World');
    });

    it('should parse HTML email body correctly', async () => {
      const htmlMime =
        'From: alice@example.com\r\n' +
        'Subject: HTML Test\r\n' +
        'Content-Type: text/html; charset=utf-8\r\n' +
        '\r\n' +
        '<html><body><h1>Hello</h1><p>This is <b>HTML</b> content.</p></body></html>';

      mockClient.fetchOne.mockResolvedValue({
        uid: 200,
        seq: 10,
        envelope: {
          messageId: '<msg2@example.com>',
          subject: 'HTML Test',
          from: [{ address: 'alice@example.com' }],
          to: [{ address: 'user@example.com' }],
          date: new Date('2026-03-22T10:00:00Z'),
        },
        flags: new Set([]),
        size: 2048,
        source: Buffer.from(htmlMime),
        bodyStructure: {},
      });

      const result = await service.getMessage('acc-1', 'INBOX', 200);

      expect(result).toBeDefined();
      expect(result!.bodyHtml).toContain('<h1>Hello</h1>');
      expect(result!.bodyHtml).toContain('<b>HTML</b>');
    });

    it('should parse multipart email with attachments', async () => {
      const boundary = '----=_Part_123';
      const multipartMime =
        'From: alice@example.com\r\n' +
        'Subject: With Attachment\r\n' +
        `Content-Type: multipart/mixed; boundary="${boundary}"\r\n` +
        '\r\n' +
        `--${boundary}\r\n` +
        'Content-Type: text/plain; charset=utf-8\r\n' +
        '\r\n' +
        'Message with attachment.\r\n' +
        `--${boundary}\r\n` +
        'Content-Type: application/pdf; name="report.pdf"\r\n' +
        'Content-Disposition: attachment; filename="report.pdf"\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        'JVBERi0xLjQK\r\n' +
        `--${boundary}--\r\n`;

      mockClient.fetchOne.mockResolvedValue({
        uid: 300,
        seq: 5,
        envelope: {
          messageId: '<msg3@example.com>',
          subject: 'With Attachment',
          from: [{ address: 'alice@example.com' }],
          to: [{ address: 'user@example.com' }],
          date: new Date('2026-03-22T10:00:00Z'),
        },
        flags: new Set([]),
        size: 4096,
        source: Buffer.from(multipartMime),
        bodyStructure: {},
      });

      const result = await service.getMessage('acc-1', 'INBOX', 300);

      expect(result).toBeDefined();
      expect(result!.bodyText).toContain('Message with attachment');
      expect(result!.attachments).toHaveLength(1);
      expect(result!.attachments[0].filename).toBe('report.pdf');
      expect(result!.attachments[0].contentType).toBe('application/pdf');
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
        '1,2,3',
        ['\\Seen'],
        { uid: true },
      );
    });

    it('should remove flags from messages', async () => {
      await service.setFlags('acc-1', 'INBOX', [1], ['\\Flagged'], 'remove');

      expect(mockClient.messageFlagsRemove).toHaveBeenCalledWith(
        '1',
        ['\\Flagged'],
        { uid: true },
      );
    });
  });

  describe('moveMessages', () => {
    it('should move messages to destination', async () => {
      await service.moveMessages('acc-1', 'INBOX', [1, 2], 'Trash');

      expect(mockClient.messageMove).toHaveBeenCalledWith(
        '1,2',
        'Trash',
        { uid: true },
      );
    });
  });

  describe('copyMessages', () => {
    it('should copy messages to destination', async () => {
      await service.copyMessages('acc-1', 'INBOX', [1, 2], 'Archive');

      expect(mockClient.messageCopy).toHaveBeenCalledWith(
        '1,2',
        'Archive',
        { uid: true },
      );
    });
  });

  describe('deleteMessages', () => {
    it('should delete messages', async () => {
      await service.deleteMessages('acc-1', 'INBOX', [1, 2]);

      expect(mockClient.messageDelete).toHaveBeenCalledWith('1,2', { uid: true });
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
