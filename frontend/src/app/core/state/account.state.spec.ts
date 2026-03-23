import { TestBed } from '@angular/core/testing';
import { AccountState } from './account.state';
import type { Account } from '@vellum/shared';

const mockAccount: Account = {
  id: 'acc-1',
  name: 'Test',
  email: 'test@example.com',
  imap: { host: 'h', port: 993, secure: true, auth: { type: 'password', user: 'u' } },
  smtp: { host: 'h', port: 587, secure: false, auth: { type: 'password', user: 'u' } },
  createdAt: new Date().toISOString(),
};

describe('AccountState', () => {
  let state: AccountState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    state = TestBed.inject(AccountState);
  });

  it('should start with empty accounts', () => {
    expect(state.accounts()).toEqual([]);
    expect(state.hasAccounts()).toBe(false);
  });

  it('should set accounts and auto-select first', () => {
    state.setAccounts([mockAccount]);
    expect(state.accounts()).toHaveLength(1);
    expect(state.activeAccountId()).toBe('acc-1');
    expect(state.hasAccounts()).toBe(true);
  });

  it('should add an account', () => {
    state.addAccount(mockAccount);
    expect(state.accounts()).toHaveLength(1);
    expect(state.activeAccountId()).toBe('acc-1');
  });

  it('should remove an account', () => {
    state.setAccounts([mockAccount]);
    state.removeAccount('acc-1');
    expect(state.accounts()).toHaveLength(0);
    expect(state.activeAccountId()).toBeNull();
  });

  it('should compute activeAccount', () => {
    state.setAccounts([mockAccount]);
    expect(state.activeAccount()?.id).toBe('acc-1');
  });

  it('should switch active account', () => {
    const account2 = { ...mockAccount, id: 'acc-2', name: 'Second' };
    state.setAccounts([mockAccount, account2]);
    state.setActiveAccount('acc-2');
    expect(state.activeAccount()?.id).toBe('acc-2');
  });
});
