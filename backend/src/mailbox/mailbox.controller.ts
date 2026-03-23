import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MailboxService } from './mailbox.service';
import type { MailboxCreateDto, MailboxRenameDto } from '@imap-mail/shared';

@Controller('accounts/:accountId/mailboxes')
export class MailboxController {
  constructor(private readonly mailboxService: MailboxService) {}

  @Get()
  async list(@Param('accountId') accountId: string) {
    return this.mailboxService.list(accountId);
  }

  @Post()
  async create(
    @Param('accountId') accountId: string,
    @Body() dto: MailboxCreateDto,
  ) {
    return this.mailboxService.create(accountId, dto.path);
  }

  @Put(':path')
  async rename(
    @Param('accountId') accountId: string,
    @Param('path') path: string,
    @Body() dto: MailboxRenameDto,
  ) {
    return this.mailboxService.rename(accountId, decodeURIComponent(path), dto.newPath);
  }

  @Delete(':path')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('accountId') accountId: string,
    @Param('path') path: string,
  ) {
    await this.mailboxService.remove(accountId, decodeURIComponent(path));
  }
}
