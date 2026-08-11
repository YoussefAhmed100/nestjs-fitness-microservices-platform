export const QUEUES = {
  AUTH: 'auth_queue',
  PRODUCT: 'product_queue',
  ORDER: 'order_queue',
  NOTIFICATION: 'notification_queue',

  NOTIFICATION_RETRY: 'notification_retry_queue',
  NOTIFICATION_DLQ: 'notification_dlq',
} as const;

export const EXCHANGES = {
  NOTIFICATION_RETRY: 'notification_retry_exchange',
} as const;

export const PATTERNS = {
  // Auth (sync - request/response)
  AUTH_VALIDATE_TOKEN: 'auth.validate_token',
  AUTH_LOGIN: 'auth.login',
  AUTH_REGISTER: 'auth.register',
  AUTH_REFRESH: 'auth.refresh',
  AUTH_LOGOUT: 'auth.logout',

  // Product (sync)
  PRODUCT_FIND_BY_ID: 'product.find_by_id',
  PRODUCT_CHECK_STOCK: 'product.check_stock',
  PRODUCT_DECREMENT_STOCK: 'product.decrement_stock',

  // Order (sync)
  ORDER_CREATE: 'order.create',
  ORDER_FIND_BY_ID: 'order.find_by_id',

  // Events (async - fire and forget)
  USER_REGISTERED: 'user.registered',
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status_changed',
} as const;