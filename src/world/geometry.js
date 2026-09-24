import * as THREE from 'three';
import { SLOT, SLOT_SCALE } from './atlas.js';

const _c = new THREE.Color();
/** Tamanho de uma telha (m) para as UVs dos telhados. */
const TILE_U = 0.5;
const TILE_V = 0.42;

// Vértices (não indexados) de icosaedros unitários para copas de árvore e nuvens
const toTris = (g) => {
  const a = (g.index ? g.toNonIndexed() : g).attributes.position.array;
  const out = [];
  for (let i = 0; i < a.length; i += 3) out.push([a[i], a[i + 1], a[i + 2]]);
  g.dispose();
  return out;
};
const ICO0 = toTris(new THREE.IcosahedronGeometry(1, 0));
const ICO1 = toTris(new THREE.IcosahedronGeometry(1, 1));

/** Beiral: face de baixo do telhado, um pouco mais escura. */
function eaveColor(color) {
  return new THREE.Color(color).multiplyScalar(0.62);
}
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();

/** Cor hex → componentes lineares (vertex colors são lineares no Three.js). */
function rgb(color) {
  _c.set(color);
  return [_c.r, _c.g, _c.b];
}

/**
 * Acumula triângulos não indexados (normais planas: visual low-poly) com cor e UV,
 * e gera uma BufferGeometry única para mesclar muitos objetos num só draw call.
 */
export class GeometryBuilder {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.uv = [];
    this.col = [];
    this.atl = [];
    /** Opcional: (x, y, z) => fator de brilho por vértice (oclusão de contato, gradiente). */
    this.shade = null;
    this.atlas = [SLOT.white, 1];
  }

  /** Região do atlas usada pelos próximos triângulos. */
  use(slot) {
    this.atlas = [slot, SLOT_SCALE[slot] ?? 1];
    return this;
  }

  get empty() {
    return this.pos.length === 0;
  }

  /** Triângulo com normal calculada; se `outside` for dado, garante normal apontando para longe dele. */
  tri(p0, p1, p2, color, uv0 = [0, 0], uv1 = [0, 0], uv2 = [0, 0], outside = null) {
    _a.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    _b.set(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
    _n.crossVectors(_a, _b);
    if (outside) {
      const cx = (p0[0] + p1[0] + p2[0]) / 3 - outside[0];
      const cy = (p0[1] + p1[1] + p2[1]) / 3 - outside[1];
      const cz = (p0[2] + p1[2] + p2[2]) / 3 - outside[2];
      if (_n.x * cx + _n.y * cy + _n.z * cz < 0) {
        [p1, p2] = [p2, p1];
        [uv1, uv2] = [uv2, uv1];
        _n.negate();
      }
    }
    _n.normalize();
    const [r, g, b] = Array.isArray(color) ? color : rgb(color);
    for (const [p, t] of [
      [p0, uv0],
      [p1, uv1],
      [p2, uv2],
    ]) {
      const k = this.shade ? this.shade(p[0], p[1], p[2]) : 1;
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(_n.x, _n.y, _n.z);
      this.uv.push(t[0], t[1]);
      this.col.push(r * k, g * k, b * k);
      this.atl.push(this.atlas[0], this.atlas[1]);
    }
  }

  quad(p0, p1, p2, p3, color, uvs = null, outside = null) {
    const u = uvs ?? [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    const c = rgb(color);
    this.tri(p0, p1, p2, c, u[0], u[1], u[2], outside);
    this.tri(p0, p2, p3, c, u[0], u[2], u[3], outside);
  }

  /**
   * Prisma vertical a partir de uma planta (lista de [x, z]).
   * UV das paredes em "vãos × andares" para a textura de fachada repetir em escala real.
   */
  prism(points, y0, y1, color, opts = {}) {
    const { bay = 3, floor = 3, u0 = 0, v0 = 0, vBase = y0, top = true, topColor = color, topBuilder = this, splits = [], topSlot = null } = opts;
    // Faixas horizontais extras: permitem gradiente/oclusão por vértice ao longo da altura
    const levels = [y0, ...splits.filter((y) => y > y0 + 0.01 && y < y1 - 0.01).sort((a, b) => a - b), y1];
    const n = points.length;
    let cx = 0;
    let cz = 0;
    for (const [x, z] of points) {
      cx += x / n;
      cz += z / n;
    }
    const center = [cx, (y0 + y1) / 2, cz];
    const c = rgb(color);
    let dist = 0;
    for (let i = 0; i < n; i++) {
      const [ax, az] = points[i];
      const [bx, bz] = points[(i + 1) % n];
      const len = Math.hypot(bx - ax, bz - az);
      const ua = u0 + dist / bay;
      const ub = u0 + (dist + len) / bay;
      for (let k = 0; k < levels.length - 1; k++) {
        const ya = levels[k];
        const yb = levels[k + 1];
        const va = v0 + (ya - vBase) / floor;
        const vb = v0 + (yb - vBase) / floor;
        this.tri([ax, ya, az], [bx, ya, bz], [bx, yb, bz], c, [ua, va], [ub, va], [ub, vb], center);
        this.tri([ax, ya, az], [bx, yb, bz], [ax, yb, az], c, [ua, va], [ub, vb], [ua, vb], center);
      }
      dist += len;
    }
    if (top) {
      const tc = rgb(topColor);
      const below = [cx, y1 - 1, cz];
      const prev = topBuilder.atlas;
      if (topSlot != null) topBuilder.use(topSlot);
      // UV planar em metros (calçadas, grama, lajes). Quadriláteros: 2 triângulos; senão, leque.
      if (n === 4) {
        const P = points.map(([px, pz]) => [px, y1, pz]);
        const U = points.map(([px, pz]) => [px, pz]);
        topBuilder.tri(P[0], P[1], P[2], tc, U[0], U[1], U[2], below);
        topBuilder.tri(P[0], P[2], P[3], tc, U[0], U[2], U[3], below);
      } else {
        for (let i = 0; i < n; i++) {
          const [ax, az] = points[i];
          const [bx, bz] = points[(i + 1) % n];
          topBuilder.tri([cx, y1, cz], [ax, y1, az], [bx, y1, bz], tc, [cx, cz], [ax, az], [bx, bz], below);
        }
      }
      topBuilder.atlas = prev;
    }
  }

  /** Caixa alinhada aos eixos (centro + tamanhos). `bottom` só quando a base aparece. */
  box(x, y, z, sx, sy, sz, color, bottom = false) {
    const hx = sx / 2;
    const hz = sz / 2;
    this.prism(
      [
        [x - hx, z - hz],
        [x + hx, z - hz],
        [x + hx, z + hz],
        [x - hx, z + hz],
      ],
      y - sy / 2,
      y + sy / 2,
      color,
    );
    if (!bottom) return;
    // Base (visível em lajes e props suspensos)
    const c = rgb(color);
    const above = [x, y, z];
    const yb = y - sy / 2;
    this.tri([x - hx, yb, z - hz], [x + hx, yb, z - hz], [x + hx, yb, z + hz], c, undefined, undefined, undefined, above);
    this.tri([x - hx, yb, z - hz], [x + hx, yb, z + hz], [x - hx, yb, z + hz], c, undefined, undefined, undefined, above);
  }

  /** Viga de seção quadrada entre dois pontos (guindastes, treliças, andaimes). */
  beam(a, b, thickness, color) {
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = dir.length();
    if (len < 1e-4) return;
    dir.divideScalar(len);
    const ref = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(dir, ref).normalize().multiplyScalar(thickness / 2);
    const v = new THREE.Vector3().crossVectors(dir, u).normalize().multiplyScalar(thickness / 2);
    const corner = (p, su, sv) => [p[0] + u.x * su + v.x * sv, p[1] + u.y * su + v.y * sv, p[2] + u.z * su + v.z * sv];
    const A = [corner(a, -1, -1), corner(a, 1, -1), corner(a, 1, 1), corner(a, -1, 1)];
    const B = [corner(b, -1, -1), corner(b, 1, -1), corner(b, 1, 1), corner(b, -1, 1)];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      this.quad(A[i], A[j], B[j], B[i], color, null, mid);
    }
    this.quad(A[0], A[1], A[2], A[3], color, null, mid);
    this.quad(B[0], B[1], B[2], B[3], color, null, mid);
  }

  /** Cone (árvores, telhados cônicos). `r2` > 0 vira tronco de cone. */
  cone(x, y, z, r, h, segments, color, r2 = 0, cap = false) {
    const c = rgb(color);
    const axis = [x, y + h / 2, z];
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const b0 = [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r];
      const b1 = [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r];
      if (r2 > 0) {
        const t0 = [x + Math.cos(a0) * r2, y + h, z + Math.sin(a0) * r2];
        const t1 = [x + Math.cos(a1) * r2, y + h, z + Math.sin(a1) * r2];
        this.tri(b0, b1, t1, c, undefined, undefined, undefined, axis);
        this.tri(b0, t1, t0, c, undefined, undefined, undefined, axis);
      } else {
        this.tri(b0, b1, [x, y + h, z], c, undefined, undefined, undefined, axis);
      }
      if (cap) this.tri([x, y, z], b0, b1, c, undefined, undefined, undefined, [x, y + 1, z]);
    }
  }

  /** Telhado de duas águas ao longo do eixo mais comprido; oitões entram em `gableBuilder`. */
  gableRoof(x, z, w, d, y, rise, overhang, roofColor, wallColor) {
    const prev = this.atlas;
    this.use(SLOT.roof);
    const alongX = w >= d;
    const L = (alongX ? w : d) / 2 + overhang;
    const S = (alongX ? d : w) / 2 + overhang;
    const P = (along, side, h) => (alongX ? [x + along, h, z + side] : [x + side, h, z + along]);
    const ridgeA = P(-L, 0, y + rise);
    const ridgeB = P(L, 0, y + rise);
    const inside = [x, y - 1, z];
    // Águas com UV de telhas (u ao longo da cumeeira, v descendo a água); face de baixo = beiral
    const slope = Math.hypot(S, rise + overhang * 0.4);
    // v cresce do beiral para a cumeeira (a sombra de cada telha fica do lado do beiral)
    const uvs = [
      [0, 0],
      [(2 * L) / TILE_U, 0],
      [(2 * L) / TILE_U, slope / TILE_V],
      [0, slope / TILE_V],
    ];
    for (const s of [-1, 1]) {
      const eA = P(-L, s * S, y - overhang * 0.4);
      const eB = P(L, s * S, y - overhang * 0.4);
      this.use(SLOT.roof);
      this.quad(eA, eB, ridgeB, ridgeA, roofColor, uvs, inside);
      this.use(SLOT.white);
      this.quad(eA, eB, ridgeB, ridgeA, eaveColor(roofColor), null, [x, y + rise + 5, z]);
    }
    this.use(SLOT.plaster);
    // Oitões (triângulos de parede)
    const gl = (alongX ? w : d) / 2;
    const gs = (alongX ? d : w) / 2;
    for (const a of [-1, 1]) {
      const pa = P(a * gl, -gs, y);
      const pb = P(a * gl, gs, y);
      const pc = P(a * gl, 0, y + rise);
      const uv = (p) => [(p[0] + p[2]) * 0.5, p[1] * 0.5];
      this.tri(pa, pb, pc, rgb(wallColor), uv(pa), uv(pb), uv(pc), [x, y, z]);
    }
    this.atlas = prev;
  }

  /** Telhado de quatro águas (sem oitões). */
  hipRoof(x, z, w, d, y, rise, overhang, roofColor) {
    const prev = this.atlas;
    this.use(SLOT.roof);
    const hw = w / 2 + overhang;
    const hd = d / 2 + overhang;
    const ridge = Math.max(Math.abs(hw - hd), 0.01);
    const alongX = hw >= hd;
    const r0 = alongX ? [x - ridge, y + rise, z] : [x, y + rise, z - ridge];
    const r1 = alongX ? [x + ridge, y + rise, z] : [x, y + rise, z + ridge];
    const e = y - overhang * 0.4;
    const c = [
      [x - hw, e, z - hd],
      [x + hw, e, z - hd],
      [x + hw, e, z + hd],
      [x - hw, e, z + hd],
    ];
    const inside = [x, y - 2, z];
    // Faces longas (trapézios) e curtas (triângulos), com UV planar em telhas
    const faces = alongX
      ? [
          [c[0], c[1], r1, r0],
          [c[2], c[3], r0, r1],
          [c[1], c[2], r1],
          [c[3], c[0], r0],
        ]
      : [
          [c[1], c[2], r1, r0],
          [c[3], c[0], r0, r1],
          [c[0], c[1], r0],
          [c[2], c[3], r1],
        ];
    const cosA = Math.cos(Math.atan2(rise, Math.min(hw, hd)));
    for (const f of faces) {
      // UV por face: u ao longo do beiral, v subindo a água (fileiras paralelas ao beiral)
      let tx = f[1][0] - f[0][0];
      let tz = f[1][2] - f[0][2];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      let nx = tz;
      let nz = -tx;
      if (nx * (f[0][0] - x) + nz * (f[0][2] - z) < 0) {
        nx = -nx;
        nz = -nz;
      }
      const uv = f.map((p) => [(p[0] * tx + p[2] * tz) / TILE_U, (-(p[0] * nx + p[2] * nz)) / (TILE_V * cosA)]);
      if (f.length === 4) this.quad(f[0], f[1], f[2], f[3], roofColor, uv, inside);
      else this.tri(f[0], f[1], f[2], rgb(roofColor), uv[0], uv[1], uv[2], inside);
    }
    this.atlas = prev;
  }

  /**
   * Volume arredondado (copas, nuvens, pedras). Com `smooth`, normais de elipsoide:
   * poucos polígonos mas sombreamento macio (estilo A Short Hike). Base mais escura = volume.
   */
  blob(x, y, z, rx, ry, rz, color, detail = 0, jitter = 0.12, seed = 1, smooth = true) {
    const src = detail === 0 ? ICO0 : ICO1;
    const c = rgb(color);
    if (!smooth) {
      const pts = src.map(([px, py, pz], i) => {
        const n = 1 + jitter * Math.sin(seed * 12.9898 + i * 78.233);
        return [x + px * rx * n, y + py * ry * n, z + pz * rz * n];
      });
      for (let i = 0; i < pts.length; i += 3) {
        const k = 0.78 + 0.22 * ((src[i][1] + src[i + 1][1] + src[i + 2][1]) / 6 + 0.5);
        this.tri(pts[i], pts[i + 1], pts[i + 2], [c[0] * k, c[1] * k, c[2] * k], undefined, undefined, undefined, [x, y, z]);
      }
      return;
    }
    for (let i = 0; i < src.length; i++) {
      const [px, py, pz] = src[i];
      // Deformação suave e contínua (mesmo vértice → mesma posição: sem rachaduras)
      const n = 1 + jitter * Math.sin(seed * 3.1 + px * 4.7 + py * 3.3 + pz * 5.9);
      const nx = px / rx;
      const ny = py / ry;
      const nz = pz / rz;
      const len = Math.hypot(nx, ny, nz) || 1;
      const k = (0.72 + 0.28 * (py * 0.5 + 0.5)) * (this.shade ? this.shade(x, y, z) : 1);
      this.pos.push(x + px * rx * n, y + py * ry * n, z + pz * rz * n);
      this.nor.push(nx / len, ny / len, nz / len);
      this.uv.push(0, 0);
      this.col.push(c[0] * k, c[1] * k, c[2] * k);
      this.atl.push(this.atlas[0], this.atlas[1]);
    }
  }

  /** Junta os triângulos de outro builder a este. */
  append(other) {
    this.pos.push(...other.pos);
    this.nor.push(...other.nor);
    this.uv.push(...other.uv);
    this.col.push(...other.col);
    this.atl.push(...other.atl);
    return this;
  }

  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('atlas', new THREE.Float32BufferAttribute(this.atl, 2));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** Planta retangular centrada. */
export function rect(x, z, w, d) {
  const hw = w / 2;
  const hd = d / 2;
  return [
    [x - hw, z - hd],
    [x + hw, z - hd],
    [x + hw, z + hd],
    [x - hw, z + hd],
  ];
}

/** Planta retangular com cantos chanfrados (octógono irregular). */
export function chamferRect(x, z, w, d, c) {
  const hw = w / 2;
  const hd = d / 2;
  return [
    [x - hw + c, z - hd],
    [x + hw - c, z - hd],
    [x + hw, z - hd + c],
    [x + hw, z + hd - c],
    [x + hw - c, z + hd],
    [x - hw + c, z + hd],
    [x - hw, z + hd - c],
    [x - hw, z - hd + c],
  ];
}

/** Polígono regular (lanterna do farol, caixas d'água). */
export function circle(x, z, r, segments = 8) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([x + Math.cos(a) * r, z + Math.sin(a) * r]);
  }
  return pts;
}
