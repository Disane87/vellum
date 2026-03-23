import { Injectable, inject, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MailboxState } from '../state/mailbox.state';

@Injectable({ providedIn: 'root' })
export class TabTitleService {
  private readonly title = inject(Title);
  private readonly mailboxState = inject(MailboxState);

  // effect() in constructor = injection context = works
  constructor() {
    effect(() => {
      const unread = this.mailboxState.totalUnread();
      if (unread > 0) {
        this.title.setTitle(`(${unread}) Vellum Mail`);
      } else {
        this.title.setTitle('Vellum Mail');
      }
    });
  }
}
