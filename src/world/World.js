import * as THREE from 'three';
import { config } from '../config.js';
import { disposeObject } from '../core/dispose.js';
import { generateCityLayout } from './cityLayout.js';
import { CityGenerator } from './CityGenerator.js';
import { Clouds } from './Clouds.js';
import { createProfile, sampleProfile } from './LightingProfile.js';
import { Lighting } from './Lighting.js';
import { createMaterials, windowUniforms } from './materials.js';
import { Props } from './Props.js';
import { Sky } from './Sky.js';
import { Terrain } from './Terrain.js';
import { terrainHeight } from './heightfield.js';
import { Tower } from './Tower.js';

const SUN_AZIMUTH = THREE.MathUtils.degToRad(-128); // sol baixo a oeste-noroeste
const MOON_DIR = new THREE.Vector3(0.45, 0.62, 0.64).normalize();
const clamp = THREE.MathUtils.clamp;

/**
 * Mundo: terreno, cidade, props, torre, céu, nuvens e luz progressiva.
 * A luz segue a "altura de referência": a do jogador (a partir da Etapa 2);
 * por enquanto, a altura da câmera, ou um valor fixo definido pelo debug.
 */
export class World {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    game.scene.add(this.root);

    this.materials = createMaterials(game.renderer);
    this.layout = generateCityLayout();

    game.scene.fog = new THREE.Fog('#f3d5bf', config.world.fogNear, config.world.fogFar);

    this.sky = new Sky();
    this.lighting = new Lighting();
    this.terrain = new Terrain(this.materials);
    this.city = new CityGenerator(this.layout, this.materials);
    this.props = new Props(this.layout, this.materials);
    this.tower = new Tower(this.materials);
    this.clouds = new Clouds();
    this.root.add(
      this.sky.group,
      this.lighting.group,
      this.terrain.mesh,
      this.city.group,
      this.props.group,
      this.tower.group,
      this.clouds.mesh,
    );

    this.profile = createProfile();
    this.referenceHeight = null; // null = segue a câmera
    this.lightHeight = 0;
    this._sunDir = new THREE.Vector3();
    this._lightDir = new THREE.Vector3();
    this._focus = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this.#applyProfile(0);
  }

  /** Fixa a altura usada pela luz (debug) ou volta a seguir a câmera com `null`. */
  setReferenceHeight(height) {
    this.referenceHeight = height == null ? null : clamp(height, 0, config.world.summitAltitude);
  }

  #applyProfile(height) {
    const p = sampleProfile(height, this.profile);
    const elev = THREE.MathUtils.degToRad(p.sunElevation);
    this._sunDir.set(Math.cos(elev) * Math.sin(SUN_AZIMUTH), Math.sin(elev), Math.cos(elev) * Math.cos(SUN_AZIMUTH));
    // Abaixo do horizonte, a luz principal vira luar
    const lowSun = this._sunDir.clone();
    lowSun.y = Math.max(lowSun.y, 0.05);
    const night = THREE.MathUtils.smoothstep(p.sunElevation, 2, -8);
    this._lightDir.copy(lowSun.normalize()).lerp(MOON_DIR, night).normalize();

    this.sky.apply(p, this._sunDir);
    this.lighting.apply(p, this._lightDir);
    const fog = this.game.scene.fog;
    fog.color.copy(p.fog);
    this.game.renderer.toneMappingExposure = p.exposure;

    windowUniforms.uLitRatio.value = p.windows * 0.5;
    for (const m of this.materials.windowMaterials) m.emissiveIntensity = p.windows > 0.01 ? 0.4 + p.windows * 1.1 : 0;
    this.materials.tower.heart.emissiveIntensity = 0.3 + p.windows * 1.6;

    this.clouds.material.emissive.copy(p.cloudGlow);
    this.clouds.material.emissiveIntensity = p.cloudGlowIntensity;
  }

  update(dt, t) {
    const cam = this.game.camera;
    const target = this.referenceHeight ?? clamp(cam.position.y, 0, config.world.summitAltitude);
    // Transição suave; saltos grandes (teleporte de vista, debug) aplicam direto
    const jump = Math.abs(target - this.lightHeight) > 120;
    const next = jump ? target : this.lightHeight + (target - this.lightHeight) * Math.min(1, dt * 1.5);
    if (Math.abs(next - this.lightHeight) > 0.05 || t < 0.2) {
      this.lightHeight = next;
      this.#applyProfile(next);
    }

    // Sombra segue um ponto no chão à frente da câmera
    cam.getWorldDirection(this._fwd);
    this._fwd.y = 0;
    if (this._fwd.lengthSq() > 1e-6) this._fwd.normalize();
    this._focus.copy(cam.position).addScaledVector(this._fwd, 45);
    this._focus.y = terrainHeight(this._focus.x, this._focus.z);
    this.lighting.follow(this._focus);

    // Lá do alto a névoa afina: dá para ver o caminho percorrido
    const fog = this.game.scene.fog;
    const alt = Math.max(cam.position.y, 0);
    fog.near = config.world.fogNear + alt * 0.8;
    fog.far = config.world.fogFar + alt * 2.5;

    this.sky.update(cam);
    this.tower.update(t, this.profile.stars);
    this.clouds.update(t);
  }

  dispose() {
    this.game.scene.fog = null;
    disposeObject(this.root);
  }
}
