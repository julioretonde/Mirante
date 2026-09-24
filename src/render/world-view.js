// =============================================================================
//  Desenho do mundo: fundo com parallax, tiles (pré-desenhados por tela, em
//  cache), decorações animadas e a estrela do topo.
// =============================================================================

import { VIEW_W, VIEW_H, TILE, WORLD_X_OFFSET, ROWS_PER_SCREEN } from '../config.js';
import { PALETTE, codeToIndex } from '../art/palette.js';
import { TILESETS } from '../art/tiles.js';
import { DECOR_BY_BIOME, STAR } from '../art/decor.js';
import { buildBiomeLayers, layerOffset } from '../art/backgrounds.js';
import { describeTile, mushroomStems, decorAt } from './autotile.js';
import { sprite, createCanvas, indexImageToCanvas } from './gfx.js';

const OX = WORLD_X_OFFSET;

export class WorldView {
  constructor(world, biomes) {
    this.world = world;
    this.biomes = biomes;
    this.screenCache = new Map();
    this.layerCache = new Map();
    this.first = {};
    this.count = {};
    for (let s = 0; s < world.count; s++) {
      const b = world.biomeOf(s);
      if (this.first[b] === undefined) this.first[b] = s;
      this.count[b] = (this.count[b] || 0) + 1;
    }
  }

  /** Camadas de fundo do bioma (geradas uma vez). */
  layers(biome) {
    let L = this.layerCache.get(biome);
    if (!L) {
      L = buildBiomeLayers(biome, this.count[biome] || 1).map((l) => ({ ...l, canvas: indexImageToCanvas(l.img) }));
      this.layerCache.set(biome, L);
    }
    return L;
  }

  /** Pré-carrega as camadas de todos os biomas (evita engasgo na troca). */
  warmup() {
    for (const b of Object.keys(this.first)) this.layers(b);
  }

  drawBackground(ctx, s, time) {
    const biome = this.world.biomeOf(s);
    const k = s - this.first[biome];
    for (const L of this.layers(biome)) {
      const h = L.canvas.height;
      const oy = layerOffset(L, k);
      const dx = L.drift ? Math.floor((time * L.drift) % VIEW_W) : 0;
      for (const x0 of dx ? [-dx, VIEW_W - dx] : [0]) {
        if (L.tall || oy + VIEW_H <= h) {
          ctx.drawImage(L.canvas, 0, oy, VIEW_W, VIEW_H, x0, 0, VIEW_W, VIEW_H);
        } else {
          const first = h - oy;
          ctx.drawImage(L.canvas, 0, oy, VIEW_W, first, x0, 0, VIEW_W, first);
          ctx.drawImage(L.canvas, 0, 0, VIEW_W, VIEW_H - first, x0, first, VIEW_W, VIEW_H - first);
        }
      }
    }
  }

  /** Canvas com tudo o que é estático na tela s (em cache). */
  screenCanvas(s) {
    let entry = this.screenCache.get(s);
    if (entry) return entry;
    const world = this.world;
    const c = createCanvas(VIEW_W, VIEW_H);
    const ctx = c.getContext('2d');
    const top = world.screenTopRow(s);
    const biome = world.biomeOf(s);
    const ts = TILESETS[biome];
    const animated = [];
    const emitters = [];
    const windCells = [];

    // decorações (as de fundo primeiro)
    const decor = [];
    for (let r = top; r < top + ROWS_PER_SCREEN; r++)
      for (let col = 0; col < world.cols; col++) {
        const d = decorAt(world, col, r, DECOR_BY_BIOME);
        if (d) decor.push(d);
        const ch = world.charAt(col, r);
        if (ch === 'G') animated.push({ star: true, x: col * TILE, y: r * TILE });
        const w = world.windAtTile(col, r);
        if (w) windCells.push({ c: col, r, dir: w });
      }
    decor.sort((a, b) => (a.def.anchor === 'free' ? 0 : 1) - (b.def.anchor === 'free' ? 0 : 1));
    for (const d of decor) {
      if (d.def.anim.length > 1) {
        animated.push({ def: d.def, x: d.x, y: d.y });
        if (d.def.embers) emitters.push({ x: d.x + OX, y: d.y });
      } else {
        ctx.drawImage(sprite(d.def.anim[0]), OX + d.x, d.y - top * TILE);
      }
    }
    // caules dos cogumelos
    for (const st of mushroomStems(world, top - 12, top + ROWS_PER_SCREEN)) {
      if (st.r < top || st.r >= top + ROWS_PER_SCREEN) continue;
      ctx.drawImage(sprite(TILESETS.forest.cap.stem), OX + st.c * TILE, (st.r - top) * TILE);
    }
    // tiles
    const drawTileAt = (col, r, px) => {
      const d = describeTile(world, col, r);
      if (!d) return false;
      const py = (r - top) * TILE;
      ctx.drawImage(sprite(d.m), px, py);
      if (d.edges) {
        ctx.fillStyle = PALETTE[codeToIndex(d.edgeColor)];
        if (d.edges.l) ctx.fillRect(px, py, 1, TILE);
        if (d.edges.r) ctx.fillRect(px + TILE - 1, py, 1, TILE);
        if (d.edges.b) ctx.fillRect(px, py + TILE - 1, TILE, 1);
      }
      return true;
    };
    for (let r = top; r < top + ROWS_PER_SCREEN; r++)
      for (let col = 0; col < world.cols; col++) drawTileAt(col, r, OX + col * TILE);
    // faixas de 2 px nas laterais: continuam a parede (ou cor sólida)
    const wallColor = PALETTE[codeToIndex(ts.wall)];
    for (let r = top; r < top + ROWS_PER_SCREEN; r++) {
      const py = (r - top) * TILE;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, py, OX, TILE);
      ctx.clip();
      if (!drawTileAt(0, r, OX - TILE)) {
        ctx.fillStyle = wallColor;
        ctx.fillRect(0, py, OX, TILE);
      }
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(VIEW_W - OX, py, OX, TILE);
      ctx.clip();
      if (!drawTileAt(world.cols - 1, r, OX + world.cols * TILE)) {
        ctx.fillStyle = wallColor;
        ctx.fillRect(VIEW_W - OX, py, OX, TILE);
      }
      ctx.restore();
    }
    entry = { canvas: c, animated, emitters, windCells, biome };
    this.screenCache.set(s, entry);
    if (this.screenCache.size > 6) {
      const oldest = this.screenCache.keys().next().value;
      this.screenCache.delete(oldest);
    }
    return entry;
  }

  drawScreen(ctx, s) {
    ctx.drawImage(this.screenCanvas(s).canvas, 0, 0);
  }

  /** Decorações animadas (tochas, velas, sinos) e a estrela. */
  drawAnimated(ctx, s, frame, starState) {
    const entry = this.screenCanvas(s);
    const topY = this.world.screenTopY(s);
    for (const a of entry.animated) {
      if (a.star) {
        const st = starState || {};
        if (st.hidden) continue;
        const bob = Math.round(Math.sin(frame * 0.05) * 1.5);
        const f = STAR[(frame >> 4) % STAR.length];
        const x = OX + a.x;
        const y = a.y - topY + bob + (st.rise || 0);
        // halo pulsante (pontos de luz ao redor)
        ctx.fillStyle = PALETTE[15];
        const halo = 11 + ((frame >> 3) % 3);
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + frame * 0.02;
          ctx.fillRect(Math.round(x + 8 + Math.cos(ang) * halo), Math.round(y + 8 + Math.sin(ang) * halo), 1, 1);
        }
        ctx.drawImage(sprite(f), Math.round(x), Math.round(y));
        continue;
      }
      const speed = a.def.speed || 8;
      const idx = Math.floor(frame / speed) % a.def.anim.length;
      ctx.drawImage(sprite(a.def.anim[idx]), OX + a.x, a.y - topY);
    }
  }
}
