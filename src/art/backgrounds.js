// =============================================================================
//  Fundos com parallax — gerados proceduralmente em código, pixel a pixel,
//  usando somente as cores da paleta (sem gradientes suaves: faixas sólidas).
// -----------------------------------------------------------------------------
//  Cada bioma tem 2 ou 3 camadas. A câmera troca de tela de uma vez, então o
//  parallax acontece ENTRE telas: cada camada sobe uma fração (f) dos 320 px
//  quando o jogador sobe uma tela. Camadas "altas" (tall) cobrem o bioma
//  inteiro (ex.: o céu do castelo escurece conforme você sobe).
//  Módulo puro (sem DOM): gera imagens de índices de paleta.
// =============================================================================

import { codeToIndex } from './palette.js';

/** Imagem de índices (0 = transparente, i+1 = cor i). */
export class IndexImage {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h);
  }
  px(x, y, c) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c + 1;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    return this.data[(y | 0) * this.w + (x | 0)] - 1;
  }
  rect(x, y, w, h, c) {
    for (let j = Math.max(0, y | 0); j < Math.min(this.h, (y + h) | 0); j++)
      for (let i = Math.max(0, x | 0); i < Math.min(this.w, (x + w) | 0); i++) this.data[j * this.w + i] = c + 1;
  }
  disc(cx, cy, r, c) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.px(cx + x, cy + y, c);
  }
  /** Carimba uma matriz de códigos da paleta. */
  stamp(rows, x, y) {
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < rows[j].length; i++) {
        const k = codeToIndex(rows[j][i]);
        if (k >= 0) this.px(x + i, y + j, k);
      }
  }
  /** Polígono convexo/côncavo simples (preenchimento por varredura). */
  poly(pts, c) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if (y0 === y1) continue;
        const yy = y + 0.5;
        if ((yy >= y0 && yy < y1) || (yy >= y1 && yy < y0)) xs.push(x0 + ((yy - y0) * (x1 - x0)) / (y1 - y0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
    }
  }
  /** Troca uma cor por outra dentro de um polígono (para raios de luz). */
  recolorPoly(pts, map) {
    const tmp = new IndexImage(this.w, this.h);
    tmp.poly(pts, 0);
    for (let i = 0; i < this.data.length; i++) {
      if (!tmp.data[i]) continue;
      const cur = this.data[i] - 1;
      if (map[cur] !== undefined) this.data[i] = map[cur] + 1;
    }
  }
}

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 180;
const K = (ch) => codeToIndex(ch);

/** Faixas horizontais sólidas (de cima para baixo) cobrindo a imagem. */
function bands(img, colors, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let y = 0;
  colors.forEach((c, i) => {
    const h = i === colors.length - 1 ? img.h - y : Math.round((img.h * weights[i]) / total);
    // borda "serrilhada" de 2 px entre faixas (efeito de pontilhado 8-bit)
    img.rect(0, y, img.w, h, K(c));
    if (i > 0) for (let x = 0; x < img.w; x += 2) img.px(x + ((y >> 1) & 1), y - 1, K(c));
    y += h;
  });
}

function stars(img, r, y0, y1, count) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * img.w);
    const y = Math.floor(y0 + r() * (y1 - y0));
    img.px(x, y, K(r() < 0.3 ? '6' : '5'));
    if (r() < 0.12) {
      img.px(x - 1, y, K('4'));
      img.px(x + 1, y, K('4'));
      img.px(x, y - 1, K('4'));
      img.px(x, y + 1, K('4'));
    }
  }
}

// ------------------------------------------------------------ FLORESTA -------
function forestFar(h) {
  const img = new IndexImage(W, h);
  const r = rng(11);
  img.rect(0, 0, W, h, K('h'));
  // copa com céu aparecendo no topo do bioma
  img.rect(0, 0, W, 70, K('n'));
  for (let i = 0; i < 70; i++) img.disc(Math.floor(r() * W), 40 + Math.floor(r() * 50), 6 + Math.floor(r() * 10), K(r() < 0.5 ? 'i' : 'h'));
  for (let i = 0; i < 40; i++) img.disc(Math.floor(r() * W), 10 + Math.floor(r() * 40), 3 + Math.floor(r() * 6), K('i'));
  // raios de luz diagonais
  for (let i = 0; i < 5; i++) {
    const x0 = -40 + i * 50 + Math.floor(r() * 20);
    const wdt = 10 + Math.floor(r() * 12);
    img.recolorPoly(
      [
        [x0, 60],
        [x0 + wdt, 60],
        [x0 + wdt + h * 0.35, h],
        [x0 + h * 0.35, h],
      ],
      { [K('h')]: K('i'), [K('i')]: K('j') }
    );
  }
  // troncos distantes
  for (let x = 6; x < W; x += 26 + Math.floor(r() * 14)) {
    const tw = 4 + Math.floor(r() * 5);
    img.rect(x, 50, tw, h - 50, K('p'));
    for (let y = 90; y < h; y += 40 + Math.floor(r() * 60)) {
      const dir = r() < 0.5 ? -1 : 1;
      for (let k = 0; k < 8; k++) img.rect(x + (dir > 0 ? tw + k : -k - 1), y - k, 1, 2, K('p'));
    }
  }
  return img;
}

function forestMid(h) {
  const img = new IndexImage(W, h);
  const r = rng(12);
  const xs = [14, 76, 142];
  for (const bx of xs) {
    const x = bx + Math.floor(r() * 16) - 8;
    const tw = 10 + Math.floor(r() * 6);
    img.rect(x, 0, tw, h, K('g'));
    // sulcos da casca
    for (let y = 0; y < h; y += 5) img.px(x + 2 + ((y * 7) % (tw - 4)), y, K('1'));
    img.rect(x + tw - 2, 0, 2, h, K('1'));
    // galhos com folhagem
    for (let y = 30 + Math.floor(r() * 40); y < h - 20; y += 90 + Math.floor(r() * 70)) {
      const dir = x < W / 2 ? 1 : -1;
      const len = 18 + Math.floor(r() * 14);
      for (let k = 0; k < len; k++) img.rect(dir > 0 ? x + tw + k : x - k - 1, y - (k >> 2), 1, 3, K('g'));
      const lx = dir > 0 ? x + tw + len : x - len;
      img.disc(lx, y - (len >> 2) - 4, 9, K('g'));
      img.disc(lx + dir * 6, y - (len >> 2) - 8, 7, K('g'));
      img.disc(lx - dir * 2, y - (len >> 2) - 9, 5, K('h'));
    }
  }
  return img;
}

// -------------------------------------------------------------- RUÍNAS -------
function ruinsFar(h) {
  const img = new IndexImage(W, h);
  const r = rng(21);
  bands(img, ['k', 'p', 'p', '2'], [1, 3, 3, 1]);
  // aqueduto distante (arcos)
  for (let y = 60; y < h - 40; y += 150) {
    img.rect(0, y, W, 8, K('k'));
    for (let x = -10; x < W; x += 30) {
      img.rect(x, y + 8, 8, 60, K('k'));
      img.disc(x + 19, y + 18, 11, K('p'));
      img.rect(x + 8, y + 18, 22, 50, K('p'));
    }
  }
  // cachoeira
  const wx = 128;
  img.rect(wx, 0, 22, h, K('q'));
  for (let y = 0; y < h; y += 3) {
    img.px(wx + 3 + Math.floor(r() * 16), y, K('r'));
    img.px(wx + 3 + Math.floor(r() * 16), y + 1, K('r'));
  }
  img.rect(wx - 1, 0, 1, h, K('r'));
  // espuma e lago no pé da cachoeira (base do bioma)
  img.rect(0, h - 30, W, 30, K('q'));
  for (let x = 0; x < W; x += 3) img.px(x, h - 30 + (x % 2), K('r'));
  for (let i = 0; i < 10; i++) img.disc(wx + Math.floor(r() * 22), h - 30, 3 + Math.floor(r() * 3), K('6'));
  return img;
}

function ruinsMid(h) {
  const img = new IndexImage(W, h);
  const r = rng(22);
  for (let seg = 0; seg < h; seg += 320) {
    // colunas quebradas ao fundo
    for (const bx of [8, 60, 150]) {
      const x = bx + Math.floor(r() * 10);
      const top = seg + 40 + Math.floor(r() * 160);
      const cw = 12;
      img.rect(x - 2, top, cw + 4, 5, K('2'));
      img.rect(x, top + 5, cw, seg + 320 - top - 5, K('2'));
      for (let k = 2; k < cw; k += 3) img.rect(x + k, top + 6, 1, seg + 320 - top - 6, K('1'));
      // topo quebrado + musgo
      for (let k = 0; k < cw + 4; k++) if (r() < 0.5) img.px(x - 2 + k, top - 1, K('2'));
      for (let k = 0; k < cw + 4; k += 2) img.px(x - 2 + k, top, K('h'));
      for (let k = 0; k < 4; k++) img.rect(x + Math.floor(r() * cw), top + 5, 1, 3 + Math.floor(r() * 10), K('h'));
    }
    // arco partido
    const ay = seg + 200 + Math.floor(r() * 60);
    img.rect(80, ay, 50, 7, K('2'));
    img.rect(80, ay + 7, 7, 60, K('2'));
    img.disc(105, ay + 22, 16, K('2'));
    img.disc(105, ay + 24, 12, -1);
  }
  return img;
}

// -------------------------------------------------------------- CASTELO ------
function castleFar(h) {
  const img = new IndexImage(W, h);
  const r = rng(31);
  bands(img, ['1', 's', 't', 'u', 'v', 'e'], [4, 3, 3, 2, 1.2, 0.8]);
  stars(img, r, 0, h * 0.45, 90);
  // sol se pondo
  img.disc(60, h - 36, 20, K('e'));
  img.disc(60, h - 36, 16, K('f'));
  img.rect(0, h - 20, W, 20, K('d'));
  // nuvens compridas
  for (let i = 0; i < 12; i++) {
    const y = h * 0.4 + r() * h * 0.55;
    const x = r() * W;
    const len = 30 + r() * 60;
    img.rect(x, y, len, 2, K(y > h * 0.8 ? 'v' : 'u'));
    img.rect(x + 6, y - 2, len * 0.5, 2, K(y > h * 0.8 ? 'v' : 'u'));
  }
  return img;
}

function castleMid(h) {
  const img = new IndexImage(W, h);
  const r = rng(32);
  // silhuetas de torres distantes (aparecem nas primeiras telas do castelo)
  const towers = [
    [16, 16, 0.42],
    [70, 22, 0.58],
    [128, 14, 0.36],
    [156, 18, 0.5],
  ];
  for (const [x, tw, hf] of towers) {
    const top = Math.floor(h * (1 - hf));
    img.rect(x, top, tw, h - top, K('2'));
    img.rect(x + tw - 3, top, 3, h - top, K('s'));
    // telhado cônico com bandeirola
    img.poly(
      [
        [x - 3, top],
        [x + tw / 2, top - tw * 1.3],
        [x + tw + 3, top],
      ],
      K('s')
    );
    const tipY = Math.round(top - tw * 1.3);
    img.rect(x + tw / 2, tipY - 7, 1, 7, K('2'));
    img.rect(x + tw / 2 + 1, tipY - 7, 4, 2, K('c'));
    // janelas acesas
    for (let y = top + 10; y < h - 70; y += 22 + Math.floor(r() * 18)) {
      const wx = x + 3 + Math.floor(r() * Math.max(1, tw - 9));
      img.rect(wx, y, 3, 5, K('f'));
      img.px(wx + 1, y - 1, K('f'));
    }
  }
  // muralha baixa com ameias
  img.rect(0, h - 60, W, 60, K('2'));
  for (let x = 0; x < W; x += 8) img.rect(x, h - 64, 5, 4, K('2'));
  for (let x = 12; x < W; x += 40) img.rect(x, h - 40, 3, 6, K('e'));
  return img;
}

// -------------------------------------------------------------- CATEDRAL -----
function rose(img, cx, cy, rad, r) {
  const cols = ['m', 'd', 'f', 'u', 'n', 'j'];
  img.disc(cx, cy, rad + 3, K('0'));
  img.disc(cx, cy, rad, K('2'));
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    const px = cx + Math.cos(ang) * rad * 0.62;
    const py = cy + Math.sin(ang) * rad * 0.62;
    img.disc(Math.round(px), Math.round(py), Math.max(2, Math.floor(rad * 0.28)), K(cols[a % cols.length]));
  }
  img.disc(cx, cy, Math.floor(rad * 0.3), K('f'));
  img.disc(cx, cy, Math.floor(rad * 0.15), K('6'));
}

function lancet(img, x, y, w, hh, r) {
  const cols = ['m', 'u', 'd', 'n', 'f', 't'];
  img.rect(x - 2, y, w + 4, hh + 2, K('0'));
  img.disc(x + w / 2, y, w / 2 + 2, K('0'));
  img.rect(x, y, w, hh, K('2'));
  img.disc(x + w / 2, y, w / 2, K('2'));
  for (let j = y - w / 2 + 2; j < y + hh - 2; j += 5)
    for (let i = x + 1; i < x + w - 1; i += 3) img.rect(i, j, 2, 4, K(cols[Math.floor(r() * cols.length)]));
}

function cathedralFar(h) {
  const img = new IndexImage(W, h);
  const r = rng(41);
  img.rect(0, 0, W, h, K('1'));
  // blocos da parede
  for (let y = 0; y < h; y += 12)
    for (let x = ((y / 12) % 2) * 12; x < W; x += 24) {
      img.rect(x, y, 23, 1, K('s'));
      img.rect(x, y, 1, 12, K('s'));
    }
  for (let seg = 0; seg < h; seg += 320) {
    rose(img, 90, seg + 110, 30, r);
    lancet(img, 18, seg + 190, 16, 70, r);
    lancet(img, 146, seg + 190, 16, 70, r);
    // fachos de luz descendo das janelas
    img.recolorPoly(
      [
        [70, seg + 130],
        [110, seg + 130],
        [150, seg + 320],
        [90, seg + 320],
      ],
      { [K('1')]: K('s') }
    );
  }
  return img;
}

function cathedralMid(h) {
  const img = new IndexImage(W, h);
  for (let seg = 0; seg < h; seg += 320) {
    // arcada: dois pilares escuros e um arco ogival entre eles
    for (const x of [26, 146]) {
      img.rect(x, seg + 60, 10, 260, K('0'));
      img.rect(x - 3, seg + 56, 16, 5, K('0'));
      img.rect(x + 1, seg + 62, 2, 258, K('1'));
    }
    for (let k = 0; k <= 60; k++) {
      const t = k / 60;
      const ang = t * Math.PI * 0.5;
      // metade esquerda e direita do arco ogival
      const lx = 31 + Math.sin(ang) * 59;
      const ly = seg + 58 - (1 - Math.cos(ang)) * 0 - Math.sin(ang) * 46;
      const rx = 151 - Math.sin(ang) * 59;
      img.rect(lx - 2, ly, 5, 5, K('0'));
      img.rect(rx - 2, ly, 5, 5, K('0'));
    }
    // lamparina pendurada no centro do arco
    img.rect(90, seg + 12, 1, 40, K('0'));
    img.rect(87, seg + 52, 7, 5, K('0'));
    img.rect(88, seg + 53, 5, 3, K('e'));
    img.px(90, seg + 54, K('f'));
  }
  return img;
}

// ------------------------------------------------------------ PICOS/CÉU ------
function skyFar(h) {
  const img = new IndexImage(W, h);
  const r = rng(51);
  bands(img, ['k', 'l', 'm', 'n', 'o'], [2.2, 2, 2, 2, 0.6]);
  stars(img, r, 0, h * 0.28, 70);
  // sol pálido
  img.disc(140, Math.floor(h * 0.62), 12, K('6'));
  img.disc(140, Math.floor(h * 0.62), 9, K('f'));
  return img;
}

function skyMid(h) {
  const img = new IndexImage(W, h);
  const r = rng(52);
  // cordilheira no pé do bioma
  const peaks = [
    [-20, 150],
    [30, 200],
    [85, 170],
    [130, 230],
    [190, 160],
  ];
  const base = h;
  for (const [px, ph] of peaks) {
    const top = base - ph;
    const left = px - ph * 0.7;
    const right = px + ph * 0.7;
    img.poly(
      [
        [left, base],
        [px, top],
        [right, base],
      ],
      K('4')
    );
    img.poly(
      [
        [px, top],
        [right, base],
        [px + ph * 0.15, base],
      ],
      K('3')
    );
    // neve no pico
    img.poly(
      [
        [px - ph * 0.22, top + ph * 0.32],
        [px, top],
        [px + ph * 0.22, top + ph * 0.32],
        [px + ph * 0.08, top + ph * 0.26],
        [px - ph * 0.05, top + ph * 0.34],
      ],
      K('6')
    );
    for (let i = 0; i < 6; i++) img.px(px - ph * 0.1 + r() * ph * 0.2, top + ph * (0.3 + r() * 0.08), K('5'));
  }
  return img;
}

function skyNear(h) {
  const img = new IndexImage(W, h);
  const r = rng(53);
  for (let i = 0; i < 7; i++) {
    const cx = Math.floor(r() * W);
    const cy = 30 + Math.floor(r() * (h - 60));
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) img.disc(cx + k * 9 - n * 4, cy - ((k % 2) * 4), 7 + Math.floor(r() * 4), K('6'));
    img.rect(cx - n * 4 - 6, cy + 2, n * 9 + 12, 6, K('5'));
    for (let k = 0; k < n; k++) img.disc(cx + k * 9 - n * 4, cy + 6, 5, K('5'));
  }
  return img;
}

// ----------------------------------------------------------------------------
/**
 * Definição das camadas de cada bioma.
 *  f     : fração da subida de uma tela aplicada à camada (0 = parada)
 *  tall  : a imagem cobre o bioma inteiro (não repete)
 *  h     : altura (para camadas que repetem)
 *  drift : deslocamento horizontal animado (px por frame)
 */
export const LAYERS = {
  forest: [
    { gen: forestFar, f: 0.18, tall: true },
    { gen: forestMid, f: 0.45, h: 640 },
  ],
  ruins: [
    { gen: ruinsFar, f: 0.15, tall: true },
    { gen: ruinsMid, f: 0.45, h: 640 },
  ],
  castle: [
    { gen: castleFar, f: 0.1, tall: true },
    { gen: castleMid, f: 0.3, tall: true },
  ],
  cathedral: [
    { gen: cathedralFar, f: 0.2, h: 320 },
    { gen: cathedralMid, f: 0.5, h: 320 },
  ],
  sky: [
    { gen: skyFar, f: 0.12, tall: true },
    { gen: skyMid, f: 0.35, tall: true },
    { gen: skyNear, f: 0.6, h: 320, drift: 0.08 },
  ],
};

/** Cor de fundo "chapada" de cada bioma (barras laterais da tela). */
export const BIOME_BAR = { forest: '1', ruins: 'k', castle: '1', cathedral: '0', sky: 'k' };

/**
 * Gera as camadas de um bioma com `n` telas.
 * @returns [{img, f, tall, drift}]
 */
export function buildBiomeLayers(biome, n) {
  return LAYERS[biome].map((def) => {
    const h = def.tall ? 320 + Math.ceil(def.f * (n - 1) * 320) : def.h;
    return { img: def.gen(h), f: def.f, tall: !!def.tall, drift: def.drift || 0 };
  });
}

/**
 * Posição vertical (topo da janela de 320 px) de uma camada para a tela
 * local k (0 = primeira tela do bioma).
 */
export function layerOffset(layer, k) {
  const h = layer.img.h;
  const y = h - 320 - Math.round(layer.f * k * 320);
  return layer.tall ? Math.max(0, y) : ((y % h) + h) % h;
}
