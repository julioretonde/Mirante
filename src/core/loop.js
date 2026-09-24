// =============================================================================
//  Loop principal com física em timestep FIXO de 60 Hz, separado do desenho.
//  A renderização acontece a cada quadro da tela (60, 90, 120 Hz...) e recebe
//  `alpha` (0..1) para interpolar a posição entre dois passos da física.
// =============================================================================

import { STEP_MS } from '../config.js';

export class Loop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.fps = 0;
    this._frames = 0;
    this._fpsTime = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this._fpsTime = this.last;
    requestAnimationFrame(this._tick);
  }

  _tick(now) {
    if (!this.running) return;
    let dt = now - this.last;
    this.last = now;
    // Evita a "espiral da morte" depois de a aba ficar em segundo plano.
    if (dt > 250) dt = 250;
    if (dt < 0) dt = 0;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP_MS && steps < 15) {
      this.update();
      this.acc -= STEP_MS;
      steps++;
    }
    if (steps === 15) this.acc = 0;
    this.render(this.acc / STEP_MS);

    this._frames++;
    if (now - this._fpsTime >= 500) {
      this.fps = Math.round((this._frames * 1000) / (now - this._fpsTime));
      this._frames = 0;
      this._fpsTime = now;
    }
    requestAnimationFrame(this._tick);
  }
}
