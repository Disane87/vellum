import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SendController } from '../../../src/send/send.controller';
import { SmtpService } from '../../../src/send/smtp.service';

describe('SendController', () => {
  let controller: SendController;
  let smtpService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    smtpService = {
      send: vi.fn().mockResolvedValue({ messageId: '<test@mock>' }),
      saveDraft: vi.fn().mockResolvedValue({ uid: 42 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SendController],
      providers: [{ provide: SmtpService, useValue: smtpService }],
    }).compile();

    controller = module.get<SendController>(SendController);
  });

  it('should send an email', async () => {
    const dto = {
      to: [{ address: 'bob@example.com' }],
      subject: 'Hello',
      bodyText: 'World',
    };

    const result = await controller.send('acc-1', dto);
    expect(smtpService.send).toHaveBeenCalledWith({ ...dto, accountId: 'acc-1' });
    expect(result.messageId).toBe('<test@mock>');
  });

  it('should save a draft', async () => {
    const dto = {
      to: [{ address: 'bob@example.com' }],
      subject: 'Draft',
      bodyText: 'In progress',
    };

    const result = await controller.saveDraft('acc-1', dto);
    expect(smtpService.saveDraft).toHaveBeenCalledWith({ ...dto, accountId: 'acc-1' });
    expect(result.uid).toBe(42);
  });

  it('should update a draft', async () => {
    const dto = {
      to: [{ address: 'bob@example.com' }],
      subject: 'Updated Draft',
      bodyText: 'Updated content',
    };

    await controller.updateDraft('acc-1', '42', dto);
    expect(smtpService.saveDraft).toHaveBeenCalledWith({
      ...dto,
      accountId: 'acc-1',
      draftUid: 42,
    });
  });
});
