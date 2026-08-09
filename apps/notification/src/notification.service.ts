import { Injectable, Logger } from '@nestjs/common';
import type { UserRegisteredEvent } from '@app/common/events/user-registered.event';
import { NotificationChannel } from './strategies/notification-strategy.interface';
import { welcomeEmailTemplate } from './templates/welcome-email.template';
import { NotificationFactory } from './factory/notification.factory';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly factory: NotificationFactory) {}

  async sendWelcomeEmail(data: UserRegisteredEvent): Promise<void> {
    const { subject, body } = welcomeEmailTemplate(data.name);
    const strategy = this.factory.getStrategy(NotificationChannel.EMAIL);
    try {
      await strategy.send({ to: data.email, subject, body });
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${data.email}`, err);
    }
  }
}