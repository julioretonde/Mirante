import './debug.css';
import { t, getLanguage } from '../i18n/index.js';
import { Haptics, Storage, platformName } from '../platform/index.js';

/**
 * Painel de debug (só em builds de desenvolvimento).
 * Abre com ?debug=1 na URL ou toque triplo no canto superior esquerdo.
 */
export function installDebugPanel({ game, launches }) {
  const ui = document.getElementById('ui');

  const panel = document.createElement('div');
  panel.className = 'debug-panel paper';
  panel.hidden = true;
  panel.innerHTML = `
    <h2></h2>
    <dl>
      <dt data-l="debug.fps"></dt><dd data-v="fps">–</dd>
      <dt data-l="debug.drawCalls"></dt><dd data-v="calls">–</dd>
      <dt data-l="debug.platform"></dt><dd data-v="platform"></dd>
      <dt data-l="debug.storage"></dt><dd data-v="storage"></dd>
      <dt data-l="debug.language"></dt><dd data-v="lang"></dd>
      <dt data-l="debug.launches"></dt><dd data-v="launches"></dd>
    </dl>
    <div class="actions">
      <button class="lantern-btn" data-action="vibrate"></button>
      <button class="lantern-btn" data-action="close"></button>
    </div>`;
  panel.querySelector('h2').textContent = t('debug.title');
  panel.querySelectorAll('[data-l]').forEach((el) => (el.textContent = t(el.dataset.l)));
  panel.querySelector('[data-action="vibrate"]').textContent = t('debug.vibrate');
  panel.querySelector('[data-action="close"]').textContent = t('debug.close');
  const v = (name) => panel.querySelector(`[data-v="${name}"]`);
  v('platform').textContent = platformName;
  v('storage').textContent = Storage.backendName;
  v('lang').textContent = getLanguage();
  v('launches').textContent = String(launches);

  panel.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'vibrate') Haptics.impact('medium');
    if (action === 'close') panel.hidden = true;
  });

  const hotspot = document.createElement('div');
  hotspot.className = 'debug-hotspot';
  let taps = [];
  hotspot.addEventListener('pointerdown', (e) => {
    const now = e.timeStamp;
    taps = taps.filter((ts) => now - ts < 600);
    taps.push(now);
    if (taps.length >= 3) {
      taps = [];
      panel.hidden = !panel.hidden;
    }
  });

  ui.append(hotspot, panel);

  let acc = 0;
  game.events.on('frame', ({ dt }) => {
    acc += dt;
    if (panel.hidden || acc < 0.5) return;
    acc = 0;
    v('fps').textContent = game.fps.toFixed(0);
    v('calls').textContent = String(game.renderer.info.render.calls);
  });

  if (new URLSearchParams(location.search).get('debug') === '1') panel.hidden = false;
}
