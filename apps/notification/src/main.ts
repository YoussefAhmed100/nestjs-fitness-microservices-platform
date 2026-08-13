import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { NotificationModule } from './notification.module';
import { EXCHANGES, QUEUES, setupNotificationTopology } from '@app/common';

async function bootstrap() {
  const rabbitMqUrl = process.env.RABBITMQ_URL as string;

  await setupNotificationTopology(rabbitMqUrl);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationModule,
    {
      transport: Transport.RMQ,

      options: {
        urls: [rabbitMqUrl],

        queue: QUEUES.NOTIFICATION,

        queueOptions: {
          durable: true,
          deadLetterExchange: EXCHANGES.NOTIFICATION_RETRY,
          deadLetterRoutingKey: '',
        },

        noAck: false,
      },
    },
  );

  await app.listen();

  console.log('Notification microservice is listening...');
}

bootstrap();
