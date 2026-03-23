import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { CacheDbService } from '../cache/cache-db.service';
import { randomUUID } from 'crypto';

@Controller('accounts/:accountId/tags')
export class TagController {
  constructor(private readonly cacheDb: CacheDbService) {}

  @Get()
  list(@Param('accountId') accountId: string) {
    return this.cacheDb.getTags(accountId);
  }

  @Post()
  create(
    @Param('accountId') accountId: string,
    @Body() body: { name: string; color: string },
  ) {
    const id = randomUUID();
    this.cacheDb.createTag(accountId, id, body.name, body.color);
    return { id, name: body.name, color: body.color };
  }

  @Put(':tagId')
  update(
    @Param('tagId') tagId: string,
    @Body() body: { name: string; color: string },
  ) {
    this.cacheDb.updateTag(tagId, body.name, body.color);
    return { id: tagId, name: body.name, color: body.color };
  }

  @Delete(':tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('tagId') tagId: string) {
    this.cacheDb.deleteTag(tagId);
  }
}

@Controller('accounts/:accountId/mailboxes/:mailbox/messages/:uid/tags')
export class MessageTagController {
  constructor(private readonly cacheDb: CacheDbService) {}

  @Post(':tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  addTag(
    @Param('accountId') accountId: string,
    @Param('mailbox') mailbox: string,
    @Param('uid') uid: string,
    @Param('tagId') tagId: string,
  ) {
    this.cacheDb.addMessageTag(accountId, decodeURIComponent(mailbox), parseInt(uid, 10), tagId);
  }

  @Delete(':tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTag(
    @Param('accountId') accountId: string,
    @Param('mailbox') mailbox: string,
    @Param('uid') uid: string,
    @Param('tagId') tagId: string,
  ) {
    this.cacheDb.removeMessageTag(accountId, decodeURIComponent(mailbox), parseInt(uid, 10), tagId);
  }
}
