// =============================================================================
//  Salvamento automático no localStorage (posição, tempo, pulos e quedas) e
//  preferências (som, HUD, recorde). Tudo protegido com try/catch: em modo
//  privado ou com o armazenamento bloqueado o jogo continua funcionando.
// =============================================================================

import { SAVE_KEY, SETTINGS_KEY } from '../config.js';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  const s = read(SAVE_KEY);
  if (!s || s.v !== 1 || !s.body) return null;
  return s;
}

export function saveGame(data) {
  return write(SAVE_KEY, { v: 1, ...data, savedAt: Date.now() });
}

export function clearGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignora */
  }
}

const DEFAULT_SETTINGS = { muted: false, hud: true, best: null };

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(read(SETTINGS_KEY) || {}) };
}

export function saveSettings(s) {
  write(SETTINGS_KEY, s);
}
