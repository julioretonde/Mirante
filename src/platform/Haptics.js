import { Haptics as NativeHaptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from './env.js';

const IMPACT = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};
const WEB_MS = { light: 10, medium: 20, heavy: 35 };

let enabled = true;

/** Vibração sempre via plugin no app (navigator.vibrate não existe no iOS). */
export const Haptics = {
  setEnabled(value) {
    enabled = !!value;
  },

  get enabled() {
    return enabled;
  },

  impact(strength = 'light') {
    if (!enabled) return;
    try {
      if (isNative) {
        NativeHaptics.impact({ style: IMPACT[strength] ?? ImpactStyle.Light }).catch(() => {});
      } else {
        globalThis.navigator?.vibrate?.(WEB_MS[strength] ?? 10);
      }
    } catch {
      // vibração é opcional
    }
  },
};
