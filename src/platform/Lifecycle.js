import { App } from '@capacitor/app';
import { isNative } from './env.js';

const pauseListeners = new Set();
const resumeListeners = new Set();
const backListeners = new Set();
let active = true;

function emitPause() {
  if (!active) return;
  active = false;
  for (const fn of pauseListeners) safeCall(fn);
}

function emitResume() {
  if (active) return;
  active = true;
  for (const fn of resumeListeners) safeCall(fn);
}

function emitBack() {
  for (const fn of backListeners) safeCall(fn);
}

function safeCall(fn) {
  try {
    fn();
  } catch (err) {
    console.error('[Lifecycle]', err);
  }
}

let installed = false;

/**
 * Ciclo de vida do app. No nativo, appStateChange cobre segundo plano e interrupções
 * (ligações, alarmes). No navegador, usa visibilitychange e Esc como "voltar".
 */
function install() {
  if (installed) return;
  installed = true;

  if (isNative) {
    try {
      App.addListener('appStateChange', ({ isActive }) => (isActive ? emitResume() : emitPause()));
      App.addListener('pause', emitPause);
      App.addListener('resume', emitResume);
      App.addListener('backButton', emitBack);
    } catch (err) {
      console.error('[Lifecycle] listeners nativos indisponíveis', err);
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () =>
      document.visibilityState === 'hidden' ? emitPause() : emitResume(),
    );
    window.addEventListener('pagehide', emitPause);
    if (!isNative) {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') emitBack();
      });
    }
  }
}

function subscribe(set, fn) {
  install();
  set.add(fn);
  return () => set.delete(fn);
}

export const Lifecycle = {
  install,
  onPause: (fn) => subscribe(pauseListeners, fn),
  onResume: (fn) => subscribe(resumeListeners, fn),
  onBack: (fn) => subscribe(backListeners, fn),
  get isActive() {
    return active;
  },
  async exitApp() {
    if (!isNative) return;
    try {
      await App.exitApp();
    } catch {
      // iOS não permite sair programaticamente; ignorar
    }
  },
};
