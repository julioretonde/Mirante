// =============================================================================
//  Controle do cavaleiro: entrada -> física, estados, animação e estatísticas
// -----------------------------------------------------------------------------
//  Estados principais:
//    chão   : parado / andando / carregando o pulo / aterrissando / estatelado
//    ar     : subindo / caindo / batendo na parede
//  O pulo: segurar = carregar (0..CHARGE_FRAMES frames), soltar = pular na
//  direção segurada NAQUELE instante. Na carga máxima pula sozinho.
// =============================================================================

import { PHYSICS as P } from '../config.js';
import {
  createBody,
  stepBody,
  launch,
  unstick,
  EV_LAND,
  EV_BOUNCE,
  EV_CEIL,
  EV_FALL_OFF,
  EV_SPLAT,
  windAtBody,
} from './physics.js';
import { KNIGHT_ANIMS } from '../art/knight.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.body = createBody(world.start.x, world.start.y);
    this.body.onGround = true;
    this.prevX = this.body.x;
    this.prevY = this.body.y;
    this.facing = 1;
    this.charging = false;
    this.charge = 0;
    this.splatTimer = 0;
    this.landTimer = 0;
    this.bumpTimer = 0;
    this.bufferTimer = 0;
    this.needRepress = false; // após o splat, é preciso soltar e apertar de novo
    this.walking = false;
    this.anim = 'idle';
    this.animTime = 0;
    this.cheering = false;
    this.jumps = 0;
    this.falls = 0;
    this.inWind = 0;
  }

  /** Estado serializável (para o save). */
  serialize() {
    const b = this.body;
    return {
      body: { x: b.x, y: b.y, vx: b.vx, vy: b.vy, onGround: b.onGround, onIce: b.onIce, peakY: b.peakY },
      facing: this.facing,
      splatTimer: this.splatTimer,
    };
  }

  restore(data) {
    const b = this.body;
    Object.assign(b, data.body);
    b.fallDist = 0;
    this.facing = data.facing || 1;
    this.splatTimer = data.splatTimer || 0;
    this.charging = false;
    this.charge = 0;
    unstick(b, this.world);
    this.prevX = b.x;
    this.prevY = b.y;
  }

  teleport(x, y) {
    const b = this.body;
    b.x = x;
    b.y = y;
    b.vx = 0;
    b.vy = 0;
    b.onGround = false;
    b.peakY = y;
    this.charging = false;
    this.splatTimer = 0;
    unstick(b, this.world);
    this.prevX = b.x;
    this.prevY = b.y;
  }

  get chargeRatio() {
    return this.charging ? this.charge / P.CHARGE_FRAMES : 0;
  }

  /**
   * Um passo de 1/60 s.
   * @param ctl { dir, jumpHeld, jumpPressed, jumpReleased, releaseDir }
   * @returns lista de eventos para som/partículas: [{type, ...}]
   */
  update(ctl) {
    const b = this.body;
    const events = [];
    this.prevX = b.x;
    this.prevY = b.y;
    this.animTime++;
    if (this.landTimer > 0) this.landTimer--;
    if (this.bumpTimer > 0) this.bumpTimer--;
    if (!ctl.jumpHeld) this.needRepress = false;

    let walkDir = 0;
    if (this.cheering) {
      // cena final: sem controle
    } else if (b.onGround) {
      if (this.splatTimer > 0) {
        this.splatTimer--;
        if (ctl.jumpHeld) this.needRepress = true;
      } else if (this.charging) {
        if (ctl.dir !== 0) this.facing = ctl.dir;
        if (ctl.jumpReleased) {
          this._jump(ctl.releaseDir, events);
        } else {
          this.charge++;
          if (this.charge >= P.CHARGE_FRAMES) this._jump(ctl.dir, events);
        }
      } else {
        const wantsCharge =
          (ctl.jumpPressed && ctl.jumpHeld) || (ctl.jumpHeld && this.bufferTimer > 0 && !this.needRepress);
        if (ctl.jumpPressed && !ctl.jumpHeld && !this.needRepress) {
          // toque mais rápido que um frame: pulo mínimo na hora
          this.charge = 0;
          this._jump(ctl.releaseDir, events);
        } else if (wantsCharge && !this.needRepress) {
          this.charging = true;
          this.charge = 0;
          events.push({ type: 'chargeStart' });
        } else {
          walkDir = ctl.dir;
          if (walkDir !== 0) this.facing = walkDir;
        }
      }
      this.bufferTimer = 0;
    } else {
      if (this.bufferTimer > 0) this.bufferTimer--;
      if (ctl.jumpPressed) this.bufferTimer = P.JUMP_BUFFER_FRAMES;
    }

    const ev = stepBody(b, this.world, walkDir);
    this.walking = b.onGround && walkDir !== 0 && b.vx !== 0;

    if (ev & EV_BOUNCE) {
      this.bumpTimer = 14;
      if (b.vx !== 0) this.facing = b.vx > 0 ? 1 : -1;
      events.push({ type: 'bounce', x: b.x + (b.vx > 0 ? 0 : P.PLAYER_W), y: b.y + P.PLAYER_H / 2 });
    }
    if (ev & EV_CEIL) events.push({ type: 'ceiling', x: b.x + P.PLAYER_W / 2, y: b.y });
    if (ev & EV_FALL_OFF) events.push({ type: 'falloff' });
    if (ev & EV_LAND) {
      const feetX = b.x + P.PLAYER_W / 2;
      const feetY = b.y + P.PLAYER_H;
      if (ev & EV_SPLAT) {
        this.splatTimer = P.SPLAT_FRAMES;
        this.falls++;
        this.charging = false;
        if (ctl.jumpHeld) this.needRepress = true;
        events.push({ type: 'splat', x: feetX, y: feetY, dist: b.fallDist });
      } else {
        this.landTimer = P.LAND_FRAMES;
        events.push({ type: 'land', x: feetX, y: feetY, dist: b.fallDist, ice: b.onIce });
      }
    }
    const wind = !b.onGround ? windAtBody(this.world, b) : 0;
    this.inWind = wind;

    this._pickAnim();
    return events;
  }

  _jump(dir, events) {
    const b = this.body;
    const charge = this.charge;
    launch(b, charge, dir);
    if (dir !== 0) this.facing = dir;
    this.charging = false;
    this.charge = 0;
    this.jumps++;
    this.landTimer = 0;
    events.push({ type: 'jump', charge, dir, x: b.x + P.PLAYER_W / 2, y: b.y + P.PLAYER_H });
  }

  _pickAnim() {
    const b = this.body;
    let a;
    if (this.cheering) a = 'cheer';
    else if (this.splatTimer > 0) a = 'splat';
    else if (this.charging) a = 'crouch';
    else if (!b.onGround) a = this.bumpTimer > 0 ? 'bump' : b.vy < 0 ? 'rise' : 'fall';
    else if (this.landTimer > 0) a = 'land';
    else if (this.walking) a = 'walk';
    else a = 'idle';
    if (a !== this.anim) {
      this.anim = a;
      this.animTime = 0;
    }
  }

  /** Nome do quadro atual da animação. */
  frameName() {
    const seq = KNIGHT_ANIMS[this.anim];
    let total = 0;
    for (const [, d] of seq) total += d;
    let t = this.animTime % total;
    for (const [name, d] of seq) {
      if (t < d) return name;
      t -= d;
    }
    return seq[0][0];
  }
}
