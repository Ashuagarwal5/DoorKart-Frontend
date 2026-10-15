import type { ApiError } from '@/services/api/api-error';

/** A lost/invalid response cannot establish that a cash recording failed. */
export function isReturnResultUnknown(error: ApiError): boolean {
  return error.isConnectionProblem || error.code === 'BAD_RESPONSE' || error.code === 'SERVER_ERROR' || (error.status ?? 0) >= 500;
}
