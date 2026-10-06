/** Failures that happen before or instead of a proper answer from the backend. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'SERVER_ERROR' | 'BAD_RESPONSE' | 'CONFIGURATION_ERROR';

/** Codes the UI branches on. The backend sends others too; they arrive as plain strings. */
export type KnownErrorCode =
  | ClientErrorCode
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'TOO_MANY_REQUESTS'
  | 'VALIDATION_ERROR'
  | 'ORIGIN_NOT_ALLOWED'
  | 'FORBIDDEN';

export type FieldErrors = Record<string, string>;

type ApiErrorOptions = { status?: number; details?: unknown };

/** Every failed API call rejects with one of these; `message` is always safe to show. */
export class ApiError extends Error {
  readonly code: KnownErrorCode | (string & {});
  readonly status: number | undefined;
  readonly details: unknown;
  /** For VALIDATION_ERROR: the backend's per-field messages, keyed by field name. */
  readonly fieldErrors: FieldErrors;

  constructor(code: ApiError['code'], message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status;
    this.details = options.details;
    this.fieldErrors = code === 'VALIDATION_ERROR' ? toFieldErrors(options.details) : {};
  }

  /** The backend could not be reached at all, or did not answer in time. */
  get isConnectionProblem(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }
}

/** The backend reports validation problems as [{ field: "mrpPaise", message: "..." }]. */
function toFieldErrors(details: unknown): FieldErrors {
  const errors: FieldErrors = {};
  if (Array.isArray(details)) {
    for (const entry of details) {
      if (typeof entry === 'object' && entry !== null) {
        const { field, message } = entry as { field?: unknown; message?: unknown };
        if (typeof field === 'string' && typeof message === 'string' && !(field in errors)) {
          errors[field] = message;
        }
      }
    }
  }
  return errors;
}

/**
 * What to show for a failure. The backend's own messages are written for people and are
 * shown as they are, with three exceptions: a server fault says nothing technical, a
 * network problem says what to check, and a rejected origin says how to fix it.
 */
export function describeApiError(error: ApiError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Could not reach the server. Check that the backend is running and your connection is working.';
    case 'TIMEOUT':
      return 'The server took too long to answer. Please try again.';
    case 'SERVER_ERROR':
      return 'The server had a problem. Please try again in a moment.';
    case 'BAD_RESPONSE':
      return 'The server sent an answer this panel could not read. Please try again.';
    case 'CONFIGURATION_ERROR':
      return 'The admin panel is not configured correctly (the server address is missing).';
    case 'ORIGIN_NOT_ALLOWED':
      return "The server does not allow requests from this address. Add this panel's address to the backend's CORS_ORIGINS.";
    default:
      return error.message;
  }
}

export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError('SERVER_ERROR', 'Something went wrong.');
}
