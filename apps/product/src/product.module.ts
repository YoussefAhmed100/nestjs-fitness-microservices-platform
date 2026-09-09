import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { QUEUES } from '@app/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
       ConfigModule.forRoot({
      isGlobal: true,
    }),
   ClientsModule.register([
      {
        name: 'PRODUCT_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as string],
          queue: QUEUES.PRODUCT,
          queueOptions: { durable: true },
        },
      },
    ]),
    DatabaseModule
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
