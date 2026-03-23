import { Module } from '@nestjs/common';
import { MailGateway } from './mail.gateway';
import { IdleService } from './idle.service';
import { ImapModule } from '../imap/imap.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [ImapModule, AccountModule],
  providers: [MailGateway, IdleService],
  exports: [IdleService, MailGateway],
})
export class WebsocketModule {}
