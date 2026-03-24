import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AccountState } from '../state/account.state';
import { AccountService } from '../services/account.service';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const accountGuard: CanActivateFn = async () => {
  const accountState = inject(AccountState);
  const accountService = inject(AccountService);
  const router = inject(Router);

  // Already loaded
  if (accountState.hasAccounts()) return true;

  // Retry loading accounts — backend may still be starting
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await accountService.loadAccounts();
      break;
    } catch {
      if (attempt < maxRetries) {
        await delay(attempt * 1000);
      }
    }
  }

  if (!accountState.hasAccounts()) {
    router.navigate(['/welcome']);
    return false;
  }

  return true;
};
