import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { MailboxController } from '../../../src/mailbox/mailbox.controller';
import { MailboxService } from '../../../src/mailbox/mailbox.service';

describe('MailboxController', () => {
  let controller: MailboxController;
  let mailboxService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    mailboxService = {
      list: vi.fn().mockResolvedValue([
        { path: 'INBOX', name: 'INBOX', totalMessages: 10, unseenMessages: 3 },
      ]),
      create: vi.fn().mockResolvedValue(undefined),
      rename: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailboxController],
      providers: [{ provide: MailboxService, useValue: mailboxService }],
    }).compile();

    controller = module.get<MailboxController>(MailboxController);
  });

  it('should list mailboxes', async () => {
    const result = await controller.list('acc-1');
    expect(mailboxService.list).toHaveBeenCalledWith('acc-1');
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('INBOX');
  });

  it('should create a mailbox', async () => {
    await controller.create('acc-1', { path: 'NewFolder' });
    expect(mailboxService.create).toHaveBeenCalledWith('acc-1', 'NewFolder');
  });

  it('should rename a mailbox', async () => {
    await controller.rename('acc-1', 'OldName', { newPath: 'NewName' });
    expect(mailboxService.rename).toHaveBeenCalledWith('acc-1', 'OldName', 'NewName');
  });

  it('should delete a mailbox', async () => {
    await controller.remove('acc-1', 'TrashFolder');
    expect(mailboxService.remove).toHaveBeenCalledWith('acc-1', 'TrashFolder');
  });

  it('should decode URL-encoded path', async () => {
    await controller.remove('acc-1', 'Folder%2FSubfolder');
    expect(mailboxService.remove).toHaveBeenCalledWith('acc-1', 'Folder/Subfolder');
  });
});
