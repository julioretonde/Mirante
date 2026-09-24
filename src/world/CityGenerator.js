import * as THREE from 'three';
import { config } from '../config.js';
import { createRandom } from '../core/Random.js';
import { SLOT } from './atlas.js';
import { STYLES, ROUTE } from './cityLayout.js';
import { GeometryBuilder, chamferRect, circle, rect } from './geometry.js';

/** Largura do vão (m) por tipo de fachada: define o espaçamento das janelas. */
const BAY = { house: 2.6, old: 3.2, office: 3.6, glass: 3 };
const WALL_SLOT = { house: SLOT.house, old: SLOT.old, office: SLOT.office, glass: SLOT.glass };

const PAVING = '#e3d6c4';
const CURB = '#cdbfad';
const STONE = '#efe6d8';
const IRON = '#5f5a63';
const WOOD = '#8a6049';
const CONCRETE = '#cfc9bf';
const SHOP_COLORS = ['#e9a38f', '#9cc5b9', '#f0cf86', '#b9a8d6', '#e7b98f', '#a7c1d9', '#d9b3a3'];
const AWNINGS = ['#d9867a', '#6fa89a', '#d8b460', '#9f8cc4', '#d99a6c', '#7e9fc0'];
const CLOTHES = ['#f4f1ea', '#e57a6b', '#7fa7c9', '#f2cf6b', '#9cc59b', '#e9a8c0', '#ffffff'];
const LEAVES = ['#86a86f', '#739a64', '#9bb87a', '#7fa380', '#a3b86c'];

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Constrói a cidade a partir do layout, em blocos de `chunkSize` metros.
 * Cada bloco vira um THREE.LOD com UMA malha perto (tudo no material-atlas: paredes, telhados,
 * calçadas, árvores, postes, varais) e UMA malha longe (caixas com as mesmas fachadas).
 */
export class CityGenerator {
  constructor(layout, materials) {
    this.materials = materials;
    this.group = new THREE.Group();
    this.chunks = [];

    const size = config.world.chunkSize;
    const half = config.world.citySize / 2;
    const byChunk = new Map();
    const bucket = (x, z) => {
      const cx = Math.floor((x + half) / size);
      const cz = Math.floor((z + half) / size);
      const k = `${cx},${cz}`;
      if (!byChunk.has(k)) byChunk.set(k, { cx, cz, buildings: [], parks: [] });
      return byChunk.get(k);
    };
    for (const b of layout.buildings) bucket(b.x, b.z).buildings.push(b);
    for (const p of layout.parks ?? []) bucket(p.x, p.z).parks.push(p);

    for (const { cx, cz, buildings, parks } of byChunk.values()) {
      const center = new THREE.Vector3(-half + (cx + 0.5) * size, 0, -half + (cz + 0.5) * size);
      this.#buildChunk(center, buildings, parks);
    }
  }

  #buildChunk(center, buildings, parks) {
    const near = new GeometryBuilder();
    const far = new GeometryBuilder();

    for (const b of buildings) {
      const rnd = createRandom(b.seed + 1);
      near.shade = contactShade(b.top - b.height);
      this.#building(near, b, rnd);
      near.shade = null;
      this.#lodBuilding(far, b);
    }
    for (const p of parks) this.#park(near, p);

    const toMesh = (builder, shadow) => {
      const geo = builder.toGeometry();
      geo.translate(-center.x, 0, -center.z);
      const mesh = new THREE.Mesh(geo, this.materials.city);
      mesh.castShadow = shadow;
      mesh.receiveShadow = shadow;
      return mesh;
    };

    const chunk = new THREE.LOD();
    chunk.position.copy(center);
    if (!near.empty) chunk.addLevel(toMesh(near, true), 0);
    if (!far.empty) chunk.addLevel(toMesh(far, false), config.world.lodDistance);
    this.group.add(chunk);
    this.chunks.push(chunk);
  }

  // ——— prédios ———

  #building(B, b, rnd) {
    const base = b.top - b.height; // nível da rua junto ao prédio
    const front = frontOf(b);

    // Calçada com meio-fio em volta do prédio (as ruas aparecem entre as calçadas)
    B.use(SLOT.paving).prism(rect(b.x, b.z, b.w + 3.4, b.d + 3.4), b.ground - 0.5, base + 0.16, CURB, {
      topColor: PAVING,
      topSlot: SLOT.paving,
    });

    if (b.style === 'house' || b.style === 'market') this.#house(B, b, rnd, base, front);
    else if (b.style === 'old') this.#old(B, b, rnd, base, front);
    else if (b.style === 'office') this.#office(B, b, rnd, base);
    else if (b.style === 'construction') this.#construction(B, b, rnd, base);
    else if (b.style === 'glass') this.#glass(B, b, rnd, base);

    this.#streetLife(B, b, rnd, base, front);
  }

  #walls(B, b, points, y0, y1, color, slot, vBase, floorH, opts = {}) {
    B.use(slot).prism(points, y0, y1, color, {
      bay: BAY[b.wall] ?? 3,
      floor: floorH,
      u0: b.seed % 97,
      v0: (b.seed >> 3) % 31,
      vBase,
      splits: [vBase + 1.2, vBase + 4],
      top: false,
      ...opts,
    });
  }

  #house(B, b, rnd, base, front) {
    const floorH = STYLES[b.style].floorH;
    const isMarket = b.style === 'market';
    const pts = rect(b.x, b.z, b.w, b.d);
    if (isMarket) {
      // Térreo de loja + andares residenciais
      const shopColor = rnd.pick(SHOP_COLORS);
      B.use(SLOT.shop).prism(pts, b.ground, base + floorH, shopColor, {
        bay: 2.8, floor: floorH, u0: b.seed % 13, vBase: base, splits: [base + 1.2], top: false,
      });
      this.#walls(B, b, pts, base + floorH, b.top, b.wallColor, SLOT.market, base, floorH);
      this.#cornice(B, b, base + floorH, 0.28, 0.3, STONE);
    } else {
      this.#walls(B, b, pts, b.ground, b.top, b.wallColor, SLOT.house, base, floorH);
      this.#door(B, b, front, base, rnd);
    }
    // Faixa sob o beiral
    this.#cornice(B, b, b.top - 0.25, 0.25, 0.12, STONE);

    const rise = Math.min(b.w, b.d) * rnd.range(0.3, 0.42);
    if (rnd.chance(0.6)) B.gableRoof(b.x, b.z, b.w, b.d, b.top, rise, 0.5, b.roofColor, b.wallColor);
    else B.hipRoof(b.x, b.z, b.w, b.d, b.top, rise, 0.5, b.roofColor);

    if (b.chimney) {
      const along = b.w >= b.d;
      const off = (along ? b.w : b.d) * 0.22 * (rnd.chance(0.5) ? 1 : -1);
      const x = b.x + (along ? off : 0);
      const z = b.z + (along ? 0 : off);
      B.use(SLOT.plaster).box(x, b.top + rise * 0.55, z, 0.9, rise + 1.4, 0.9, b.wallColor);
      B.use(SLOT.white).box(x, b.top + rise * 0.55 + rise / 2 + 0.75, z, 1.2, 0.25, 1.2, '#8f6d62');
      b.chimneyTop = [x, b.top + rise * 0.55 + rise / 2 + 1, z]; // usado pela fumaça (Ambient)
    }

    if (isMarket) {
      this.#awning(B, b, front, base + floorH - 0.4, rnd, 0.85);
      this.#awning(B, b, opposite(front), base + floorH - 0.4, rnd, 0.85);
      this.#bunting(B, b, front, base + floorH + 1.6, rnd);
    } else if (b.awnings) {
      this.#awning(B, b, front, base + 2.9, rnd, 0.5);
    }
  }

  #old(B, b, rnd, base, front) {
    const floorH = STYLES.old.floorH;
    const shopH = 3.8;
    const pts = rect(b.x, b.z, b.w, b.d);
    const shopColor = rnd.pick(SHOP_COLORS);
    B.use(SLOT.shop).prism(pts, b.ground, base + shopH, shopColor, {
      bay: 3.2, floor: shopH, u0: b.seed % 13, vBase: base, splits: [base + 1.2], top: false,
    });
    this.#walls(B, b, pts, base + shopH, b.top, b.wallColor, SLOT.old, base + shopH, floorH);
    this.#cornice(B, b, base + shopH, 0.35, 0.35, STONE);
    if (rnd.chance(0.55)) this.#awning(B, b, front, base + shopH - 0.5, rnd, 0.7);

    // Sacadas em andares alternados da fachada principal
    if (rnd.chance(0.5) && b.floors >= 4) {
      for (let f = 1; f < b.floors - 1; f += 2) {
        const y = base + shopH + f * floorH;
        this.#faceBox(B, b, front, 0, y + 0.1, 0.7, b.w * 0.55, 0.18, 1.3, STONE, SLOT.white, true);
        this.#railing(B, b, front, y + 0.2, 1.3, b.w * 0.55);
      }
    }

    // Cornija, platibanda e laje
    this.#cornice(B, b, b.top - 0.1, 0.6, 0.45, STONE);
    B.use(SLOT.concrete).prism(rect(b.x, b.z, b.w - 0.2, b.d - 0.2), b.top, b.top + 0.3, b.roofColor, { top: true, topSlot: SLOT.concrete, topColor: '#d9cfc2' });
    this.#parapet(B, b, b.top + 0.3, 0.9, b.wallColor);

    const roofY = b.top + 0.3;
    if (rnd.chance(0.4)) {
      // Casinha da escada
      const sx = b.x - b.w * 0.25;
      const sz = b.z - b.d * 0.2;
      B.use(SLOT.plaster).box(sx, roofY + 1.4, sz, 3, 2.8, 2.6, b.wallColor);
      B.use(SLOT.white).box(sx, roofY + 2.9, sz, 3.4, 0.25, 3, '#b9aa9c');
      B.use(SLOT.wood).box(sx + 1.51, roofY + 1.05, sz, 0.08, 2.1, 1, WOOD);
    }
    if (b.waterTank) this.#waterTank(B, b.x + b.w * 0.22, roofY, b.z + b.d * 0.15, rnd);
    if (rnd.chance(0.35)) this.#laundry(B, b, roofY, rnd);
    if (rnd.chance(0.45)) {
      for (let i = 0; i < 3; i++) {
        const x = b.x + rnd.range(-0.35, 0.35) * b.w;
        const z = b.z + rnd.range(-0.35, 0.35) * b.d;
        B.use(SLOT.white).box(x, roofY + 0.3, z, 0.6, 0.6, 0.6, '#b0735c');
        B.blob(x, roofY + 1.1, z, 0.6, 0.55, 0.6, rnd.pick(LEAVES), 0, 0.2, b.seed + i);
      }
    }
    if (b.antenna) this.#antenna(B, b.x - b.w * 0.3, roofY, b.z + b.d * 0.3, rnd.range(4, 8));
  }

  #office(B, b, rnd, base) {
    const floorH = STYLES.office.floorH;
    const pts = rect(b.x, b.z, b.w, b.d);
    // Pódio de pedra com térreo envidraçado
    B.use(SLOT.shop).prism(rect(b.x, b.z, b.w + 1.2, b.d + 1.2), b.ground, base + 4.2, '#e8e1d6', {
      bay: 3.6, floor: 4.2, u0: b.seed % 13, vBase: base, splits: [base + 1.2], top: true, topSlot: SLOT.concrete, topColor: '#d8d0c4',
    });
    this.#walls(B, b, pts, base + 4.2, b.top, b.wallColor, SLOT.office, base + 4.2, floorH);
    this.#cornice(B, b, b.top - 0.1, 0.5, 0.35, '#e6e0d6');
    B.use(SLOT.concrete).prism(rect(b.x, b.z, b.w - 0.2, b.d - 0.2), b.top, b.top + 0.3, b.roofColor, { topSlot: SLOT.concrete, topColor: '#cfc8bd' });
    this.#parapet(B, b, b.top + 0.3, 1, '#ddd6cc');
    const roofY = b.top + 0.3;
    // Casa de máquinas e condensadores
    B.use(SLOT.concrete).box(b.x - b.w * 0.15, roofY + 1.6, b.z, b.w * 0.35, 3.2, b.d * 0.3, '#d3ccc2');
    for (let i = 0; i < 3; i++) {
      B.use(SLOT.white).box(b.x + b.w * 0.25, roofY + 0.5, b.z - b.d * 0.25 + i * 1.6, 1.2, 1, 1.2, '#b8bcc0');
    }
    if (b.waterTank) this.#waterTank(B, b.x + b.w * 0.25, roofY, b.z + b.d * 0.25, rnd);
    if (b.antenna) this.#antenna(B, b.x - b.w * 0.3, roofY + 3.2, b.z, rnd.range(5, 10));
  }

  #construction(B, b, rnd, base) {
    const floorH = STYLES.construction.floorH;
    const pts = rect(b.x, b.z, b.w, b.d);
    if (!b.unfinished) {
      this.#office(B, b, rnd, base);
      return;
    }
    const done = base + Math.round(b.floors * 0.55) * floorH;
    this.#walls(B, b, pts, b.ground, done, b.wallColor, SLOT.office, base, floorH);
    const hw = b.w / 2 - 0.5;
    const hd = b.d / 2 - 0.5;
    B.use(SLOT.concrete);
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      B.beam([b.x + sx * hw, done, b.z + sz * hd], [b.x + sx * hw, b.top, b.z + sz * hd], 0.8, CONCRETE);
    }
    for (let y = done; y <= b.top + 0.01; y += floorH) {
      B.prism(rect(b.x, b.z, b.w, b.d), y - 0.35, y, CONCRETE, { topSlot: SLOT.concrete, topColor: '#d8d2c8' });
    }
    // Lona de proteção num dos lados e andaime de madeira
    B.use(SLOT.white);
    const side = rnd.chance(0.5) ? 1 : -1;
    const z = b.z + side * (b.d / 2 + 1.3);
    for (let x = b.x - b.w / 2; x <= b.x + b.w / 2 + 0.01; x += 2.5) {
      B.beam([x, b.ground + 1, z], [x, done, z], 0.14, '#b8a06c');
      B.beam([x, b.ground + 1, z + side * 1.1], [x, done, z + side * 1.1], 0.14, '#b8a06c');
    }
    for (let y = b.ground + 1 + floorH; y <= done; y += floorH) {
      B.use(SLOT.wood).box(b.x, y, z + side * 0.55, b.w, 0.12, 1.3, '#b08c62', true);
      B.use(SLOT.white).beam([b.x - b.w / 2, y + 1, z + side * 1.1], [b.x + b.w / 2, y + 1, z + side * 1.1], 0.1, '#b8a06c');
    }
    B.use(SLOT.white).box(b.x, (done + b.top) / 2 + 2, b.z - side * (b.d / 2 + 0.2), b.w * 0.8, (b.top - done) * 0.6, 0.1, '#8fb3a8');
  }

  #glass(B, b, rnd, base) {
    const floorH = STYLES.glass.floorH;
    const footprint = (w, d) => chamferRect(b.x, b.z, w, d, Math.min(w, d) * 0.14);
    // Pódio de pedra (dois andares) com lojas
    B.use(SLOT.shop).prism(footprint(b.w + 6, b.d + 6), b.ground, base + 7.5, '#efe7da', {
      bay: 4, floor: 3.75, u0: b.seed % 13, vBase: base, splits: [base + 1.2], topSlot: SLOT.paving, topColor: '#e6dccd',
    });
    B.use(SLOT.white).prism(footprint(b.w + 6.6, b.d + 6.6), base + 7.5, base + 8.1, STONE);

    const fractions = b.setbacks === 2 ? [0.55, 0.82, 1] : b.setbacks === 1 ? [0.68, 1] : [1];
    const scales = [1, 0.78, 0.58];
    let y0 = base + 8.1;
    fractions.forEach((f, i) => {
      const y1 = base + b.height * f;
      const s = scales[i];
      this.#walls(B, b, footprint(b.w * s, b.d * s), y0, y1, b.wallColor, SLOT.glass, base, floorH, {
        top: true, topSlot: SLOT.concrete, topColor: b.roofColor,
      });
      // Faixa de coroamento que acende à noite
      B.use(SLOT.lamp).prism(footprint(b.w * s + 0.5, b.d * s + 0.5), y1 - 0.9, y1 - 0.4, '#fff3d6', { top: false });
      B.use(SLOT.white).prism(footprint(b.w * s + 0.9, b.d * s + 0.9), y1 - 0.4, y1 + 0.6, b.roofColor);
      y0 = y1 + 0.6;
    });
    // Coroa: volume afunilado + mastro (os marcos ganham uma agulha)
    const s = scales[fractions.length - 1];
    const topY = base + b.height + 0.6;
    B.use(SLOT.glass).prism(footprint(b.w * s * 0.6, b.d * s * 0.6), topY, topY + 6, b.wallColor, { topSlot: SLOT.concrete, topColor: b.roofColor, bay: 3, floor: 3.5, vBase: topY });
    if (b.landmark || b.antenna) this.#antenna(B, b.x, topY + 6, b.z, b.landmark ? 26 : 10, b.landmark ? 0.9 : 0.3);
  }

  // ——— versão distante ———

  #lodBuilding(F, b) {
    const base = b.top - b.height;
    const style = STYLES[b.style];
    const slot = b.style === 'market' ? SLOT.market : WALL_SLOT[b.wall];
    const opts = { bay: BAY[b.wall], floor: style.floorH, u0: b.seed % 97, v0: (b.seed >> 3) % 31, vBase: base, topSlot: SLOT.white, topColor: b.roofColor };
    if (b.roof === 'gable') {
      F.use(slot).prism(rect(b.x, b.z, b.w, b.d), b.ground, b.top, b.wallColor, { ...opts, top: false });
      F.hipRoof(b.x, b.z, b.w, b.d, b.top, Math.min(b.w, b.d) * 0.36, 0.3, b.roofColor);
    } else if (b.style === 'glass') {
      const fp = (w, d) => chamferRect(b.x, b.z, w, d, Math.min(w, d) * 0.14);
      const fractions = b.setbacks === 2 ? [0.55, 0.82, 1] : b.setbacks === 1 ? [0.68, 1] : [1];
      const scales = [1, 0.78, 0.58];
      F.use(SLOT.shop).prism(fp(b.w + 6, b.d + 6), b.ground, base + 7.5, '#efe7da', { ...opts, bay: 4, floor: 3.75 });
      let y0 = base + 7.5;
      fractions.forEach((f, i) => {
        const y1 = base + b.height * f;
        F.use(slot).prism(fp(b.w * scales[i], b.d * scales[i]), y0, y1, b.wallColor, opts);
        F.use(SLOT.lamp).prism(fp(b.w * scales[i] + 0.5, b.d * scales[i] + 0.5), y1 - 0.9, y1 - 0.2, '#fff3d6', { top: false });
        y0 = y1;
      });
      const s = scales[fractions.length - 1];
      F.use(slot).prism(fp(b.w * s * 0.6, b.d * s * 0.6), b.top, b.top + 6.6, b.wallColor, opts);
    } else if (b.setbacks) {
      const h1 = base + b.height * 0.62;
      F.use(slot).prism(rect(b.x, b.z, b.w, b.d), b.ground, h1, b.wallColor, opts);
      F.use(slot).prism(rect(b.x, b.z, b.w * 0.72, b.d * 0.72), h1, b.top, b.wallColor, opts);
    } else {
      F.use(slot).prism(rect(b.x, b.z, b.w, b.d), b.ground, b.top, b.wallColor, opts);
    }
  }

  // ——— praças e vida de rua ———

  #park(B, p) {
    const rnd = createRandom(p.seed);
    const top = p.ground + 0.35;
    B.use(SLOT.paving).prism(rect(p.x, p.z, p.w, p.d), p.ground - 0.6, top, CURB, { topSlot: SLOT.paving, topColor: PAVING });
    B.use(SLOT.grass).prism(rect(p.x, p.z, p.w - 3, p.d - 3), top - 0.1, top + 0.08, '#8fae74', { topSlot: SLOT.grass, topColor: '#9cb97d' });
    // Caminho em cruz
    B.use(SLOT.paving).prism(rect(p.x, p.z, p.w - 3, 1.6), top, top + 0.1, PAVING, { topSlot: SLOT.paving, topColor: PAVING });
    B.use(SLOT.paving).prism(rect(p.x, p.z, 1.6, p.d - 3), top, top + 0.1, PAVING, { topSlot: SLOT.paving, topColor: PAVING });
    const n = rnd.int(3, 6);
    for (let i = 0; i < n; i++) {
      const qx = rnd.chance(0.5) ? 1 : -1;
      const qz = rnd.chance(0.5) ? 1 : -1;
      const x = p.x + qx * rnd.range(2, p.w / 2 - 2);
      const z = p.z + qz * rnd.range(2, p.d / 2 - 2);
      this.#tree(B, x, top, z, rnd, rnd.range(0.9, 1.4));
    }
    // Banco e poste
    B.use(SLOT.wood).box(p.x + 2.2, top + 0.45, p.z + 1.4, 1.8, 0.12, 0.5, WOOD);
    B.use(SLOT.white).box(p.x + 2.2, top + 0.22, p.z + 1.4, 1.6, 0.44, 0.12, IRON);
    this.#lamp(B, p.x - 1.3, top, p.z - 1.3);
  }

  #streetLife(B, b, rnd, base, front) {
    if (b.style === 'glass' || b.style === 'construction') return;
    // Árvore de rua numa das esquinas da calçada
    if (rnd.chance(b.style === 'house' ? 0.28 : 0.35)) {
      const sx = rnd.chance(0.5) ? 1 : -1;
      const [fx, fz] = front.n;
      const ox = fx !== 0 ? fx * (b.w / 2 + 1) : sx * (b.w / 2 - 1);
      const oz = fz !== 0 ? fz * (b.d / 2 + 1) : sx * (b.d / 2 - 1);
      this.#tree(B, b.x + ox, base + 0.16, b.z + oz, rnd, rnd.range(0.8, 1.15));
    } else if (rnd.chance(0.2)) {
      const [fx, fz] = front.n;
      this.#lamp(B, b.x + fx * (b.w / 2 + 1.1) + fz * b.w * 0.3, base + 0.16, b.z + fz * (b.d / 2 + 1.1) + fx * b.d * 0.3);
    }
  }

  #tree(B, x, y, z, rnd, s = 1) {
    B.use(SLOT.wood).beam([x, y, z], [x, y + 2.6 * s, z], 0.3 * s, '#7a5a48');
    const color = rnd.pick(LEAVES);
    const seed = rnd.int(0, 999);
    if (rnd.chance(0.25)) {
      // Cipreste (vertical, bem mediterrâneo)
      B.use(SLOT.white).blob(x, y + 4.2 * s, z, 0.9 * s, 3 * s, 0.9 * s, '#6f8f62', 0, 0.06, seed);
    } else {
      B.use(SLOT.white).blob(x, y + 3.5 * s, z, 1.9 * s, 1.6 * s, 1.9 * s, color, 1, 0.1, seed);
    }
  }

  #lamp(B, x, y, z) {
    B.use(SLOT.white).beam([x, y, z], [x, y + 3.6, z], 0.14, IRON);
    B.beam([x, y + 3.6, z], [x + 0.5, y + 3.8, z], 0.1, IRON);
    B.use(SLOT.lamp).box(x + 0.55, y + 3.6, z, 0.35, 0.4, 0.35, '#fff1cf');
    B.use(SLOT.white).box(x + 0.55, y + 3.85, z, 0.5, 0.1, 0.5, IRON);
  }

  #waterTank(B, x, y, z, rnd) {
    const wood = rnd.chance(0.5);
    B.use(SLOT.white);
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      B.beam([x + dx, y, z + dz], [x + dx, y + 2, z + dz], 0.22, '#6f6660');
    }
    B.use(wood ? SLOT.wood : SLOT.concrete).prism(circle(x, z, 1.6, 10), y + 2, y + 5, wood ? '#b58a64' : '#a9b3b7', { bay: 1.2, floor: 3, vBase: y + 2 });
    B.use(SLOT.white).cone(x, y + 5, z, 1.75, 1, 10, wood ? '#8e6a4f' : '#8d979c');
  }

  #antenna(B, x, y, z, h, t = 0.18) {
    B.use(SLOT.white).beam([x, y, z], [x, y + h, z], t, '#7d7880');
    B.beam([x - 1.2, y + h * 0.7, z], [x + 1.2, y + h * 0.7, z], t * 0.6, '#7d7880');
    B.use(SLOT.lamp).box(x, y + h + 0.2, z, t * 2.5, 0.4, t * 2.5, '#ff8a7a');
  }

  /** Varal no terraço com roupas coloridas (GDD §3: "varais com roupas balançando"). */
  #laundry(B, b, y, rnd) {
    const alongX = b.w >= b.d;
    const len = (alongX ? b.w : b.d) * 0.6;
    const off = (alongX ? b.d : b.w) * rnd.range(-0.2, 0.2);
    const a = alongX ? [b.x - len / 2, y, b.z + off] : [b.x + off, y, b.z - len / 2];
    const c = alongX ? [b.x + len / 2, y, b.z + off] : [b.x + off, y, b.z + len / 2];
    B.use(SLOT.white);
    B.beam(a, [a[0], y + 2, a[2]], 0.1, IRON);
    B.beam(c, [c[0], y + 2, c[2]], 0.1, IRON);
    B.beam([a[0], y + 1.9, a[2]], [c[0], y + 1.9, c[2]], 0.03, '#dddddd');
    const n = Math.floor(len / 0.9);
    for (let i = 1; i < n; i++) {
      if (!rnd.chance(0.7)) continue;
      const t = i / n;
      const px = a[0] + (c[0] - a[0]) * t;
      const pz = a[2] + (c[2] - a[2]) * t;
      const w = rnd.range(0.35, 0.6);
      const h = rnd.range(0.5, 0.9);
      const color = rnd.pick(CLOTHES);
      const p0 = alongX ? [px - w / 2, y + 1.9, pz] : [px, y + 1.9, pz - w / 2];
      const p1 = alongX ? [px + w / 2, y + 1.9, pz] : [px, y + 1.9, pz + w / 2];
      const p2 = [p1[0], y + 1.9 - h, p1[2]];
      const p3 = [p0[0], y + 1.9 - h, p0[2]];
      B.quad(p0, p1, p2, p3, color, null, alongX ? [px, y, pz - 1] : [px - 1, y, pz]);
      B.quad(p0, p1, p2, p3, color, null, alongX ? [px, y, pz + 1] : [px + 1, y, pz]);
    }
  }

  /** Bandeirinhas de festa na fachada do mercado. */
  #bunting(B, b, face, y, rnd) {
    const [nx, nz] = face.n;
    const half = (nx !== 0 ? b.d : b.w) / 2;
    const out = (nx !== 0 ? b.w : b.d) / 2 + 1.2;
    const flags = Math.floor(half * 2 / 0.8);
    B.use(SLOT.white);
    for (let i = 0; i < flags; i++) {
      const t = -half + (i + 0.5) * (half * 2 / flags);
      const sag = Math.sin(((i + 0.5) / flags) * Math.PI) * 0.6;
      const at = (along, dy) => (nx !== 0 ? [b.x + nx * out, y - sag + dy, b.z + along] : [b.x + along, y - sag + dy, b.z + nz * out]);
      const color = rnd.pick(AWNINGS.concat(['#f4f1ea', '#f2cf6b']));
      const p0 = at(t - 0.3, 0);
      const p1 = at(t + 0.3, 0);
      const p2 = at(t, -0.55);
      const o = [b.x, y, b.z];
      B.tri(p0, p1, p2, new THREE.Color(color).toArray(), undefined, undefined, undefined, o);
      B.tri(p0, p1, p2, new THREE.Color(color).toArray(), undefined, undefined, undefined, [b.x + nx * out * 3, y, b.z + nz * out * 3]);
    }
  }

  /** Toldo listrado inclinado sobre a fachada. */
  #awning(B, b, face, y, rnd, widthFrac) {
    const [nx, nz] = face.n;
    const halfFace = (nx !== 0 ? b.d : b.w) / 2;
    const wallOff = (nx !== 0 ? b.w : b.d) / 2;
    const width = halfFace * 2 * widthFrac;
    const out = rnd.range(1.4, 2);
    const at = (along, dy, o) => (nx !== 0 ? [b.x + nx * (wallOff + o), y + dy, b.z + along] : [b.x + along, y + dy, b.z + nz * (wallOff + o)]);
    const hiA = at(-width / 2, 0.7, 0.02);
    const hiB = at(width / 2, 0.7, 0.02);
    const loA = at(-width / 2, 0, out);
    const loB = at(width / 2, 0, out);
    const dropA = at(-width / 2, -0.45, out);
    const dropB = at(width / 2, -0.45, out);
    const stripes = width / 0.6;
    const uvs = [
      [0, 1],
      [stripes, 1],
      [stripes, 0],
      [0, 0],
    ];
    const color = rnd.pick(AWNINGS);
    const inside = [b.x, y - 4, b.z];
    const outside = at(0, 6, out * 3);
    B.use(SLOT.stripes);
    B.quad(hiA, hiB, loB, loA, color, uvs, inside);
    B.quad(hiA, hiB, loB, loA, color, uvs, outside);
    B.quad(loA, loB, dropB, dropA, color, uvs, [b.x, y, b.z]);
  }

  // ——— pequenos elementos arquitetônicos ———

  #cornice(B, b, y, h, out, color) {
    B.use(SLOT.white).prism(rect(b.x, b.z, b.w + out * 2, b.d + out * 2), y - h / 2, y + h / 2, color);
  }

  #parapet(B, b, y, h, color) {
    const t = 0.3;
    B.use(SLOT.plaster);
    B.box(b.x, y + h / 2, b.z - b.d / 2 + t / 2, b.w, h, t, color);
    B.box(b.x, y + h / 2, b.z + b.d / 2 - t / 2, b.w, h, t, color);
    B.box(b.x - b.w / 2 + t / 2, y + h / 2, b.z, t, h, b.d - t * 2, color);
    B.box(b.x + b.w / 2 - t / 2, y + h / 2, b.z, t, h, b.d - t * 2, color);
  }

  #door(B, b, face, base, rnd) {
    this.#faceBox(B, b, face, 0, base + 1.1, 0.1, 1.15, 2.2, 0.1, rnd.pick(['#7a5646', '#5f7a73', '#8a4f4a', '#4f6480']), SLOT.wood);
    this.#faceBox(B, b, face, 0, base + 0.08, 0.5, 1.8, 0.16, 0.8, STONE, SLOT.paving);
  }

  /** Guarda-corpo de sacada: painel baixo + corrimão (barato em triângulos). */
  #railing(B, b, face, y, out, width) {
    this.#faceBox(B, b, face, 0, y + 0.45, out, width, 0.9, 0.08, '#eee4d6', SLOT.plaster);
    this.#faceBox(B, b, face, 0, y + 0.95, out + 0.04, width + 0.1, 0.1, 0.16, IRON, SLOT.white);
  }

  /** Caixa encostada numa fachada: `along` desloca ao longo dela, `out` para fora. */
  #faceBox(B, b, face, along, y, out, sizeAlong, sizeUp, sizeOut, color, slot, bottom = false) {
    const [nx, nz] = face.n;
    const wallOff = (nx !== 0 ? b.w : b.d) / 2;
    const cx = nx !== 0 ? b.x + nx * (wallOff + out - sizeOut / 2) : b.x + along;
    const cz = nz !== 0 ? b.z + nz * (wallOff + out - sizeOut / 2) : b.z + along;
    const sx = nx !== 0 ? sizeOut : sizeAlong;
    const sz = nz !== 0 ? sizeOut : sizeAlong;
    B.use(slot).box(cx, y, cz, sx, sizeUp, sz, color, bottom);
  }
}

/** Oclusão de contato no pé do prédio + leve clareamento com a altura (volume sem custo de luz). */
function contactShade(base) {
  return (x, y) => {
    const ao = 0.66 + 0.34 * smooth(clamp((y - base) / 4, 0, 1));
    const lift = 0.96 + 0.08 * clamp((y - base) / 50, 0, 1);
    return ao * lift;
  };
}

/** Fachada principal: a voltada para a rota (se perto), senão a sul (+Z, vista do começo). */
function frontOf(b) {
  let best = null;
  let bestD = Infinity;
  for (const [x, z] of ROUTE) {
    const d = Math.hypot(x - b.x, z - b.z);
    if (d < bestD) {
      bestD = d;
      best = [x, z];
    }
  }
  if (bestD < 45) {
    const dx = best[0] - b.x;
    const dz = best[1] - b.z;
    return Math.abs(dx) > Math.abs(dz) ? { n: [Math.sign(dx), 0] } : { n: [0, Math.sign(dz)] };
  }
  return { n: [0, 1] };
}

function opposite(face) {
  return { n: [-face.n[0], -face.n[1]] };
}
