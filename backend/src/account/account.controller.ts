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
import { AccountService } from './account.service';
import { ImapService } from '../imap/imap.service';
import { SmtpService } from '../send/smtp.service';
import type { AccountCreateDto, AccountUpdateDto, ConnectionTestResult } from '@vellum/shared';

@Controller('accounts')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly imapService: ImapService,
    private readonly smtpService: SmtpService,
  ) {}

  @Get()
  async findAll() {
    return this.accountService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const account = await this.accountService.findById(id);
    // Return redacted version for API consumers
    return {
      ...account,
      imap: { ...account.imap, auth: { ...account.imap.auth, pass: undefined } },
      smtp: { ...account.smtp, auth: { ...account.smtp.auth, pass: undefined } },
    };
  }

  @Post()
  async create(@Body() dto: AccountCreateDto) {
    return this.accountService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: AccountUpdateDto) {
    return this.accountService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.accountService.delete(id);
  }

  @Post(':id/test')
  async testConnection(@Param('id') id: string): Promise<ConnectionTestResult> {
    let imapResult: ConnectionTestResult['imap'] = { success: false };
    let smtpResult: ConnectionTestResult['smtp'] = { success: false };

    try {
      const imapOk = await this.imapService.testConnection(id);
      imapResult = { success: imapOk };
    } catch (e) {
      imapResult = { success: false, error: (e as Error).message };
    }

    try {
      const smtpOk = await this.smtpService.testConnection(id);
      smtpResult = { success: smtpOk };
    } catch (e) {
      smtpResult = { success: false, error: (e as Error).message };
    }

    return { imap: imapResult, smtp: smtpResult };
  }
}
