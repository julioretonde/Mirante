import * as THREE from 'three';
import { config } from '../config.js';

/** Uma luz direcional com sombra (caixa pequena que segue um ponto) + luz hemisférica. */
export class Lighting {
  constructor() {
    this.group = new THREE.Group();
    this.direction = new THREE.Vector3(0, 1, 0);

    this.hemi = new THREE.HemisphereLight('#ffffff', '#888888', 1.5);
    this.group.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#ffffff', 2);
    this.sun.castShadow = true;
    const size = config.render.shadowMapSize;
    this.sun.shadow.mapSize.set(size, size);
    const cam = this.sun.shadow.camera;
    const box = config.render.shadowBox;
    cam.left = -box;
    cam.right = box;
    cam.top = box;
    cam.bottom = -box;
    cam.near = 1;
    cam.far = 800;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.05;
    this.group.add(this.sun, this.sun.target);
    this._focus = new THREE.Vector3();
  }

  apply(profile, lightDir) {
    this.direction.copy(lightDir);
    this.sun.color.copy(profile.light);
    this.sun.intensity = profile.lightIntensity;
    this.hemi.color.copy(profile.hemiSky);
    this.hemi.groundColor.copy(profile.hemiGround);
    this.hemi.intensity = profile.hemiIntensity;
    this.follow(this._focus);
  }

  /** Posiciona a caixa de sombra em volta do ponto de interesse (câmera; depois, o jogador). */
  follow(point) {
    this._focus.copy(point);
    this.sun.target.position.copy(point);
    this.sun.position.copy(point).addScaledVector(this.direction, 400);
  }
}
