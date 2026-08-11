import { Injectable, Logger } from '@nestjs/common';
import type { UserRegisteredEvent } from '@app/common/events/user-registered.event';
import { NotificationChannel } from './strategies/notification-strategy.interface';
import { welcomeEmailTemplate } from './templates/welcome-email.template';
import { NotificationFactory } from './factory/notification.factory';
import { NotificationRetryService } from './notification-retry.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly factory: NotificationFactory,
    private readonly retryService: NotificationRetryService
  ) {}

async handleWelcomeEmailEvent(data: UserRegisteredEvent, channel: any, msg: any): Promise<void> {
  try {
    const { subject, body } = welcomeEmailTemplate(data.name);
    const strategy = this.factory.getStrategy(NotificationChannel.EMAIL);
    await strategy.send({ to: data.email, subject, body });
    channel.ack(msg);
  } catch (err) {
    this.retryService.handleFailure(data.email, channel, msg);
  }
}
}