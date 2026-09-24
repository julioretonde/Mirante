import * as THREE from 'three';
import { config } from '../config.js';
import { Events } from './Events.js';
import { Loop } from './Loop.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.events = new Events();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.render.maxPixelRatio));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(config.colors.background);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(config.render.fov, 1, config.render.near, config.render.far);

    this.world = null;
    /** Sistemas atualizados antes do mundo a cada frame (câmera, jogador...). */
    this.systems = [];
    this.paused = false;
    this.loop = new Loop((dt, t) => this.update(dt, t));

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.visualViewport?.addEventListener('resize', this._onResize);
    // Celulares liberam o contexto WebGL sob pressão de memória; evita tela preta permanente.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.loop.stop();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      if (!this.paused) this.loop.start();
    });
    this.resize();
  }

  setWorld(world) {
    this.world?.dispose?.();
    this.world = world;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.events.emit('resize', { width: w, height: h });
  }

  start() {
    this.paused = false;
    this.loop.start();
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.loop.stop();
    this.events.emit('pause');
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.loop.start();
    this.events.emit('resume');
  }

  update(dt, t) {
    for (const system of this.systems) system.update(dt, t);
    this.world?.update(dt, t);
    this.renderer.render(this.scene, this.camera);
    this.events.emit('frame', { dt, t });
  }

  get fps() {
    return this.loop.fps;
  }
}
