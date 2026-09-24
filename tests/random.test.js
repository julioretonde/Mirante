import { describe, it, expect } from 'vitest';
import { createRandom } from '../src/core/Random.js';

describe('Random', () => {
  it('mesma seed gera a mesma sequência', () => {
    const a = createRandom(123);
    const b = createRandom(123);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });

  it('valores ficam em [0, 1)', () => {
    const r = createRandom(9);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
