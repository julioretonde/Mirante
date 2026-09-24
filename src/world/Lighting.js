import * as THREE from 'three';
import { config } from '../config.js';

/** Uma luz direcional com sombra (sombra pequena que segue um alvo) + luz hemisférica. */
export class Lighting {
  constructor(sunDirection) {
    this.group = new THREE.Group();
    this.sunDirection = sunDirection.clone().normalize();

    this.hemi = new THREE.HemisphereLight(config.colors.hemiSky, config.colors.hemiGround, 2.0);
    this.group.add(this.hemi);

    this.sun = new THREE.DirectionalLight(config.colors.sunLight, 2.6);
    this.sun.castShadow = true;
    const size = config.render.shadowMapSize;
    this.sun.shadow.mapSize.set(size, size);
    const cam = this.sun.shadow.camera;
    cam.left = -45;
    cam.right = 45;
    cam.top = 45;
    cam.bottom = -45;
    cam.near = 1;
    cam.far = 300;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.group.add(this.sun, this.sun.target);

    this.follow(new THREE.Vector3());
  }

  /** Posiciona a caixa de sombra em volta do ponto de interesse (depois: o jogador). */
  follow(point) {
    this.sun.target.position.copy(point);
    this.sun.position.copy(point).addScaledVector(this.sunDirection, 150);
  }
}
