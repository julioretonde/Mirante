import * as THREE from 'three';
import { config } from '../config.js';
import { createRandom } from '../core/Random.js';
import { GeometryBuilder, circle } from './geometry.js';
import { terrainHeight } from './heightfield.js';
import { cityEdge } from './cityLayout.js';

const SCAFFOLD = '#b8a06c';
const CRANE = '#c8ad6a';
const CRANE_DARK = '#8d8378';
const AWNINGS = ['#d9a6a0', '#9cc2b8', '#e3cd92', '#c3b3d9', '#e8b58f', '#a9c4d9'];

/**
 * Detalhes de vida da cidade (GDD §3): caixas d'água, antenas, chaminés, toldos, andaimes,
 * guindastes e árvores nas encostas. Tudo mesclado em poucas malhas estáticas.
 */
export class Props {
  constructor(layout, materials) {
    this.group = new THREE.Group();
    const rnd = createRandom(config.world.seed + 11);
    const plain = new GeometryBuilder();
    const awning = new GeometryBuilder();

    for (const b of layout.buildings) {
      if (b.unfinished) this.#scaffold(plain, b, rnd);
      if (b.chimney) {
        const along = b.w >= b.d;
        const off = (along ? b.w : b.d) * 0.25 * (rnd.chance(0.5) ? 1 : -1);
        const x = b.x + (along ? off : 0);
        const z = b.z + (along ? 0 : off);
        plain.box(x, b.top + Math.min(b.w, b.d) * 0.3, z, 0.9, 2.6, 0.9, '#a8715c');
        plain.box(x, b.top + Math.min(b.w, b.d) * 0.3 + 1.35, z, 1.2, 0.3, 1.2, '#8f5f4f');
      }
      if (b.waterTank && !b.setbacks) {
        const x = b.x + rnd.range(-0.25, 0.25) * b.w;
        const z = b.z + rnd.range(-0.25, 0.25) * b.d;
        const y = b.top + 0.55;
        const wood = rnd.chance(0.5);
        for (const [dx, dz] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          plain.beam([x + dx, y, z + dz], [x + dx, y + 2, z + dz], 0.25, '#6f6660');
        }
        plain.prism(circle(x, z, 1.6, 8), y + 2, y + 5, wood ? '#b58a64' : '#a9b3b7');
        plain.cone(x, y + 5, z, 1.75, 1, 8, wood ? '#8e6a4f' : '#8d979c');
      }
      if (b.antenna) {
        const h = b.landmark ? 24 : rnd.range(4, 9);
        const x = b.x + rnd.range(-0.2, 0.2) * b.w * (b.setbacks ? 0.4 : 1);
        const z = b.z + rnd.range(-0.2, 0.2) * b.d * (b.setbacks ? 0.4 : 1);
        const y = b.top + 0.8;
        plain.beam([x, y, z], [x, y + h, z], b.landmark ? 0.8 : 0.18, '#7d7880');
        plain.beam([x - 1.2, y + h * 0.7, z], [x + 1.2, y + h * 0.7, z], 0.12, '#7d7880');
      }
      for (let i = 0; i < b.awnings; i++) this.#awning(awning, b, i, rnd);
    }

    for (const c of layout.cranes) this.#crane(plain, c);
    this.#hillTrees(plain, rnd);

    const plainMesh = new THREE.Mesh(plain.toGeometry(), materials.plain);
    plainMesh.castShadow = plainMesh.receiveShadow = true;
    this.group.add(plainMesh);

    if (!awning.empty) {
      const awningMesh = new THREE.Mesh(awning.toGeometry(), materials.awning);
      awningMesh.castShadow = awningMesh.receiveShadow = true;
      this.group.add(awningMesh);
    }
  }

  /** Toldo listrado inclinado sobre a porta (frente ou fundos do prédio). */
  #awning(builder, b, index, rnd) {
    const side = index === 0 ? 1 : -1;
    const width = b.w * rnd.range(0.55, 0.8);
    const out = rnd.range(1.6, 2.2);
    const y = b.top - b.height + 3;
    const zWall = b.z + side * (b.d / 2);
    const x0 = b.x - width / 2;
    const x1 = b.x + width / 2;
    const hiA = [x0, y + 0.6, zWall];
    const hiB = [x1, y + 0.6, zWall];
    const loA = [x0, y - 0.1, zWall + side * out];
    const loB = [x1, y - 0.1, zWall + side * out];
    const stripes = width / 0.7;
    const uvs = [
      [0, 1],
      [stripes, 1],
      [stripes, 0],
      [0, 0],
    ];
    const color = rnd.pick(AWNINGS);
    builder.quad(hiA, hiB, loB, loA, color, uvs, [b.x, y - 5, b.z]);
    builder.quad(hiA, hiB, loB, loA, color, uvs, [b.x, y + 5, b.z + side * out * 3]);
    // Barrado frontal
    const dropA = [x0, y - 0.6, zWall + side * out];
    const dropB = [x1, y - 0.6, zWall + side * out];
    builder.quad(loA, loB, dropB, dropA, color, uvs, [b.x, y, b.z]);
  }

  /** Andaime num dos lados do prédio em obras. */
  #scaffold(builder, b, rnd) {
    const side = rnd.chance(0.5) ? 1 : -1;
    const z = b.z + side * (b.d / 2 + 1.2);
    const floorH = 3.5;
    const top = b.top - b.height + Math.round(b.floors * 0.55) * floorH;
    const base = b.ground + 1;
    const step = 2.5;
    for (let x = b.x - b.w / 2; x <= b.x + b.w / 2 + 0.01; x += step) {
      builder.beam([x, base, z], [x, top, z], 0.14, SCAFFOLD);
      builder.beam([x, base, z + side * 1.1], [x, top, z + side * 1.1], 0.14, SCAFFOLD);
    }
    for (let y = base + floorH; y <= top; y += floorH) {
      builder.box(b.x, y, z + side * 0.55, b.w, 0.12, 1.3, '#a88f63');
      builder.beam([b.x - b.w / 2, y + 1, z + side * 1.1], [b.x + b.w / 2, y + 1, z + side * 1.1], 0.1, SCAFFOLD);
    }
  }

  /** Guindaste de torre: mastro treliçado, lança, contralança, contrapeso e cabine. */
  #crane(builder, c) {
    const s = 1.1; // meia-largura do mastro
    const top = c.ground + c.height;
    for (const [dx, dz] of [
      [-s, -s],
      [s, -s],
      [s, s],
      [-s, s],
    ]) {
      builder.beam([c.x + dx, c.ground, c.z + dz], [c.x + dx, top, c.z + dz], 0.3, CRANE);
    }
    for (let y = c.ground; y < top - 3; y += 3.2) {
      builder.beam([c.x - s, y, c.z - s], [c.x + s, y + 3.2, c.z - s], 0.14, CRANE);
      builder.beam([c.x - s, y, c.z + s], [c.x + s, y + 3.2, c.z + s], 0.14, CRANE);
      builder.beam([c.x - s, y, c.z - s], [c.x - s, y + 3.2, c.z + s], 0.14, CRANE);
      builder.beam([c.x + s, y, c.z - s], [c.x + s, y + 3.2, c.z + s], 0.14, CRANE);
    }
    const dir = [Math.cos(c.rotation), Math.sin(c.rotation)];
    const at = (d, y) => [c.x + dir[0] * d, y, c.z + dir[1] * d];
    const perp = [-dir[1], dir[0]];
    const off = (p, k) => [p[0] + perp[0] * k, p[1], p[2] + perp[1] * k];
    // Lança (treliça triangular)
    const jy = top + 0.5;
    for (const k of [-0.9, 0.9]) builder.beam(off(at(-c.jib * 0.3, jy), k), off(at(c.jib, jy), k), 0.25, CRANE);
    builder.beam(at(0, jy + 1.8), at(c.jib, jy + 1.8), 0.2, CRANE);
    for (let d = 0; d < c.jib; d += 3) {
      builder.beam(off(at(d, jy), -0.9), at(d + 1.5, jy + 1.8), 0.1, CRANE);
      builder.beam(off(at(d, jy), 0.9), at(d + 1.5, jy + 1.8), 0.1, CRANE);
    }
    // Torre do topo e tirantes
    builder.beam(at(0, jy), at(0, jy + 8), 0.35, CRANE);
    builder.beam(at(0, jy + 8), at(c.jib * 0.7, jy + 1.8), 0.08, CRANE_DARK);
    builder.beam(at(0, jy + 8), at(-c.jib * 0.3, jy + 1), 0.08, CRANE_DARK);
    // Contrapeso e cabine
    const cw = at(-c.jib * 0.26, jy - 0.8);
    builder.box(cw[0], cw[1], cw[2], 3, 2.4, 3, CRANE_DARK);
    const cab = at(1.6, top - 1.2);
    builder.box(cab[0], cab[1], cab[2], 2.2, 2.2, 2.2, '#e6e0d4');
    // Cabo e gancho
    const hook = at(c.jib * 0.62, jy - 18);
    builder.beam(at(c.jib * 0.62, jy), hook, 0.05, CRANE_DARK);
    builder.box(hook[0], hook[1], hook[2], 0.8, 0.8, 0.8, CRANE_DARK);
  }

  /** Árvores nas encostas fora da cidade (anfiteatro verde). */
  #hillTrees(builder, rnd) {
    const greens = ['#8fa77f', '#7f9a74', '#9fb48a', '#869f82'];
    for (let i = 0; i < 1400; i++) {
      const x = rnd.range(-1100, 1100);
      const z = rnd.range(-1100, 1100);
      const inside = cityEdge(x, z) < 1.03;
      if (inside) continue;
      const y = terrainHeight(x, z);
      const s = rnd.range(1.4, 2.6);
      builder.box(x, y + 1.2 * s, z, 0.7 * s, 2.4 * s, 0.7 * s, '#7c6453');
      builder.cone(x, y + 1.8 * s, z, 2.6 * s, 6 * s, 6, rnd.pick(greens));
    }
  }
}
