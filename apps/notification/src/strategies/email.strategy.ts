import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationStrategy, NotificationPayload } from './notification-strategy.interface';

@Injectable()
export class EmailStrategy implements NotificationStrategy {
  private readonly logger = new Logger(EmailStrategy.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async send(payload: NotificationPayload): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: payload.to,
      subject: payload.subject,
      html: payload.body,
    });
    this.logger.log(`Email sent to ${payload.to}`);
  }
}