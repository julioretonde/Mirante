import * as THREE from 'three';
import { config } from '../config.js';
import { createRandom } from '../core/Random.js';

/**
 * Vida em movimento (GDD §3): bandos de pássaros circulando em várias alturas e
 * fumaça saindo das chaminés da Rua do Vale.
 */
export class Ambient {
  constructor(layout) {
    this.group = new THREE.Group();
    this.#birds();
    this.#smoke(layout);
  }

  // ——— pássaros: "V" low-poly com asas batendo no vertex shader ———
  #birds() {
    const rnd = createRandom(config.world.seed + 31);
    // Um pássaro: corpo + duas asas (a coordenada x > 0.3 marca a ponta da asa)
    const geo = new THREE.BufferGeometry();
    const v = [
      // asa esquerda
      0, 0, -0.35, -1.1, 0, 0.1, 0, 0, 0.35,
      // asa direita
      0, 0, -0.35, 0, 0, 0.35, 1.1, 0, 0.1,
    ];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.computeVertexNormals();

    this.flocks = [];
    const centers = [
      [20, 60, 250],
      [-90, 110, 170],
      [60, 170, 30],
      [30, 260, -150],
      [0, 380, -300],
      [-200, 90, 120],
      [180, 140, 60],
    ];
    const count = centers.length * 9;
    this.birdMaterial = new THREE.MeshLambertMaterial({ color: '#4a4550', side: THREE.DoubleSide });
    this.birdMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.birdTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        float phase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
        transformed.y += abs(position.x) * sin(uTime * 9.0 + phase) * 0.7;`,
      );
    };
    this.birdMaterial.customProgramCacheKey = () => 'mirante-birds';
    this.birdTime = { value: 0 };
    this.birds = new THREE.InstancedMesh(geo, this.birdMaterial, count);
    this.birds.frustumCulled = false;
    centers.forEach((c, f) => {
      const flock = { c, r: rnd.range(40, 90), speed: rnd.range(0.08, 0.16) * (rnd.chance(0.5) ? 1 : -1), members: [] };
      for (let i = 0; i < 9; i++) {
        flock.members.push({ a: rnd.range(0, 0.6), dr: rnd.range(-8, 8), dy: rnd.range(-4, 4), s: rnd.range(0.9, 1.3) });
      }
      this.flocks.push(flock);
    });
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this.group.add(this.birds);
  }

  // ——— fumaça das chaminés ———
  #smoke(layout) {
    const [sx, , sz] = config.world.spawn;
    const chimneys = layout.buildings
      .filter((b) => b.chimneyTop && Math.hypot(b.x - sx, b.z - sz) < 260)
      .slice(0, 36)
      .map((b) => new THREE.Vector3(...b.chimneyTop));
    const puffs = 5;
    const n = chimneys.length * puffs;
    const pos = new Float32Array(n * 3);
    const life = new Float32Array(n);
    this.smokeData = { chimneys, puffs, pos, life };
    for (let i = 0; i < n; i++) life[i] = (i % puffs) / puffs;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('life', new THREE.BufferAttribute(life, 1));
    this.smokeMaterial = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#f4ece6') }, uScale: { value: 300 } },
      vertexShader: /* glsl */ `
        attribute float life;
        uniform float uScale;
        varying float vLife;
        void main() {
          vLife = life;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uScale * (0.6 + life * 1.8) / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vLife;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.3, d) * (1.0 - vLife) * smoothstep(0.0, 0.12, vLife) * 0.5;
          gl_FragColor = vec4(uColor, a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.smoke = new THREE.Points(geo, this.smokeMaterial);
    this.smoke.frustumCulled = false;
    this.group.add(this.smoke);
  }

  update(dt, t, profile) {
    this.birdTime.value = t;
    let i = 0;
    for (const flock of this.flocks) {
      const base = t * flock.speed;
      for (const m of flock.members) {
        const a = base + m.a;
        const r = flock.r + m.dr;
        this._p.set(flock.c[0] + Math.cos(a) * r, flock.c[1] + m.dy + Math.sin(t * 0.5 + m.a * 6) * 2, flock.c[2] + Math.sin(a) * r);
        // Voa na tangente do círculo
        this._q.setFromAxisAngle(this._up, -a + (flock.speed > 0 ? 0 : Math.PI));
        this._s.setScalar(m.s);
        this._m.compose(this._p, this._q, this._s);
        this.birds.setMatrixAt(i++, this._m);
      }
    }
    this.birds.instanceMatrix.needsUpdate = true;

    const { chimneys, puffs, pos, life } = this.smokeData;
    for (let c = 0; c < chimneys.length; c++) {
      const ch = chimneys[c];
      for (let k = 0; k < puffs; k++) {
        const idx = c * puffs + k;
        let l = life[idx] + dt * 0.18;
        if (l > 1) l -= 1;
        life[idx] = l;
        pos[idx * 3] = ch.x + l * 4 + Math.sin(t + c) * 0.4 * l;
        pos[idx * 3 + 1] = ch.y + l * 9;
        pos[idx * 3 + 2] = ch.z + l * 1.5;
      }
    }
    this.smoke.geometry.attributes.position.needsUpdate = true;
    this.smoke.geometry.attributes.life.needsUpdate = true;
    if (profile) this.smokeMaterial.uniforms.uColor.value.copy(profile.fog).lerp(new THREE.Color('#ffffff'), 0.4);
  }
}
