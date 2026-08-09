export enum NotificationChannel {
  EMAIL = 'EMAIL',
}

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
}

export interface NotificationStrategy {
  send(payload: NotificationPayload): Promise<void>;
}