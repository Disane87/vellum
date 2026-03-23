import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { createPool, Pool } from 'generic-pool';
import { CredentialService } from './credential.service';
import type { ImapConfig } from '@imap-mail/shared';

@Injectable()
export class ConnectionPoolService implements OnModuleDestroy {
  private pools = new Map<string, Pool<ImapFlow>>();

  constructor(private readonly credentialService: CredentialService) {}

  async acquire(accountId: string, config: ImapConfig): Promise<ImapFlow> {
    let pool = this.pools.get(accountId);
    if (!pool) {
      pool = this.createPoolForAccount(accountId, config);
      this.pools.set(accountId, pool);
    }
    return pool.acquire();
  }

  async release(accountId: string, client: ImapFlow): Promise<void> {
    const pool = this.pools.get(accountId);
    if (pool) {
      await pool.release(client);
    }
  }

  async destroyPool(accountId: string): Promise<void> {
    const pool = this.pools.get(accountId);
    if (pool) {
      await pool.drain();
      await pool.clear();
      this.pools.delete(accountId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [accountId] of this.pools) {
      await this.destroyPool(accountId);
    }
  }

  private createPoolForAccount(accountId: string, config: ImapConfig): Pool<ImapFlow> {
    const credentialService = this.credentialService;

    return createPool<ImapFlow>(
      {
        async create(): Promise<ImapFlow> {
          const auth =
            config.auth.type === 'password'
              ? {
                  user: config.auth.user,
                  pass: config.auth.pass
                    ? credentialService.decrypt(config.auth.pass)
                    : '',
                }
              : {
                  user: config.auth.user,
                  accessToken: config.auth.accessToken || '',
                };

          const client = new ImapFlow({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth,
            logger: false,
          });

          await client.connect();
          return client;
        },
        async destroy(client: ImapFlow): Promise<void> {
          try {
            await client.logout();
          } catch {
            client.close();
          }
        },
        async validate(client: ImapFlow): Promise<boolean> {
          return client.usable === true;
        },
      },
      {
        min: 0,
        max: 3,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 300000,
        testOnBorrow: true,
      },
    );
  }
}
