import { NotificationRetryService } from '../../src/notification-retry.service';

describe('NotificationRetryService', () => {
  let service: NotificationRetryService;

  const channel = {
    ack: jest.fn(),
    nack: jest.fn(),
    sendToQueue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationRetryService();
  });

  it('should nack message when retry count is less than max retries', () => {
    const msg = {
      content: Buffer.from('test-message'),
      properties: {
        headers: {},
      },
    };

    service.handleFailure('test@example.com', channel, msg);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.sendToQueue).not.toHaveBeenCalled();
  });

  it('should nack message when retry count is 2', () => {
    const msg = {
      content: Buffer.from('test-message'),
      properties: {
        headers: {
          'x-death': [
            { count: 2 },
          ],
        },
      },
    };

    service.handleFailure('test@example.com', channel, msg);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.sendToQueue).not.toHaveBeenCalled();
  });

  it('should send message to DLQ and acknowledge when max retries is reached', () => {
    const msg = {
      content: Buffer.from('test-message'),
      properties: {
        headers: {
          'x-death': [
            { count: 3 },
          ],
        },
      },
    };

    service.handleFailure('test@example.com', channel, msg);

    expect(channel.sendToQueue).toHaveBeenCalledWith(
      'notification_dlq',
      msg.content,
      {
        headers: msg.properties.headers,
      },
    );

    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.nack).not.toHaveBeenCalled();
  });
});