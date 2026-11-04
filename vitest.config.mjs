import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { include: ["src/**/*.test.js"] },
  server: {
    proxy: {
      // With options
      '/api': {
        target: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.doorkart.in',
        changeOrigin: true,
        secure: false, // For self-signed HTTPS certs
        rewrite: (path) => path.replace(/^\/api/, ''),
        // ws: true, // Enable WebSocket proxying
      },
    },
  },
});
