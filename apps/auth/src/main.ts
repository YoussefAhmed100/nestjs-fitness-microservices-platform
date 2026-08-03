import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AuthModule } from './auth.module';
import { AllRpcExceptionsFilter } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AuthModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL!],
      queue: 'auth_queue',
      queueOptions: { durable: true },
    }, 
  });
    app.useGlobalFilters(new AllRpcExceptionsFilter());
  
    
  await app.listen();
  console.log('Auth microservice is listening...');
}
bootstrap();