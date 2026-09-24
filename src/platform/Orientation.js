import { ScreenOrientation } from '@capacitor/screen-orientation';
import { isNative } from './env.js';

/** Trava em paisagem. No navegador só funciona em tela cheia; falhar é normal. */
export const Orientation = {
  async lockLandscape() {
    try {
      if (isNative) {
        await ScreenOrientation.lock({ orientation: 'landscape' });
      } else {
        await globalThis.screen?.orientation?.lock?.('landscape');
      }
      return true;
    } catch {
      return false;
    }
  },

  isPortrait() {
    try {
      return globalThis.matchMedia?.('(orientation: portrait)').matches ?? false;
    } catch {
      return false;
    }
  },
};
