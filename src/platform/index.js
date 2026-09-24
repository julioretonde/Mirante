/**
 * Camada de plataforma: único ponto do jogo que conversa com APIs nativas.
 * Tudo aqui tem fallback para o navegador e nunca derruba o jogo se falhar.
 */
import { isNative, platformName } from './env.js';
import { Haptics } from './Haptics.js';
import { Storage } from './Storage.js';
import { Lifecycle } from './Lifecycle.js';
import { Orientation } from './Orientation.js';
import { StatusBar } from './StatusBar.js';
import { KeepAwake } from './KeepAwake.js';

export { isNative, platformName, Haptics, Storage, Lifecycle, Orientation, StatusBar, KeepAwake };

export async function initPlatform() {
  Lifecycle.install();
  await Promise.all([Orientation.lockLandscape(), StatusBar.hide()]);
  // Ao voltar do segundo plano o sistema pode mostrar as barras de novo.
  Lifecycle.onResume(() => StatusBar.hide());
}
