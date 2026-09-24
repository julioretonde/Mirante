import { defineConfig } from 'vite';
import fs from 'node:fs';
import { serviceWorkerPlugin } from './scripts/vite-plugin-sw.mjs';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // caminhos relativos: funciona em qualquer pasta, no Capacitor e no GitHub Pages
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __SINGLE_FILE__: 'false',
  },
  server: {
    host: true, // acessível pela rede local (celular)
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1000,
  },
  plugins: [serviceWorkerPlugin()],
});
