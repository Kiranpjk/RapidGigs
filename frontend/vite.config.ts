import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isDev = mode === 'development';
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      historyApiFallback: true,
      proxy: {
        '/api': {
          // In development, proxy to local backend. In production, the frontend
          // uses VITE_API_BASE which points to the deployed backend URL.
          target: isDev
            ? 'http://localhost:3001'
            : 'https://rapidgigs.onrender.com',
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
