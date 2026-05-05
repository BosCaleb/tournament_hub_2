import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // ↓↓↓ Added for Docker-on-Windows dev. No-op outside containers.
  server: {
    host: true,        // bind 0.0.0.0 so the port is reachable from the host
    port: 5173,
    strictPort: true,
    watch: {
      // Polling is required because filesystem events don't reliably cross
      // the Windows → WSL2 → container bind-mount boundary
      usePolling: true,
      interval: 100,
    },
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
  // ↑↑↑
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/lib/**', 'src/context/**'],
      exclude: ['src/test/**'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor';
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/@supabase')) return 'supabase';
        },
      },
    },
  },
})
