import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true, // binds to 0.0.0.0 for LAN/mobile access
    port: 8000, // port 8000 is permitted by UFW firewall
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});
