import * as THREE from 'three';
import { config } from '../config.js';
import { terrainHeight } from './heightfield.js';
import { cityEdge, distanceToRoute } from './cityLayout.js';

const PAVED = new THREE.Color('#d7c4aa');
const STREET = new THREE.Color('#c2ae96');
const GRASS = new THREE.Color('#a9b98f');
const HILL = new THREE.Color('#8fa288');

/** Malha do terreno (low-poly, sombreamento facetado) com cores por região. */
export class Terrain {
  constructor(materials) {
    const size = 6000; // grande o bastante para não ver a borda lá do topo
    const seg = 200;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const half = config.world.citySize / 2;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
      const edge = (cityEdge(x, z) - 1) * half;
      if (edge < 0) {
        c.copy(distanceToRoute(x, z) < 14 ? STREET : PAVED);
      } else {
        c.copy(GRASS).lerp(HILL, Math.min(edge / 500, 1));
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    this.mesh = new THREE.Mesh(geo, materials.terrain);
    this.mesh.receiveShadow = true;
  }
}
