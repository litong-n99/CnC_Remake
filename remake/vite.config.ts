import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/CnC_Remake/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    include: ['fengari-web'],
  },
});
