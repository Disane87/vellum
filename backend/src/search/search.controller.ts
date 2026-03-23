import { Controller, Post, Body, Param } from '@nestjs/common';
import { SearchService } from './search.service';
import type { SearchQuery, SearchResult } from '@imap-mail/shared';

@Controller('accounts/:accountId/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  async search(
    @Param('accountId') accountId: string,
    @Body() query: SearchQuery,
  ): Promise<SearchResult> {
    return this.searchService.search(accountId, query);
  }
}
