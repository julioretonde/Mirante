import { describe, it, expect } from 'vitest';
import { QUALITY, detectQuality } from '../src/core/Quality.js';

describe('Presets de qualidade (GDD §2)', () => {
  it('tem Baixa, Média e Alta; só a Alta usa pós-processamento', () => {
    expect(Object.keys(QUALITY)).toEqual(['baixa', 'media', 'alta']);
    expect(QUALITY.alta.post).toBe(true);
    expect(QUALITY.media.post).toBe(false);
    expect(QUALITY.baixa.post).toBe(false);
  });

  it('nunca passa de DPR 2 nem de sombra 2048', () => {
    for (const q of Object.values(QUALITY)) {
      expect(q.dpr).toBeLessThanOrEqual(2);
      expect(q.shadowMapSize).toBeLessThanOrEqual(2048);
    }
  });

  it('app nativo começa na Média; ?quality= força um preset', () => {
    expect(detectQuality({ isNative: true, search: '' }).name).toBe('media');
    expect(detectQuality({ isNative: true, search: '?quality=baixa' }).name).toBe('baixa');
    expect(detectQuality({ isNative: false, search: '?quality=invalida' }).name).not.toBe('invalida');
  });
});
