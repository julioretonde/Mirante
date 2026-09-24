import * as THREE from 'three';
import { terrainHeight } from '../world/heightfield.js';
import { t } from '../i18n/index.js';

/**
 * Câmera livre de voo (GDD §9, modo debug). Serve para explorar o mundo antes do personagem.
 * Computador: WASD/setas movem, arrastar o mouse olha, Espaço/E sobe, Q/C desce, Shift acelera.
 * Toque: metade esquerda = joystick (anda para onde olha), metade direita = olhar.
 */
export class FlyCamera {
  constructor(camera, dom, ui) {
    this.camera = camera;
    this.dom = dom;
    this.enabled = false;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.look = { id: null, x: 0, y: 0 };
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();

    this.stickEl = document.createElement('div');
    this.stickEl.className = 'fly-stick';
    this.stickEl.hidden = true;
    this.knobEl = document.createElement('div');
    this.knobEl.className = 'fly-knob';
    this.stickEl.appendChild(this.knobEl);
    this.hintEl = document.createElement('div');
    this.hintEl.className = 'fly-hint paper';
    this.hintEl.hidden = true;
    ui.append(this.stickEl, this.hintEl);

    this._down = (e) => this.#onDown(e);
    this._move = (e) => this.#onMove(e);
    this._up = (e) => this.#onUp(e);
    this._key = (e) => {
      if (!this.enabled) return;
      if (e.type === 'keydown') this.keys.add(e.code);
      else this.keys.delete(e.code);
    };
    window.addEventListener('keydown', this._key);
    window.addEventListener('keyup', this._key);
    window.addEventListener('blur', () => this.keys.clear());
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this._euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = this._euler.y;
    this.pitch = this._euler.x;
    this.dom.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
    const touch = (navigator.maxTouchPoints ?? 0) > 0;
    this.hintEl.textContent = t(touch ? 'fly.hintTouch' : 'fly.hintDesktop');
    this.hintEl.hidden = false;
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => (this.hintEl.hidden = true), 9000);
  }

  disable() {
    this.enabled = false;
    this.dom.removeEventListener('pointerdown', this._down);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
    this.stick.id = this.look.id = null;
    this.stickEl.hidden = true;
    this.hintEl.hidden = true;
    this.keys.clear();
  }

  /** Posiciona a câmera num ponto olhando para um alvo. */
  place(position, target) {
    this.camera.position.copy(position);
    this.camera.lookAt(target);
    this._euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = this._euler.y;
    this.pitch = this._euler.x;
  }

  #onDown(e) {
    const touchLeft = e.pointerType === 'touch' && e.clientX < window.innerWidth / 2;
    if (touchLeft && this.stick.id == null) {
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      this.stickEl.style.left = `${e.clientX}px`;
      this.stickEl.style.top = `${e.clientY}px`;
      this.knobEl.style.transform = 'translate(-50%, -50%)';
      this.stickEl.hidden = false;
    } else if (this.look.id == null) {
      this.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  }

  #onMove(e) {
    if (e.pointerId === this.stick.id) {
      const max = 55;
      let dx = e.clientX - this.stick.ox;
      let dy = e.clientY - this.stick.oy;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx *= max / len;
        dy *= max / len;
      }
      this.stick.x = dx / max;
      this.stick.y = dy / max;
      this.knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    } else if (e.pointerId === this.look.id) {
      const k = e.pointerType === 'touch' ? 0.006 : 0.0035;
      this.yaw -= (e.clientX - this.look.x) * k;
      this.pitch -= (e.clientY - this.look.y) * k;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.5, 1.5);
      this.look.x = e.clientX;
      this.look.y = e.clientY;
    }
  }

  #onUp(e) {
    if (e.pointerId === this.stick.id) {
      this.stick.id = null;
      this.stick.x = this.stick.y = 0;
      this.stickEl.hidden = true;
    }
    if (e.pointerId === this.look.id) this.look.id = null;
  }

  update(dt) {
    if (!this.enabled) return;
    const k = this.keys;
    let forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const lift = (k.has('Space') || k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') || k.has('KeyC') ? 1 : 0);
    let speed = k.has('ShiftLeft') || k.has('ShiftRight') ? 90 : 22;
    if (this.stick.id != null) {
      forward = -this.stick.y;
      strafe = this.stick.x;
      speed = 45;
    }

    this._euler.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(this._euler);
    this._fwd.set(0, 0, -1).applyQuaternion(this.camera.quaternion); // anda para onde olha
    this._right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const p = this.camera.position;
    p.addScaledVector(this._fwd, forward * speed * dt);
    p.addScaledVector(this._right, strafe * speed * dt);
    p.y += lift * speed * dt;
    p.y = Math.min(Math.max(p.y, terrainHeight(p.x, p.z) + 1.6), 1500);
  }
}
