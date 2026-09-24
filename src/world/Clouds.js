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
      emissive: new THREE.Color('#ffd9c2'),
      emissiveIntensity: 0.35,
      flatShading: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
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

function mergePuff() {
  const parts = [
    [0, 0, 0, 1],
    [0.8, -0.1, 0.2, 0.75],
    [-0.8, -0.15, -0.1, 0.7],
    [0.3, 0.35, -0.3, 0.65],
    [-0.35, 0.25, 0.35, 0.6],
  ];
  const positions = [];
  for (const [x, y, z, r] of parts) {
    const g = new THREE.IcosahedronGeometry(r, 0).toNonIndexed();
    g.translate(x, y, z);
    positions.push(...g.attributes.position.array);
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}
