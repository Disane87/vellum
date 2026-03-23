import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { SanitizerService } from './sanitizer.service';
import { AttachmentService } from './attachment.service';

@Module({
  controllers: [MessageController],
  providers: [MessageService, SanitizerService, AttachmentService],
  exports: [MessageService],
})
export class MessageModule {}
