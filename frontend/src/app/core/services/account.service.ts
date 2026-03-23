import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AccountState } from '../state/account.state';
import type { Account, AccountCreateDto, ConnectionTestResult } from '@imap-mail/shared';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly api = inject(ApiService);
  private readonly state = inject(AccountState);

  async loadAccounts(): Promise<void> {
    const accounts = await firstValueFrom(this.api.get<Account[]>('/accounts'));
    this.state.setAccounts(accounts);
  }

  async createAccount(dto: AccountCreateDto): Promise<Account> {
    const account = await firstValueFrom(this.api.post<Account>('/accounts', dto));
    this.state.addAccount(account);
    return account;
  }

  async deleteAccount(id: string): Promise<void> {
    await firstValueFrom(this.api.delete(`/accounts/${id}`));
    this.state.removeAccount(id);
  }

  async testConnection(id: string): Promise<ConnectionTestResult> {
    return firstValueFrom(this.api.post<ConnectionTestResult>(`/accounts/${id}/test`, {}));
  }
}
