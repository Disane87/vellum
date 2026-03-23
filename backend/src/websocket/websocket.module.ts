import { Module } from '@nestjs/common';
import { MailGateway } from './mail.gateway';
import { IdleService } from './idle.service';

@Module({
  providers: [MailGateway, IdleService],
  exports: [IdleService],
})
export class WebsocketModule {}
