import { Injectable } from '@nestjs/common';
import { resolveTxt } from 'dns/promises';
import { CacheDbService } from '../cache/cache-db.service';

export interface BimiRecord {
  version: string;
  logoUrl: string | null;
  authorityUrl: string | null;
}

@Injectable()
export class BimiService {
  constructor(private readonly cacheDb: CacheDbService) {}

  async getLogoUrl(email: string): Promise<string | null> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    // SQLite cache first (24h TTL)
    const cached = this.cacheDb.getBimiLogo(domain);
    if (cached) {
      return cached.logoUrl;
    }

    // DNS lookup
    const record = await this.lookupBimi(domain);
    const logoUrl = record?.logoUrl || null;

    // Persist to SQLite (even null — so we don't re-lookup domains without BIMI)
    this.cacheDb.setBimiLogo(domain, logoUrl);

    return logoUrl;
  }

  private async lookupBimi(domain: string): Promise<BimiRecord | null> {
    try {
      const hostname = `default._bimi.${domain}`;
      const records = await resolveTxt(hostname);

      for (const record of records) {
        const txt = record.join('');
        if (txt.startsWith('v=BIMI1')) {
          return this.parseBimiRecord(txt);
        }
      }
    } catch {
      // No BIMI record
    }

    return null;
  }

  private parseBimiRecord(txt: string): BimiRecord {
    const parts = txt.split(';').map((p) => p.trim());
    let version = 'BIMI1';
    let logoUrl: string | null = null;
    let authorityUrl: string | null = null;

    for (const part of parts) {
      if (part.startsWith('v=')) {
        version = part.substring(2);
      } else if (part.startsWith('l=')) {
        const url = part.substring(2).trim();
        if (url) logoUrl = url;
      } else if (part.startsWith('a=')) {
        const url = part.substring(2).trim();
        if (url) authorityUrl = url;
      }
    }

    return { version, logoUrl, authorityUrl };
  }
}
