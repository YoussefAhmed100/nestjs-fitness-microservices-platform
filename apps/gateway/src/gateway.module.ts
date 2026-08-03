import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './auth/auth.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL!],
            queue: 'auth_queue',
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: 'PRODUCT_SERVICE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL!],
            queue: 'product_queue',
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: 'ORDER_SERVICE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL!],
            queue: 'order_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController],
})
export class AppModule {}