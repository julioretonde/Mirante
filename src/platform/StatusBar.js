import { SystemBars } from '@capacitor/core';
import { StatusBar as NativeStatusBar } from '@capacitor/status-bar';
import { isNative, platformName } from './env.js';

/**
 * Modo imersivo: esconde barra de status (e, no Android, a de navegação).
 * No Android, MainActivity também reaplica o modo ao recuperar o foco.
 */
export const StatusBar = {
  async hide() {
    if (!isNative) return;
    try {
      await SystemBars.hide();
    } catch {
      // indisponível em versões antigas do WebView
    }
    if (platformName === 'ios') {
      try {
        await NativeStatusBar.hide();
      } catch {
        // ignora
      }
    }
  },
};
