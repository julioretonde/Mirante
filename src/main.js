import { initPlatform, isNative, Lifecycle, KeepAwake, Storage } from './platform/index.js';
import { detectLanguage, setLanguage, t } from './i18n/index.js';
import { Game } from './core/Game.js';
import { detectQuality } from './core/Quality.js';
import { World } from './world/World.js';
import { ShowcaseCamera } from './camera/ShowcaseCamera.js';
import { Dialog } from './ui/Dialog.js';
import { PauseVeil } from './ui/PauseVeil.js';

function blockBrowserGestures() {
  const prevent = (e) => e.preventDefault();
  // Zoom de pinça do Safari, menu de toque longo e duplo toque
  for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'contextmenu', 'dblclick']) {
    document.addEventListener(type, prevent, { passive: false });
  }
  document.addEventListener('touchmove', prevent, { passive: false });
}

function mountRotateHint(ui) {
  if (isNative) return; // no app a orientação já é travada em paisagem
  const hint = document.createElement('div');
  hint.className = 'rotate-hint enabled';
  hint.textContent = t('rotate.hint');
  ui.appendChild(hint);
}

async function main() {
  blockBrowserGestures();
  setLanguage(detectLanguage());

  const ui = document.getElementById('ui');
  mountRotateHint(ui);

  await initPlatform();

  const launches = (await Storage.get('launches', 0)) + 1;
  await Storage.set('launches', launches);

  const canvas = document.getElementById('game');
  const game = new Game(canvas, detectQuality({ isNative }));
  const world = new World(game);
  game.setWorld(world);
  const showcase = new ShowcaseCamera(game.camera, canvas);
  game.systems.push(showcase);

  const resumeGame = () => {
    pauseVeil.hide();
    game.resume();
    KeepAwake.enable();
  };
  const pauseVeil = new PauseVeil(resumeGame);
  pauseVeil.mount(ui);

  game.start();
  KeepAwake.enable();

  // Segundo plano / interrupções: pausa, salva e libera a tela.
  // Ao voltar, o jogo fica pausado até o próximo toque.
  Lifecycle.onPause(() => {
    game.pause();
    KeepAwake.disable();
    pauseVeil.show();
    Storage.set('lastPausedAt', Date.now());
  });

  // Botão voltar do Android (Esc no navegador). Por enquanto a cena é a "tela inicial".
  Lifecycle.onBack(async () => {
    if (Dialog.isOpen) return Dialog.close(false);
    if (pauseVeil.visible) return resumeGame();
    if (await Dialog.confirm(t('exit.confirm'))) Lifecycle.exitApp();
  });

  if (__MIRANTE_DEBUG__) {
    const { installDebugPanel } = await import('./debug/DebugPanel.js');
    installDebugPanel({ game, world, showcase, launches });
    window.__mirante = { game, world, showcase };
  }

  document.documentElement.dataset.ready = 'true';
}

main().catch((err) => {
  console.error('[Mirante] falha ao iniciar', err);
});
