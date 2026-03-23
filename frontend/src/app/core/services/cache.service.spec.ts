import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    cache = TestBed.inject(CacheService);
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get<string>('key1')).toBe('value1');
  });

  it('should return null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should expire entries after TTL', () => {
    vi.useFakeTimers();
    cache.set('key1', 'value1', 1000);

    expect(cache.get('key1')).toBe('value1');

    vi.advanceTimersByTime(1001);
    expect(cache.get('key1')).toBeNull();

    vi.useRealTimers();
  });

  it('should invalidate a specific key', () => {
    cache.set('key1', 'value1');
    cache.invalidate('key1');
    expect(cache.get('key1')).toBeNull();
  });

  it('should invalidate by prefix', () => {
    cache.set('messages:acc1:INBOX:1', 'page1');
    cache.set('messages:acc1:INBOX:2', 'page2');
    cache.set('messages:acc1:Sent:1', 'sent1');
    cache.set('mailboxes:acc1', 'tree');

    cache.invalidateByPrefix('messages:acc1:INBOX:');

    expect(cache.get('messages:acc1:INBOX:1')).toBeNull();
    expect(cache.get('messages:acc1:INBOX:2')).toBeNull();
    expect(cache.get('messages:acc1:Sent:1')).toBe('sent1');
    expect(cache.get('mailboxes:acc1')).toBe('tree');
  });

  it('should clear all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should check if key exists with has()', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should evict oldest entry when at max capacity', () => {
    // Fill to capacity (maxEntries = 200)
    for (let i = 0; i < 200; i++) {
      cache.set(`key${i}`, `value${i}`);
    }
    expect(cache.size).toBe(200);

    // Adding one more should evict the oldest (key0)
    cache.set('key_new', 'new_value');
    expect(cache.size).toBe(200);
    expect(cache.get('key0')).toBeNull();
    expect(cache.get('key_new')).toBe('new_value');
  });

  it('should update existing key without eviction', () => {
    cache.set('key1', 'v1');
    cache.set('key1', 'v2');
    expect(cache.get('key1')).toBe('v2');
    expect(cache.size).toBe(1);
  });

  it('should handle complex objects', () => {
    const data = { messages: [{ uid: 1, subject: 'Test' }], total: 42 };
    cache.set('complex', data);
    expect(cache.get<typeof data>('complex')?.total).toBe(42);
    expect(cache.get<typeof data>('complex')?.messages[0].uid).toBe(1);
  });
});
