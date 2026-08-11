import { Test, TestingModule } from '@nestjs/testing';

import { NotificationService } from '../../src/notification.service';
import { NotificationFactory } from '../../src/factory/notification.factory';
import { NotificationRetryService } from '../../src/notification-retry.service';
import { NotificationChannel } from '../../src/strategies/notification-strategy.interface';

import type { UserRegisteredEvent } from '@app/common/events/user-registered.event';

describe('NotificationService', () => {
  let service: NotificationService;

  const strategy = {
    send: jest.fn(),
  };

  const factory = {
    getStrategy: jest.fn(),
  };

  const retryService = {
    handleFailure: jest.fn(),
  };

  const channel = {
    ack: jest.fn(),
    nack: jest.fn(),
    sendToQueue: jest.fn(),
  };

  const msg = {
    content: Buffer.from('test-message'),
    properties: {
      headers: {},
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    factory.getStrategy.mockReturnValue(strategy);
    strategy.send.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NotificationFactory,
          useValue: factory,
        },
        {
          provide: NotificationRetryService,
          useValue: retryService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should send welcome email and acknowledge the message', async () => {
    const data: UserRegisteredEvent = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Youssef',
      registeredAt: new Date(),
    };

    await service.handleWelcomeEmailEvent(data, channel, msg);

    expect(factory.getStrategy).toHaveBeenCalledWith(
      NotificationChannel.EMAIL,
    );

    expect(strategy.send).toHaveBeenCalledWith({
      to: data.email,
      subject: expect.any(String),
      body: expect.any(String),
    });

    expect(channel.ack).toHaveBeenCalledWith(msg);

    expect(retryService.handleFailure).not.toHaveBeenCalled();
  });

  it('should handle email sending failure', async () => {
    const data: UserRegisteredEvent = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Youssef',
      registeredAt: new Date(),
    };

    const error = new Error('Email sending failed');

    strategy.send.mockRejectedValue(error);

    await service.handleWelcomeEmailEvent(data, channel, msg);

    expect(strategy.send).toHaveBeenCalledWith({
      to: data.email,
      subject: expect.any(String),
      body: expect.any(String),
    });

    expect(retryService.handleFailure).toHaveBeenCalledWith(
      data.email,
      channel,
      msg,
    );

    expect(channel.ack).not.toHaveBeenCalled();
  });
});