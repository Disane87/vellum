import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { SnoozeController } from './snooze.controller';
import { ContactsController } from './contacts.controller';
import { TagController, MessageTagController } from './tag.controller';
import { MessageService } from './message.service';
import { SanitizerService } from './sanitizer.service';
import { AttachmentService } from './attachment.service';
import { ThreadingService } from './threading.service';

@Module({
  controllers: [MessageController, SnoozeController, ContactsController, TagController, MessageTagController],
  providers: [MessageService, SanitizerService, AttachmentService, ThreadingService],
  exports: [MessageService, ThreadingService],
})
export class MessageModule {}
