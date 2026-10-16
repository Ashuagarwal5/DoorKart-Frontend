/** Browser requests stay on the admin origin; Next.js forwards them to the backend. */
export const API_BASE_URL = '';
export const ADMIN_API_URL = `${API_BASE_URL}/api/v1/admin`;
export const API_CONFIG_ERROR: string | null = null;

export const REQUEST_TIMEOUT_MS = 15_000;
/** Videos are large, so an upload gets longer than an ordinary request. */
export const UPLOAD_TIMEOUT_MS = 180_000;

/** Local uploads use the media proxy; external media addresses remain unchanged. */
export function resolveMediaUrl(url: string): string {
  return url.startsWith('/uploads/') ? `${API_BASE_URL}${url}` : url;
}
