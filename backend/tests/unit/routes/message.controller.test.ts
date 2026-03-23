import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { MessageController } from '../../../src/message/message.controller';
import { MessageService } from '../../../src/message/message.service';
import { AttachmentService } from '../../../src/message/attachment.service';

describe('MessageController', () => {
  let controller: MessageController;
  let messageService: Record<string, ReturnType<typeof vi.fn>>;
  let attachmentService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    messageService = {
      list: vi.fn().mockResolvedValue({ messages: [], total: 0, page: 1, pageSize: 20, mailbox: 'INBOX' }),
      getOne: vi.fn().mockResolvedValue({ uid: 1, subject: 'Test' }),
      delete: vi.fn().mockResolvedValue(undefined),
      move: vi.fn().mockResolvedValue(undefined),
      copy: vi.fn().mockResolvedValue(undefined),
      setFlags: vi.fn().mockResolvedValue(undefined),
    };

    attachmentService = {
      download: vi.fn().mockResolvedValue({
        stream: { pipe: vi.fn() },
        contentType: 'application/pdf',
        filename: 'file.pdf',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [
        { provide: MessageService, useValue: messageService },
        { provide: AttachmentService, useValue: attachmentService },
      ],
    }).compile();

    controller = module.get<MessageController>(MessageController);
  });

  it('should list messages', async () => {
    await controller.list('acc-1', 'INBOX', '1', '20');
    expect(messageService.list).toHaveBeenCalledWith('acc-1', 'INBOX', 1, 20);
  });

  it('should get a single message', async () => {
    const result = await controller.getOne('acc-1', 'INBOX', '100');
    expect(messageService.getOne).toHaveBeenCalledWith('acc-1', 'INBOX', 100);
    expect(result.uid).toBe(1);
  });

  it('should delete a message', async () => {
    await controller.delete('acc-1', 'INBOX', '100');
    expect(messageService.delete).toHaveBeenCalledWith('acc-1', 'INBOX', 100);
  });

  it('should move messages', async () => {
    await controller.move('acc-1', 'INBOX', { uids: [1, 2], destination: 'Trash' });
    expect(messageService.move).toHaveBeenCalledWith('acc-1', 'INBOX', [1, 2], 'Trash');
  });

  it('should copy messages', async () => {
    await controller.copy('acc-1', 'INBOX', { uids: [1], destination: 'Archive' });
    expect(messageService.copy).toHaveBeenCalledWith('acc-1', 'INBOX', [1], 'Archive');
  });

  it('should set flags on messages', async () => {
    await controller.setFlags('acc-1', 'INBOX', {
      uids: [1, 2],
      flags: ['\\Seen' as any],
      action: 'add',
    });
    expect(messageService.setFlags).toHaveBeenCalledWith('acc-1', 'INBOX', [1, 2], ['\\Seen'], 'add');
  });

  it('should decode URL-encoded mailbox path', async () => {
    await controller.list('acc-1', 'Folder%2FSubfolder', '1', '20');
    expect(messageService.list).toHaveBeenCalledWith('acc-1', 'Folder/Subfolder', 1, 20);
  });

  it('should default page and pageSize', async () => {
    await controller.list('acc-1', 'INBOX');
    expect(messageService.list).toHaveBeenCalledWith('acc-1', 'INBOX', 1, 20);
  });
});
