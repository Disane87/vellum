import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { CredentialService } from './credential.service';
import type { ImapConfig } from '@vellum/shared';

interface ManagedConnection {
  client: ImapFlow;
  busy: boolean;
  queue: Array<(client: ImapFlow) => void>;
}

@Injectable()
export class ConnectionPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private connections = new Map<string, ManagedConnection>();
  private connecting = new Map<string, Promise<ImapFlow>>();

  constructor(private readonly credentialService: CredentialService) {}

  async acquire(accountId: string, config: ImapConfig): Promise<ImapFlow> {
    const existing = this.connections.get(accountId);

    // If we have a usable connection that's not busy, return it
    if (existing?.client?.usable && !existing.busy) {
      existing.busy = true;
      return existing.client;
    }

    // If we have a usable connection that IS busy, queue up
    if (existing?.client?.usable && existing.busy) {
      return new Promise<ImapFlow>((resolve) => {
        existing.queue.push(resolve);
      });
    }

    // No connection or dead connection — create one
    // Dedup: if we're already connecting, wait for that
    let connectPromise = this.connecting.get(accountId);
    if (!connectPromise) {
      connectPromise = this.createConnection(accountId, config);
      this.connecting.set(accountId, connectPromise);
    }

    try {
      const client = await connectPromise;
      return client;
    } finally {
      this.connecting.delete(accountId);
    }
  }

  async release(accountId: string, _client: ImapFlow): Promise<void> {
    const managed = this.connections.get(accountId);
    if (!managed) return;

    // If someone is queued, give them the connection
    const next = managed.queue.shift();
    if (next) {
      next(managed.client);
    } else {
      managed.busy = false;
    }
  }

  async destroyPool(accountId: string): Promise<void> {
    const managed = this.connections.get(accountId);
    if (managed) {
      try { await managed.client.logout(); } catch {
        try { managed.client.close(); } catch { /* ignore */ }
      }
      // Reject all queued
      for (const resolve of managed.queue) {
        resolve(null as any); // will fail, but prevents hanging
      }
      this.connections.delete(accountId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [accountId] of this.connections) {
      await this.destroyPool(accountId);
    }
  }

  private async createConnection(accountId: string, config: ImapConfig): Promise<ImapFlow> {
    // Clean up old dead connection
    const old = this.connections.get(accountId);
    if (old) {
      try { old.client.close(); } catch { /* ignore */ }
      this.connections.delete(accountId);
    }

    this.logger.log(`Creating IMAP connection for ${accountId}`);

    const auth = config.auth.type === 'password'
      ? {
          user: config.auth.user,
          pass: config.auth.pass ? this.credentialService.decrypt(config.auth.pass) : '',
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
      emitLogs: false,
    });

    await client.connect();
    this.logger.log(`IMAP connection established for ${accountId}`);

    const managed: ManagedConnection = { client, busy: true, queue: [] };
    this.connections.set(accountId, managed);

    // Auto-cleanup on disconnect
    client.on('close', () => {
      this.logger.warn(`IMAP connection closed for ${accountId}`);
      this.connections.delete(accountId);
    });

    return client;
  }
}
