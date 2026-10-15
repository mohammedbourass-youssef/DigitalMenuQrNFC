import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// LOCAL development version of vite.config.ts.
//
// The Docker image builds with vite.config.ts; this file is only used when you
// run the dev server by hand:
//
//   npm run dev -- --config vite.config.local.ts
//
// Differences from the shared config:
//   * port 5174 instead of 80 — port 80 belongs to the local gateway container
//     (docker-compose), so `strictPort` on 80 would fail while the stack runs.
//   * strictPort: false — fall back to the next free port instead of erroring.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5174,
    strictPort: false,
  },
});
