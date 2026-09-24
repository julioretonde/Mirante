// =============================================================================
//  Física do personagem — o coração do jogo
// -----------------------------------------------------------------------------
//  Funções puras (sem DOM) usadas tanto pelo jogo quanto pelo validador de
//  fases em Node, garantindo que o validador simule EXATAMENTE a mesma física.
//
//  Regras (estilo "pulo carregado"):
//   - Só anda no chão. No ar não há controle nenhum: a trajetória é definida
//     no instante do pulo (a única força extra é o vento).
//   - Parede lateral no ar: ricocheteia, invertendo e reduzindo vx.
//   - Teto: perde a velocidade vertical e começa a cair.
//   - Colisão AABB contra a grade de tiles, com o movimento de cada frame
//     subdividido em passos de no máximo MAX_SUBSTEP px (sem "túnel").
//     Em cada sub-passo movemos primeiro no eixo X e depois no Y; assim uma
//     colisão só é tratada como parede se o corpo já estava na altura do
//     bloco, e o personagem não "gruda" em quinas.
// =============================================================================

import { PHYSICS as P, TILE } from '../config.js';
import { T_ICE } from '../levels/legend.js';

// Eventos retornados por stepBody (máscara de bits).
export const EV_LAND = 1; // tocou o chão neste frame
export const EV_WALL = 2; // bateu numa parede lateral
export const EV_CEIL = 4; // bateu no teto
export const EV_FALL_OFF = 8; // saiu andando de uma borda
export const EV_SPLAT = 16; // aterrissou depois de uma queda grande
export const EV_BOUNCE = 32; // bateu na parede estando no ar (ricochete)

const W = P.PLAYER_W;
const H = P.PLAYER_H;

/** Cria o estado físico do personagem. (x, y) = canto superior esquerdo. */
export function createBody(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    onGround: false,
    onIce: false,
    /** Ponto mais alto (menor y) alcançado desde que saiu do chão. */
    peakY: y,
    /** Distância da última queda (calculada ao aterrissar). */
    fallDist: 0,
  };
}

export function copyBody(src, dst = {}) {
  dst.x = src.x;
  dst.y = src.y;
  dst.vx = src.vx;
  dst.vy = src.vy;
  dst.onGround = src.onGround;
  dst.onIce = src.onIce;
  dst.peakY = src.peakY;
  dst.fallDist = src.fallDist;
  return dst;
}

/** Velocidade vertical do pulo para uma carga (em frames segurados). */
export function jumpSpeed(charge) {
  const c = charge < 0 ? 0 : charge > P.CHARGE_FRAMES ? P.CHARGE_FRAMES : charge;
  return P.JUMP_MIN_SPEED + ((P.JUMP_MAX_SPEED - P.JUMP_MIN_SPEED) * c) / P.CHARGE_FRAMES;
}

/**
 * Executa o pulo. dir: -1 esquerda, 0 vertical, +1 direita.
 * A velocidade horizontal é fixa; a vertical depende da carga.
 */
export function launch(b, charge, dir) {
  b.vy = -jumpSpeed(charge);
  b.vx = dir * P.JUMP_HORIZONTAL_SPEED;
  b.onGround = false;
  b.onIce = false;
  b.peakY = b.y;
}

/** true se a caixa (x, y, w, h) sobrepõe algum tile sólido ou sai do mundo. */
export function overlapsSolid(world, x, y, w, h) {
  const c0 = Math.floor(x / TILE);
  const c1 = Math.ceil((x + w) / TILE) - 1;
  const r0 = Math.floor(y / TILE);
  const r1 = Math.ceil((y + h) / TILE) - 1;
  if (c0 < 0 || c1 >= world.cols || r0 < 0 || r1 >= world.rows) return true;
  const tiles = world.tiles;
  const cols = world.cols;
  for (let r = r0; r <= r1; r++) {
    const base = r * cols;
    for (let c = c0; c <= c1; c++) {
      if (tiles[base + c] !== 0) return true;
    }
  }
  return false;
}

/**
 * Tipo de superfície logo abaixo dos pés (0 nenhuma, 1 sólido, 2 gelo).
 * feetY precisa estar alinhado à grade (o corpo está apoiado).
 * O tipo é o do tile sob o centro do corpo; se o centro estiver sobre o vazio
 * (pendurado na borda), vale o tile que está dando apoio.
 */
export function surfaceUnder(world, x, feetY, w) {
  const r = Math.floor(feetY / TILE);
  if (r >= world.rows) return 1;
  if (r < 0) return 0;
  const c0 = Math.floor(x / TILE);
  const c1 = Math.ceil((x + w) / TILE) - 1;
  const cc = Math.floor((x + w * 0.5) / TILE);
  const tiles = world.tiles;
  const base = r * world.cols;
  if (cc >= 0 && cc < world.cols && tiles[base + cc] !== 0) return tiles[base + cc];
  for (let c = c0; c <= c1; c++) {
    if (c < 0 || c >= world.cols) return 1;
    const t = tiles[base + c];
    if (t !== 0) return t;
  }
  return 0;
}

/** Direção do vento no centro do corpo. */
export function windAtBody(world, b) {
  const c = Math.floor((b.x + W * 0.5) / TILE);
  const r = Math.floor((b.y + H * 0.5) / TILE);
  if (c < 0 || c >= world.cols || r < 0 || r >= world.rows) return 0;
  return world.wind[r * world.cols + c];
}

/**
 * Avança a física em 1 frame (1/60 s).
 * @param walkDir -1/0/+1: intenção de andar (só tem efeito no chão).
 * @returns máscara de eventos EV_*
 */
export function stepBody(b, world, walkDir) {
  let ev = 0;
  const wasGround = b.onGround;

  // --- velocidades -----------------------------------------------------------
  if (wasGround) {
    b.vy = 0;
    if (b.onIce) {
      if (walkDir !== 0) {
        const target = walkDir * P.ICE_WALK_SPEED;
        if (b.vx < target) b.vx = Math.min(target, b.vx + P.ICE_ACCEL);
        else if (b.vx > target) b.vx = Math.max(target, b.vx - P.ICE_ACCEL);
      } else if (b.vx !== 0) {
        b.vx = b.vx > 0 ? Math.max(0, b.vx - P.ICE_FRICTION) : Math.min(0, b.vx + P.ICE_FRICTION);
        if (b.vx === 0) snapToPixel(b, world); // parou de deslizar
      }
    } else {
      b.vx = walkDir * P.WALK_SPEED;
    }
  } else {
    b.vy += P.GRAVITY;
    if (b.vy > P.MAX_FALL_SPEED) b.vy = P.MAX_FALL_SPEED;
    const wind = windAtBody(world, b);
    if (wind !== 0) {
      b.vx += wind * P.WIND_ACCEL;
      if (b.vx > P.WIND_MAX_SPEED) b.vx = P.WIND_MAX_SPEED;
      else if (b.vx < -P.WIND_MAX_SPEED) b.vx = -P.WIND_MAX_SPEED;
    }
  }

  // --- movimento subdividido (anti-túnel) -----------------------------------
  const vx = b.vx;
  const vy = b.vy;
  const big = Math.max(Math.abs(vx), Math.abs(vy));
  // Número de sub-passos sempre potência de 2 (1, 2, 4, 8...): assim vx/n é
  // uma fração binária exata e as posições de pouso ficam "limpas".
  let n = 1;
  while (big / n > P.MAX_SUBSTEP) n *= 2;
  const sx = vx / n;
  const sy = vy / n;
  let moveX = sx !== 0;
  let moveY = sy !== 0;

  for (let i = 0; i < n && (moveX || moveY); i++) {
    if (moveX) {
      const nx = b.x + sx;
      if (overlapsSolid(world, nx, b.y, W, H)) {
        // Encosta exatamente na face do tile que bloqueou.
        if (sx > 0) b.x = (Math.ceil((nx + W) / TILE) - 1) * TILE - W;
        else b.x = (Math.floor(nx / TILE) + 1) * TILE;
        moveX = false;
        ev |= EV_WALL;
      } else {
        b.x = nx;
      }
    }
    if (moveY) {
      const ny = b.y + sy;
      if (overlapsSolid(world, b.x, ny, W, H)) {
        if (sy > 0) {
          b.y = (Math.ceil((ny + H) / TILE) - 1) * TILE - H;
          ev |= EV_LAND;
          moveX = false; // ao tocar o chão, o resto do movimento do frame é descartado
        } else {
          b.y = (Math.floor(ny / TILE) + 1) * TILE;
          ev |= EV_CEIL;
        }
        moveY = false;
      } else {
        b.y = ny;
      }
    }
  }

  // --- reações às colisões ---------------------------------------------------
  if (ev & EV_WALL) {
    if (wasGround) {
      b.vx = 0;
    } else {
      b.vx = -b.vx * P.WALL_BOUNCE;
      ev |= EV_BOUNCE;
    }
  }
  if (ev & EV_CEIL) b.vy = 0;

  if (ev & EV_LAND) {
    b.vy = 0;
    b.onGround = true;
    b.onIce = surfaceUnder(world, b.x, b.y + H, W) === T_ICE;
    if (!b.onIce) {
      b.vx = 0;
      snapToPixel(b, world);
    }
    if (b.y < b.peakY) b.peakY = b.y;
    b.fallDist = b.y - b.peakY;
    if (b.fallDist >= P.SPLAT_HEIGHT) ev |= EV_SPLAT;
  } else if (wasGround) {
    const surf = surfaceUnder(world, b.x, b.y + H, W);
    if (surf === 0) {
      b.onGround = false;
      b.onIce = false;
      b.peakY = b.y;
      ev |= EV_FALL_OFF;
    } else {
      b.onIce = surf === T_ICE;
    }
  } else if (b.y < b.peakY) {
    b.peakY = b.y;
  }

  return ev;
}

/**
 * Ao ficar parado no chão, alinha x ao pixel inteiro mais próximo (se a nova
 * posição continuar livre e apoiada). O desenho já é feito em pixels
 * inteiros, então isso é invisível — mas mantém as posições de descanso
 * "limpas", o que deixa o jogo mais previsível e o validador exato.
 */
export function snapToPixel(b, world) {
  const fx = Math.floor(b.x);
  if (fx === b.x) return;
  const first = b.x - fx < 0.5 ? fx : fx + 1;
  const second = first === fx ? fx + 1 : fx;
  for (const nx of [first, second]) {
    if (!overlapsSolid(world, nx, b.y, W, H) && surfaceUnder(world, nx, b.y + H, W) !== 0) {
      b.x = nx;
      return;
    }
  }
}

/** true se o corpo está parado e apoiado (estado de "descanso"). */
export function isAtRest(b) {
  return b.onGround && b.vx === 0;
}

/** true se o corpo encosta no retângulo r {x,y,w,h}. */
export function touchesRect(b, r) {
  return b.x < r.x + r.w && b.x + W > r.x && b.y < r.y + r.h && b.y + H > r.y;
}

/**
 * Se o corpo estiver dentro de um sólido (ex.: save antigo após editar a
 * fase), procura a posição livre mais próxima subindo/descendo.
 */
export function unstick(b, world) {
  if (!overlapsSolid(world, b.x, b.y, W, H)) return false;
  for (let d = 1; d < 400; d++) {
    for (const [dx, dy] of [
      [0, -d],
      [0, d],
      [-d, 0],
      [d, 0],
    ]) {
      if (!overlapsSolid(world, b.x + dx, b.y + dy, W, H)) {
        b.x += dx;
        b.y += dy;
        b.vx = 0;
        b.vy = 0;
        b.onGround = false;
        b.peakY = b.y;
        return true;
      }
    }
  }
  return false;
}

/**
 * Simula um pulo completo a partir de um estado parado, até o corpo voltar a
 * ficar em repouso. Usado pelo validador e pela prévia de trajetória do modo
 * debug. Retorna {body, frames, touchedGoal, path?}.
 */
export function simulateJump(world, start, charge, dir, opts = {}) {
  const b = copyBody(start, {});
  launch(b, charge, dir);
  const maxFrames = opts.maxFrames || 6000;
  const goal = opts.goal || null;
  const path = opts.path ? [] : null;
  let touchedGoal = false;
  let splat = false;
  let frames = 0;
  for (; frames < maxFrames; frames++) {
    const ev = stepBody(b, world, 0);
    if (path) path.push(b.x, b.y);
    if (ev & EV_SPLAT) splat = true;
    if (goal && !touchedGoal && touchesRect(b, goal)) touchedGoal = true;
    if (b.onGround && b.vx === 0) break;
  }
  return { body: b, frames, touchedGoal, splat, path };
}
