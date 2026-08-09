import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { NotificationModule } from './notification.module';
import { QUEUES } from '@app/common/constants/queues.constant';
import { AllRpcExceptionsFilter } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL!],
        queue: QUEUES.NOTIFICATION,
        queueOptions: { durable: true },
      },
    },
  );
   app.useGlobalFilters(new AllRpcExceptionsFilter());
  await app.listen();
  console.log('Notification microservice is listening...');
}
bootstrap();
