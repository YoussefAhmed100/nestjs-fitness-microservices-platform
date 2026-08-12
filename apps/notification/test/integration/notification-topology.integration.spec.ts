import 'dotenv/config';
import * as amqp from 'amqplib';
import { EXCHANGES, QUEUES, setupNotificationTopology } from '@app/common';

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
  });

  afterAll(async () => {
    await channel?.close();
    await connection?.close();
  });

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

    channel.publish(
      EXCHANGES.NOTIFICATION_RETRY,
      '',
      Buffer.from(JSON.stringify(testMessage)),
    );

    const message = await new Promise<amqp.ConsumeMessage | null>((resolve) => {
      channel.consume(QUEUES.NOTIFICATION_RETRY, (msg) => resolve(msg), {
        noAck: true,
      });
    });

    expect(message).not.toBeNull();

    const receivedMessage = JSON.parse(message!.content.toString());

    expect(receivedMessage).toEqual(testMessage);
  });
});
