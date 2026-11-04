/** Every failed API call rejects with one of these; `message` is always safe to show. */
export class ApiError extends Error {

  constructor(code, message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status;
    this.details = options.details;
    this.fieldErrors = code === 'VALIDATION_ERROR' ? toFieldErrors(options.details) : {};
  }

  /** The backend could not be reached at all, or did not answer in time. */
  get isConnectionProblem() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }
}

/** The backend reports validation problems as [{ field: "mrpPaise", message: "..." }]. */
function toFieldErrors(details) {
  const errors = {};
  if (Array.isArray(details)) {
    for (const entry of details) {
      if (typeof entry === 'object' && entry !== null) {
        const { field, message } = entry;
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
export function describeApiError(error) {
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

export function toApiError(error) {
  return error instanceof ApiError
    ? error
    : new ApiError('SERVER_ERROR', 'Something went wrong.');
}

/** The message to show for anything caught from an API call, known error or not. */
export function getErrorMessage(error) {
  return describeApiError(toApiError(error));
}
