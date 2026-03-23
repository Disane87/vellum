import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AccountState } from '../state/account.state';
import { MessageState } from '../state/message.state';
import type { SearchQuery, SearchResult } from '@vellum/shared';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly api = inject(ApiService);
  private readonly accountState = inject(AccountState);
  private readonly messageState = inject(MessageState);

  async search(query: SearchQuery): Promise<void> {
    const accountId = this.accountState.activeAccountId();
    if (!accountId) return;

    this.messageState.loading.set(true);
    try {
      const result = await firstValueFrom(
        this.api.post<SearchResult>(`/accounts/${accountId}/search`, query),
      );
      this.messageState.setMessages(result.messages, result.total);
    } finally {
      this.messageState.loading.set(false);
    }
  }
}
