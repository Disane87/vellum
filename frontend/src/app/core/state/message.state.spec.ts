import { TestBed } from '@angular/core/testing';
import { MessageState } from './message.state';
import type { MessageEnvelope } from '@imap-mail/shared';

const mockMessage: MessageEnvelope = {
  uid: 1,
  seq: 1,
  messageId: '<msg1@test>',
  subject: 'Test',
  from: [{ address: 'alice@test.com' }],
  to: [{ address: 'bob@test.com' }],
  date: new Date().toISOString(),
  flags: [],
  size: 1024,
  hasAttachments: false,
  preview: 'Hello',
};

describe('MessageState', () => {
  let state: MessageState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    state = TestBed.inject(MessageState);
  });

  it('should start empty', () => {
    expect(state.messages()).toEqual([]);
    expect(state.total()).toBe(0);
    expect(state.loading()).toBe(false);
  });

  it('should set messages', () => {
    state.setMessages([mockMessage], 10);
    expect(state.messages()).toHaveLength(1);
    expect(state.total()).toBe(10);
  });

  it('should toggle selection', () => {
    state.toggleSelection(1);
    expect(state.selectedUids().has(1)).toBe(true);
    expect(state.hasSelection()).toBe(true);

    state.toggleSelection(1);
    expect(state.selectedUids().has(1)).toBe(false);
  });

  it('should select all', () => {
    state.setMessages([mockMessage, { ...mockMessage, uid: 2 }], 2);
    state.selectAll();
    expect(state.selectedUids().size).toBe(2);
  });

  it('should clear selection', () => {
    state.toggleSelection(1);
    state.clearSelection();
    expect(state.hasSelection()).toBe(false);
  });

  it('should remove messages', () => {
    state.setMessages([mockMessage, { ...mockMessage, uid: 2 }], 5);
    state.removeMessages([1]);
    expect(state.messages()).toHaveLength(1);
    expect(state.total()).toBe(4);
  });

  it('should prepend message', () => {
    state.setMessages([mockMessage], 1);
    state.prependMessage({ ...mockMessage, uid: 99 });
    expect(state.messages()[0].uid).toBe(99);
    expect(state.total()).toBe(2);
  });

  it('should compute totalPages', () => {
    state.setMessages([], 45);
    expect(state.totalPages()).toBe(3); // 45/20 = 2.25 → ceil = 3
  });

  it('should update flags', () => {
    state.setMessages([mockMessage], 1);
    state.updateFlags(1, ['\\Seen']);
    expect(state.messages()[0].flags).toEqual(['\\Seen']);
  });
});
