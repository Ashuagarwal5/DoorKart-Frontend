import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, describeApiError } from '@/services/api/api-error';
import { apiRequest, setUnauthorizedHandler, toApiError } from '@/services/api/client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function stubFetch(handler: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe('apiRequest', () => {
  it('sends the sign-in cookie, builds the query without empty values, and unwraps data', async () => {
    const fetchMock = stubFetch(async () => json(200, { success: true, data: { ok: 1 } }));

    const data = await apiRequest<{ ok: number }>('/orders', {
      query: { page: 2, status: 'PLACED', search: '', paymentStatus: undefined, flag: false },
    });

    expect(data).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.credentials).toBe('include');
    const search = new URL(String(url)).searchParams;
    expect(search.get('page')).toBe('2');
    expect(search.get('status')).toBe('PLACED');
    expect(search.get('flag')).toBe('false');
    // Empty and undefined filters never reach the server.
    expect(search.has('search')).toBe(false);
    expect(search.has('paymentStatus')).toBe(false);
    expect(String(url)).toContain('/api/v1/admin/orders');
  });

  it('sends JSON bodies with the right header', async () => {
    const fetchMock = stubFetch(async () => json(200, { success: true, data: {} }));

    await apiRequest('/products', { method: 'POST', body: { name: 'x' } });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"name":"x"}');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('turns the backend error envelope into an ApiError, with per-field validation messages', async () => {
    stubFetch(async () =>
      json(400, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The request is not valid.',
          details: [
            { field: 'mrpPaise', message: 'Too big' },
            { field: 'sku', message: 'Required' },
            { field: 'sku', message: 'ignored: the first message for a field wins' },
          ],
        },
      })
    );

    const error = await apiRequest('/products', { method: 'POST', body: {} }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
      fieldErrors: { mrpPaise: 'Too big', sku: 'Required' },
    });
  });

  it('signs the panel out on a 401 from a normal request', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stubFetch(async () => json(401, { success: false, error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } }));

    const error = await apiRequest('/orders').catch((e: unknown) => e);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED', status: 401 });
  });

  it('does not treat a 401 from the login or "who am I" calls as a session expiry', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stubFetch(async () =>
      json(401, { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' } })
    );

    const error = await apiRequest('/auth/login', { method: 'POST', body: {}, isAuthCheck: true }).catch((e: unknown) => e);

    expect(handler).not.toHaveBeenCalled();
    expect(error).toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('reports an unreachable server as a connection problem', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    const error = (await apiRequest('/orders').catch((e: unknown) => e)) as ApiError;

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.isConnectionProblem).toBe(true);
    expect(describeApiError(error)).toMatch(/backend is running/);
  });

  it('reports a request that never finishes as a timeout', async () => {
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })
    );

    const error = (await apiRequest('/orders', { timeoutMs: 20 }).catch((e: unknown) => e)) as ApiError;

    expect(error.code).toBe('TIMEOUT');
    expect(error.isConnectionProblem).toBe(true);
  });

  it('lets a screen cancel its own request without reporting an error to the user', async () => {
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })
    );
    const controller = new AbortController();

    const pending = apiRequest('/orders', { signal: controller.signal }).catch((e: unknown) => e);
    controller.abort();
    const result = await pending;

    expect(result).not.toBeInstanceOf(ApiError);
  });

  it('rejects a success response that is not in the backend envelope', async () => {
    stubFetch(async () => json(200, { hello: 'world' }));

    const error = (await apiRequest('/orders').catch((e: unknown) => e)) as ApiError;

    expect(error.code).toBe('BAD_RESPONSE');
  });
});

describe('toApiError and describeApiError', () => {
  it('maps a 5xx that is not the backend’s format to a calm server error', () => {
    const error = toApiError(502, '<html>Bad gateway</html>');
    expect(error.code).toBe('SERVER_ERROR');
    expect(describeApiError(error)).not.toMatch(/gateway|html/i);
  });

  it('shows the backend’s own message for ordinary rejections', () => {
    const error = toApiError(409, {
      success: false,
      error: { code: 'ADJUSTMENT_BELOW_RESERVED', message: 'Stock cannot go below the 6 units already reserved.' },
    });
    expect(describeApiError(error)).toBe('Stock cannot go below the 6 units already reserved.');
  });

  it('explains a rejected origin so the fix is obvious', () => {
    const error = toApiError(403, {
      success: false,
      error: { code: 'ORIGIN_NOT_ALLOWED', message: 'This request did not come from the admin panel.' },
    });
    expect(describeApiError(error)).toMatch(/CORS_ORIGINS/);
  });
});
