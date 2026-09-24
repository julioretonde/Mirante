import { describe, it, expect } from 'vitest';
import { createStorage, createMemoryBackend, createLocalStorageBackend } from '../src/platform/Storage.js';

function fakeLocalStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}

const failingBackend = {
  name: 'failing',
  get: async () => {
    throw new Error('indisponível');
  },
  set: async () => {
    throw new Error('indisponível');
  },
  remove: async () => {
    throw new Error('indisponível');
  },
};

describe('Storage', () => {
  it('grava e lê JSON', async () => {
    const s = createStorage(createMemoryBackend());
    expect(await s.set('save', { zone: 2, notes: [1, 5] })).toBe(true);
    expect(await s.get('save')).toEqual({ zone: 2, notes: [1, 5] });
  });

  it('devolve o fallback para chaves ausentes', async () => {
    const s = createStorage(createMemoryBackend());
    expect(await s.get('nada', 42)).toBe(42);
  });

  it('usa prefixo no localStorage', async () => {
    const ls = fakeLocalStorage();
    const s = createStorage(createLocalStorageBackend(ls));
    await s.set('launches', 3);
    expect(ls.map.get('mirante.launches')).toBe('3');
    expect(await s.get('launches')).toBe(3);
  });

  it('remove chaves', async () => {
    const s = createStorage(createMemoryBackend());
    await s.set('x', 1);
    await s.remove('x');
    expect(await s.get('x', null)).toBe(null);
  });

  it('não lança exceção se o backend falhar e mantém o valor na sessão', async () => {
    const s = createStorage(failingBackend);
    expect(await s.set('save', { zone: 1 })).toBe(false);
    expect(await s.get('save')).toEqual({ zone: 1 });
    expect(await s.remove('save')).toBe(false);
  });

  it('ignora JSON corrompido', async () => {
    const ls = fakeLocalStorage();
    ls.setItem('mirante.save', '{quebrado');
    const s = createStorage(createLocalStorageBackend(ls));
    expect(await s.get('save', 'padrão')).toBe('padrão');
  });
});
