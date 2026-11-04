import { afterEach, expect, it, vi } from 'vitest';

import nextConfig from '../../../next.config';
import { resolveMediaUrl } from './config';

afterEach(() => vi.unstubAllEnvs());

it('proxies admin and media paths without removing backend prefixes', async () => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://backend.example/');
  expect(await nextConfig.rewrites?.()).toEqual([
    { source: '/api/v1/admin/:path*', destination: 'https://backend.example/api/v1/admin/:path*' },
    { source: '/uploads/:path*', destination: 'https://backend.example/uploads/:path*' },
  ]);
  expect(resolveMediaUrl('/uploads/product.mp4')).toBe('/uploads/product.mp4');
  expect(resolveMediaUrl('https://cdn.example/product.jpg')).toBe('https://cdn.example/product.jpg');
});

it('requires an explicit backend target for production', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');
  expect(() => nextConfig.rewrites?.()).toThrow('must be set');
});

it('uses the local backend in development', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');
  expect(await nextConfig.rewrites?.()).toContainEqual({
    source: '/api/v1/admin/:path*', destination: 'http://localhost:4000/api/v1/admin/:path*',
  });
});
