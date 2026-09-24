import * as THREE from 'three';
import { config } from '../config.js';
import { createRandom } from '../core/Random.js';

/**
 * Nuvens low-poly: tufos soltos em várias altitudes e a camada de nuvens da Agulha (~540 m),
 * que o jogador atravessa na zona final. Uma InstancedMesh, deriva lenta para leste.
 */
export class Clouds {
  constructor() {
    const rnd = createRandom(config.world.seed + 5);
    const puff = mergePuff();
    this.material = new THREE.MeshLambertMaterial({
      color: '#ffffff',
      vertexColors: true,
      emissive: new THREE.Color('#ffd9c2'),
      emissiveIntensity: 0.35,
    });
    const items = [];
    const [tx, tz] = config.world.towerPosition;
    // Tufos soltos pela cidade e horizonte
    for (let i = 0; i < 34; i++) {
      const a = rnd.range(0, Math.PI * 2);
      const r = rnd.range(450, 2600);
      items.push({ x: Math.cos(a) * r, y: rnd.range(300, 500), z: Math.sin(a) * r, s: rnd.range(22, 48) });
    }
    // Camada da Agulha, em volta da torre
    for (let i = 0; i < 46; i++) {
      const a = rnd.range(0, Math.PI * 2);
      const r = rnd.range(90, 1000);
      items.push({ x: tx + Math.cos(a) * r, y: rnd.range(528, 552), z: tz + Math.sin(a) * r, s: rnd.range(20, 46) });
    }
    this.items = items;
    this.mesh = new THREE.InstancedMesh(puff, this.material, items.length);
    this.mesh.frustumCulled = false;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this.update(0);
  }

  update(t) {
    const span = 4400;
    this.items.forEach((it, i) => {
      const x = ((it.x + t * 3 + span * 1.5) % span) - span / 2;
      this._p.set(x, it.y, it.z);
      this._s.set(it.s * 1.6, it.s * 0.55, it.s);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Tufo macio: esferas suaves agrupadas, base achatada e mais escura (volume sem custo de luz). */
function mergePuff() {
  const parts = [
    [0, 0, 0, 1],
    [0.85, -0.12, 0.15, 0.72],
    [-0.85, -0.15, -0.1, 0.7],
    [0.35, 0.38, -0.25, 0.62],
    [-0.4, 0.28, 0.3, 0.58],
    [1.45, -0.28, -0.1, 0.45],
    [-1.4, -0.3, 0.12, 0.42],
  ];
  const positions = [];
  const normals = [];
  const colors = [];
  for (const [x, y, z, r] of parts) {
    const g = new THREE.SphereGeometry(r, 12, 8).toNonIndexed();
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const py = Math.max(p.getY(i) + y, -0.32); // base achatada
      positions.push(p.getX(i) + x, py, p.getZ(i) + z);
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      const k = 0.72 + 0.28 * THREE.MathUtils.smoothstep(py, -0.32, 0.7);
      colors.push(k, k, k * 1.02);
    }
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}
