import { Preferences } from '@capacitor/preferences';
import { isNative } from './env.js';

const PREFIX = 'mirante.';

/** Armazenamento nativo (Preferences), mais confiável que localStorage no iOS. */
export const preferencesBackend = {
  name: 'preferences',
  async get(key) {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  },
};

export function createLocalStorageBackend(ls = globalThis.localStorage) {
  return {
    name: 'localStorage',
    async get(key) {
      return ls.getItem(key);
    },
    async set(key, value) {
      ls.setItem(key, value);
    },
    async remove(key) {
      ls.removeItem(key);
    },
  };
}

export function createMemoryBackend() {
  const map = new Map();
  return {
    name: 'memory',
    async get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
  };
}

function localStorageUsable() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return false;
    const probe = PREFIX + '__probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function pickBackend() {
  if (isNative) return preferencesBackend;
  if (localStorageUsable()) return createLocalStorageBackend();
  return createMemoryBackend();
}

/**
 * Armazenamento de chave/valor em JSON. Nunca lança exceção: se o backend falhar,
 * o valor fica guardado em memória e o jogo continua funcionando.
 */
export function createStorage(backend = pickBackend()) {
  const memory = createMemoryBackend();

  return {
    get backendName() {
      return backend.name;
    },

    async get(key, fallback = null) {
      try {
        const raw = await backend.get(PREFIX + key);
        if (raw != null) return JSON.parse(raw);
      } catch {
        // backend indisponível ou JSON corrompido: tenta a cópia em memória
      }
      try {
        const raw = await memory.get(PREFIX + key);
        if (raw != null) return JSON.parse(raw);
      } catch {
        // ignora
      }
      return fallback;
    },

    /** Retorna true se gravou no backend persistente. */
    async set(key, value) {
      let raw;
      try {
        raw = JSON.stringify(value);
      } catch {
        return false;
      }
      await memory.set(PREFIX + key, raw);
      try {
        await backend.set(PREFIX + key, raw);
        return true;
      } catch {
        return false;
      }
    },

    async remove(key) {
      await memory.remove(PREFIX + key);
      try {
        await backend.remove(PREFIX + key);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export const Storage = createStorage();
