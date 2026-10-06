/**
 * Where the BuyNest backend is. The browser calls it directly (the sign-in cookie belongs
 * to the backend's origin, so the Next.js server could never forward it), which means this
 * must be an address the BROWSER can reach, and the backend's CORS_ORIGINS must list this
 * app's own address.
 *
 * Development falls back to http://localhost:4000. A production build never falls back:
 * a missing address is reported as a configuration error instead of quietly aiming at
 * localhost.
 */

const DEVELOPMENT_FALLBACK = 'http://localhost:4000';

function resolveBaseUrl(): { url: string; error: null } | { url: null; error: string } {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return { url: configured.replace(/\/+$/, ''), error: null };
  }
  if (process.env.NODE_ENV !== 'production') {
    return { url: DEVELOPMENT_FALLBACK, error: null };
  }
  return { url: null, error: 'NEXT_PUBLIC_API_BASE_URL is not set. Set it before building the admin panel.' };
}

const resolved = resolveBaseUrl();

export const API_CONFIG_ERROR: string | null = resolved.error;
/** Origin only, e.g. "http://localhost:4000". Empty when the configuration is invalid. */
export const API_BASE_URL: string = resolved.url ?? '';
export const ADMIN_API_URL = `${API_BASE_URL}/api/v1/admin`;

export const REQUEST_TIMEOUT_MS = 15_000;
/** Videos are large, so an upload gets longer than an ordinary request. */
export const UPLOAD_TIMEOUT_MS = 180_000;

/**
 * Turns a stored media address into one the browser can load. Files uploaded through this
 * panel are stored as "/uploads/<name>" and live on the backend; anything else is already a
 * full web address and is left alone.
 */
export function resolveMediaUrl(url: string): string {
  return url.startsWith('/uploads/') ? `${API_BASE_URL}${url}` : url;
}
