import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import app from './server/app.js';

/**
 * Plugin para integrar el servidor Express (/api/*) directamente durante `npm run dev`.
 */
function expressApiPlugin() {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          app(req, res, next);
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), expressApiPlugin()],
  server: {
    port: 5173,
    host: true
  },
  test: {
    environment: 'node',
    testTimeout: 20000
  }
});
