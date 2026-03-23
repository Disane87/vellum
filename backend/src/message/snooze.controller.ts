import { Controller, Post, Get, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { CacheDbService } from '../cache/cache-db.service';

@Controller('accounts/:accountId/snooze')
export class SnoozeController {
  constructor(private readonly cacheDb: CacheDbService) {}

  @Post()
  snooze(
    @Param('accountId') accountId: string,
    @Body() body: { mailbox: string; uid: number; until: string },
  ) {
    this.cacheDb.snoozeMessage(accountId, body.mailbox, body.uid, body.until);
    return { ok: true };
  }

  @Delete(':mailbox/:uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsnooze(
    @Param('accountId') accountId: string,
    @Param('mailbox') mailbox: string,
    @Param('uid') uid: string,
  ) {
    this.cacheDb.unsnoozeMessage(accountId, decodeURIComponent(mailbox), parseInt(uid, 10));
  }

  @Get('due')
  getDue(@Param('accountId') accountId: string) {
    return this.cacheDb.getSnoozedMessages(accountId);
  }
}
