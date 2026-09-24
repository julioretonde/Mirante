import * as THREE from 'three';
import { config } from '../config.js';
import { STYLES } from './cityLayout.js';
import { GeometryBuilder, chamferRect, rect } from './geometry.js';

/** Largura do vão (m) por tipo de fachada: define o espaçamento das janelas. */
const BAY = { house: 2.6, old: 3.2, office: 3.6, glass: 3 };
const CONCRETE = '#c9c3b8';

/**
 * Constrói a cidade a partir do layout, em blocos de `chunkSize` metros.
 * Cada bloco vira um THREE.LOD: perto, fachadas texturizadas mescladas por material
 * (poucos draw calls); longe, caixas simples numa única malha.
 */
export class CityGenerator {
  constructor(layout, materials) {
    this.materials = materials;
    this.group = new THREE.Group();
    this.chunks = [];

    const size = config.world.chunkSize;
    const half = config.world.citySize / 2;
    const byChunk = new Map();
    for (const b of layout.buildings) {
      const cx = Math.floor((b.x + half) / size);
      const cz = Math.floor((b.z + half) / size);
      const k = `${cx},${cz}`;
      if (!byChunk.has(k)) byChunk.set(k, { cx, cz, list: [] });
      byChunk.get(k).list.push(b);
    }

    for (const { cx, cz, list } of byChunk.values()) {
      const center = new THREE.Vector3(-half + (cx + 0.5) * size, 0, -half + (cz + 0.5) * size);
      this.#buildChunk(center, list);
    }
  }

  #buildChunk(center, buildings) {
    const walls = { house: new GeometryBuilder(), old: new GeometryBuilder(), office: new GeometryBuilder(), glass: new GeometryBuilder() };
    const plain = new GeometryBuilder();
    const lodWalls = { house: new GeometryBuilder(), old: new GeometryBuilder(), office: new GeometryBuilder(), glass: new GeometryBuilder() };
    const lodRoofs = new GeometryBuilder();

    for (const b of buildings) {
      this.#building(b, walls, plain);
      // Versão distante: caixas simples, mas com as mesmas fachadas (janelas acendem de longe)
      const style = STYLES[b.style];
      const lodOpts = { bay: BAY[b.wall], floor: style.floorH, u0: b.seed % 97, v0: (b.seed >> 3) % 31, vBase: b.top - b.height };
      const lw = lodWalls[b.wall];
      const roof = { topColor: b.roofColor, topBuilder: lodRoofs };
      if (b.setbacks) {
        const h1 = b.top - b.height + b.height * 0.62;
        lw.prism(rect(b.x, b.z, b.w, b.d), b.ground, h1, b.wallColor, { ...lodOpts, ...roof });
        lw.prism(rect(b.x, b.z, b.w * 0.72, b.d * 0.72), h1, b.top, b.wallColor, { ...lodOpts, ...roof });
      } else {
        lw.prism(rect(b.x, b.z, b.w, b.d), b.ground, b.top, b.wallColor, { ...lodOpts, ...roof });
      }
    }

    const near = new THREE.Group();
    const addMesh = (builder, material, parent) => {
      if (builder.empty) return null;
      const geo = builder.toGeometry();
      geo.translate(-center.x, 0, -center.z);
      const mesh = new THREE.Mesh(geo, material);
      parent.add(mesh);
      return mesh;
    };
    for (const [kind, builder] of Object.entries(walls)) {
      const m = addMesh(builder, this.materials.wall[kind], near);
      if (m) m.castShadow = m.receiveShadow = true;
    }
    const p = addMesh(plain, this.materials.plain, near);
    if (p) p.castShadow = p.receiveShadow = true;

    const far = new THREE.Group();
    for (const [kind, builder] of Object.entries(lodWalls)) addMesh(builder, this.materials.wall[kind], far);
    addMesh(lodRoofs, this.materials.plain, far);

    const chunk = new THREE.LOD();
    chunk.position.copy(center);
    chunk.addLevel(near, 0);
    chunk.addLevel(far, config.world.lodDistance);
    this.group.add(chunk);
    this.chunks.push(chunk);
  }

  #building(b, walls, plain) {
    const style = STYLES[b.style];
    const wall = walls[b.wall];
    const floorBase = b.top - b.height; // térreo começa no ponto mais alto do terreno sob o prédio
    const opts = { bay: BAY[b.wall], floor: style.floorH, u0: b.seed % 97, v0: (b.seed >> 3) % 31, vBase: floorBase };

    if (b.unfinished) {
      // Canteiro de obras: parte de baixo pronta, em cima só estrutura de concreto
      const done = floorBase + Math.round(b.floors * 0.55) * style.floorH;
      wall.prism(rect(b.x, b.z, b.w, b.d), b.ground, done, b.wallColor, { ...opts, topColor: CONCRETE, topBuilder: plain });
      const hw = b.w / 2 - 0.5;
      const hd = b.d / 2 - 0.5;
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
        [0, -1],
        [0, 1],
      ]) {
        plain.beam([b.x + sx * hw, done, b.z + sz * hd], [b.x + sx * hw, b.top, b.z + sz * hd], 0.8, CONCRETE);
      }
      for (let y = done + style.floorH; y <= b.top + 0.01; y += style.floorH) {
        plain.box(b.x, y, b.z, b.w, 0.35, b.d, CONCRETE);
      }
      return;
    }

    const footprint = (w, d) => (b.chamfer ? chamferRect(b.x, b.z, w, d, Math.min(w, d) * 0.14) : rect(b.x, b.z, w, d));

    if (b.setbacks) {
      // Arranha-céu com recuos escalonados
      const fractions = b.setbacks === 2 ? [0.55, 0.82, 1] : [0.68, 1];
      const scales = [1, 0.78, 0.58];
      let y0 = b.ground;
      fractions.forEach((f, i) => {
        const y1 = floorBase + b.height * f;
        const s = scales[i];
        wall.prism(footprint(b.w * s, b.d * s), y0, y1, b.wallColor, { ...opts, topColor: b.roofColor, topBuilder: plain });
        plain.prism(footprint(b.w * s + 0.8, b.d * s + 0.8), y1 - 0.2, y1 + 0.8, b.roofColor);
        y0 = y1 + 0.8;
      });
      return;
    }

    wall.prism(footprint(b.w, b.d), b.ground, b.top, b.wallColor, { ...opts, topColor: b.roofColor, topBuilder: plain });

    if (b.roof === 'gable') {
      const rise = Math.min(b.w, b.d) * 0.34;
      plain.gableRoof(b.x, b.z, b.w, b.d, b.top, rise, 0.45, b.roofColor, wall, b.wallColor);
    } else {
      // Cornija: laje um pouco maior no topo
      plain.prism(footprint(b.w + 0.6, b.d + 0.6), b.top - 0.1, b.top + 0.55, b.roofColor);
    }
  }
}
