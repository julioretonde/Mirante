import { config } from '../config.js';

/** Laço principal com delta limitado (evita saltos após travadas ou volta do segundo plano). */
export class Loop {
  constructor(tick) {
    this.tick = tick;
    this.running = false;
    this.elapsed = 0;
    this.fps = 0;
    this._last = 0;
    this._frame = this._frame.bind(this);
    this._raf = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  _frame(now) {
    if (!this.running) return;
    const raw = (now - this._last) / 1000;
    this._last = now;
    const dt = Math.min(Math.max(raw, 0), config.loop.maxDelta);
    this.elapsed += dt;
    if (raw > 0) this.fps += (1 / raw - this.fps) * 0.05;
    this.tick(dt, this.elapsed);
    this._raf = requestAnimationFrame(this._frame);
  }
}
