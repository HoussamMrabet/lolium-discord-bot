import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The SPA is built to web/dist and served by the Express API (same origin).
// In dev, proxy /api to the running API so cookies + fetch "just work".
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
