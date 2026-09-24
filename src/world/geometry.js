import * as THREE from 'three';

const _c = new THREE.Color();
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
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(_n.x, _n.y, _n.z);
      this.uv.push(t[0], t[1]);
      this.col.push(r, g, b);
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
    const { bay = 3, floor = 3, u0 = 0, v0 = 0, vBase = y0, top = true, topColor = color, topBuilder = this } = opts;
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
      const va = v0 + (y0 - vBase) / floor;
      const vb = v0 + (y1 - vBase) / floor;
      this.tri([ax, y0, az], [bx, y0, bz], [bx, y1, bz], c, [ua, va], [ub, va], [ub, vb], center);
      this.tri([ax, y0, az], [bx, y1, bz], [ax, y1, az], c, [ua, va], [ub, vb], [ua, vb], center);
      dist += len;
    }
    if (top) {
      const tc = rgb(topColor);
      const below = [cx, y1 - 1, cz];
      for (let i = 0; i < n; i++) {
        const [ax, az] = points[i];
        const [bx, bz] = points[(i + 1) % n];
        topBuilder.tri([cx, y1, cz], [ax, y1, az], [bx, y1, bz], tc, [0, 0], [0, 0], [0, 0], below);
      }
    }
  }

  /** Caixa alinhada aos eixos (centro + tamanhos). */
  box(x, y, z, sx, sy, sz, color) {
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
  gableRoof(x, z, w, d, y, rise, overhang, roofColor, gableBuilder, wallColor) {
    const alongX = w >= d;
    const L = (alongX ? w : d) / 2 + overhang;
    const S = (alongX ? d : w) / 2 + overhang;
    const P = (along, side, h) => (alongX ? [x + along, h, z + side] : [x + side, h, z + along]);
    const ridgeA = P(-L, 0, y + rise);
    const ridgeB = P(L, 0, y + rise);
    const inside = [x, y - 1, z];
    // Águas (com espessura mínima: face de baixo para o beiral não sumir)
    for (const s of [-1, 1]) {
      const eA = P(-L, s * S, y - overhang * 0.4);
      const eB = P(L, s * S, y - overhang * 0.4);
      this.quad(eA, eB, ridgeB, ridgeA, roofColor, null, inside);
      this.quad(eA, eB, ridgeB, ridgeA, roofColor, null, [x, y + rise + 5, z]);
    }
    // Oitões (triângulos de parede)
    const gl = (alongX ? w : d) / 2;
    const gs = (alongX ? d : w) / 2;
    for (const a of [-1, 1]) {
      gableBuilder.tri(P(a * gl, -gs, y), P(a * gl, gs, y), P(a * gl, 0, y + rise), wallColor, [0.02, 0.02], [0.02, 0.02], [0.02, 0.02], [x, y, z]);
    }
  }

  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
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
