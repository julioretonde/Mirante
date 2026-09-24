// =============================================================================
//  Vibração curta na aterrissagem pesada.
//  - No navegador: navigator.vibrate (Android/Chrome; o iOS Safari não tem).
//  - No app nativo (Capacitor): plugin Haptics, que funciona também no iPhone.
// =============================================================================

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function vibrate(ms = 50) {
  if (isNativeApp()) {
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    return;
  }
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch {
    /* sem vibração disponível */
  }
}
