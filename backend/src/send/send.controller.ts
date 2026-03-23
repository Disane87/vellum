import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SmtpService } from './smtp.service';
import type { ComposeMessage } from '@imap-mail/shared';

@Controller('accounts/:accountId')
export class SendController {
  constructor(private readonly smtpService: SmtpService) {}

  @Post('send')
  async send(
    @Param('accountId') accountId: string,
    @Body() dto: Omit<ComposeMessage, 'accountId'>,
  ) {
    return this.smtpService.send({ ...dto, accountId });
  }

  @Post('drafts')
  async saveDraft(
    @Param('accountId') accountId: string,
    @Body() dto: Omit<ComposeMessage, 'accountId'>,
  ) {
    return this.smtpService.saveDraft({ ...dto, accountId });
  }

  @Put('drafts/:uid')
  async updateDraft(
    @Param('accountId') accountId: string,
    @Param('uid') uid: string,
    @Body() dto: Omit<ComposeMessage, 'accountId'>,
  ) {
    return this.smtpService.saveDraft({ ...dto, accountId, draftUid: parseInt(uid, 10) });
  }
}
