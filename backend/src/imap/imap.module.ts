import { Global, Module, forwardRef } from '@nestjs/common';
import { ImapService } from './imap.service';
import { ConnectionPoolService } from './connection-pool.service';
import { CredentialService } from './credential.service';
import { AccountModule } from '../account/account.module';

@Global()
@Module({
  imports: [forwardRef(() => AccountModule)],
  providers: [ImapService, ConnectionPoolService, CredentialService],
  exports: [ImapService, ConnectionPoolService, CredentialService],
})
export class ImapModule {}
