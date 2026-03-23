import { vi } from 'vitest';

export interface SentMessage {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: unknown[];
}

export function createMockTransporter() {
  const sentMessages: SentMessage[] = [];

  const transporter = {
    sendMail: vi.fn().mockImplementation(async (mailOptions: SentMessage) => {
      sentMessages.push(mailOptions);
      return {
        messageId: `<${Date.now()}@mock.local>`,
        accepted: [mailOptions.to].flat(),
        rejected: [],
        response: '250 OK',
      };
    }),
    verify: vi.fn().mockResolvedValue(true),
    close: vi.fn(),
  };

  return { transporter, sentMessages };
}

export type MockTransporter = ReturnType<typeof createMockTransporter>['transporter'];
