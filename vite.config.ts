import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from './package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Tauri expects a fixed dev port; bind to all interfaces for sandbox preview.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0',
    // Allow sandbox preview hosts (the packaged desktop app does not use the
    // dev server at all — Tauri serves from dist/).
    allowedHosts: true,
  },
  build: {
    target: 'es2021',
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
