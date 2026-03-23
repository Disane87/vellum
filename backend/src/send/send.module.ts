import { Module, forwardRef } from '@nestjs/common';
import { SendController } from './send.controller';
import { SmtpService } from './smtp.service';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [forwardRef(() => AccountModule)],
  controllers: [SendController],
  providers: [SmtpService],
  exports: [SmtpService],
})
export class SendModule {}
