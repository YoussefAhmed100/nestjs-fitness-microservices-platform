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

// ============================================================
// Auth Patterns (sync - request/response)
// ============================================================
export const AUTH_PATTERNS = {
  AUTH_VALIDATE_TOKEN: 'auth.validate_token',
  AUTH_LOGIN: 'auth.login',
  AUTH_REGISTER: 'auth.register',
  AUTH_REFRESH: 'auth.refresh',
  AUTH_LOGOUT: 'auth.logout',
} as const;

// ============================================================
// Product Patterns (sync - request/response)
// ============================================================
export const PRODUCT_PATTERNS = {
  PRODUCT_CREATE: 'product.create',
  PRODUCT_FIND_ALL: 'product.find_all',
  PRODUCT_FIND_BY_ID: 'product.find_by_id',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_CHECK_STOCK: 'product.check_stock',
  PRODUCT_DECREMENT_STOCK: 'product.decrement_stock',
} as const;

// ============================================================
// Order Patterns (sync - request/response)
// ============================================================
export const ORDER_PATTERNS = {
  ORDER_CREATE: 'order.create',
  ORDER_FIND_BY_ID: 'order.find_by_id',
} as const;

// ============================================================
// Events (async - fire and forget)
// ============================================================
export const EVENT_PATTERNS = {
  USER_REGISTERED: 'user.registered',
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status_changed',
} as const;


export const PATTERNS = {
  ...AUTH_PATTERNS,
  ...PRODUCT_PATTERNS,
  ...ORDER_PATTERNS,
  ...EVENT_PATTERNS,
} as const;