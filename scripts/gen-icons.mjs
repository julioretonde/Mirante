#!/usr/bin/env node
// =============================================================================
//  Gera os ícones do app (PWA e Capacitor) a partir da MESMA arte em código
//  do jogo (src/art). Nenhuma imagem é desenhada à mão fora do código.
//
//  Saída:
//    public/icons/icon-192.png, icon-512.png, maskable-512.png,
//    apple-touch-icon.png (180), favicon-32.png
//    assets/icon-only.png, icon-foreground.png, icon-background.png,
//    assets/splash.png, splash-dark.png   (para `npx @capacitor/assets generate`)
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from './lib/png.mjs';
import { PALETTE_RGB, codeToIndex } from '../src/art/palette.js';
import { KNIGHT_FRAMES } from '../src/art/knight.js';
import { TITLE_GLYPHS } from '../src/art/font.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = path.join(root, 'public', 'icons');
const assetsDir = path.join(root, 'assets');
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });

const K = (ch) => PALETTE_RGB[codeToIndex(ch)];

/** Cena base 32x32 em índices (null = transparente). */
function scene({ background = true, foreground = true } = {}) {
  const g = Array.from({ length: 32 }, () => new Array(32).fill(null));
  const set = (x, y, ch) => {
    if (x >= 0 && y >= 0 && x < 32 && y < 32) g[y][x] = ch;
  };
  if (background) {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) set(x, y, y < 18 ? 'k' : 'l');
    for (let x = 0; x < 32; x += 2) set(x + ((x >> 1) & 1), 17, 'l');
    for (const [x, y] of [
      [4, 4],
      [9, 2],
      [27, 13],
      [3, 12],
      [14, 5],
      [22, 3],
    ])
      set(x, y, '5');
  }
  if (foreground) {
    // estrela dourada
    const star = ['..f..', '.fff.', 'fffff', '.f.f.'];
    star.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && set(21 + i, 5 + j, ch)));
    set(23, 6, '6');
    // plataforma com grama
    for (let x = 6; x < 26; x++) {
      set(x, 26, x % 3 === 0 ? 'i' : 'j');
      set(x, 27, 'i');
      for (let y = 28; y < 32; y++) set(x, y, (x + y) % 5 === 0 ? '7' : '8');
    }
    for (let y = 26; y < 32; y++) {
      set(5, y, '0');
      set(26, y, '0');
    }
    // cavaleiro
    KNIGHT_FRAMES.idle1.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch !== '.') set(8 + i, 10 + j, ch);
      })
    );
  }
  return g;
}

function render(g, size, { round = false } = {}) {
  const n = g.length;
  const s = size / n;
  const bm = new Bitmap(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const ch = g[Math.min(n - 1, Math.floor(y / s))][Math.min(n - 1, Math.floor(x / s))];
      if (!ch) continue;
      if (round) {
        // cantos arredondados (só para o favicon)
        const r = size * 0.18;
        const cx = x < r ? r - x : x > size - 1 - r ? x - (size - 1 - r) : 0;
        const cy = y < r ? r - y : y > size - 1 - r ? y - (size - 1 - r) : 0;
        if (cx * cx + cy * cy > r * r) continue;
      }
      const c = PALETTE_RGB[codeToIndex(ch)];
      bm.set(x, y, c[0], c[1], c[2], 255);
    }
  return bm;
}

function write(file, bm) {
  fs.writeFileSync(file, bm.toPNG());
}

const full = scene();
write(path.join(iconsDir, 'icon-192.png'), render(full, 192));
write(path.join(iconsDir, 'icon-512.png'), render(full, 512));
write(path.join(iconsDir, 'maskable-512.png'), render(full, 512));
write(path.join(iconsDir, 'apple-touch-icon.png'), render(full, 180));
write(path.join(iconsDir, 'favicon-32.png'), render(full, 32, { round: true }));

// Capacitor (@capacitor/assets)
write(path.join(assetsDir, 'icon-only.png'), render(full, 1024));
write(path.join(assetsDir, 'icon-background.png'), render(scene({ foreground: false }), 1024));
write(path.join(assetsDir, 'icon-foreground.png'), render(scene({ background: false }), 1024));

// Tela de abertura: fundo escuro + logotipo + cavaleiro
function splash(size) {
  const bm = new Bitmap(size, size);
  const bg = K('1');
  bm.fill(0, 0, size, size, bg);
  const word = 'ASCENDA';
  const scale = Math.floor(size / 110);
  const gw = 11 * scale;
  const gap = 2 * scale;
  const totalW = word.length * gw + (word.length - 1) * gap;
  let ox = Math.floor((size - totalW) / 2);
  const oy = Math.floor(size * 0.36);
  const body = [K('f'), K('e'), K('d')];
  for (const ch of word) {
    TITLE_GLYPHS[ch].forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== '#') continue;
        const col = y < 7 ? body[0] : y < 10 ? body[1] : body[2];
        bm.fill(ox + x * scale, oy + y * scale, scale, scale, col);
      }
    });
    ox += gw + gap;
  }
  const ks = Math.floor(size / 80);
  const kx = Math.floor(size / 2 - 8 * ks);
  const ky = Math.floor(size * 0.55);
  KNIGHT_FRAMES.idle1.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch !== '.') bm.fill(kx + i * ks, ky + j * ks, ks, ks, PALETTE_RGB[codeToIndex(ch)]);
    })
  );
  return bm;
}
const sp = splash(2732);
write(path.join(assetsDir, 'splash.png'), sp);
write(path.join(assetsDir, 'splash-dark.png'), sp);

console.log('Ícones gerados em public/icons e assets/');
