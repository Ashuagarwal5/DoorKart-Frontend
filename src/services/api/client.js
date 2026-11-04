import { ApiError } from '@/services/api/api-error';
import { ADMIN_API_URL, API_CONFIG_ERROR, REQUEST_TIMEOUT_MS } from '@/services/api/config';

let onUnauthorized = null;

/** The auth context registers itself here, so any request can end the session on a 401. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function buildUrl(path, query) {
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    // Empty values are left out entirely, so "no filter" never reaches the server as "".
    if (value !== undefined && value !== null && value !== '') {
      queryParams.set(key, String(value));
    }
  }
  const search = queryParams.toString();
  return `${ADMIN_API_URL}${path}${search ? `?${search}` : ''}`;
}

/**
 * The only function that talks to the backend. It resolves with the response's `data`, or
 * rejects with an ApiError; it never resolves with an error shape.
 *
 * Every request carries the sign-in cookie (`credentials: 'include'`). The panel never sees
 * or stores the session token: it is HttpOnly. Nothing about a request or response, such
 * as passwords or customer addresses, is ever logged.
 */
export async function apiRequest(path, options = {}) {
  if (API_CONFIG_ERROR) {
    throw new ApiError('CONFIGURATION_ERROR', API_CONFIG_ERROR);
  }

  const controller = new AbortController();
  let didTimeOut = false;
  const timeout = setTimeout(() => {
    didTimeOut = true;
    controller.abort();
  }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener('abort', forwardAbort);

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  let response;
  let payload;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        // For FormData the browser sets the Content-Type itself, with the multipart boundary.
        ...(options.body === undefined || isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : isFormData ? options.body : JSON.stringify(options.body),
      signal: controller.signal,
    });
    // Read inside the try, so the timeout also covers a body that never finishes.
    payload = await response.json().catch(() => undefined);
  } catch (error) {
    // A request the screen cancelled itself is not a failure to report.
    if (options.signal?.aborted && !didTimeOut) {
      throw error;
    }
    throw didTimeOut
      ? new ApiError('TIMEOUT', 'The request timed out.')
      : new ApiError('NETWORK_ERROR', 'The server could not be reached.');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', forwardAbort);
  }

  if (!response.ok) {
    const error = toApiError(response.status, payload);
    if (response.status === 401 && !options.isAuthCheck) {
      onUnauthorized?.();
    }
    throw error;
  }

  if (typeof payload !== 'object' || payload === null || payload.success !== true) {
    throw new ApiError('BAD_RESPONSE', 'Unexpected response.', { status: response.status });
  }
  return payload.data;
}

/** Builds the error from the backend's `{ success: false, error: { code, message, details } }`. */
export function toApiError(status, payload) {
  const error =
    typeof payload === 'object' && payload !== null ? payload.error : undefined;

  if (typeof error === 'object' && error !== null) {
    const { code, message, details } = error;
    if (typeof code === 'string' && typeof message === 'string') {
      return new ApiError(code, message, { status, details });
    }
  }
  // Not the backend's own format: a proxy page, a crashed server, a wrong address.
  return status >= 500
    ? new ApiError('SERVER_ERROR', 'The server had a problem.', { status })
    : new ApiError('BAD_RESPONSE', 'Unexpected response.', { status });
}
