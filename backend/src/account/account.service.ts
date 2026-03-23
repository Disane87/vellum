import { Injectable, NotFoundException } from '@nestjs/common';
import { CredentialService } from '../imap/credential.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import type { Account, AccountCreateDto, AccountUpdateDto } from '@vellum/shared';

// Find the backend workspace root by looking for nest-cli.json
function findBackendRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'nest-cli.json'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const DATA_DIR = path.join(findBackendRoot(), 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

@Injectable()
export class AccountService {
  private accounts: Account[] = [];

  constructor(private readonly credentialService: CredentialService) {
    this.loadAccounts();
  }

  async findAll(): Promise<Account[]> {
    return this.accounts.map((a) => this.redactCredentials(a));
  }

  async findById(id: string): Promise<Account> {
    const account = this.accounts.find((a) => a.id === id);
    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }
    return account;
  }

  async create(dto: AccountCreateDto): Promise<Account> {
    const account: Account = {
      ...dto,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      imap: {
        ...dto.imap,
        auth: {
          ...dto.imap.auth,
          pass: dto.imap.auth.pass
            ? this.credentialService.encrypt(dto.imap.auth.pass)
            : undefined,
        },
      },
      smtp: {
        ...dto.smtp,
        auth: {
          ...dto.smtp.auth,
          pass: dto.smtp.auth.pass
            ? this.credentialService.encrypt(dto.smtp.auth.pass)
            : undefined,
        },
      },
    };

    this.accounts.push(account);
    this.saveAccounts();
    return account;
  }

  async update(id: string, dto: AccountUpdateDto): Promise<Account> {
    const index = this.accounts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException(`Account ${id} not found`);
    }

    const existing = this.accounts[index];
    const updated: Account = {
      ...existing,
      ...dto,
      id: existing.id,
      createdAt: existing.createdAt,
    };

    // Re-encrypt passwords if they changed
    if (dto.imap?.auth?.pass) {
      updated.imap.auth.pass = this.credentialService.encrypt(dto.imap.auth.pass);
    }
    if (dto.smtp?.auth?.pass) {
      updated.smtp.auth.pass = this.credentialService.encrypt(dto.smtp.auth.pass);
    }

    this.accounts[index] = updated;
    this.saveAccounts();
    return updated;
  }

  async delete(id: string): Promise<void> {
    const index = this.accounts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException(`Account ${id} not found`);
    }
    this.accounts.splice(index, 1);
    this.saveAccounts();
  }

  private redactCredentials(account: Account): Account {
    return {
      ...account,
      imap: {
        ...account.imap,
        auth: { ...account.imap.auth, pass: undefined, accessToken: undefined, refreshToken: undefined },
      },
      smtp: {
        ...account.smtp,
        auth: { ...account.smtp.auth, pass: undefined, accessToken: undefined, refreshToken: undefined },
      },
    };
  }

  private loadAccounts(): void {
    try {
      if (fs.existsSync(ACCOUNTS_FILE)) {
        const data = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
        this.accounts = JSON.parse(data);
      }
    } catch {
      this.accounts = [];
    }
  }

  private saveAccounts(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(this.accounts, null, 2));
  }
}
