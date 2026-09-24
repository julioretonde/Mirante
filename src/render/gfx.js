// =============================================================================
//  Utilidades de desenho: transforma as matrizes de pixels (src/art) em
//  canvas prontos para drawImage, com cache. Também desenha texto com a fonte
//  pixel e efeitos 8-bit (pontilhado em vez de transparência).
// =============================================================================

import { PALETTE, codeToIndex } from '../art/palette.js';
import { GLYPHS, GLYPH_W, GLYPH_H, ACCENTS, ACCENTED, TITLE_GLYPHS } from '../art/font.js';

export const COLORS = PALETTE;

export function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const spriteCache = new WeakMap();

/**
 * Converte uma matriz (lista de strings com códigos da paleta) em canvas.
 * `flip` espelha horizontalmente. O resultado fica em cache.
 */
export function sprite(rows, flip = false) {
  let entry = spriteCache.get(rows);
  if (!entry) {
    entry = {};
    spriteCache.set(rows, entry);
  }
  const key = flip ? 'f' : 'n';
  if (entry[key]) return entry[key];
  const h = rows.length;
  const w = rows[0].length;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const idx = codeToIndex(row[flip ? w - 1 - x : x]);
      if (idx < 0) continue;
      const hex = PALETTE[idx];
      const o = (y * w + x) * 4;
      img.data[o] = parseInt(hex.slice(1, 3), 16);
      img.data[o + 1] = parseInt(hex.slice(3, 5), 16);
      img.data[o + 2] = parseInt(hex.slice(5, 7), 16);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  entry[key] = c;
  return c;
}

/** Desenha uma matriz de pixels em (x, y), arredondando para pixel inteiro. */
export function drawSprite(ctx, rows, x, y, flip = false) {
  ctx.drawImage(sprite(rows, flip), Math.round(x), Math.round(y));
}

/** Converte uma IndexImage (backgrounds.js) em canvas. */
export function indexImageToCanvas(img) {
  const c = createCanvas(img.w, img.h);
  const ctx = c.getContext('2d');
  const data = ctx.createImageData(img.w, img.h);
  const rgb = PALETTE.map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
  for (let i = 0; i < img.data.length; i++) {
    const v = img.data[i];
    if (!v) continue;
    const c3 = rgb[v - 1];
    data.data[i * 4] = c3[0];
    data.data[i * 4 + 1] = c3[1];
    data.data[i * 4 + 2] = c3[2];
    data.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

const patternCache = new Map();

/**
 * Preenche um retângulo com um pontilhado (xadrez) de uma cor da paleta —
 * o jeito 8-bit de "escurecer" a tela sem criar cores novas.
 * density: 2 = 50% (xadrez), 4 = 25%.
 */
export function ditherRect(ctx, x, y, w, h, colorIdx, density = 2) {
  const key = colorIdx + ':' + density;
  let pat = patternCache.get(key);
  if (!pat) {
    const n = density === 4 ? 4 : 2;
    const c = createCanvas(n, n);
    const cx = c.getContext('2d');
    cx.fillStyle = PALETTE[colorIdx];
    if (n === 2) {
      cx.fillRect(0, 0, 1, 1);
      cx.fillRect(1, 1, 1, 1);
    } else {
      cx.fillRect(0, 0, 1, 1);
      cx.fillRect(2, 2, 1, 1);
    }
    pat = ctx.createPattern(c, 'repeat');
    patternCache.set(key, pat);
  }
  ctx.fillStyle = pat;
  ctx.fillRect(x, y, w, h);
}

export function rect(ctx, x, y, w, h, colorIdx) {
  ctx.fillStyle = PALETTE[colorIdx];
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Moldura de painel no estilo 8-bit. */
export function panel(ctx, x, y, w, h, fill = 1, border = 5) {
  rect(ctx, x + 1, y, w - 2, h, 0);
  rect(ctx, x, y + 1, w, h - 2, 0);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, border);
  rect(ctx, x + 2, y + 2, w - 4, h - 4, 0);
  rect(ctx, x + 3, y + 3, w - 6, h - 6, fill);
}

// --------------------------------------------------------------- TEXTO ------
const CHAR_ADV = GLYPH_W + 1;
let glyphMask = null; // canvas branco com todos os glifos
let glyphIndex = null;
const tinted = new Map();

function buildGlyphMask() {
  const chars = Object.keys(GLYPHS);
  glyphIndex = new Map(chars.map((ch, i) => [ch, i]));
  const accentKeys = Object.keys(ACCENTS);
  accentKeys.forEach((k, i) => glyphIndex.set('accent:' + k, chars.length + i));
  const total = chars.length + accentKeys.length;
  const c = createCanvas(total * GLYPH_W, GLYPH_H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  chars.forEach((ch, i) => {
    GLYPHS[ch].forEach((row, y) => {
      for (let x = 0; x < GLYPH_W; x++) if (row[x] === '#') ctx.fillRect(i * GLYPH_W + x, y, 1, 1);
    });
  });
  accentKeys.forEach((k, i) => {
    ACCENTS[k].forEach((row, y) => {
      for (let x = 0; x < GLYPH_W; x++) if (row[x] === '#') ctx.fillRect((chars.length + i) * GLYPH_W + x, y, 1, 1);
    });
  });
  glyphMask = c;
}

function atlasFor(colorIdx) {
  if (!glyphMask) buildGlyphMask();
  let a = tinted.get(colorIdx);
  if (a) return a;
  a = createCanvas(glyphMask.width, glyphMask.height);
  const ctx = a.getContext('2d');
  ctx.drawImage(glyphMask, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = PALETTE[colorIdx];
  ctx.fillRect(0, 0, a.width, a.height);
  tinted.set(colorIdx, a);
  return a;
}

export function textWidth(str) {
  return Math.max(0, str.length * CHAR_ADV - 1);
}

function drawRaw(ctx, str, x, y, colorIdx) {
  const atlas = atlasFor(colorIdx);
  let cx = x;
  for (const raw of str.toUpperCase()) {
    let ch = raw;
    let accent = null;
    if (ACCENTED[ch]) [ch, accent] = ACCENTED[ch];
    const gi = glyphIndex.get(ch);
    if (gi !== undefined && ch !== ' ') ctx.drawImage(atlas, gi * GLYPH_W, 0, GLYPH_W, GLYPH_H, cx, y, GLYPH_W, GLYPH_H);
    if (accent) {
      const ai = glyphIndex.get('accent:' + accent);
      const ay = accent === 'cedil' ? y + GLYPH_H : y - 2;
      ctx.drawImage(atlas, ai * GLYPH_W, 0, GLYPH_W, 2, cx, ay, GLYPH_W, 2);
    }
    cx += CHAR_ADV;
  }
}

/**
 * Escreve texto com a fonte pixel.
 * opts: { align: 'left'|'center'|'right', outline: cor, shadow: cor }
 */
export function text(ctx, str, x, y, colorIdx = 6, opts = {}) {
  const w = textWidth(str);
  let tx = Math.round(x);
  if (opts.align === 'center') tx = Math.round(x - w / 2);
  else if (opts.align === 'right') tx = Math.round(x - w);
  const ty = Math.round(y);
  if (opts.outline !== undefined && opts.outline !== null) {
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      drawRaw(ctx, str, tx + dx, ty + dy, opts.outline);
  } else if (opts.shadow !== undefined && opts.shadow !== null) {
    drawRaw(ctx, str, tx + 1, ty + 1, opts.shadow);
  }
  drawRaw(ctx, str, tx, ty, colorIdx);
  return w;
}

// --------------------------------------------------------------- TÍTULO -----
let titleCanvas = null;

/** Logotipo "ASCENDA": letras 11x12 em escala 2, com contorno e faixas de cor. */
export function titleLogo() {
  if (titleCanvas) return titleCanvas;
  const word = 'ASCENDA';
  const S = 2;
  const gap = 2;
  const gw = 11 * S;
  const gh = 12 * S;
  const w = word.length * gw + (word.length - 1) * gap + 6;
  const h = gh + 8;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  // máscara das letras
  const mask = createCanvas(w, h);
  const m = mask.getContext('2d');
  m.fillStyle = '#fff';
  [...word].forEach((ch, i) => {
    const g = TITLE_GLYPHS[ch];
    const ox = 3 + i * (gw + gap);
    g.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') m.fillRect(ox + x * S, 3 + y * S, S, S);
    });
  });
  const md = m.getImageData(0, 0, w, h).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && md[(y * w + x) * 4 + 3] > 0;
  const put = (x, y, idx) => {
    ctx.fillStyle = PALETTE[idx];
    ctx.fillRect(x, y, 1, 1);
  };
  // sombra projetada (violeta escuro) e contorno
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (on(x, y - 3) && !on(x, y)) put(x, y, codeToIndex('s'));
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (on(x, y)) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) if (on(x + dx, y + dy)) near = true;
      if (near) put(x, y, 0);
    }
  // corpo em faixas: brilho, ouro, brasa, escarlate
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      const ly = y - 3;
      let col = codeToIndex('f');
      if (!on(x, y - 1)) col = 6; // brilho no topo de cada traço
      else if (ly >= gh * 0.55 && ly < gh * 0.8) col = codeToIndex('e');
      else if (ly >= gh * 0.8) col = codeToIndex('d');
      put(x, y, col);
    }
  titleCanvas = c;
  return c;
}
