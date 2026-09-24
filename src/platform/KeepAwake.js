import { KeepAwake as NativeKeepAwake } from '@capacitor-community/keep-awake';
import { isNative } from './env.js';

let wakeLock = null;
let wanted = false;

async function requestWebLock() {
  try {
    if (!wanted || wakeLock || !globalThis.navigator?.wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener?.('release', () => {
      wakeLock = null;
    });
  } catch {
    wakeLock = null;
  }
}

if (!isNative && typeof document !== 'undefined') {
  // O navegador solta o wake lock quando a aba some; pede de novo ao voltar.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestWebLock();
  });
}

/** Mantém a tela ligada durante o gameplay (não nos menus). */
export const KeepAwake = {
  async enable() {
    wanted = true;
    try {
      if (isNative) await NativeKeepAwake.keepAwake();
      else await requestWebLock();
    } catch {
      // opcional
    }
  },

  async disable() {
    wanted = false;
    try {
      if (isNative) await NativeKeepAwake.allowSleep();
      else if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch {
      // opcional
    }
  },
};
