#!/usr/bin/env node
// =============================================================================
//  npm run build:single — gera "jogo.html" na raiz do projeto: o jogo inteiro
//  (código, arte, sons) em UM arquivo, que abre com duplo clique, sem servidor
//  e sem internet. Não tem service worker nem manifest (não são necessários).
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const outDir = path.join(root, 'dist-single');

/** Remove o manifest e embute o favicon como data URI. */
function singleHtmlTweaks() {
  return {
    name: 'ascenda-single-html',
    transformIndexHtml(html) {
      const fav = path.join(root, 'public', 'icons', 'favicon-32.png');
      const data = fs.existsSync(fav) ? 'data:image/png;base64,' + fs.readFileSync(fav).toString('base64') : '';
      return html
        .replace(/\s*<link rel="manifest"[^>]*>/, '')
        .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
        .replace(/(<link rel="icon"[^>]*href=")[^"]*(")/, `$1${data}$2`);
    },
  };
}

await build({
  configFile: false,
  root,
  base: './',
  publicDir: false,
  logLevel: 'warn',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __SINGLE_FILE__: 'true',
  },
  plugins: [viteSingleFile({ removeViteModuleLoader: true }), singleHtmlTweaks()],
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
  },
});

const target = path.join(root, 'jogo.html');
fs.copyFileSync(path.join(outDir, 'index.html'), target);
fs.rmSync(outDir, { recursive: true, force: true });
const kb = (fs.statSync(target).size / 1024).toFixed(0);
console.log(`\n  ✔ jogo.html gerado (${kb} KB). Abra com duplo clique — funciona offline.\n`);
