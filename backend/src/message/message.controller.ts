import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { MessageService } from './message.service';
import { AttachmentService } from './attachment.service';
import type { MessageMoveDto, MessageCopyDto, MessageFlagDto } from '@imap-mail/shared';

@Controller('accounts/:accountId/mailboxes/:mailbox/messages')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly attachmentService: AttachmentService,
  ) {}

  @Get()
  async list(
    @Param('accountId') accountId: string,
    @Param('mailbox') mailbox: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    return this.messageService.list(
      accountId,
      decodeURIComponent(mailbox),
      parseInt(page, 10) || 1,
      parseInt(pageSize, 10) || 20,
    );
  }

  @Get(':uid')
  async getOne(
    @Param('accountId') accountId: string,
    @Param('mailbox') mailbox: string,
    @Param('uid') uid: string,
  ) {
    return this.messageService.getOne(
      accountId,
      decodeURIComponent(mailbox),
      parseInt(uid, 10),
    );
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('accountId') accountId: string,
    @Param('mailbox') mailbox: string,
    @Param('uid') uid: string,
  ) {
    await this.messageService.delete(
      accountId,
      decodeURIComponent(mailbox),
      parseInt(uid, 10),
    );
  }

  @Post('move')
  @HttpCode(HttpStatus.NO_CONTENT)
  async move(
    @Param('accountId') accountId: string,
    @Param('mailbox') mailbox: string,
    @Body() dto: MessageMoveDto,
  ) {
    await this.messageService.move(
      accountId,
      decodeURIComponent(mailbox),
      dto.uids,
      dto.destination,
    );
  }

  @Post('copy')
  @HttpCode(HttpStatus.NO_CONTENT)
  async copy(
    @Param('accountId') accountId: string,
    @Param('mailbox') mailbox: string,
    @Body() dto: MessageCopyDto,
  ) {
    await this.messageService.copy(
      accountId,
      decodeURIComponent(mailbox),
      dto.uids,
      dto.destination,
    );
  }

  @Post('flags')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setFlags(
    @Param('accountId') accountId: string,
    @Param('mailbox') mailbox: string,
    @Body() dto: MessageFlagDto,
  ) {
    await this.messageService.setFlags(
      accountId,
      decodeURIComponent(mailbox),
      dto.uids,
      dto.flags,
      dto.action,
    );
  }

  @Get(':uid/attachments/:partId')
  async downloadAttachment(
    @Param('accountId') accountId: string,
    @Param('mailbox') mailbox: string,
    @Param('uid') uid: string,
    @Param('partId') partId: string,
    @Res() res: Response,
  ) {
    const { stream, contentType, filename } = await this.attachmentService.download(
      accountId,
      decodeURIComponent(mailbox),
      parseInt(uid, 10),
      partId,
    );

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    stream.pipe(res);
  }
}
