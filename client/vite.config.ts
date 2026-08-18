import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API_TARGET = process.env.API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  // Explicit, so the root package scripts can build/serve the client without
  // first changing directory.
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.PORT ?? 5173),
    // Same-origin in production, so dev proxies both HTTP and the WebSocket
    // upgrade to keep cookies first-party in development too.
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: false },
      '/socket.io': { target: API_TARGET, ws: true, changeOrigin: false },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split the big, rarely-changing dependencies into their own chunks so a
        // code change does not force everyone to re-download React and friends.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            'sonner',
          ],
          data: [
            '@tanstack/react-query',
            'socket.io-client',
            'zod',
            'react-hook-form',
            '@hookform/resolvers/zod',
          ],
        },
      },
    },
  },
});
