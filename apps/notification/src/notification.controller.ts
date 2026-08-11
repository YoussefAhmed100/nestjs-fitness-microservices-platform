import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { PATTERNS } from '@app/common/constants/queues.constant';
import type { UserRegisteredEvent } from '@app/common/events/user-registered.event';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(PATTERNS.USER_REGISTERED)
  async handleUserRegistered(@Payload() data: UserRegisteredEvent, @Ctx() context: RmqContext) {
    await this.notificationService.handleWelcomeEmailEvent(
      data,
      context.getChannelRef(),
      context.getMessage(),
    );
  }
}