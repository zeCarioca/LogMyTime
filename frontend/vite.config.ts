import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/repos': 'http://localhost:8000',
      '/time': 'http://localhost:8000',
      '/commits': 'http://localhost:8000',
      '/data': 'http://localhost:8000',
    }
  }
});
