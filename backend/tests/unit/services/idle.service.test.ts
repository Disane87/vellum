import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdleService } from '../../../src/websocket/idle.service';
import type { WsEvent, WsEventType } from '@imap-mail/shared';

describe('IdleService', () => {
  let service: IdleService;

  beforeEach(() => {
    service = new IdleService();
  });

  it('should subscribe to mailbox events', () => {
    const cb = vi.fn();
    service.subscribe('acc-1', 'INBOX', cb);
    expect(service.getSubscriptionCount()).toBe(1);
  });

  it('should emit events to subscribers', () => {
    const cb = vi.fn();
    service.subscribe('acc-1', 'INBOX', cb);

    const event: WsEvent = {
      type: 'new_message' as WsEventType,
      accountId: 'acc-1',
      mailbox: 'INBOX',
      payload: {},
      timestamp: new Date().toISOString(),
    };

    service.emit('acc-1', 'INBOX', event);
    expect(cb).toHaveBeenCalledWith(event);
  });

  it('should not emit to unsubscribed mailboxes', () => {
    const cb = vi.fn();
    service.subscribe('acc-1', 'INBOX', cb);

    const event: WsEvent = {
      type: 'new_message' as WsEventType,
      accountId: 'acc-1',
      mailbox: 'Sent',
      payload: {},
      timestamp: new Date().toISOString(),
    };

    service.emit('acc-1', 'Sent', event);
    expect(cb).not.toHaveBeenCalled();
  });

  it('should unsubscribe from mailbox', () => {
    const cb = vi.fn();
    service.subscribe('acc-1', 'INBOX', cb);
    service.unsubscribe('acc-1', 'INBOX');

    expect(service.getSubscriptionCount()).toBe(0);
  });

  it('should support multiple callbacks', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    service.subscribe('acc-1', 'INBOX', cb1);
    service.subscribe('acc-1', 'INBOX', cb2);

    const event: WsEvent = {
      type: 'new_message' as WsEventType,
      accountId: 'acc-1',
      mailbox: 'INBOX',
      payload: {},
      timestamp: new Date().toISOString(),
    };

    service.emit('acc-1', 'INBOX', event);
    expect(cb1).toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();
  });

  it('should clean up on module destroy', () => {
    service.subscribe('acc-1', 'INBOX', vi.fn());
    service.subscribe('acc-2', 'Sent', vi.fn());
    service.onModuleDestroy();
    expect(service.getSubscriptionCount()).toBe(0);
  });

  it('should handle emit on non-existent subscription gracefully', () => {
    const event: WsEvent = {
      type: 'new_message' as WsEventType,
      accountId: 'acc-1',
      mailbox: 'INBOX',
      payload: {},
      timestamp: new Date().toISOString(),
    };

    expect(() => service.emit('acc-1', 'INBOX', event)).not.toThrow();
  });
});
