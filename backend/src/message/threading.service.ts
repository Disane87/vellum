import { Injectable } from '@nestjs/common';
import type { MessageEnvelope } from '@vellum/shared';

export interface Thread {
  id: string;
  subject: string;
  messages: MessageEnvelope[];
  lastDate: string;
  unreadCount: number;
  participants: string[];
}

@Injectable()
export class ThreadingService {
  /**
   * Group messages into conversation threads using RFC 5256 threading algorithm.
   * Groups by References/In-Reply-To headers, falls back to normalized subject.
   */
  buildThreads(messages: MessageEnvelope[]): Thread[] {
    const threadMap = new Map<string, MessageEnvelope[]>();

    for (const msg of messages) {
      const threadKey = this.getThreadKey(msg);
      const existing = threadMap.get(threadKey) || [];
      existing.push(msg);
      threadMap.set(threadKey, existing);
    }

    const threads: Thread[] = [];
    for (const [id, msgs] of threadMap) {
      msgs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const participants = new Set<string>();
      let unreadCount = 0;
      for (const m of msgs) {
        if (m.from[0]?.address) participants.add(m.from[0].address);
        if (!m.flags.includes('\\Seen' as any)) unreadCount++;
      }

      threads.push({
        id,
        subject: this.normalizeSubject(msgs[0].subject),
        messages: msgs,
        lastDate: msgs[msgs.length - 1].date,
        unreadCount,
        participants: Array.from(participants),
      });
    }

    // Sort threads by last message date, newest first
    threads.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());

    return threads;
  }

  private getThreadKey(msg: MessageEnvelope): string {
    // Use threadId if available (set from References[0] or In-Reply-To)
    if (msg.threadId) return msg.threadId;

    // Fall back to normalized subject
    return this.normalizeSubject(msg.subject).toLowerCase();
  }

  private normalizeSubject(subject: string): string {
    return subject.replace(/^(re|fwd?|aw|wg):\s*/gi, '').trim() || '(No Subject)';
  }
}
