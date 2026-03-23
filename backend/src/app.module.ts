import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { AccountModule } from './account/account.module';
import { MailboxModule } from './mailbox/mailbox.module';
import { MessageModule } from './message/message.module';
import { SendModule } from './send/send.module';
import { SearchModule } from './search/search.module';
import { ImapModule } from './imap/imap.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ImapModule,
    AccountModule,
    MailboxModule,
    MessageModule,
    SendModule,
    SearchModule,
    WebsocketModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
