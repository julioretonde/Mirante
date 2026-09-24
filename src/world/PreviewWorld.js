import * as THREE from 'three';
import { config } from '../config.js';
import { createRandom } from '../core/Random.js';
import { disposeObject } from '../core/dispose.js';
import { Sky } from './Sky.js';
import { Lighting } from './Lighting.js';
import { Tower } from './Tower.js';

/**
 * Cena provisória da Etapa 0: rua com casinhas, silhuetas da cidade e a Torre Farol,
 * com câmera balançando devagar. Será substituída pelo mundo real na Etapa 1.
 */
export class PreviewWorld {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    game.scene.add(this.root);

    const c = config.colors;
    const sunDirection = new THREE.Vector3(-0.75, 0.16, -0.64); // sol baixo a noroeste

    game.scene.fog = new THREE.Fog(c.skyHorizon, config.world.fogNear, config.world.fogFar);

    this.sky = new Sky({ top: c.skyTop, horizon: c.skyHorizon, bottom: c.skyBottom, sun: c.sun, sunDirection });
    this.root.add(this.sky.mesh);

    this.lighting = new Lighting(sunDirection);
    this.lighting.follow(new THREE.Vector3(0, 0, -5));
    this.root.add(this.lighting.group);

    this.tower = new Tower();
    this.root.add(this.tower.group);

    this.#buildGround();
    this.#buildStreet();
    this.#buildCitySilhouette();

    this.cameraTarget = new THREE.Vector3();
  }

  #buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 3000),
      new THREE.MeshLambertMaterial({ color: '#cdb59a' }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.root.add(ground);

    const street = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 120),
      new THREE.MeshLambertMaterial({ color: '#b9a491' }),
    );
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0.02, -30);
    street.receiveShadow = true;
    this.root.add(street);
  }

  #buildStreet() {
    const c = config.colors;
    const rnd = createRandom(7);
    const walls = [c.cream, c.terracotta, c.sage, '#e8c9b0', '#d9cbb5'].map(
      (color) => new THREE.MeshLambertMaterial({ color }),
    );
    const roofMat = new THREE.MeshLambertMaterial({ color: '#b86f55' });
    const accentMat = new THREE.MeshLambertMaterial({ color: c.accent });
    const windowMat = new THREE.MeshLambertMaterial({ color: '#6c5a5e' });

    for (const side of [-1, 1]) {
      let z = 14;
      while (z > -80) {
        const w = rnd.range(5, 7.5);
        const d = rnd.range(6, 8);
        const h = rnd.range(4.5, 9);
        const house = new THREE.Group();

        const body = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), rnd.pick(walls));
        body.position.y = h / 2;
        body.castShadow = body.receiveShadow = true;
        house.add(body);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.6, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.scale.set(d / Math.max(w, d), 1, w / Math.max(w, d));
        roof.position.y = h + 1.3;
        roof.castShadow = true;
        house.add(roof);

        // Janelas voltadas para a rua
        const floors = Math.floor(h / 3);
        for (let f = 0; f < floors; f++) {
          for (const off of [-w / 4, w / 4]) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.8), windowMat);
            win.position.set((-side * d) / 2 - side * 0.02, 1.8 + f * 3, off);
            house.add(win);
          }
        }

        // Toldo coral: prévia da linguagem visual de escalada
        if (rnd.chance(0.45)) {
          const awning = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, w * 0.7), accentMat);
          awning.position.set((-side * d) / 2 - side * 0.8, 2.6, 0);
          awning.rotation.z = side * -0.25;
          awning.castShadow = true;
          house.add(awning);
        }

        house.position.set(side * (3 + d / 2 + rnd.range(0, 0.6)), 0, z - w / 2);
        this.root.add(house);
        z -= w + rnd.range(0.2, 1.2);
      }
    }
  }

  /** Cidade de fundo em anfiteatro: prédios crescem em direção à torre (norte). */
  #buildCitySilhouette() {
    const rnd = createRandom(2024);
    const count = 520;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const palette = ['#e6d6c2', '#d8b59c', '#b7c1b0', '#aab5c2', '#e9cdb8'].map((h) => new THREE.Color(h));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();

    let i = 0;
    while (i < count) {
      const x = rnd.range(-420, 420);
      const z = rnd.range(-640, -90);
      if (Math.abs(x) < 18 && z > -120) continue; // deixa a vista da rua livre
      const north = (-z - 90) / 550; // 0 perto, 1 junto à torre
      const tall = rnd.chance(0.08 * north);
      const h = tall ? rnd.range(80, 240) * north + 40 : rnd.range(8, 22) + north * rnd.range(10, 70);
      const w = rnd.range(12, 28);
      // O terreno sobe em anfiteatro rumo ao norte
      pos.set(x, north * 45 - 1, z);
      scale.set(w, h, rnd.range(12, 28));
      m.compose(pos, q, scale);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, rnd.pick(palette));
      i++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.root.add(mesh);

    // Encosta do vale (anfiteatro) sob os prédios
    const slope = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 700),
      new THREE.MeshLambertMaterial({ color: '#c9ad92' }),
    );
    slope.rotation.x = -Math.PI / 2 + Math.atan(45 / 550);
    slope.position.set(0, 22, -380);
    this.root.add(slope);
  }

  update(dt, t) {
    const cam = this.game.camera;
    cam.position.set(Math.sin(t * 0.07) * 1.6, 3.4 + Math.sin(t * 0.11) * 0.3, 24);
    const [tx, , tz] = config.world.towerPosition;
    this.cameraTarget.set(tx + Math.sin(t * 0.05) * 30, 230, tz);
    cam.lookAt(this.cameraTarget);

    this.sky.update(cam);
    this.tower.update(t);
  }

  dispose() {
    this.game.scene.fog = null;
    disposeObject(this.root);
  }
}
