import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PATTERNS } from '@app/common/constants/queues.constant';
import type { UserRegisteredEvent } from '@app/common/events/user-registered.event';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(PATTERNS.USER_REGISTERED)
  async handleUserRegistered(@Payload() data: UserRegisteredEvent) {
    await this.notificationService.sendWelcomeEmail(data);
  }
}