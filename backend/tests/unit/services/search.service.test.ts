import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../../../src/search/search.service';
import { ImapService } from '../../../src/imap/imap.service';

describe('SearchService', () => {
  let service: SearchService;
  let imapService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    imapService = {
      search: vi.fn().mockResolvedValue([]),
      listMessages: vi.fn().mockResolvedValue({ messages: [], total: 0, page: 1, pageSize: 20, mailbox: 'INBOX' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ImapService, useValue: imapService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildCriteria', () => {
    it('should build text search with OR', () => {
      const criteria = service.buildCriteria({ text: 'hello' });
      expect(criteria.or).toBeDefined();
      expect(criteria.or).toHaveLength(4);
    });

    it('should build from filter', () => {
      const criteria = service.buildCriteria({ from: 'alice@example.com' });
      expect(criteria.from).toBe('alice@example.com');
    });

    it('should build to filter', () => {
      const criteria = service.buildCriteria({ to: 'bob@example.com' });
      expect(criteria.to).toBe('bob@example.com');
    });

    it('should build subject filter', () => {
      const criteria = service.buildCriteria({ subject: 'Meeting' });
      expect(criteria.subject).toBe('Meeting');
    });

    it('should build date range', () => {
      const criteria = service.buildCriteria({
        since: '2026-01-01',
        before: '2026-03-01',
      });
      expect(criteria.since).toBeInstanceOf(Date);
      expect(criteria.before).toBeInstanceOf(Date);
    });

    it('should build flagged filter', () => {
      expect(service.buildCriteria({ flagged: true })).toHaveProperty('flagged', true);
      expect(service.buildCriteria({ flagged: false })).toHaveProperty('unflagged', true);
    });

    it('should build unseen filter', () => {
      expect(service.buildCriteria({ unseen: true })).toHaveProperty('unseen', true);
      expect(service.buildCriteria({ unseen: false })).toHaveProperty('seen', true);
    });

    it('should handle empty query', () => {
      const criteria = service.buildCriteria({});
      expect(Object.keys(criteria)).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('should return empty result when no matches', async () => {
      const result = await service.search('acc-1', { text: 'nonexistent' });
      expect(result.messages).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should default to INBOX mailbox', async () => {
      await service.search('acc-1', { text: 'test' });
      expect(imapService.search).toHaveBeenCalledWith('acc-1', 'INBOX', expect.any(Object));
    });

    it('should use specified mailbox', async () => {
      await service.search('acc-1', { text: 'test', mailbox: 'Sent' });
      expect(imapService.search).toHaveBeenCalledWith('acc-1', 'Sent', expect.any(Object));
    });
  });
});
