import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { config } from '../config.js';

/**
 * Câmera de vitrine (Etapa 1): percorre vistas da cidade e da torre sozinha.
 * Arrastar gira, pinça dá zoom; depois de alguns segundos sem toque, volta ao passeio.
 */
export const VIEWS = {
  rua: { position: [3, 3.2, 358], target: [0, 250, -320] },
  telhados: { position: [-170, 62, 262], target: [0, 200, -320] },
  aerea: { position: [620, 360, 520], target: [0, 70, -60] },
  vidro: { position: [165, 150, -40], target: [0, 420, -320] },
  jardins: { position: [80, 380, -205], target: [0, 430, -320] },
  topo: { position: [10, 607, -304], target: [0, 190, 380] },
};
export const VIEW_ORDER = ['rua', 'telhados', 'aerea', 'vidro', 'jardins', 'topo'];

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class ShowcaseCamera {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 2600;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;

    this.mode = 'auto';
    this.index = 0;
    this.hold = 0;
    this.blend = 1;
    this.idle = 0;
    this.from = { position: new THREE.Vector3(), target: new THREE.Vector3() };
    this.to = { position: new THREE.Vector3(), target: new THREE.Vector3() };
    this.current = { position: new THREE.Vector3(), target: new THREE.Vector3() };
    this.#load(VIEW_ORDER[0], this.to);
    this.from.position.copy(this.to.position);
    this.from.target.copy(this.to.target);

    this.controls.addEventListener('start', () => {
      this.mode = 'manual';
      this.idle = 0;
    });
    this.controls.addEventListener('end', () => {
      this.idle = 0;
    });
  }

  #load(name, into) {
    const v = VIEWS[name];
    into.position.fromArray(v.position);
    into.target.fromArray(v.target);
  }

  /** Vai para uma vista (com transição suave). */
  goTo(name, { instant = false } = {}) {
    if (!VIEWS[name]) return;
    this.index = VIEW_ORDER.indexOf(name);
    this.from.position.copy(this.camera.position);
    this.from.target.copy(this.controls.target);
    this.#load(name, this.to);
    this.blend = instant ? 1 : 0;
    this.hold = 0;
    this.mode = 'auto';
    if (instant) this.#applyAuto(0);
  }

  get viewName() {
    return VIEW_ORDER[this.index];
  }

  #applyAuto(t) {
    const k = ease(Math.min(this.blend, 1));
    this.current.position.lerpVectors(this.from.position, this.to.position, k);
    this.current.target.lerpVectors(this.from.target, this.to.target, k);
    // Leve deriva, para a vista nunca ficar parada
    const drift = Math.min(this.hold / 2, 1);
    const scale = Math.max(3, this.to.position.distanceTo(this.to.target) * 0.012);
    this.current.position.x += Math.sin(t * 0.13) * scale * drift;
    this.current.position.y += Math.sin(t * 0.09) * scale * 0.3 * drift;
    this.camera.position.copy(this.current.position);
    this.controls.target.copy(this.current.target);
    this.camera.lookAt(this.current.target);
  }

  update(dt, t) {
    if (this.mode === 'manual') {
      this.controls.update();
      this.idle += dt;
      if (this.idle > config.camera.idleResume) {
        this.goTo(VIEW_ORDER[(this.index + 1) % VIEW_ORDER.length]);
      }
      return;
    }
    if (this.blend < 1) {
      this.blend += dt / config.camera.showcaseBlend;
    } else {
      this.hold += dt;
      if (this.hold > config.camera.showcaseHold && !this.paused) {
        this.goTo(VIEW_ORDER[(this.index + 1) % VIEW_ORDER.length]);
      }
    }
    this.#applyAuto(t);
  }
}
