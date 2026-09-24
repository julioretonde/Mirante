// =============================================================================
//  Tela: resolução interna fixa 180x320 escalada por fator INTEIRO, com
//  vizinho mais próximo (sem borrão). O que sobra da tela vira barras na cor
//  de fundo. Em celulares altos, a faixa que sobra embaixo recebe os botões
//  de toque (assim eles não cobrem o jogo); senão os botões ficam por cima.
// =============================================================================

import { VIEW_W, VIEW_H } from '../config.js';

export class Display {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    /** Buffer da resolução interna, onde todo o jogo é desenhado. */
    this.buffer = document.createElement('canvas');
    this.buffer.width = VIEW_W;
    this.buffer.height = VIEW_H;
    this.bctx = this.buffer.getContext('2d');
    this.bctx.imageSmoothingEnabled = false;
    /** Faixa inferior de controles (resolução interna, largura 180). */
    this.strip = document.createElement('canvas');
    this.strip.width = VIEW_W;
    this.strip.height = 1;
    this.sctx = this.strip.getContext('2d');
    this.touchUI = false;
    this.barColor = '#120e1c';
    this.layout = null;
    this.probe = document.getElementById('safe-area-probe');
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', () => setTimeout(this.resize, 200));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this.resize);
    this.resize();
  }

  /** Liga/desliga o espaço reservado para os botões de toque. */
  setTouchUI(on) {
    if (this.touchUI === on) return;
    this.touchUI = on;
    this.resize();
  }

  safeArea() {
    if (!this.probe) return { top: 0, right: 0, bottom: 0, left: 0 };
    const cs = getComputedStyle(this.probe);
    return {
      top: parseFloat(cs.paddingTop) || 0,
      right: parseFloat(cs.paddingRight) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0,
      left: parseFloat(cs.paddingLeft) || 0,
    };
  }

  resize() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 4));
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    const W = Math.max(1, Math.round(cssW * dpr));
    const H = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.ctx.imageSmoothingEnabled = false;

    const sa = this.safeArea();
    const top = Math.round(sa.top * dpr);
    const bottom = Math.round(sa.bottom * dpr);
    const left = Math.round(sa.left * dpr);
    const right = Math.round(sa.right * dpr);
    const availW = W - left - right;
    const availH = H - top - bottom;

    // Fator inteiro; se a tela for menor que 180x320 pixels físicos, usa 1.
    let k = Math.floor(Math.min(availW / VIEW_W, availH / VIEW_H));
    if (k < 1) k = 1;
    const gw = VIEW_W * k;
    const gh = VIEW_H * k;
    const gx = left + Math.floor((availW - gw) / 2);

    // Espaço que sobra embaixo, em pixels internos.
    const spare = Math.floor((availH - gh) / k);
    let gy;
    let stripH = 0;
    if (this.touchUI && spare >= 40) {
      stripH = Math.min(spare, 96);
      const used = gh + stripH * k;
      gy = top + Math.floor((availH - used) / 2);
    } else {
      gy = top + Math.floor((availH - gh) / 2);
    }
    if (stripH && this.strip.height !== stripH) {
      this.strip.height = stripH;
      this.sctx.imageSmoothingEnabled = false;
    }
    this.layout = { dpr, W, H, k, gx, gy, gw, gh, stripH, stripY: gy + gh, cssW, cssH };
  }

  /** Converte coordenada de tela (px CSS) para coordenada interna do jogo. */
  toInternal(cssX, cssY) {
    const L = this.layout;
    const x = (cssX * L.dpr - L.gx) / L.k;
    const y = (cssY * L.dpr - L.gy) / L.k;
    return { x, y };
  }

  /** Copia o buffer interno (e a faixa de controles) para a tela real. */
  present() {
    const L = this.layout;
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = this.barColor;
    ctx.fillRect(0, 0, L.W, L.H);
    ctx.drawImage(this.buffer, 0, 0, VIEW_W, VIEW_H, L.gx, L.gy, L.gw, L.gh);
    if (L.stripH) {
      ctx.drawImage(this.strip, 0, 0, VIEW_W, L.stripH, L.gx, L.stripY, L.gw, L.stripH * L.k);
    }
  }
}
