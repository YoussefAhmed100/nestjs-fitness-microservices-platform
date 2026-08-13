import 'dotenv/config';
import * as amqp from 'amqplib';
import { EXCHANGES, QUEUES, setupNotificationTopology } from '@app/common';
import { NotificationRetryService } from '../../src/notification-retry.service';

describe('Notification RabbitMQ Topology (Integration)', () => {
  let connection: amqp.ChannelModel;
  let channel: amqp.Channel;

  beforeAll(async () => {
    const rabbitMqUrl = process.env.RABBITMQ_URL;

    if (!rabbitMqUrl) {
      throw new Error('RABBITMQ_URL is not defined');
    }

    await setupNotificationTopology(rabbitMqUrl);

    connection = await amqp.connect(rabbitMqUrl);
    channel = await connection.createChannel();

    await channel.assertQueue(QUEUES.NOTIFICATION, {
      durable: true,
      deadLetterExchange: EXCHANGES.NOTIFICATION_RETRY,
      deadLetterRoutingKey: '',
    });

    await channel.purgeQueue(QUEUES.NOTIFICATION);
    await channel.purgeQueue(QUEUES.NOTIFICATION_RETRY);
    await channel.purgeQueue(QUEUES.NOTIFICATION_DLQ);
  });

  afterAll(async () => {
    await channel?.close();
    await connection?.close();
  });

const consumeOnce = async (queue: string, timeoutMs = 15_000): Promise<amqp.ConsumeMessage> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timeout waiting for message on ${queue}`)),
      timeoutMs,
    );
    channel.consume(
      queue,
      (msg) => {
        if (msg) {
          clearTimeout(timeout);
          channel
            .cancel(msg.fields.consumerTag)
            .then(() => resolve(msg))
            .catch(reject);
        }
      },
      { noAck: false },
    );
  });
};

  it('should create the notification retry exchange', async () => {
    await channel.checkExchange(EXCHANGES.NOTIFICATION_RETRY);
  });

  it('should create the notification retry queue', async () => {
    await expect(
      channel.checkQueue(QUEUES.NOTIFICATION_RETRY),
    ).resolves.toEqual(
      expect.objectContaining({
        queue: QUEUES.NOTIFICATION_RETRY,
      }),
    );
  });

  it('should create the notification DLQ', async () => {
    await expect(channel.checkQueue(QUEUES.NOTIFICATION_DLQ)).resolves.toEqual(
      expect.objectContaining({
        queue: QUEUES.NOTIFICATION_DLQ,
      }),
    );
  });

  it('should route messages from retry exchange to retry queue', async () => {
    const testMessage = {
      test: true,
      timestamp: Date.now(),
    };

    const messagePromise = consumeOnce(QUEUES.NOTIFICATION_RETRY);

    channel.publish(
      EXCHANGES.NOTIFICATION_RETRY,
      '',
      Buffer.from(JSON.stringify(testMessage)),
    );

    const message = await messagePromise;
    channel.ack(message);

    const receivedMessage = JSON.parse(message.content.toString());
    expect(receivedMessage).toEqual(testMessage);
  });

  it(
    'should move message from retry queue to notification queue after TTL expires',
    async () => {
      const testMessage = {
        test: true,
        timestamp: Date.now(),
      };

      const messagePromise = consumeOnce(QUEUES.NOTIFICATION);

      channel.publish(
        EXCHANGES.NOTIFICATION_RETRY,
        '',
        Buffer.from(JSON.stringify(testMessage)),
      );

      const message = await messagePromise;
      channel.ack(message);

      const receivedMessage = JSON.parse(message.content.toString());
      expect(receivedMessage).toEqual(testMessage);
    },
    15_000,
  );

  it(
    'should route message to DLQ after exceeding max retries (3) using the real NotificationRetryService',
    async () => {
      const retryService = new NotificationRetryService();

      const testMessage = {
        test: true,
        scenario: 'max-retries-dlq',
        timestamp: Date.now(),
      };

      channel.sendToQueue(
        QUEUES.NOTIFICATION,
        Buffer.from(JSON.stringify(testMessage)),
      );

      let msg = await consumeOnce(QUEUES.NOTIFICATION);
      retryService.handleFailure('test@example.com', channel, msg);

      msg = await consumeOnce(QUEUES.NOTIFICATION);
      retryService.handleFailure('test@example.com', channel, msg);

      msg = await consumeOnce(QUEUES.NOTIFICATION);
      retryService.handleFailure('test@example.com', channel, msg);

      msg = await consumeOnce(QUEUES.NOTIFICATION);
      retryService.handleFailure('test@example.com', channel, msg);

      const dlqMessage = await consumeOnce(QUEUES.NOTIFICATION_DLQ);
      channel.ack(dlqMessage);

      const dlqContent = JSON.parse(dlqMessage.content.toString());
      expect(dlqContent).toEqual(testMessage);
    },
    40_000,
  );
});