import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AccountState } from '../state/account.state';
import type { ComposeMessage } from '@vellum/shared';

@Injectable({ providedIn: 'root' })
export class ComposeService {
  private readonly api = inject(ApiService);
  private readonly accountState = inject(AccountState);

  async send(dto: Omit<ComposeMessage, 'accountId'>): Promise<{ messageId: string }> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) throw new Error('No active account');

    return firstValueFrom(
      this.api.post<{ messageId: string }>(`/accounts/${accountId}/send`, dto),
    );
  }

  async saveDraft(dto: Omit<ComposeMessage, 'accountId'>): Promise<{ uid: number }> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) throw new Error('No active account');

    return firstValueFrom(
      this.api.post<{ uid: number }>(`/accounts/${accountId}/drafts`, dto),
    );
  }
}
