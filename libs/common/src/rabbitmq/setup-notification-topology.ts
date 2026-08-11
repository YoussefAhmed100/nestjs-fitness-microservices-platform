import * as amqp from 'amqplib';
import { EXCHANGES, QUEUES } from '@app/common';

const RETRY_TTL_MS = 10_000;

export async function setupNotificationTopology(
  rabbitMqUrl: string,
): Promise<void> {
  const connection = await amqp.connect(rabbitMqUrl);
  const channel = await connection.createChannel();

  await channel.assertExchange(
    EXCHANGES.NOTIFICATION_RETRY,
    'direct',
    { durable: true },
  );

  await channel.assertQueue(QUEUES.NOTIFICATION_RETRY, {
    durable: true,
    messageTtl: RETRY_TTL_MS,
    deadLetterExchange: '',
    deadLetterRoutingKey: QUEUES.NOTIFICATION,
  });

  await channel.bindQueue(
    QUEUES.NOTIFICATION_RETRY,
    EXCHANGES.NOTIFICATION_RETRY,
    '',
  );

  await channel.assertQueue(QUEUES.NOTIFICATION_DLQ, {
    durable: true,
  });

  await channel.close();
  await connection.close();
}