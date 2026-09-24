// =============================================================================
//  Partículas (só visuais — não afetam a física): poeira ao aterrissar,
//  folhas na floresta, esporos nas ruínas, brasas no castelo, poeira de luz
//  na catedral, neve no topo, rajadas de vento e brilhos.
// =============================================================================

import { PALETTE } from '../art/palette.js';
import { VIEW_W, TILE } from '../config.js';

const MAX = 320;
const LEAF_A = ['.j.', 'jij', '.i.'];
const LEAF_B = ['..j', '.i.', 'j..'];

export class Particles {
  constructor() {
    this.list = [];
    this.t = 0;
  }

  clear() {
    this.list.length = 0;
  }

  add(p) {
    if (this.list.length >= MAX) this.list.shift();
    p.age = 0;
    this.list.push(p);
  }

  // ---------------------------------------------------------- emissores ----
  dust(x, y, count, power = 1) {
    for (let i = 0; i < count; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      this.add({
        kind: 'dust',
        x: x + dir * (1 + Math.random() * 3),
        y: y - 1,
        vx: dir * (0.3 + Math.random() * 0.9) * power,
        vy: -(0.2 + Math.random() * 0.7) * power,
        life: 18 + Math.random() * 14,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }

  bump(x, y) {
    for (let i = 0; i < 5; i++) {
      this.add({
        kind: 'spark',
        x,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        life: 14 + Math.random() * 8,
      });
    }
  }

  sparkles(x, y, count, spread = 10) {
    for (let i = 0; i < count; i++) {
      this.add({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * spread * 2,
        y: y + (Math.random() - 0.5) * spread * 2,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.2 - Math.random() * 0.6,
        life: 30 + Math.random() * 40,
      });
    }
  }

  /** Partículas de ambiente para a tela atual (chamado a cada passo). */
  ambient(biome, camTop, emitters, windCells) {
    this.t++;
    const r = Math.random();
    switch (biome) {
      case 'forest':
        if (r < 1 / 38)
          this.add({
            kind: 'leaf',
            x: Math.random() * VIEW_W,
            y: camTop - 4,
            vx: 0.1 + Math.random() * 0.2,
            vy: 0.3 + Math.random() * 0.25,
            life: 900,
            phase: Math.random() * 6.28,
            color: Math.random() < 0.25 ? 'e' : null,
          });
        break;
      case 'ruins':
        if (r < 1 / 30)
          this.add({
            kind: 'spore',
            x: Math.random() * VIEW_W,
            y: camTop + 320 + 2,
            vx: 0,
            vy: -(0.15 + Math.random() * 0.2),
            life: 700,
            phase: Math.random() * 6.28,
          });
        break;
      case 'castle':
        if (r < 1 / 20)
          this.add({
            kind: 'ember',
            x: Math.random() * VIEW_W,
            y: camTop + 322,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -(0.4 + Math.random() * 0.5),
            life: 300 + Math.random() * 200,
            phase: Math.random() * 6.28,
          });
        break;
      case 'cathedral':
        if (r < 1 / 24)
          this.add({
            kind: 'mote',
            x: 50 + Math.random() * 90,
            y: camTop + Math.random() * 320,
            vx: (Math.random() - 0.5) * 0.12,
            vy: 0.05 + Math.random() * 0.1,
            life: 240 + Math.random() * 200,
            phase: Math.random() * 6.28,
          });
        break;
      case 'sky':
        for (let i = 0; i < 2; i++)
          if (Math.random() < 0.55)
            this.add({
              kind: 'snow',
              x: Math.random() * (VIEW_W + 60) - 30,
              y: camTop - 3,
              vx: -0.15 + Math.random() * 0.3,
              vy: 0.45 + Math.random() * 0.5,
              life: 1000,
              size: Math.random() < 0.2 ? 2 : 1,
            });
        break;
      default:
        break;
    }
    // brasas saindo das tochas
    for (const e of emitters) {
      if (Math.random() < 1 / 9)
        this.add({
          kind: 'ember',
          x: e.x + 3 + Math.random() * 3,
          y: e.y + 2,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -(0.3 + Math.random() * 0.5),
          life: 40 + Math.random() * 50,
          phase: Math.random() * 6.28,
        });
    }
    // rajadas desenhando o vento
    if (windCells.length && Math.random() < 0.35) {
      const cell = windCells[(Math.random() * windCells.length) | 0];
      this.add({
        kind: 'streak',
        x: cell.c * TILE + Math.random() * TILE,
        y: cell.r * TILE + Math.random() * TILE,
        vx: cell.dir * (2 + Math.random() * 1.5),
        vy: 0,
        life: 22 + Math.random() * 14,
        len: 4 + ((Math.random() * 6) | 0),
      });
    }
  }

  update(world, camTop) {
    const list = this.list;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.age++;
      switch (p.kind) {
        case 'dust':
          p.vy += 0.04;
          p.vx *= 0.92;
          break;
        case 'leaf':
          p.x += Math.sin(p.age * 0.05 + p.phase) * 0.35;
          break;
        case 'spore':
        case 'mote':
          p.x += Math.sin(p.age * 0.03 + p.phase) * 0.15;
          break;
        case 'ember':
          p.x += Math.sin(p.age * 0.12 + p.phase) * 0.15;
          break;
        case 'snow': {
          const c = Math.floor(p.x / TILE);
          const r = Math.floor(p.y / TILE);
          const wind = world.windAtTile(c, r);
          if (wind) p.vx += wind * 0.05;
          else p.vx *= 0.98;
          if (p.vx > 2.5) p.vx = 2.5;
          if (p.vx < -2.5) p.vx = -2.5;
          break;
        }
        default:
          break;
      }
      p.x += p.vx;
      p.y += p.vy;
      const out = p.y > camTop + 340 || p.y < camTop - 30 || p.x < -40 || p.x > VIEW_W + 40;
      if (p.age < p.life && !(out && p.kind !== 'dust')) list[w++] = p;
    }
    list.length = w;
  }

  /** Desenha com a câmera no topo da tela atual. ox = deslocamento da grade. */
  draw(ctx, camTop, ox, layer) {
    for (const p of this.list) {
      const isBack = p.kind === 'streak';
      if ((layer === 'back') !== isBack) continue;
      const x = Math.round(p.x + ox);
      const y = Math.round(p.y - camTop);
      if (y < -10 || y > 330) continue;
      const k = p.age / p.life;
      switch (p.kind) {
        case 'dust': {
          ctx.fillStyle = PALETTE[k < 0.4 ? 5 : k < 0.75 ? 4 : 3];
          ctx.fillRect(x, y, p.size, p.size);
          break;
        }
        case 'leaf': {
          const rows = (p.age >> 4) % 2 ? LEAF_A : LEAF_B;
          for (let j = 0; j < 3; j++)
            for (let i = 0; i < 3; i++) {
              const ch = rows[j][i];
              if (ch === '.') continue;
              ctx.fillStyle = PALETTE[p.color ? (ch === 'i' ? 14 : 15) : ch === 'i' ? 18 : 19];
              ctx.fillRect(x + i, y + j, 1, 1);
            }
          break;
        }
        case 'spore':
          ctx.fillStyle = PALETTE[(p.age >> 5) % 2 ? 27 : 19];
          ctx.fillRect(x, y, 1, 1);
          break;
        case 'mote':
          ctx.fillStyle = PALETTE[(p.age >> 4) % 3 === 0 ? 15 : 10];
          ctx.fillRect(x, y, 1, 1);
          break;
        case 'ember': {
          const f = (p.age >> 2) % 3;
          ctx.fillStyle = PALETTE[k > 0.8 ? 11 : f === 0 ? 15 : f === 1 ? 14 : 13];
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'snow':
          ctx.fillStyle = PALETTE[p.size > 1 ? 6 : 5];
          ctx.fillRect(x, y, p.size, p.size);
          break;
        case 'spark': {
          const on = (p.age >> 2) % 2 === 0;
          ctx.fillStyle = PALETTE[on ? 6 : 15];
          ctx.fillRect(x, y, 1, 1);
          if (on && k < 0.6) {
            ctx.fillStyle = PALETTE[15];
            ctx.fillRect(x - 1, y, 1, 1);
            ctx.fillRect(x + 1, y, 1, 1);
            ctx.fillRect(x, y - 1, 1, 1);
            ctx.fillRect(x, y + 1, 1, 1);
          }
          break;
        }
        case 'streak': {
          ctx.fillStyle = PALETTE[k < 0.5 ? 6 : 24];
          const len = Math.round(p.len * (1 - Math.abs(k - 0.5)));
          ctx.fillRect(p.vx > 0 ? x - len : x, y, len, 1);
          break;
        }
        default:
          break;
      }
    }
  }
}
