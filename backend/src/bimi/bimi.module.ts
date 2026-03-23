import { Module } from '@nestjs/common';
import { BimiController } from './bimi.controller';
import { BimiService } from './bimi.service';

@Module({
  controllers: [BimiController],
  providers: [BimiService],
  exports: [BimiService],
})
export class BimiModule {}
