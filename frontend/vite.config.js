import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_API_BASE_URL || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/__shortly_redirect__': {
          target: backend,
          changeOrigin: true,
          rewrite: (path) => path.replace('/__shortly_redirect__', '')
        }
      }
    }
  };
});
