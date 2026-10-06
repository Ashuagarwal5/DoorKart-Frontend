import type { Tone } from '@/components/ui/badge';
import type { OrderStatus, PaymentStatus } from '@/types/api';

/**
 * How statuses are SHOWN: labels and colours. Which status an order may move to is never
 * decided here; the server sends `allowedNextStatuses` and the panel offers only those.
 */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  DELIVERY_FAILED: 'Delivery failed',
};

export const ORDER_STATUS_TONE: Record<OrderStatus, Tone> = {
  PLACED: 'info',
  CONFIRMED: 'primary',
  PACKED: 'primary',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  DELIVERY_FAILED: 'danger',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  COLLECTED: 'Collected',
  REFUNDED: 'Refunded',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  PENDING: 'warning',
  COLLECTED: 'success',
  REFUNDED: 'neutral',
};

/** What the button for moving an order to each status says, and how serious it looks. */
export const ORDER_ACTION: Record<OrderStatus, { label: string; variant: 'primary' | 'secondary' | 'danger' }> = {
  PLACED: { label: 'Mark as placed', variant: 'secondary' },
  CONFIRMED: { label: 'Confirm order', variant: 'primary' },
  PACKED: { label: 'Mark as packed', variant: 'primary' },
  OUT_FOR_DELIVERY: { label: 'Send out for delivery', variant: 'primary' },
  DELIVERED: { label: 'Mark as delivered', variant: 'primary' },
  CANCELLED: { label: 'Cancel order', variant: 'danger' },
  DELIVERY_FAILED: { label: 'Delivery failed', variant: 'secondary' },
};

/** Past tense for the confirmation toast. */
export const ORDER_ACTION_DONE: Record<OrderStatus, string> = {
  PLACED: 'Order marked as placed.',
  CONFIRMED: 'Order confirmed.',
  PACKED: 'Order packed.',
  OUT_FOR_DELIVERY: 'Order sent out for delivery.',
  DELIVERED: 'Order delivered.',
  CANCELLED: 'Order cancelled.',
  DELIVERY_FAILED: 'Delivery marked as failed.',
};
