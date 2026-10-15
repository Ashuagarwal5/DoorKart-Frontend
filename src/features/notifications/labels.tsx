import { Badge, type Tone } from '@/components/ui/badge';
import type { NotificationStatus } from '@/services/api/notifications-api';

const STATUS_TONE: Record<NotificationStatus, Tone> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SENT: 'success',
  FAILED: 'danger',
  SKIPPED: 'neutral',
};

const STATUS_LABEL: Record<NotificationStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SENT: 'Sent to FCM',
  FAILED: 'Failed',
  SKIPPED: 'Skipped',
};

export const STATUSES: NotificationStatus[] = ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED'];

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

/** What each status means. "Sent" is provider acceptance, never confirmed device delivery. */
export const STATUS_HINT =
  '“Sent to FCM” means Firebase accepted the message. It does not confirm that a device received or showed it.';

const ERROR_LABEL: Record<string, string> = {
  NO_DEVICE: 'No registered device',
  DEVICE_INVALID: 'Device registration expired',
  PUSH_DISABLED: 'Push notifications are turned off',
  NOT_CONFIGURED: 'Firebase is not configured',
  AUTH: 'Firebase rejected the credentials',
  QUOTA: 'Rate limited by Firebase',
  UNAVAILABLE: 'Firebase temporarily unavailable',
  NETWORK: 'Could not reach Firebase',
  INVALID_PAYLOAD: 'Message rejected by Firebase',
  INVALID_TOKEN: 'Invalid device token',
  UNREGISTERED: 'Device unregistered',
  SENDER_MISMATCH: 'Device belongs to another Firebase project',
  INTERNAL: 'Internal error',
  UNKNOWN: 'Unknown error',
};

export const errorLabel = (category: string | null): string => (category ? (ERROR_LABEL[category] ?? category) : '—');
