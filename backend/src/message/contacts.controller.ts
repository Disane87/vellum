import { Controller, Get, Param, Query } from '@nestjs/common';
import { CacheDbService } from '../cache/cache-db.service';

@Controller('accounts/:accountId/contacts')
export class ContactsController {
  constructor(private readonly cacheDb: CacheDbService) {}

  @Get('autocomplete')
  autocomplete(
    @Param('accountId') accountId: string,
    @Query('q') query: string,
  ) {
    if (!query || query.length < 2) return [];
    return this.cacheDb.getKnownContacts(accountId, query);
  }
}
