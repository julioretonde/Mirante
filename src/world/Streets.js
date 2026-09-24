import * as THREE from 'three';
import { SLOT } from './atlas.js';
import { ROUTE } from './cityLayout.js';
import { GeometryBuilder } from './geometry.js';
import { terrainHeight } from './heightfield.js';

const COBBLE = '#c9b8a3';
const IRON = '#5f5a63';

/**
 * A rua principal (corredor da rota): calçamento de pedra que acompanha o terreno e
 * postes dos dois lados. Deixa o caminho legível desde o nascimento (GDD §1, pilar 1).
 */
export class Streets {
  constructor(materials) {
    const b = new GeometryBuilder().use(SLOT.paving);
    const half = 5.5;
    let lampAcc = 0;
    let side = 1;
    for (let i = 0; i < ROUTE.length - 1; i++) {
      const [ax, az] = ROUTE[i];
      const [bx, bz] = ROUTE[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / len;
      const dz = (bz - az) / len;
      const nx = -dz;
      const nz = dx;
      const steps = Math.ceil(len / 6);
      for (let s = 0; s < steps; s++) {
        const t0 = (s / steps) * len;
        const t1 = ((s + 1) / steps) * len + 0.6; // leve sobreposição cobre as dobras
        const p = (t, o) => {
          const x = ax + dx * t + nx * o;
          const z = az + dz * t + nz * o;
          return [x, terrainHeight(x, z) + 0.06, z];
        };
        const uv = (t, o) => [(ax + dx * t + nx * o) * 1.4, (az + dz * t + nz * o) * 1.4];
        b.quad(p(t0, -half), p(t0, half), p(t1, half), p(t1, -half), COBBLE, [uv(t0, -half), uv(t0, half), uv(t1, half), uv(t1, -half)], [ax, -100, az]);
        // Sarjeta (faixa mais escura nas bordas)
        for (const e of [-1, 1]) {
          b.quad(p(t0, e * half), p(t0, e * (half + 0.5)), p(t1, e * (half + 0.5)), p(t1, e * half), '#a2968a', null, [ax, -100, az]);
        }
        // Postes alternando os lados, a cada ~22 m
        lampAcc += len / steps;
        if (lampAcc > 22) {
          lampAcc = 0;
          side = -side;
          const [x, y, z] = p((t0 + t1) / 2, side * (half + 0.9));
          b.use(SLOT.white).beam([x, y, z], [x, y + 4, z], 0.16, IRON);
          b.beam([x, y + 4, z], [x - side * nx * 0.7, y + 4.2, z - side * nz * 0.7], 0.1, IRON);
          const hx = x - side * nx * 0.75;
          const hz = z - side * nz * 0.75;
          b.use(SLOT.lamp).box(hx, y + 3.95, hz, 0.4, 0.45, 0.4, '#fff1cf');
          b.use(SLOT.white).box(hx, y + 4.25, hz, 0.55, 0.1, 0.55, IRON);
          b.use(SLOT.paving);
        }
      }
    }
    this.mesh = new THREE.Mesh(b.toGeometry(), materials.city);
    this.mesh.receiveShadow = true;
  }
}
