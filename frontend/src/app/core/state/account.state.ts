import { Injectable, signal, computed } from '@angular/core';
import type { Account } from '@imap-mail/shared';

@Injectable({ providedIn: 'root' })
export class AccountState {
  readonly accounts = signal<Account[]>([]);
  readonly activeAccountId = signal<string | null>(null);

  readonly activeAccount = computed(() => {
    const id = this.activeAccountId();
    return this.accounts().find((a) => a.id === id) ?? null;
  });

  readonly hasAccounts = computed(() => this.accounts().length > 0);

  setAccounts(accounts: Account[]): void {
    this.accounts.set(accounts);
    if (!this.activeAccountId() && accounts.length > 0) {
      this.activeAccountId.set(accounts[0].id);
    }
  }

  setActiveAccount(id: string): void {
    this.activeAccountId.set(id);
  }

  addAccount(account: Account): void {
    this.accounts.update((list) => [...list, account]);
    if (!this.activeAccountId()) {
      this.activeAccountId.set(account.id);
    }
  }

  removeAccount(id: string): void {
    this.accounts.update((list) => list.filter((a) => a.id !== id));
    if (this.activeAccountId() === id) {
      const remaining = this.accounts();
      this.activeAccountId.set(remaining.length > 0 ? remaining[0].id : null);
    }
  }
}
