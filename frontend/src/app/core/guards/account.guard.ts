import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AccountState } from '../state/account.state';
import { AccountService } from '../services/account.service';

export const accountGuard: CanActivateFn = async () => {
  const accountState = inject(AccountState);
  const accountService = inject(AccountService);
  const router = inject(Router);

  // Always try to load accounts if state is empty
  if (accountState.accounts().length === 0) {
    try {
      await accountService.loadAccounts();
    } catch (err) {
      console.warn('[AccountGuard] Failed to load accounts:', err);
      // Backend unreachable — let through, shell will handle the error
      return true;
    }
  }

  if (!accountState.hasAccounts()) {
    router.navigate(['/welcome']);
    return false;
  }

  return true;
};
