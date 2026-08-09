import { Injectable } from '@nestjs/common';
import { EmailStrategy } from '../strategies/email.strategy';
import { NotificationChannel, NotificationStrategy } from '../strategies/notification-strategy.interface';

@Injectable()
export class NotificationFactory {
  constructor(private readonly emailStrategy: EmailStrategy) {}

  getStrategy(channel: NotificationChannel): NotificationStrategy {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.emailStrategy;
      default:
        throw new Error(`No strategy registered for channel: ${channel}`);
    }
  }
}