import { Injectable, Logger } from '@nestjs/common';

const MAX_RETRIES = 3;

@Injectable()
export class NotificationRetryService {
  private readonly logger = new Logger(NotificationRetryService.name);

  handleFailure(identifier: string, channel: any, msg: any): void {
    const retryCount = this.getRetryCount(msg);
    this.logger.warn(`Attempt ${retryCount + 1} failed for: ${identifier}`);

    if (retryCount >= MAX_RETRIES) {
      channel.sendToQueue('notification_dlq', msg.content, { headers: msg.properties.headers });
      channel.ack(msg);
    } else {
      channel.nack(msg, false, false);
    }
  }

  private getRetryCount(msg: any): number {
    const xDeath = msg.properties?.headers?.['x-death'];
    if (!xDeath || !Array.isArray(xDeath)) return 0;
    return xDeath.reduce((sum: number, entry: any) => sum + (entry.count || 0), 0);
  }
}