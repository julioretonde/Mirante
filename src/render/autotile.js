// =============================================================================
//  Auto-tile: escolhe o desenho de cada tile sólido olhando os vizinhos.
//  Módulo puro (sem DOM) — usado pelo jogo e pelo gerador de ícones/prévias.
// =============================================================================

import { TILESETS } from '../art/tiles.js';

/** Hash inteiro determinístico de (c, r) — para sortear variações. */
export function hash2(c, r) {
  let h = (c * 374761393 + r * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

const pick = (list, h) => list[h % list.length];

/**
 * Descreve como desenhar o tile (c, r) do mundo.
 * @returns null (vazio) ou { m: string[8], edges: {t,b,l,r}, biome }
 */
export function describeTile(world, c, r) {
  const ch = world.charAt(c, r);
  const biome = world.biomeOf(world.screenAtRow(r));
  const ts = TILESETS[biome];
  const solidUp = world.isSolid(c, r - 1);
  const solidDown = world.isSolid(c, r + 1);
  const solidLeft = world.isSolid(c - 1, r);
  const solidRight = world.isSolid(c + 1, r);
  const h = hash2(c, r);
  const same = (dc) => world.charAt(c + dc, r) === ch;
  let m = null;
  let edges = null;

  switch (ch) {
    case '#':
      m = solidUp ? pick(ts.block.fill, h) : pick(ts.block.top, h);
      edges = { t: false, b: !solidDown, l: !solidLeft, r: !solidRight };
      break;
    case 'T': {
      const mids = ts.pillar.mid;
      // Faixas decorativas (ex.: anéis dourados) alinhadas por linha.
      const v = mids.length > 1 && r % 6 === 0 ? mids[1] : mids[0];
      m = solidUp ? v : ts.pillar.top[0];
      edges = { t: false, b: !solidDown, l: !solidLeft, r: !solidRight };
      break;
    }
    case 'M':
      if (ts.cap) {
        m = !same(-1) ? ts.cap.left : !same(1) ? ts.cap.right : ts.cap.mid;
        break;
      }
      m = ledgePiece(ts, solidLeft, solidRight);
      break;
    case 'C':
      if (ts.cloud) {
        m = !same(-1) ? ts.cloud.left : !same(1) ? ts.cloud.right : ts.cloud.mid;
        break;
      }
      m = ledgePiece(ts, solidLeft, solidRight);
      break;
    case 'I': {
      const ice = ts.ice || TILESETS.sky.ice;
      m = !same(-1) ? ice.left : !same(1) ? ice.right : ice.mid;
      break;
    }
    case '=':
      m = ledgePiece(ts, solidLeft, solidRight);
      break;
    default:
      return null;
  }
  return { m, edges, biome, edgeColor: ts.edge };
}

function ledgePiece(ts, solidLeft, solidRight) {
  if (!solidLeft && !solidRight) return ts.ledge.single;
  if (!solidLeft) return ts.ledge.left;
  if (!solidRight) return ts.ledge.right;
  return ts.ledge.mid;
}

/**
 * Caules dos cogumelos gigantes: para cada trecho de 'M', um caule desce do
 * centro do chapéu até encontrar um sólido (no máximo `max` tiles). Chapéus
 * sem chão por perto ficam sem caule (cogumelos "flutuantes" da floresta).
 * @returns lista de {c, r} de tiles de caule
 */
export function mushroomStems(world, rowStart, rowEnd, max = 12) {
  const stems = [];
  for (let r = rowStart; r < rowEnd; r++) {
    let c = 0;
    while (c < world.cols) {
      if (world.charAt(c, r) !== 'M') {
        c++;
        continue;
      }
      let e = c;
      while (e + 1 < world.cols && world.charAt(e + 1, r) === 'M') e++;
      const mid = (c + e) >> 1;
      // só desenha o caule se ele encontrar o chão logo abaixo
      const part = [];
      let grounded = false;
      for (let k = 1; k <= max; k++) {
        if (r + k >= world.rows || world.isSolid(mid, r + k)) {
          grounded = true;
          break;
        }
        part.push({ c: mid, r: r + k });
      }
      if (grounded) stems.push(...part);
      c = e + 1;
    }
  }
  return stems;
}

/**
 * Decoração na célula (c, r), conforme o bioma da tela.
 * @returns null ou { def, x, y, w, h } em coordenadas do mundo (px)
 */
export function decorAt(world, c, r, table) {
  const ch = world.charAt(c, r);
  if (ch < 'a' || ch > 'z') return null;
  const biome = world.biomeOf(world.screenAtRow(r));
  const def = table[biome] && table[biome][ch];
  if (!def) return null;
  const spr = def.anim[0];
  const w = spr[0].length;
  const h = spr.length;
  let x = c * 8 + 4 - (w >> 1);
  let y = r * 8;
  if (def.anchor === 'floor') y = (r + 1) * 8 - h;
  if (def.anchor === 'free') x = c * 8;
  return { def, x, y, w, h, ch };
}
