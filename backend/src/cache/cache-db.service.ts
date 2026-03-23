import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import type { Mailbox, MessageEnvelope, MessageFull } from '@vellum/shared';

function findBackendRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'nest-cli.json'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const DB_PATH = path.join(findBackendRoot(), 'data', 'mail-cache.db');

@Injectable()
export class CacheDbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheDbService.name);
  private db!: Database.Database;

  onModuleInit(): void {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
    this.logger.log(`Cache DB initialized at ${DB_PATH}`);
  }

  onModuleDestroy(): void {
    this.db?.close();
  }

  // --- Mailboxes ---

  getMailboxes(accountId: string): Mailbox[] | null {
    const rows = this.db
      .prepare('SELECT data FROM mailboxes WHERE account_id = ?')
      .all(accountId) as { data: string }[];
    if (rows.length === 0) return null;
    return rows.map((r) => JSON.parse(r.data));
  }

  setMailboxes(accountId: string, mailboxes: Mailbox[]): void {
    const del = this.db.prepare('DELETE FROM mailboxes WHERE account_id = ?');
    const ins = this.db.prepare(
      'INSERT INTO mailboxes (account_id, path, data) VALUES (?, ?, ?)',
    );

    this.db.transaction(() => {
      del.run(accountId);
      for (const mb of mailboxes) {
        ins.run(accountId, mb.path, JSON.stringify(mb));
      }
    })();
  }

  updateMailboxCounts(
    accountId: string,
    mailboxPath: string,
    total: number,
    unseen: number,
  ): void {
    const row = this.db
      .prepare('SELECT data FROM mailboxes WHERE account_id = ? AND path = ?')
      .get(accountId, mailboxPath) as { data: string } | undefined;
    if (!row) return;

    const mb: Mailbox = JSON.parse(row.data);
    mb.totalMessages = total;
    mb.unseenMessages = unseen;

    this.db
      .prepare('UPDATE mailboxes SET data = ? WHERE account_id = ? AND path = ?')
      .run(JSON.stringify(mb), accountId, mailboxPath);
  }

  // --- Message Envelopes ---

  getMessageList(
    accountId: string,
    mailbox: string,
    page: number,
    pageSize: number,
  ): { messages: MessageEnvelope[]; total: number } | null {
    // Use the real total from sync_state, not the cached message count
    const totalRow = this.db
      .prepare('SELECT total FROM mailbox_totals WHERE account_id = ? AND mailbox = ?')
      .get(accountId, mailbox) as { total: number } | undefined;

    const offset = (page - 1) * pageSize;
    const rows = this.db
      .prepare(
        'SELECT envelope FROM messages WHERE account_id = ? AND mailbox = ? ORDER BY date DESC LIMIT ? OFFSET ?',
      )
      .all(accountId, mailbox, pageSize, offset) as { envelope: string }[];

    if (rows.length === 0) return null;

    return {
      messages: rows.map((r) => JSON.parse(r.envelope)),
      total: totalRow?.total ?? rows.length,
    };
  }

  setMailboxTotal(accountId: string, mailbox: string, total: number): void {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO mailbox_totals (account_id, mailbox, total) VALUES (?, ?, ?)',
      )
      .run(accountId, mailbox, total);
  }

  upsertMessages(accountId: string, mailbox: string, messages: MessageEnvelope[]): void {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO messages (account_id, mailbox, uid, message_id, date, envelope) VALUES (?, ?, ?, ?, ?, ?)',
    );

    this.db.transaction(() => {
      for (const msg of messages) {
        stmt.run(accountId, mailbox, msg.uid, msg.messageId, msg.date, JSON.stringify(msg));
      }
    })();
  }

  // --- Full Messages ---

  getFullMessage(accountId: string, mailbox: string, uid: number): MessageFull | null {
    const row = this.db
      .prepare('SELECT data FROM message_bodies WHERE account_id = ? AND mailbox = ? AND uid = ?')
      .get(accountId, mailbox, uid) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }

  setFullMessage(accountId: string, mailbox: string, uid: number, message: MessageFull): void {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO message_bodies (account_id, mailbox, uid, data) VALUES (?, ?, ?, ?)',
      )
      .run(accountId, mailbox, uid, JSON.stringify(message));
  }

  // --- Deletion ---

  deleteMessages(accountId: string, mailbox: string, uids: number[]): void {
    const stmt1 = this.db.prepare(
      'DELETE FROM messages WHERE account_id = ? AND mailbox = ? AND uid = ?',
    );
    const stmt2 = this.db.prepare(
      'DELETE FROM message_bodies WHERE account_id = ? AND mailbox = ? AND uid = ?',
    );
    this.db.transaction(() => {
      for (const uid of uids) {
        stmt1.run(accountId, mailbox, uid);
        stmt2.run(accountId, mailbox, uid);
      }
    })();
  }

  clearMailbox(accountId: string, mailbox: string): void {
    this.db.prepare('DELETE FROM messages WHERE account_id = ? AND mailbox = ?').run(accountId, mailbox);
    this.db.prepare('DELETE FROM message_bodies WHERE account_id = ? AND mailbox = ?').run(accountId, mailbox);
  }

  clearAccount(accountId: string): void {
    this.db.prepare('DELETE FROM mailboxes WHERE account_id = ?').run(accountId);
    this.db.prepare('DELETE FROM messages WHERE account_id = ?').run(accountId);
    this.db.prepare('DELETE FROM message_bodies WHERE account_id = ?').run(accountId);
  }

  // --- Sync tracking ---

  getLastSync(accountId: string, mailbox: string): string | null {
    const row = this.db
      .prepare('SELECT synced_at FROM sync_state WHERE account_id = ? AND mailbox = ?')
      .get(accountId, mailbox) as { synced_at: string } | undefined;
    return row?.synced_at ?? null;
  }

  setLastSync(accountId: string, mailbox: string): void {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO sync_state (account_id, mailbox, synced_at) VALUES (?, ?, ?)',
      )
      .run(accountId, mailbox, new Date().toISOString());
  }

  getHighestUid(accountId: string, mailbox: string): number {
    const row = this.db
      .prepare('SELECT MAX(uid) as max_uid FROM messages WHERE account_id = ? AND mailbox = ?')
      .get(accountId, mailbox) as { max_uid: number | null };
    return row?.max_uid ?? 0;
  }

  // --- BIMI ---

  getBimiLogo(domain: string): { logoUrl: string | null; cachedAt: string } | null {
    const row = this.db
      .prepare('SELECT logo_url, cached_at FROM bimi_cache WHERE domain = ?')
      .get(domain) as { logo_url: string | null; cached_at: string } | undefined;
    if (!row) return null;

    // Expire after 24h
    const age = Date.now() - new Date(row.cached_at).getTime();
    if (age > 86_400_000) {
      this.db.prepare('DELETE FROM bimi_cache WHERE domain = ?').run(domain);
      return null;
    }

    return { logoUrl: row.logo_url, cachedAt: row.cached_at };
  }

  setBimiLogo(domain: string, logoUrl: string | null): void {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO bimi_cache (domain, logo_url, cached_at) VALUES (?, ?, ?)',
      )
      .run(domain, logoUrl, new Date().toISOString());
  }

  // --- Contacts ---

  getKnownContacts(accountId: string, query: string, limit = 10): string[] {
    const rows = this.db
      .prepare(
        'SELECT DISTINCT address FROM known_contacts WHERE account_id = ? AND address LIKE ? ORDER BY last_seen DESC LIMIT ?',
      )
      .all(accountId, `%${query}%`, limit) as { address: string }[];
    return rows.map((r) => r.address);
  }

  addKnownContact(accountId: string, address: string, name?: string): void {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO known_contacts (account_id, address, name, last_seen) VALUES (?, ?, ?, ?)',
      )
      .run(accountId, address, name || null, new Date().toISOString());
  }

  // --- Snooze ---

  snoozeMessage(accountId: string, mailbox: string, uid: number, until: string): void {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO snoozed_messages (account_id, mailbox, uid, snooze_until) VALUES (?, ?, ?, ?)',
      )
      .run(accountId, mailbox, uid, until);
  }

  getSnoozedMessages(accountId: string): { mailbox: string; uid: number; snoozeUntil: string }[] {
    const rows = this.db
      .prepare('SELECT mailbox, uid, snooze_until FROM snoozed_messages WHERE account_id = ? AND snooze_until <= ?')
      .all(accountId, new Date().toISOString()) as { mailbox: string; uid: number; snooze_until: string }[];
    return rows.map((r) => ({ mailbox: r.mailbox, uid: r.uid, snoozeUntil: r.snooze_until }));
  }

  unsnoozeMessage(accountId: string, mailbox: string, uid: number): void {
    this.db
      .prepare('DELETE FROM snoozed_messages WHERE account_id = ? AND mailbox = ? AND uid = ?')
      .run(accountId, mailbox, uid);
  }

  isMessageSnoozed(accountId: string, mailbox: string, uid: number): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM snoozed_messages WHERE account_id = ? AND mailbox = ? AND uid = ? AND snooze_until > ?')
      .get(accountId, mailbox, uid, new Date().toISOString());
    return !!row;
  }

  // --- Tags ---

  getTags(accountId: string): { id: string; name: string; color: string }[] {
    return this.db
      .prepare('SELECT id, name, color FROM tags WHERE account_id = ?')
      .all(accountId) as { id: string; name: string; color: string }[];
  }

  createTag(accountId: string, id: string, name: string, color: string): void {
    this.db
      .prepare('INSERT INTO tags (id, account_id, name, color) VALUES (?, ?, ?, ?)')
      .run(id, accountId, name, color);
  }

  updateTag(id: string, name: string, color: string): void {
    this.db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, id);
  }

  deleteTag(id: string): void {
    this.db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  }

  getMessageTags(accountId: string, mailbox: string, uids: number[]): Record<number, string[]> {
    if (uids.length === 0) return {};
    const placeholders = uids.map(() => '?').join(',');
    const rows = this.db
      .prepare(
        `SELECT uid, tag_id FROM message_tags WHERE account_id = ? AND mailbox = ? AND uid IN (${placeholders})`,
      )
      .all(accountId, mailbox, ...uids) as { uid: number; tag_id: string }[];

    const result: Record<number, string[]> = {};
    for (const row of rows) {
      if (!result[row.uid]) result[row.uid] = [];
      result[row.uid].push(row.tag_id);
    }
    return result;
  }

  addMessageTag(accountId: string, mailbox: string, uid: number, tagId: string): void {
    this.db
      .prepare('INSERT OR IGNORE INTO message_tags (account_id, mailbox, uid, tag_id) VALUES (?, ?, ?, ?)')
      .run(accountId, mailbox, uid, tagId);
  }

  removeMessageTag(accountId: string, mailbox: string, uid: number, tagId: string): void {
    this.db
      .prepare('DELETE FROM message_tags WHERE account_id = ? AND mailbox = ? AND uid = ? AND tag_id = ?')
      .run(accountId, mailbox, uid, tagId);
  }

  // --- Schema ---

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mailboxes (
        account_id TEXT NOT NULL,
        path TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (account_id, path)
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        account_id TEXT NOT NULL,
        mailbox TEXT NOT NULL,
        uid INTEGER NOT NULL,
        message_id TEXT,
        date TEXT,
        envelope TEXT NOT NULL,
        PRIMARY KEY (account_id, mailbox, uid)
      )
    `);
    this.db.exec(
      'CREATE INDEX IF NOT EXISTS idx_messages_date ON messages (account_id, mailbox, date DESC)',
    );
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS message_bodies (
        account_id TEXT NOT NULL,
        mailbox TEXT NOT NULL,
        uid INTEGER NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (account_id, mailbox, uid)
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_state (
        account_id TEXT NOT NULL,
        mailbox TEXT NOT NULL,
        synced_at TEXT NOT NULL,
        PRIMARY KEY (account_id, mailbox)
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bimi_cache (
        domain TEXT NOT NULL PRIMARY KEY,
        logo_url TEXT,
        cached_at TEXT NOT NULL
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS known_contacts (
        account_id TEXT NOT NULL,
        address TEXT NOT NULL,
        name TEXT,
        last_seen TEXT NOT NULL,
        PRIMARY KEY (account_id, address)
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT NOT NULL PRIMARY KEY,
        account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1'
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS message_tags (
        account_id TEXT NOT NULL,
        mailbox TEXT NOT NULL,
        uid INTEGER NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (account_id, mailbox, uid, tag_id),
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mailbox_totals (
        account_id TEXT NOT NULL,
        mailbox TEXT NOT NULL,
        total INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (account_id, mailbox)
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snoozed_messages (
        account_id TEXT NOT NULL,
        mailbox TEXT NOT NULL,
        uid INTEGER NOT NULL,
        snooze_until TEXT NOT NULL,
        PRIMARY KEY (account_id, mailbox, uid)
      )
    `);
  }
}
