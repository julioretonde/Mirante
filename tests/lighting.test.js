import { describe, it, expect } from 'vitest';
import { KEYFRAMES, sampleProfile } from '../src/world/LightingProfile.js';

describe('Luz progressiva por altura (GDD §3)', () => {
  it('cobre as 6 faixas do GDD, em ordem', () => {
    expect(KEYFRAMES.map((k) => k.name)).toEqual(['fimDeTarde', 'horaDourada', 'porDoSol', 'ultimoSol', 'crepusculo', 'noite']);
    const bands = [
      [0, 60],
      [60, 160],
      [160, 320],
      [320, 420],
      [420, 520],
      [520, 600],
    ];
    KEYFRAMES.forEach((k, i) => {
      expect(k.height).toBeGreaterThanOrEqual(bands[i][0]);
      expect(k.height).toBeLessThanOrEqual(bands[i][1]);
    });
  });

  it('usa a luz principal da tabela do GDD no meio de cada faixa', () => {
    expect(sampleProfile(30).light.getHexString()).toBe('ffd29a');
    expect(sampleProfile(110).light.getHexString()).toBe('ffb070');
    expect(sampleProfile(240).light.getHexString()).toBe('ff8f7a');
  });

  it('fica constante fora dos extremos', () => {
    expect(sampleProfile(-50).skyTop.equals(sampleProfile(30).skyTop)).toBe(true);
    expect(sampleProfile(700).skyTop.equals(sampleProfile(560).skyTop)).toBe(true);
  });

  it('escurece e acende as janelas conforme sobe', () => {
    let lastStars = -1;
    let lastWindows = -1;
    for (let h = 0; h <= 600; h += 10) {
      const p = sampleProfile(h);
      expect(p.stars).toBeGreaterThanOrEqual(lastStars);
      expect(p.windows).toBeGreaterThanOrEqual(lastWindows);
      lastStars = p.stars;
      lastWindows = p.windows;
    }
    expect(sampleProfile(0).stars).toBe(0);
    expect(sampleProfile(600).stars).toBe(1);
  });

  it('muda suavemente (sem saltos entre alturas próximas)', () => {
    for (let h = 0; h < 600; h += 1) {
      const a = sampleProfile(h);
      const b = sampleProfile(h + 1);
      expect(Math.abs(a.lightIntensity - b.lightIntensity)).toBeLessThan(0.05);
      expect(Math.abs(a.skyTop.r - b.skyTop.r)).toBeLessThan(0.03);
    }
  });
});
