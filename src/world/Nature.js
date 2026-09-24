import * as THREE from 'three';
import { config } from '../config.js';
import { createRandom } from '../core/Random.js';
import { GeometryBuilder } from './geometry.js';
import { fbm, outsideCity, terrainHeight } from './heightfield.js';

/** Uniform de tempo compartilhado pelo balanço do vento (árvores, roupas). */
export const windUniforms = { uTime: { value: 0 } };

const LEAVES = ['#8fae78', '#7d9f6c', '#a2bc80', '#88a888', '#b0bd78', '#9bb58f'];

/** Balanço de vento nas copas (topo mexe, base parada), fase por instância. */
function windMaterial() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float phase = instanceMatrix[3].x * 0.05 + instanceMatrix[3].z * 0.07;
      #else
        float phase = 0.0;
      #endif
      float sway = max(position.y - 1.5, 0.0);
      transformed.x += sin(uTime * 1.3 + phase) * 0.035 * sway;
      transformed.z += cos(uTime * 1.05 + phase) * 0.025 * sway;`,
    );
  };
  mat.customProgramCacheKey = () => 'mirante-wind';
  return mat;
}

function fogScaled(material, fogScale) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      /* glsl */ `
      #ifdef USE_FOG
        float fogFactor = smoothstep( fogNear, fogFar, vFogDepth * ${fogScale.toFixed(3)} );
        gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
      #endif`,
    );
  };
  material.customProgramCacheKey = () => `mirante-fog:${fogScale}`;
  return material;
}

/**
 * Natureza em volta da cidade: bosques (árvores redondas e ciprestes instanciados, com vento),
 * pedras, e três cordilheiras no horizonte para dar profundidade.
 */
export class Nature {
  constructor() {
    this.group = new THREE.Group();
    const rnd = createRandom(config.world.seed + 21);
    this.windMaterial = windMaterial();

    // Árvores: dois modelos (copa redonda e cipreste), cor variando por instância;
    // de longe, só a copa (versão barata)
    const round = new GeometryBuilder();
    round.beam([0, 0, 0], [0, 2.4, 0], 0.35, '#7a5a48');
    round.blob(0, 3.4, 0, 1.9, 1.6, 1.9, '#ffffff', 0, 0.12, 3);
    round.blob(0.6, 4.3, -0.3, 1.2, 1.1, 1.2, '#f4f8ec', 0, 0.12, 4);
    const roundFar = new GeometryBuilder();
    roundFar.blob(0, 3.6, 0, 2, 1.9, 2, '#ffffff', 0, 0.1, 3);
    const cypress = new GeometryBuilder();
    cypress.beam([0, 0, 0], [0, 1.4, 0], 0.3, '#7a5a48');
    cypress.blob(0, 4, 0, 1, 3.2, 1, '#e6eee0', 0, 0.08, 5);
    const cypressFar = new GeometryBuilder();
    cypressFar.blob(0, 4, 0, 1, 3.3, 1, '#e6eee0', 0, 0.05, 5);

    const spots = { round: [], cypress: [] };
    for (let i = 0; i < 40000 && spots.round.length + spots.cypress.length < 2600; i++) {
      const x = rnd.range(-1500, 1500);
      const z = rnd.range(-1500, 1500);
      const out = outsideCity(x, z);
      if (out < 0.08) continue;
      // Bosques agrupados: densidade vem de ruído
      const density = fbm(x / 140 - 3, z / 140 + 5, 3);
      if (rnd.next() > THREE.MathUtils.smoothstep(density, 0.4, 0.58) * 0.97 + 0.02) continue;
      const kind = rnd.chance(0.28) ? 'cypress' : 'round';
      spots[kind].push({ x, z, y: terrainHeight(x, z), s: rnd.range(1.5, 2.8), sy: rnd.range(0.9, 1.15), rot: rnd.range(0, Math.PI * 2) });
    }
    this.#forest(
      { round: round.toGeometry(), cypress: cypress.toGeometry() },
      { round: roundFar.toGeometry(), cypress: cypressFar.toGeometry() },
      spots,
      rnd,
    );
    this.#rocks(rnd);
    this.#ridges(rnd);
  }

  /** Bosques em regiões de 500 m, cada uma um LOD (perto: árvore completa; longe: só a copa). */
  #forest(nearGeo, farGeo, spots, rnd) {
    const TILE = 500;
    const tiles = new Map();
    for (const kind of ['round', 'cypress']) {
      for (const p of spots[kind]) {
        const k = `${Math.floor(p.x / TILE)},${Math.floor(p.z / TILE)}`;
        if (!tiles.has(k)) tiles.set(k, { round: [], cypress: [], cx: (Math.floor(p.x / TILE) + 0.5) * TILE, cz: (Math.floor(p.z / TILE) + 0.5) * TILE });
        tiles.get(k)[kind].push(p);
      }
    }
    for (const tile of tiles.values()) {
      const lod = new THREE.LOD();
      lod.position.set(tile.cx, 0, tile.cz);
      const near = new THREE.Group();
      const far = new THREE.Group();
      for (const kind of ['round', 'cypress']) {
        if (!tile[kind].length) continue;
        const colors = tile[kind].map(() => rnd.pick(LEAVES));
        near.add(this.#instanced(nearGeo[kind], tile[kind], colors, tile));
        far.add(this.#instanced(farGeo[kind], tile[kind], colors, tile));
      }
      lod.addLevel(near, 0);
      lod.addLevel(far, 650);
      this.group.add(lod);
    }
  }

  #instanced(geometry, spots, colors, tile) {
    const mesh = new THREE.InstancedMesh(geometry, this.windMaterial, spots.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const color = new THREE.Color();
    spots.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rot);
      m.compose(new THREE.Vector3(p.x - tile.cx, p.y - 0.3, p.z - tile.cz), q, new THREE.Vector3(p.s, p.s * p.sy, p.s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.set(colors[i]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }

  #rocks(rnd) {
    const b = new GeometryBuilder();
    for (let i = 0; i < 220; i++) {
      const x = rnd.range(-1400, 1400);
      const z = rnd.range(-1400, 1400);
      if (outsideCity(x, z) < 0.15) continue;
      const s = rnd.range(1.2, 4.5);
      const y = terrainHeight(x, z);
      const k = rnd.range(0.85, 1.05);
      b.blob(x, y + s * 0.2, z, s * 1.3, s * 0.8, s, new THREE.Color('#b9b2a6').multiplyScalar(k), 0, 0.3, i);
    }
    const mesh = new THREE.Mesh(b.toGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  /** Três anéis de montanhas recortadas no horizonte, cada vez mais claras (perspectiva aérea). */
  #ridges(rnd) {
    const rings = [
      { r: 2700, h: 240, color: '#8aa08c', fog: 0.3, haze: 0.35 },
      { r: 3600, h: 380, color: '#9fb0a6', fog: 0.22, haze: 0.55 },
      { r: 4600, h: 520, color: '#b4bdb8', fog: 0.16, haze: 0.72 },
    ];
    for (const ring of rings) {
      const seg = 160;
      const pos = [];
      const col = [];
      const base = new THREE.Color(ring.color);
      const top = base.clone().lerp(new THREE.Color('#ffffff'), 0.18);
      const phase = rnd.range(0, 100);
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2;
        const a1 = ((i + 1) / seg) * Math.PI * 2;
        const h = (a) => ring.h * (0.35 + 0.65 * fbm(Math.cos(a) * 6 + phase, Math.sin(a) * 6 - phase, 4));
        const p = (a, y) => [Math.cos(a) * ring.r, y, Math.sin(a) * ring.r];
        const g0 = terrainHeight(Math.cos(a0) * ring.r, Math.sin(a0) * ring.r) - 40;
        const g1 = terrainHeight(Math.cos(a1) * ring.r, Math.sin(a1) * ring.r) - 40;
        const [b0, b1, t0, t1] = [p(a0, g0), p(a1, g1), p(a0, g0 + 40 + h(a0)), p(a1, g1 + 40 + h(a1))];
        for (const v of [b0, t1, b1, b0, t0, t1]) pos.push(...v);
        for (const v of [base, top, base, base, top, top]) col.push(v.r, v.g, v.b);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.computeVertexNormals();
      const mat = fogScaled(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), ring.fog);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      mat.userData.haze = ring.haze;
      (this.ridgeMaterials ??= []).push(mat);
    }
  }

  update(t) {
    windUniforms.uTime.value = t;
  }
}
