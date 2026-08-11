import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import { EmailStrategy } from './strategies/email.strategy';
import { NotificationFactory } from './factory/notification.factory';
import { NotificationService } from './notification.service';
import { NotificationRetryService } from './notification-retry.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [NotificationController],
  providers: [EmailStrategy, NotificationFactory,NotificationService,NotificationRetryService],
})
export class NotificationModule {}