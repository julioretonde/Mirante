import * as THREE from 'three';
import { SLOT } from './atlas.js';
import { GeometryBuilder } from './geometry.js';

const CRANE = '#c8ad6a';
const CRANE_DARK = '#8d8378';

/**
 * Marcos grandes fora dos blocos da cidade: os guindastes do canteiro de obras
 * (visíveis de longe, então ficam numa malha própria, sempre carregada).
 */
export class Props {
  constructor(layout, materials) {
    this.group = new THREE.Group();
    const b = new GeometryBuilder().use(SLOT.white);
    for (const c of layout.cranes) this.#crane(b, c);
    const mesh = new THREE.Mesh(b.toGeometry(), materials.city);
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
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
    const jy = top + 0.5;
    for (const k of [-0.9, 0.9]) builder.beam(off(at(-c.jib * 0.3, jy), k), off(at(c.jib, jy), k), 0.25, CRANE);
    builder.beam(at(0, jy + 1.8), at(c.jib, jy + 1.8), 0.2, CRANE);
    for (let d = 0; d < c.jib; d += 3) {
      builder.beam(off(at(d, jy), -0.9), at(d + 1.5, jy + 1.8), 0.1, CRANE);
      builder.beam(off(at(d, jy), 0.9), at(d + 1.5, jy + 1.8), 0.1, CRANE);
    }
    builder.beam(at(0, jy), at(0, jy + 8), 0.35, CRANE);
    builder.beam(at(0, jy + 8), at(c.jib * 0.7, jy + 1.8), 0.08, CRANE_DARK);
    builder.beam(at(0, jy + 8), at(-c.jib * 0.3, jy + 1), 0.08, CRANE_DARK);
    const cw = at(-c.jib * 0.26, jy - 0.8);
    builder.use(SLOT.concrete).box(cw[0], cw[1], cw[2], 3, 2.4, 3, CRANE_DARK);
    const cab = at(1.6, top - 1.2);
    builder.use(SLOT.office).box(cab[0], cab[1], cab[2], 2.2, 2.2, 2.2, '#e6e0d4');
    builder.use(SLOT.white);
    const hook = at(c.jib * 0.62, jy - 18);
    builder.beam(at(c.jib * 0.62, jy), hook, 0.05, CRANE_DARK);
    builder.box(hook[0], hook[1], hook[2], 0.8, 0.8, 0.8, CRANE_DARK);
    // Luz de sinalização no topo (acende à noite)
    builder.use(SLOT.lamp).box(c.x, jy + 8.4, c.z, 0.6, 0.6, 0.6, '#ff8a7a');
    builder.use(SLOT.white);
  }
}
