import type { ReturnKind } from '@/services/api/returns-api';

export const RETURN_KIND_LABEL: Record<ReturnKind, string> = { RETURN_ONLY: 'Return only', REFUND_ONLY: 'Refund only', RETURN_REFUND: 'Return and refund' };
