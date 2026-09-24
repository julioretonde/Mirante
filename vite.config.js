import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  // Caminhos relativos: o mesmo build funciona no navegador e dentro do WebView do Capacitor.
  base: './',
  define: {
    // Modo debug existe em todo build, exceto no de release (vite build --mode release),
    // onde o código de debug é removido do bundle.
    __MIRANTE_DEBUG__: JSON.stringify(mode !== 'release'),
    // Build de prévia (npm run build:preview): abre voando, para testar pelo navegador
    __MIRANTE_PREVIEW__: JSON.stringify(mode === 'preview'),
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
}));
