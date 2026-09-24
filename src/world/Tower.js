import * as THREE from 'three';
import { config } from '../config.js';
import { GeometryBuilder, chamferRect, circle } from './geometry.js';

/**
 * Torre Farol (GDD §3). Alturas em altitude absoluta (0 = rua do nascimento):
 *   40–90 base de pedra · 90–320 vidro · 320/370/420 terraços dos Jardins Suspensos
 *   420–510 Coração da Torre (janelões) · 510–566 aço exposto · 568–588 sala do farol
 *   600 mirante (topo jogável) · 600–640 antena
 * Materiais com fog reduzido (towerFogScale) para ser visível de qualquer ponto.
 */
const STONE = '#ece0d0';
const STONE_LIGHT = '#f6ecdc';
const STONE_DARK = '#cdbba6';
const GLASS = '#aac2d2';
const HEART = '#f1e6d4';
const STEEL = '#8f8795';
const STEEL_LIGHT = '#b6aab2';
const GARDEN = '#8fb38a';
const GARDEN_DARK = '#6f9870';
const LAVENDER = '#b7a2d8';
const PORTAL = '#5d5158';

export class Tower {
  constructor(materials) {
    const [tx, tz] = config.world.towerPosition;
    const B = config.world.towerBaseAltitude;
    this.center = new THREE.Vector3(tx, B, tz);
    this.group = new THREE.Group();

    const plain = new GeometryBuilder();
    const glass = new GeometryBuilder();
    const heart = new GeometryBuilder();
    const lantern = new GeometryBuilder();

    const oct = (size, c) => chamferRect(tx, tz, size, size, c);

    // Praça e base de pedra
    plain.prism(circle(tx, tz, config.world.towerPlazaRadius, 16), B - 4, B + 0.3, STONE_DARK, { topColor: '#e4d6c2' });
    plain.prism(oct(84, 16), B - 1, 90, STONE, { topColor: STONE_LIGHT });
    plain.prism(oct(88, 17), 90, 92, STONE_LIGHT);
    // Portais nos quatro lados
    for (const [dx, dz, w, d] of [
      [0, 42, 14, 1],
      [0, -42, 14, 1],
      [42, 0, 1, 14],
      [-42, 0, 1, 14],
    ]) {
      plain.box(tx + dx, B + 11, tz + dz, w, 22, d, PORTAL);
      plain.box(tx + dx * 1.01, B + 23.5, tz + dz * 1.01, w ? w + 3 : 1.4, 3, d ? d + 3 : 1.4, STONE_LIGHT);
    }

    // Corpo de vidro com faixas de pedra e aletas nos cantos
    const glassSection = (size, c, y0, y1) => {
      glass.prism(oct(size, c), y0, y1, GLASS, { bay: 3, floor: 4, vBase: y0, top: false });
      for (let y = y0 + 45; y < y1 - 10; y += 45) plain.prism(oct(size + 1.5, c + 0.3), y, y + 1.2, STONE);
      for (const [x, z] of oct(size + 0.8, c + 0.2)) plain.beam([x, y0, z], [x, y1, z], 1.4, STONE_LIGHT);
    };
    glassSection(62, 10, 92, 318);

    // Terraços-jardim (Jardins Suspensos, zona 6)
    const terraces = [
      { y: 318, outer: 68, inner: 50, c: 11 },
      { y: 368, outer: 56, inner: 40, c: 9 },
      { y: 418, outer: 46, inner: 32, c: 7 },
    ];
    const rnd = mulberry(77);
    for (const t of terraces) {
      plain.prism(oct(t.outer, t.c), t.y, t.y + 3, STONE, { topColor: GARDEN });
      // Árvores, canteiros de lavanda e cipós pendurados na borda
      const ringR = (t.outer + t.inner) / 4;
      const count = Math.round(t.outer * 0.55);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rnd() * 0.2;
        const r = ringR + (rnd() - 0.5) * (t.outer - t.inner) * 0.3;
        const x = tx + Math.cos(a) * r;
        const z = tz + Math.sin(a) * r;
        if (rnd() < 0.6) {
          const s = 0.8 + rnd() * 0.7;
          plain.box(x, t.y + 3 + s, z, 0.5 * s, 2 * s, 0.5 * s, '#8a6a55');
          plain.cone(x, t.y + 3 + s * 1.4, z, 2.2 * s, 5 * s, 6, rnd() < 0.5 ? GARDEN : GARDEN_DARK);
        } else {
          plain.box(x, t.y + 3.4, z, 2.4, 0.8, 1.2, LAVENDER);
        }
      }
      const edge = oct(t.outer - 0.2, t.c);
      for (let i = 0; i < edge.length; i++) {
        const [ax, az] = edge[i];
        const [bx, bz] = edge[(i + 1) % edge.length];
        const n = 6;
        for (let k = 0; k < n; k++) {
          const f = (k + 0.5) / n;
          const len = 3 + rnd() * 9;
          plain.box(ax + (bx - ax) * f, t.y - len / 2, az + (bz - az) * f, 0.9, len, 0.9, rnd() < 0.2 ? LAVENDER : GARDEN_DARK);
        }
      }
    }
    glassSection(50, 8, 321, 368);
    glassSection(40, 6.5, 371, 418);

    // Coração da Torre: janelões com caixilho de latão (acendem ao anoitecer)
    heart.prism(oct(32, 5), 421, 510, HEART, { bay: 4, floor: 6, vBase: 421, top: false });
    for (const [x, z] of oct(32.8, 5.2)) plain.beam([x, 421, z], [x, 510, z], 1.2, STONE_LIGHT);
    plain.prism(oct(36, 6), 510, 512.5, STEEL_LIGHT);

    // Estrutura de aço exposta (Agulha, zona 8)
    const tiers = [512.5, 530, 548, 566];
    const halfAt = (y) => 15 - ((y - 512.5) / (566 - 512.5)) * 7;
    const corners = (y) => {
      const h = halfAt(y);
      return [
        [tx - h, y, tz - h],
        [tx + h, y, tz - h],
        [tx + h, y, tz + h],
        [tx - h, y, tz + h],
      ];
    };
    for (let i = 0; i < tiers.length - 1; i++) {
      const lo = corners(tiers[i]);
      const hi = corners(tiers[i + 1]);
      for (let k = 0; k < 4; k++) {
        const j = (k + 1) % 4;
        plain.beam(lo[k], hi[k], 1.5, STEEL);
        plain.beam(hi[k], hi[j], 1, STEEL);
        plain.beam(lo[k], hi[j], 0.6, STEEL_LIGHT); // X de contraventamento
        plain.beam(lo[j], hi[k], 0.6, STEEL_LIGHT);
      }
    }
    plain.box(tx, 539, tz, 7, 54, 7, STEEL_LIGHT); // poço do elevador

    // Sala do farol, mirante e antena
    plain.prism(circle(tx, tz, 11, 12), 566, 568, STEEL);
    lantern.prism(circle(tx, tz, 7, 12), 568, 588, '#ffe6ad', { top: false });
    for (const [x, z] of circle(tx, tz, 7.2, 12)) plain.beam([x, 568, z], [x, 588, z], 0.5, '#6e6670');
    plain.prism(circle(tx, tz, 9.5, 12), 588, 590, STEEL);
    plain.prism(circle(tx, tz, 8, 12), 590, 600, STONE, { topColor: STONE_LIGHT });
    for (const [x, z] of circle(tx, tz, 7.8, 16)) plain.beam([x, 600, z], [x, 601.1, z], 0.18, STEEL); // guarda-corpo
    plain.beam([tx, 600, tz], [tx, 625, tz], 1.4, STEEL);
    plain.beam([tx, 625, tz], [tx, config.world.antennaTop, tz], 0.6, STEEL);

    const add = (builder, material, shadow = true) => {
      const mesh = new THREE.Mesh(builder.toGeometry(), material);
      mesh.castShadow = shadow;
      mesh.receiveShadow = shadow;
      this.group.add(mesh);
      return mesh;
    };
    add(plain, materials.tower.plain);
    add(glass, materials.tower.glass);
    add(heart, materials.tower.heart);
    add(lantern, materials.tower.lantern, false);

    this.#buildBeacon(tx, tz);
  }

  #buildBeacon(tx, tz) {
    this.beaconY = 578;
    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: '#ffe2a8',
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    );
    this.halo.position.set(tx, this.beaconY, tz);
    this.group.add(this.halo);

    this.antennaLight = new THREE.Sprite(this.halo.material.clone());
    this.antennaLight.material.color.set('#ff6a5a');
    this.antennaLight.position.set(tx, config.world.antennaTop, tz);
    this.group.add(this.antennaLight);

    const length = 900;
    const beamGeo = new THREE.ConeGeometry(42, length, 24, 1, true);
    beamGeo.translate(0, -length / 2, 0);
    beamGeo.rotateZ(Math.PI / 2);
    this.beamMaterial = makeBeamMaterial(length);
    this.beamPivot = new THREE.Group();
    this.beamPivot.position.set(tx, this.beaconY, tz);
    this.beamPivot.rotation.z = 0.06;
    for (const yaw of [0, Math.PI]) {
      const m = new THREE.Mesh(beamGeo, this.beamMaterial);
      m.rotation.y = yaw;
      m.frustumCulled = false;
      this.beamPivot.add(m);
    }
    this.group.add(this.beamPivot);
  }

  /** `night` (0..1) deixa o farol mais forte conforme escurece. */
  update(t, night = 0) {
    const pulse = 0.5 + 0.5 * Math.sin(t * ((Math.PI * 2) / 3.2));
    const s = 60 + pulse * 40 + night * 40;
    this.halo.scale.set(s, s, 1);
    this.halo.material.opacity = 0.55 + pulse * 0.45;
    this.beamPivot.rotation.y = t * 0.3;
    this.beamMaterial.uniforms.opacity.value = (0.07 + pulse * 0.05) * (1 + night * 1.5);
    const blink = Math.sin(t * 2.4) > 0.3 ? 1 : 0.15;
    this.antennaLight.scale.setScalar(18 * blink);
  }
}

function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Feixe que some ao longo do comprimento e nas bordas. */
function makeBeamMaterial(length) {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color('#ffe7b8') },
      opacity: { value: 0.1 },
      length: { value: length },
    },
    vertexShader: /* glsl */ `
      uniform float length;
      varying float vAlong;
      varying float vFacing;
      void main() {
        vAlong = clamp(position.x / length, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFacing = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float opacity;
      varying float vAlong;
      varying float vFacing;
      void main() {
        float fade = pow(1.0 - vAlong, 2.0) * smoothstep(0.0, 0.7, vFacing);
        gl_FragColor = vec4(color, opacity * fade);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.15, 'rgba(255,240,200,0.85)');
  g.addColorStop(0.45, 'rgba(255,210,150,0.2)');
  g.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
