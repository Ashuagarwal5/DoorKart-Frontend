/**
 * How statuses are SHOWN: labels and colours. Which status an order may move to is never
 * decided here; the server sends `allowedNextStatuses` and the panel offers only those.
 */

export const ORDER_STATUS_LABEL = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  DELIVERY_FAILED: 'Delivery failed',
};

export const ORDER_STATUS_TONE = {
  PLACED: 'info',
  CONFIRMED: 'primary',
  PACKED: 'primary',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  DELIVERY_FAILED: 'danger',
};

export const PAYMENT_STATUS_LABEL = {
  PENDING: 'Pending',
  COLLECTED: 'Collected',
  REFUNDED: 'Refunded',
};

export const PAYMENT_STATUS_TONE = {
  PENDING: 'warning',
  COLLECTED: 'success',
  REFUNDED: 'neutral',
};

/** What the button for moving an order to each status says, and how serious it looks. */
export const ORDER_ACTION = {
  PLACED: { label: 'Mark as placed', variant: 'secondary' },
  CONFIRMED: { label: 'Confirm order', variant: 'primary' },
  PACKED: { label: 'Mark as packed', variant: 'primary' },
  OUT_FOR_DELIVERY: { label: 'Send out for delivery', variant: 'primary' },
  DELIVERED: { label: 'Mark as delivered', variant: 'primary' },
  CANCELLED: { label: 'Cancel order', variant: 'danger' },
  DELIVERY_FAILED: { label: 'Delivery failed', variant: 'secondary' },
};

/** Past tense for the confirmation toast. */
export const ORDER_ACTION_DONE = {
  PLACED: 'Order marked as placed.',
  CONFIRMED: 'Order confirmed.',
  PACKED: 'Order packed.',
  OUT_FOR_DELIVERY: 'Order sent out for delivery.',
  DELIVERED: 'Order delivered.',
  CANCELLED: 'Order cancelled.',
  DELIVERY_FAILED: 'Delivery marked as failed.',
};

export const ORDER_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'DELIVERY_FAILED',
];

export const PAYMENT_STATUSES = ['PENDING', 'COLLECTED', 'REFUNDED'];
