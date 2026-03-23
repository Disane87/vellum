export const CacheKeys = {
  mailboxes: (accountId: string) => `mailboxes:${accountId}`,
  messageList: (accountId: string, mailbox: string, page: number) =>
    `messages:${accountId}:${mailbox}:${page}`,
  messageFull: (accountId: string, mailbox: string, uid: number) =>
    `message:${accountId}:${mailbox}:${uid}`,
  messageListPrefix: (accountId: string, mailbox: string) =>
    `messages:${accountId}:${mailbox}:`,
  accountPrefix: (accountId: string) => `messages:${accountId}:`,
} as const;

export const CacheTTL = {
  mailboxes: 300_000,     // 5 min (invalidated by WebSocket events)
  messageList: 300_000,   // 5 min (invalidated by WebSocket events)
  messageFull: 600_000,   // 10 min (invalidated by flag changes)
} as const;
