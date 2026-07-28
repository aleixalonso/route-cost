import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  resolve: {
    alias: {
      '@route-cost/contracts': new URL(
        '../../packages/contracts/src/index.ts',
        import.meta.url,
      ).pathname,
      '@route-cost/fuel-prices': new URL(
        '../../packages/fuel-prices/src/index.ts',
        import.meta.url,
      ).pathname,
    },
  },
  build: {
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
