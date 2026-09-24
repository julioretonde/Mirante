// =============================================================================
//  Entrada: toque multitouch + teclado
// -----------------------------------------------------------------------------
//  Toque (modo jogo):
//    metade ESQUERDA da tela: direção (1º quarto = ←, 2º quarto = →). Dá para
//                             deslizar o dedo entre as duas setas.
//    metade DIREITA da tela : PULO (segurar carrega, soltar pula).
//  Cada dedo é rastreado pelo seu pointerId (multitouch real).
//  Teclado: ← → (ou A D) e Espaço (ou ↑ / W) para pular.
//
//  Os eventos de apertar/soltar o pulo ficam "travados" até o próximo passo
//  da simulação, então nem um toque rapidíssimo se perde.
// =============================================================================

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyX']);
const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

export class Input {
  constructor(display, target) {
    this.display = display;
    this.target = target;
    /** 'game' = zonas de toque do jogo; 'ui' = toques viram cliques de menu. */
    this.mode = 'ui';
    /** Função que testa se (x,y) interno acerta um botão da interface. */
    this.hitUI = () => null;
    /** Chamado no primeiro gesto do usuário (desbloquear áudio etc.). */
    this.onGesture = null;

    this.pointers = new Map(); // id -> { zone, x, y }
    this.keysDown = new Set();
    this.dirOrder = []; // ordem em que as direções foram apertadas
    this.touchSeen = false;
    this.lastPointerType = 'mouse';

    this._jumpHeld = false;
    this.pending = this._emptyPending();

    this._bind();
  }

  _emptyPending() {
    return { jumpPressed: 0, jumpReleased: 0, releaseDir: 0, taps: [], ui: [], keys: [] };
  }

  _bind() {
    const t = this.target;
    const opts = { passive: false };
    t.addEventListener('pointerdown', (e) => this._down(e), opts);
    t.addEventListener('pointermove', (e) => this._move(e), opts);
    t.addEventListener('pointerup', (e) => this._up(e), opts);
    t.addEventListener('pointercancel', (e) => this._up(e), opts);
    t.addEventListener('lostpointercapture', (e) => this._up(e), opts);
    window.addEventListener('keydown', (e) => this._key(e, true));
    window.addEventListener('keyup', (e) => this._key(e, false));
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
    // Bloqueia rolagem, zoom por pinça/duplo toque e o menu de toque longo.
    const stop = (e) => {
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener('touchstart', stop, opts);
    document.addEventListener('touchmove', stop, opts);
    document.addEventListener('touchend', stop, opts);
    document.addEventListener('gesturestart', stop, opts);
    document.addEventListener('gesturechange', stop, opts);
    document.addEventListener('dblclick', stop, opts);
    document.addEventListener('contextmenu', stop, opts);
    document.addEventListener('selectstart', stop, opts);
    window.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey) e.preventDefault();
      },
      opts
    );
  }

  _gesture(e) {
    if (this.onGesture) this.onGesture(e ? e.type : 'key');
  }

  _zoneFor(cssX) {
    const w = this.display.layout.cssW;
    if (cssX >= w / 2) return 'jump';
    return cssX < w / 4 ? 'left' : 'right';
  }

  _down(e) {
    if (e.cancelable) e.preventDefault();
    this.lastPointerType = e.pointerType || 'mouse';
    if (e.pointerType === 'touch' && !this.touchSeen) {
      this.touchSeen = true;
      this.display.setTouchUI(true);
    }
    try {
      this.target.setPointerCapture(e.pointerId);
    } catch {
      /* ignora */
    }
    this._gesture(e);
    const p = this.display.toInternal(e.clientX, e.clientY);
    const ui = this.hitUI(p.x, p.y);
    if (ui) {
      this.pointers.set(e.pointerId, { zone: 'ui' });
      this.pending.ui.push({ id: ui, x: p.x, y: p.y, shift: e.shiftKey });
      return;
    }
    if (this.mode === 'ui' || (this.lastPointerType === 'mouse' && e.button !== 0)) {
      this.pointers.set(e.pointerId, { zone: 'ui' });
      this.pending.taps.push({ x: p.x, y: p.y, shift: e.shiftKey, button: e.button });
      return;
    }
    if (e.shiftKey && this.lastPointerType === 'mouse') {
      // Shift+clique: usado pelo modo debug para teleportar
      this.pointers.set(e.pointerId, { zone: 'ui' });
      this.pending.taps.push({ x: p.x, y: p.y, shift: true, button: e.button });
      return;
    }
    const zone = this._zoneFor(e.clientX);
    this.pointers.set(e.pointerId, { zone });
    if (zone === 'left' || zone === 'right') this._pushDir(zone === 'left' ? -1 : 1);
    this._updateJump();
  }

  _move(e) {
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) return;
    if (e.cancelable) e.preventDefault();
    if (ptr.zone === 'left' || ptr.zone === 'right') {
      const w = this.display.layout.cssW;
      // enquanto o dedo estiver na metade esquerda, pode trocar de seta
      if (e.clientX < w / 2 + w * 0.05) {
        const zone = e.clientX < w / 4 ? 'left' : 'right';
        if (zone !== ptr.zone) {
          ptr.zone = zone;
          this._pushDir(zone === 'left' ? -1 : 1);
        }
      }
    }
  }

  _up(e) {
    // Em telas de toque o navegador só considera "gesto do usuário" ao soltar
    // o dedo: é aqui que o áudio e a tela cheia podem ser liberados.
    if (e.type === 'pointerup') this._gesture(e);
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) return;
    this.pointers.delete(e.pointerId);
    this._updateJump();
  }

  _key(e, down) {
    const code = e.code;
    if (PREVENT.has(code)) e.preventDefault();
    if (down) {
      this._gesture();
      if (!e.repeat) this.pending.keys.push(code);
      if (this.keysDown.has(code)) return;
      this.keysDown.add(code);
      if (LEFT_KEYS.has(code)) this._pushDir(-1);
      if (RIGHT_KEYS.has(code)) this._pushDir(1);
    } else {
      this.keysDown.delete(code);
    }
    this._updateJump();
  }

  _pushDir(d) {
    this.dirOrder = this.dirOrder.filter((x) => x !== d);
    this.dirOrder.push(d);
  }

  /** Direção atual: -1, 0 ou +1 (a última apertada vence). */
  dir() {
    let left = false;
    let right = false;
    for (const k of this.keysDown) {
      if (LEFT_KEYS.has(k)) left = true;
      if (RIGHT_KEYS.has(k)) right = true;
    }
    for (const p of this.pointers.values()) {
      if (p.zone === 'left') left = true;
      if (p.zone === 'right') right = true;
    }
    if (left && right) {
      for (let i = this.dirOrder.length - 1; i >= 0; i--) {
        const d = this.dirOrder[i];
        if ((d < 0 && left) || (d > 0 && right)) return d;
      }
    }
    return left ? -1 : right ? 1 : 0;
  }

  /** Algum dedo ou tecla está segurando uma direção (para desenhar botões). */
  dirPressed(d) {
    for (const k of this.keysDown) {
      if (d < 0 && LEFT_KEYS.has(k)) return true;
      if (d > 0 && RIGHT_KEYS.has(k)) return true;
    }
    for (const p of this.pointers.values()) if (p.zone === (d < 0 ? 'left' : 'right')) return true;
    return false;
  }

  jumpHeld() {
    return this._jumpHeld;
  }

  _computeJumpHeld() {
    if (this.mode !== 'game') return false;
    for (const k of this.keysDown) if (JUMP_KEYS.has(k)) return true;
    for (const p of this.pointers.values()) if (p.zone === 'jump') return true;
    return false;
  }

  _updateJump() {
    const held = this._computeJumpHeld();
    if (held === this._jumpHeld) return;
    this._jumpHeld = held;
    if (held) this.pending.jumpPressed++;
    else {
      this.pending.jumpReleased++;
      this.pending.releaseDir = this.dir(); // direção no instante em que soltou
    }
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    // Toques que já estavam na tela não disparam nada no novo modo.
    for (const p of this.pointers.values()) p.zone = 'ui';
    this._jumpHeld = this._computeJumpHeld();
    this.pending.jumpPressed = 0;
    this.pending.jumpReleased = 0;
  }

  releaseAll() {
    this.pointers.clear();
    this.keysDown.clear();
    this._updateJump();
  }

  /** Entrega e zera os eventos acumulados desde o último passo. */
  consume() {
    const p = this.pending;
    this.pending = this._emptyPending();
    return p;
  }
}

export { LEFT_KEYS, RIGHT_KEYS, JUMP_KEYS };
