
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

import { QUEUES } from '@app/common';
import { ProductModule } from './product.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ProductModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL as string],
        queue: QUEUES.PRODUCT,
        queueOptions: {
          durable: true,
        },
      },
    },
  );

  await app.listen();
  console.log('Product microservice is listening on', QUEUES.PRODUCT);
}
bootstrap();