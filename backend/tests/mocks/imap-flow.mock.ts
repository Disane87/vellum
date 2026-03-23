import { vi } from 'vitest';
import { EventEmitter } from 'events';

export interface MockMailbox {
  path: string;
  name: string;
  flags: Set<string>;
  specialUse?: string;
  status: { messages: number; unseen: number };
  subscribed: boolean;
  delimiter: string;
  listed: boolean;
}

export interface MockMessage {
  uid: number;
  seq: number;
  envelope: {
    messageId: string;
    subject: string;
    from: { name?: string; address: string }[];
    to: { name?: string; address: string }[];
    cc?: { name?: string; address: string }[];
    date: Date;
    inReplyTo?: string;
  };
  flags: Set<string>;
  size: number;
  source?: Buffer;
  bodyStructure?: {
    childNodes?: { part: string; type: string; disposition?: string; size?: number }[];
  };
}

export function createMockImapFlow() {
  const emitter = new EventEmitter();

  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),

    list: vi.fn().mockResolvedValue([]),
    mailboxOpen: vi.fn().mockResolvedValue({ exists: 0, path: 'INBOX' }),
    mailboxClose: vi.fn().mockResolvedValue(undefined),
    mailboxCreate: vi.fn().mockResolvedValue({ path: 'NewFolder' }),
    mailboxDelete: vi.fn().mockResolvedValue(undefined),
    mailboxRename: vi.fn().mockResolvedValue({ newPath: 'RenamedFolder' }),
    mailboxSubscribe: vi.fn().mockResolvedValue(undefined),
    mailboxUnsubscribe: vi.fn().mockResolvedValue(undefined),
    status: vi.fn().mockResolvedValue({ messages: 10, unseen: 3 }),

    fetch: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: async function* () {},
    }),
    fetchOne: vi.fn().mockResolvedValue(null),
    download: vi.fn().mockResolvedValue({ content: Buffer.from(''), meta: {} }),
    search: vi.fn().mockResolvedValue([]),

    messageDelete: vi.fn().mockResolvedValue(true),
    messageMove: vi.fn().mockResolvedValue({ destination: 'Trash', uidMap: new Map() }),
    messageCopy: vi.fn().mockResolvedValue({ destination: 'Archive', uidMap: new Map() }),
    messageFlagsAdd: vi.fn().mockResolvedValue(true),
    messageFlagsRemove: vi.fn().mockResolvedValue(true),
    messageFlagsSet: vi.fn().mockResolvedValue(true),

    append: vi.fn().mockResolvedValue({ uid: 1, destination: 'Drafts' }),

    idle: vi.fn().mockResolvedValue(undefined),

    on: vi.fn((event: string, cb: Function) => {
      emitter.on(event, cb as (...args: unknown[]) => void);
      return mockClient;
    }),
    off: vi.fn((event: string, cb: Function) => {
      emitter.off(event, cb as (...args: unknown[]) => void);
      return mockClient;
    }),
    emit: (event: string, ...args: unknown[]) => emitter.emit(event, ...args),

    authenticated: true,
    usable: true,
  };

  return mockClient;
}

export type MockImapFlowClient = ReturnType<typeof createMockImapFlow>;
