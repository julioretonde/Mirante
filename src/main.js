// =============================================================================
//  ASCENDA — ponto de entrada
// =============================================================================

import { Display } from './core/display.js';
import { Input } from './core/input.js';
import { Loop } from './core/loop.js';
import { AudioEngine } from './audio/audio.js';
import { Game } from './game/game.js';
import { isNativeApp } from './platform/haptics.js';

/* global __APP_VERSION__, __SINGLE_FILE__ */
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? 'v' + __APP_VERSION__ : '';
const SINGLE_FILE = typeof __SINGLE_FILE__ !== 'undefined' && __SINGLE_FILE__;

function boot() {
  const canvas = document.getElementById('game');
  const params = new URLSearchParams(location.search);
  const debug = params.get('debug') === '1';

  const display = new Display(canvas);
  const input = new Input(display, canvas);
  const audio = new AudioEngine();
  const game = new Game({ display, input, audio, debug, version: VERSION });

  let triedFullscreen = false;
  input.onGesture = (type) => {
    audio.unlock();
    if (audio.ready && game.state === 'title' && !audio.music?.id) audio.playMusic('title');
    // tela cheia só pode ser pedida ao soltar o dedo (ativação do usuário)
    if (!triedFullscreen && type === 'pointerup') {
      triedFullscreen = true;
      tryFullscreen(input);
    }
  };

  document.addEventListener('visibilitychange', () => (document.hidden ? game.onHidden() : game.onVisible()));
  window.addEventListener('pagehide', () => game.save());

  const loop = new Loop(
    () => game.update(),
    (alpha) => {
      game.fps = loop.fps;
      game.render(alpha);
    }
  );
  loop.start();
  canvas.focus();
  // gera os fundos dos outros biomas sem travar o primeiro quadro
  setTimeout(() => game.view.warmup(), 300);

  if (debug) window.ascenda = game; // acesso pelo console no modo debug
}

/** Em celulares (fora do app instalado), tenta tela cheia e retrato. */
function tryFullscreen(input) {
  if (input.lastPointerType !== 'touch' || isNativeApp()) return;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone;
  if (standalone) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.then) {
      p.then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {});
      }).catch(() => {});
    }
  } catch {
    /* sem tela cheia */
  }
}

function registerServiceWorker() {
  if (!import.meta.env.PROD || SINGLE_FILE) return;
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http') || isNativeApp()) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

try {
  boot();
  registerServiceWorker();
} catch (err) {
  console.error(err);
  const el = document.getElementById('boot-error');
  if (el) el.style.display = 'flex';
}
