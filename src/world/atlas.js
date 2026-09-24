import * as THREE from 'three';
import { createRandom } from '../core/Random.js';

/**
 * Atlas de texturas da cidade, todo desenhado em canvas (nada externo).
 * 4×4 regiões de 256 px. Cada vértice diz qual região usar e em que escala (atributo `atlas`);
 * o shader repete a região com fract() — assim a cidade inteira usa um único material.
 *
 * Convenção de UV: fachadas em (vãos, andares); telhados em telhas; chão em metros.
 */
export const SLOT = {
  house: 0,
  old: 1,
  office: 2,
  glass: 3,
  heart: 4,
  shop: 5,
  roof: 6,
  paving: 7,
  plaster: 8,
  market: 9,
  concrete: 10,
  wood: 11,
  grass: 12,
  stripes: 13, // toldos: listras brancas alternadas com a cor do vértice
  lamp: 14, // sempre aceso à noite
  white: 15,
};

/** Quantas unidades de UV cada região cobre (1 / escala). */
export const SLOT_SCALE = {
  [SLOT.house]: 0.5,
  [SLOT.old]: 0.5,
  [SLOT.office]: 0.5,
  [SLOT.glass]: 0.5,
  [SLOT.heart]: 0.5,
  [SLOT.shop]: 0.5,
  [SLOT.market]: 0.5,
  [SLOT.roof]: 0.25,
  [SLOT.paving]: 0.25,
  [SLOT.plaster]: 0.25,
  [SLOT.concrete]: 0.25,
  [SLOT.wood]: 0.5,
  [SLOT.grass]: 0.2,
  [SLOT.stripes]: 1,
  [SLOT.lamp]: 1,
  [SLOT.white]: 1,
};

const R = 256; // tamanho de cada região
const GRID = 4;

// ——— utilidades de desenho ———

function grain(ctx, x, y, w, h, rnd, amount = 900, alpha = 0.05) {
  for (let i = 0; i < amount; i++) {
    const light = rnd.chance(0.5);
    ctx.fillStyle = light ? `rgba(255,255,255,${alpha * 1.6})` : `rgba(90,70,60,${alpha})`;
    const s = rnd.range(1, 3);
    ctx.fillRect(x + rnd.next() * w, y + rnd.next() * h, s, s);
  }
}

function plaster(ctx, x, y, w, h, rnd, base = '#fbf7f1') {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  // Manchas suaves (reboco envelhecido)
  for (let i = 0; i < 6; i++) {
    const cx = x + rnd.next() * w;
    const cy = y + rnd.next() * h;
    const r = rnd.range(20, 60);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(120,95,80,0.05)');
    g.addColorStop(1, 'rgba(120,95,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  grain(ctx, x, y, w, h, rnd);
}

/** Vidro com reflexo diagonal e sombra do recuo no topo. */
function glassPane(ctx, x, y, w, h, tint = ['#39405a', '#56627e']) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, tint[0]);
  g.addColorStop(1, tint[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, y + h);
  ctx.lineTo(x + w * 0.55, y + h);
  ctx.lineTo(x + w * 0.95, y);
  ctx.lineTo(x + w * 0.6, y);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(20,16,30,0.35)'; // recuo
  ctx.fillRect(x, y, w, h * 0.12);
  ctx.fillRect(x, y, w * 0.07, h);
}

function shutter(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let yy = y + 4; yy < y + h - 2; yy += 6) ctx.fillRect(x + 2, yy, w - 4, 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function flowerBox(ctx, x, y, w, rnd) {
  ctx.fillStyle = '#8b5e48';
  ctx.fillRect(x, y, w, 9);
  const colors = ['#e2667a', '#f2a3b5', '#f4d35e', '#e8795a', '#ffffff'];
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = rnd.chance(0.45) ? '#6f9a5c' : rnd.pick(colors);
    const s = rnd.range(4, 8);
    ctx.fillRect(x + rnd.next() * (w - s), y - s + 2, s, s);
  }
}

/**
 * Janela completa numa célula (vão × andar). `v` escolhe a variação.
 * No modo máscara só a área de vidro (que acende) é desenhada em branco.
 */
function window1(ctx, cx, cy, cw, ch, v, rnd, mask, style) {
  const ww = cw * style.w;
  const wh = ch * style.h;
  const wx = cx + (cw - ww) / 2;
  const wy = cy + ch * style.top;
  if (mask) {
    if (v !== 1) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(wx, wy, ww, wh);
    }
    return;
  }
  // Moldura de estuque com sombra projetada
  ctx.fillStyle = 'rgba(60,40,40,0.16)';
  ctx.fillRect(wx - 5, wy - 3, ww + 12, wh + 12);
  ctx.fillStyle = '#fffaf2';
  ctx.fillRect(wx - 7, wy - 7, ww + 14, wh + 14);
  if (style.lintel) {
    ctx.fillStyle = '#f3ebdf';
    ctx.fillRect(wx - 11, wy - 16, ww + 22, 9);
    ctx.fillStyle = 'rgba(60,40,40,0.2)';
    ctx.fillRect(wx - 11, wy - 7, ww + 22, 3);
  }
  const tint = rnd.chance(0.5) ? ['#39405a', '#56627e'] : ['#3d3f52', '#6a6f85'];
  if (v === 1) {
    // Venezianas fechadas
    shutter(ctx, wx, wy, ww / 2, wh, style.shutter);
    shutter(ctx, wx + ww / 2, wy, ww / 2, wh, style.shutter);
  } else {
    glassPane(ctx, wx, wy, ww, wh, tint);
    ctx.fillStyle = '#fffaf2'; // caixilho
    ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
    ctx.fillRect(wx, wy + wh * 0.38, ww, 3);
    if (v === 2) {
      // Cortinas
      ctx.fillStyle = rnd.pick(['rgba(245,225,200,0.85)', 'rgba(232,190,190,0.85)', 'rgba(210,220,235,0.85)']);
      ctx.fillRect(wx + 3, wy + 3, ww * 0.22, wh - 6);
      ctx.fillRect(wx + ww * 0.78 - 3, wy + 3, ww * 0.22, wh - 6);
    }
    if (v === 0 || v === 3) {
      shutter(ctx, wx - ww * 0.36 - 7, wy, ww * 0.34, wh, style.shutter);
      shutter(ctx, wx + ww + 7, wy, ww * 0.34, wh, style.shutter);
    }
  }
  // Peitoril
  ctx.fillStyle = '#f1e8dc';
  ctx.fillRect(wx - 9, wy + wh + 4, ww + 18, 6);
  ctx.fillStyle = 'rgba(60,40,40,0.22)';
  ctx.fillRect(wx - 9, wy + wh + 10, ww + 18, 3);
  if (v === 3) flowerBox(ctx, wx - 4, wy + wh - 4, ww + 8, rnd);
  if (style.railing && v !== 1) {
    ctx.fillStyle = '#5d5a62';
    ctx.fillRect(wx - 6, wy + wh * 0.66, ww + 12, 3);
    for (let i = 0; i <= 8; i++) ctx.fillRect(wx - 6 + ((ww + 10) * i) / 8, wy + wh * 0.66, 2, wh * 0.34);
  }
}

// ——— regiões ———

function residential(style) {
  return (ctx, x, y, mask, rnd) => {
    if (!mask) plaster(ctx, x, y, R, R, rnd, style.wall ?? '#fbf7f1');
    else {
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, R, R);
    }
    const c = R / 2;
    for (let j = 0; j < 2; j++) {
      if (!mask) {
        // Friso entre andares
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x, y + j * c + c - 6, R, 4);
        ctx.fillStyle = 'rgba(80,60,55,0.12)';
        ctx.fillRect(x, y + j * c + c - 2, R, 2);
      }
      for (let i = 0; i < 2; i++) {
        const v = style.variants[(i + j * 2) % style.variants.length];
        window1(ctx, x + i * c, y + j * c, c, c, v, rnd, mask, style);
      }
    }
  };
}

const REGIONS = {
  [SLOT.house]: residential({ w: 0.36, h: 0.46, top: 0.24, shutter: '#9fb8ad', variants: [0, 3, 2, 1] }),
  [SLOT.old]: residential({ w: 0.34, h: 0.56, top: 0.2, shutter: '#8fa7a0', lintel: true, railing: true, variants: [2, 0, 3, 1] }),
  [SLOT.market]: residential({ w: 0.4, h: 0.44, top: 0.26, shutter: '#c9a27e', variants: [3, 0, 2, 3] }),

  [SLOT.office](ctx, x, y, mask, rnd) {
    const c = R / 2;
    ctx.fillStyle = mask ? '#000' : '#f4f1ec';
    ctx.fillRect(x, y, R, R);
    if (!mask) grain(ctx, x, y, R, R, rnd, 500, 0.04);
    for (let j = 0; j < 2; j++) {
      const by = y + j * c + c * 0.28;
      const bh = c * 0.5;
      if (mask) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, by, R, bh);
        continue;
      }
      glassPane(ctx, x, by, R, bh, ['#4a5874', '#72829e']);
      ctx.fillStyle = '#e8e4de';
      for (let i = 0; i <= 6; i++) ctx.fillRect(x + (R * i) / 6 - 2, by, 4, bh);
      ctx.fillStyle = 'rgba(70,60,60,0.18)';
      ctx.fillRect(x, by + bh, R, 4);
    }
  },

  [SLOT.glass](ctx, x, y, mask, rnd) {
    // Pele de vidro com ênfase vertical: montantes fortes, lajes finas
    const c = R / 2;
    if (mask) {
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, R, R);
      ctx.fillStyle = '#fff';
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) ctx.fillRect(x + i * c + 10, y + j * c + 10, c - 20, c - 16);
      return;
    }
    const g = ctx.createLinearGradient(x, y + R, x, y);
    g.addColorStop(0, '#a9bccb');
    g.addColorStop(0.5, '#d8e3ea');
    g.addColorStop(1, '#bccdda');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, R, R);
    for (let i = 0; i < 2; i++) {
      const k = rnd.range(-10, 10);
      ctx.fillStyle = `rgba(${120 + k},${140 + k},${170 + k},0.12)`;
      ctx.fillRect(x + i * c, y, c, R);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x + c * 0.2, y, c * 0.1, R);
    ctx.fillRect(x + c * 1.25, y, c * 0.06, R);
    ctx.fillStyle = '#f1efeb';
    for (let i = 0; i <= 2; i++) ctx.fillRect(x + i * c - 5, y, 10, R); // montantes
    ctx.fillStyle = 'rgba(60,70,90,0.35)';
    for (let j = 0; j < 2; j++) ctx.fillRect(x, y + j * c, R, 4); // lajes
  },

  [SLOT.heart](ctx, x, y, mask, rnd) {
    const c = R / 2;
    ctx.fillStyle = mask ? '#000' : '#fbf6ee';
    ctx.fillRect(x, y, R, R);
    if (!mask) grain(ctx, x, y, R, R, rnd, 400, 0.04);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const wx = x + i * c + c * 0.16;
        const wy = y + j * c + c * 0.1;
        const ww = c * 0.68;
        const wh = c * 0.82;
        if (mask) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(wx, wy + ww / 2, ww, wh - ww / 2);
          ctx.beginPath();
          ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
          ctx.fill();
          continue;
        }
        ctx.fillStyle = '#d7b98a'; // arco de latão
        ctx.beginPath();
        ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2 + 6, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(wx - 6, wy + ww / 2, ww + 12, wh - ww / 2 + 4);
        ctx.save();
        ctx.beginPath();
        ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
        ctx.rect(wx, wy + ww / 2, ww, wh - ww / 2);
        ctx.clip();
        glassPane(ctx, wx, wy, ww, wh, ['#3c3a58', '#5e5d80']);
        ctx.restore();
        ctx.fillStyle = '#d7b98a';
        ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
        for (let k = 1; k < 4; k++) ctx.fillRect(wx, wy + ww / 2 + ((wh - ww / 2) * k) / 4, ww, 3);
      }
    }
  },

  [SLOT.shop](ctx, x, y, mask, rnd) {
    // Duas faixas idênticas de térreo comercial (cada uma = 2 vãos × 1 andar)
    for (let j = 0; j < 2; j++) {
      const sy = y + j * (R / 2);
      const h = R / 2;
      if (mask) {
        ctx.fillStyle = '#000';
        ctx.fillRect(x, sy, R, h);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 14, sy + h * 0.3, R * 0.56, h * 0.58);
        ctx.fillRect(x + R * 0.72, sy + h * 0.3, R * 0.2, h * 0.68);
        continue;
      }
      plaster(ctx, x, sy, R, h, rnd, '#f4ede4');
      // Faixa do letreiro (tingida pela cor do prédio)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, sy + h * 0.08, R, h * 0.14);
      ctx.fillStyle = 'rgba(60,40,40,0.25)';
      ctx.fillRect(x, sy + h * 0.22, R, 3);
      // Vitrine com mercadorias
      glassPane(ctx, x + 14, sy + h * 0.3, R * 0.56, h * 0.58, ['#4a4a5e', '#6d6f86']);
      const goods = ['#e8b04e', '#d9644f', '#8fb07a', '#f0d9a6', '#c47aa0'];
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = rnd.pick(goods);
        ctx.fillRect(x + 22 + i * 15, sy + h * 0.66 + rnd.range(0, 8), 10, 12);
      }
      ctx.fillStyle = '#6b4d3f';
      ctx.fillRect(x + 12, sy + h * 0.88, R * 0.56 + 4, 5);
      // Porta
      ctx.fillStyle = '#7a5646';
      ctx.fillRect(x + R * 0.72 - 4, sy + h * 0.27, R * 0.2 + 8, h * 0.73);
      glassPane(ctx, x + R * 0.72, sy + h * 0.3, R * 0.2, h * 0.34, ['#3e4256', '#5f6680']);
      ctx.fillStyle = '#e9c46a';
      ctx.fillRect(x + R * 0.88, sy + h * 0.72, 4, 4);
    }
  },

  [SLOT.roof](ctx, x, y, mask, rnd) {
    ctx.fillStyle = mask ? '#000' : '#f6efe9';
    ctx.fillRect(x, y, R, R);
    if (mask) return;
    // Telhas coloniais: fileiras com sombra embaixo e desencontradas
    const tw = R / 4;
    const th = R / 4;
    for (let row = 0; row < 4; row++) {
      for (let col = -1; col < 5; col++) {
        const tx = x + col * tw + (row % 2) * (tw / 2);
        const ty = y + row * th;
        const k = rnd.range(-14, 10);
        ctx.fillStyle = `rgb(${246 + k},${236 + k},${228 + k})`;
        ctx.beginPath();
        ctx.moveTo(tx + 2, ty);
        ctx.lineTo(tx + tw - 2, ty);
        ctx.quadraticCurveTo(tx + tw, ty + th * 0.9, tx + tw / 2, ty + th);
        ctx.quadraticCurveTo(tx, ty + th * 0.9, tx + 2, ty);
        ctx.fill();
        ctx.fillStyle = 'rgba(70,35,30,0.28)';
        ctx.fillRect(tx + 2, ty + th - 5, tw - 4, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(tx + tw * 0.25, ty + 3, tw * 0.12, th * 0.6);
      }
    }
    grain(ctx, x, y, R, R, rnd, 400, 0.05);
  },

  [SLOT.paving](ctx, x, y, mask, rnd) {
    ctx.fillStyle = mask ? '#000' : '#f5f1ea';
    ctx.fillRect(x, y, R, R);
    if (mask) return;
    // Lajotas de 1 m (a região cobre 4 × 4 m)
    const s = R / 4;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const k = rnd.range(-10, 6);
        ctx.fillStyle = `rgb(${244 + k},${238 + k},${228 + k})`;
        ctx.fillRect(x + i * s + 2, y + j * s + 2, s - 4, s - 4);
      }
    }
    ctx.fillStyle = 'rgba(90,75,65,0.22)';
    for (let i = 0; i <= 4; i++) {
      ctx.fillRect(x + i * s - 1, y, 2, R);
      ctx.fillRect(x, y + i * s - 1, R, 2);
    }
    grain(ctx, x, y, R, R, rnd, 500, 0.05);
  },

  [SLOT.plaster](ctx, x, y, mask, rnd) {
    if (mask) {
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, R, R);
      return;
    }
    plaster(ctx, x, y, R, R, rnd);
  },

  [SLOT.concrete](ctx, x, y, mask, rnd) {
    ctx.fillStyle = mask ? '#000' : '#f2efe9';
    ctx.fillRect(x, y, R, R);
    if (mask) return;
    ctx.fillStyle = 'rgba(80,80,80,0.12)';
    ctx.fillRect(x, y + R / 2, R, 2);
    ctx.fillRect(x + R / 2, y, 2, R);
    grain(ctx, x, y, R, R, rnd, 1400, 0.06);
  },

  [SLOT.wood](ctx, x, y, mask, rnd) {
    ctx.fillStyle = mask ? '#000' : '#f2e6d8';
    ctx.fillRect(x, y, R, R);
    if (mask) return;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = `rgba(110,70,40,${rnd.range(0.06, 0.16)})`;
      ctx.fillRect(x + (i * R) / 8, y, R / 8 - 3, R);
      ctx.fillStyle = 'rgba(80,50,30,0.3)';
      ctx.fillRect(x + ((i + 1) * R) / 8 - 3, y, 3, R);
    }
  },

  [SLOT.grass](ctx, x, y, mask, rnd) {
    ctx.fillStyle = mask ? '#000' : '#f2f6ea';
    ctx.fillRect(x, y, R, R);
    if (mask) return;
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = rnd.chance(0.5) ? 'rgba(80,110,60,0.14)' : 'rgba(255,255,230,0.2)';
      ctx.fillRect(x + rnd.next() * R, y + rnd.next() * R, 2, rnd.range(2, 5));
    }
    const flowers = ['#ffffff', '#f4d35e', '#f2a3b5'];
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = rnd.pick(flowers);
      ctx.fillRect(x + rnd.next() * R, y + rnd.next() * R, 3, 3);
    }
  },

  [SLOT.stripes](ctx, x, y, mask) {
    ctx.fillStyle = mask ? '#000' : '#fff';
    ctx.fillRect(x, y, R, R);
  },

  [SLOT.lamp](ctx, x, y, mask) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, R, R);
    void mask;
  },

  [SLOT.white](ctx, x, y, mask) {
    ctx.fillStyle = mask ? '#000' : '#fff';
    ctx.fillRect(x, y, R, R);
  },
};

function drawAtlas(mask) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = R * GRID;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = mask ? '#000' : '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const [slot, draw] of Object.entries(REGIONS)) {
    const s = Number(slot);
    const col = s % GRID;
    const row = Math.floor(s / GRID);
    // flipY: a linha 0 do atlas fica embaixo do canvas
    const x = col * R;
    const y = (GRID - 1 - row) * R;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, R, R);
    ctx.clip();
    draw(ctx, x, y, mask, createRandom(1000 + s * 17));
    ctx.restore();
  }
  return canvas;
}

export function createAtlasTextures(maxAnisotropy = 4) {
  const make = (mask) => {
    const tex = new THREE.CanvasTexture(drawAtlas(mask));
    tex.colorSpace = mask ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  };
  return { map: make(false), emissiveMap: make(true) };
}
