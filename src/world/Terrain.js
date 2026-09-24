import * as THREE from 'three';
import { fbm, outsideCity, terrainHeight } from './heightfield.js';
import { distanceToRoute } from './cityLayout.js';

const STREET = new THREE.Color('#a99d91');
const MEADOW = new THREE.Color('#a9bb8c');
const MEADOW_WARM = new THREE.Color('#c2c48e');
const FOREST_FLOOR = new THREE.Color('#86a07a');
const FAR = new THREE.Color('#9aab95');

/**
 * Terreno low-poly em dois níveis: um miolo detalhado (cidade e encostas) e um anel largo
 * e grosseiro até o horizonte (abaixado sob o miolo para não brigar com ele).
 */
export class Terrain {
  constructor(materials) {
    this.group = new THREE.Group();
    this.group.add(this.#mesh(materials, 2400, 120, null));
    this.group.add(this.#mesh(materials, 14000, 70, 1150));
  }

  #mesh(materials, size, seg, holeHalf) {
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let y = terrainHeight(x, z);
      if (holeHalf && Math.abs(x) < holeHalf && Math.abs(z) < holeHalf) y -= 12;
      pos.setY(i, y);
      uv.setXY(i, x / 9, z / 9); // grão fino do chão (sem manchas grandes que denunciem a repetição)

      const out = outsideCity(x, z);
      if (out <= 0) {
        c.copy(STREET);
        if (distanceToRoute(x, z) < 12) c.multiplyScalar(0.96);
      } else {
        // Manchas de prado quente/frio e chão de bosque, desbotando ao longe
        const patch = fbm(x / 180 + 11, z / 180 - 7, 3);
        const forest = fbm(x / 140 - 3, z / 140 + 5, 3);
        c.copy(MEADOW).lerp(MEADOW_WARM, THREE.MathUtils.smoothstep(patch, 0.45, 0.7));
        if (forest > 0.55) c.lerp(FOREST_FLOOR, THREE.MathUtils.smoothstep(forest, 0.55, 0.7));
        c.lerp(STREET, 1 - THREE.MathUtils.smoothstep(out, 0, 0.25));
        const dist = Math.hypot(x, z);
        c.lerp(FAR, THREE.MathUtils.smoothstep(dist, 1400, 4000) * 0.7);
      }
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, materials.terrain);
    mesh.receiveShadow = true;
    return mesh;
  }
}
