import { Global, Module } from '@nestjs/common';
import { CacheDbService } from './cache-db.service';

@Global()
@Module({
  providers: [CacheDbService],
  exports: [CacheDbService],
})
export class CacheModule {}
