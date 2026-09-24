import './debug.css';
import { t, getLanguage } from '../i18n/index.js';
import { Haptics, Storage, platformName } from '../platform/index.js';
import { VIEW_ORDER } from '../camera/ShowcaseCamera.js';

/**
 * Painel de debug (só em builds de desenvolvimento).
 * Abre com ?debug=1 na URL ou toque triplo no canto superior esquerdo.
 * URL também aceita ?view=rua|telhados|aerea|vidro|jardins|topo e ?height=0..600.
 */
export function installDebugPanel({ game, world, showcase, launches }) {
  const ui = document.getElementById('ui');

  const panel = document.createElement('div');
  panel.className = 'debug-panel paper';
  panel.hidden = true;
  panel.innerHTML = `
    <h2></h2>
    <dl>
      <dt data-l="debug.fps"></dt><dd data-v="fps">–</dd>
      <dt data-l="debug.drawCalls"></dt><dd data-v="calls">–</dd>
      <dt data-l="debug.triangles"></dt><dd data-v="tris">–</dd>
      <dt data-l="debug.height"></dt><dd data-v="height">–</dd>
    </dl>
    <p class="debug-info" data-v="info"></p>
    <label class="debug-slider">
      <span data-l="debug.lightHeight"></span>
      <input type="range" min="0" max="600" step="5" value="0" />
      <button class="lantern-btn" data-action="auto"></button>
    </label>
    <div class="debug-views"></div>
    <div class="actions">
      <button class="lantern-btn" data-action="vibrate"></button>
      <button class="lantern-btn" data-action="close"></button>
    </div>`;
  panel.querySelector('h2').textContent = t('debug.title');
  panel.querySelectorAll('[data-l]').forEach((el) => (el.textContent = t(el.dataset.l)));
  panel.querySelector('[data-action="vibrate"]').textContent = t('debug.vibrate');
  panel.querySelector('[data-action="close"]').textContent = t('debug.close');
  panel.querySelector('[data-action="auto"]').textContent = t('debug.auto');
  const v = (name) => panel.querySelector(`[data-v="${name}"]`);
  v('info').textContent = `${platformName} · ${Storage.backendName} · ${getLanguage()} · ${t('debug.launches')}: ${launches}`;

  const views = panel.querySelector('.debug-views');
  for (const name of VIEW_ORDER) {
    const b = document.createElement('button');
    b.className = 'lantern-btn';
    b.dataset.view = name;
    b.textContent = t(`view.${name}`);
    views.appendChild(b);
  }

  const slider = panel.querySelector('input[type="range"]');
  slider.addEventListener('input', () => world.setReferenceHeight(Number(slider.value)));
  panel.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    if (target.dataset.view) showcase.goTo(target.dataset.view);
    const action = target.dataset.action;
    if (action === 'vibrate') Haptics.impact('medium');
    if (action === 'close') panel.hidden = true;
    if (action === 'auto') world.setReferenceHeight(null);
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
    const info = game.renderer.info.render;
    v('fps').textContent = game.fps.toFixed(0);
    v('calls').textContent = String(info.calls);
    v('tris').textContent = `${(info.triangles / 1000).toFixed(0)}k`;
    v('height').textContent = `${world.lightHeight.toFixed(0)} m`;
    if (world.referenceHeight == null) slider.value = String(Math.round(world.lightHeight));
  });

  const params = new URLSearchParams(location.search);
  if (params.get('debug') === '1') panel.hidden = false;
  if (params.has('view')) showcase.goTo(params.get('view'), { instant: true });
  if (params.has('height')) {
    world.setReferenceHeight(Number(params.get('height')));
    slider.value = params.get('height');
  }
}
