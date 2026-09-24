import { describe, it, expect, afterEach } from 'vitest';
import { dictionaries, detectLanguage, setLanguage, t, DEFAULT_LANGUAGE } from '../src/i18n/index.js';

afterEach(() => setLanguage(DEFAULT_LANGUAGE));

describe('i18n', () => {
  it('pt-BR e en têm exatamente as mesmas chaves', () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries['pt-BR']).sort());
  });

  it('nenhum texto vazio', () => {
    for (const dict of Object.values(dictionaries)) {
      for (const value of Object.values(dict)) expect(value.trim()).not.toBe('');
    }
  });

  it('detecta português e usa inglês para os demais idiomas', () => {
    expect(detectLanguage(['pt-BR'])).toBe('pt-BR');
    expect(detectLanguage(['pt-PT', 'en'])).toBe('pt-BR');
    expect(detectLanguage(['en-US'])).toBe('en');
    expect(detectLanguage(['es-ES'])).toBe('en');
    expect(detectLanguage([])).toBe('pt-BR');
  });

  it('traduz, interpola e cai para a chave se não existir', () => {
    setLanguage('en');
    expect(t('common.yes')).toBe('Yes');
    setLanguage('pt-BR');
    expect(t('common.yes')).toBe('Sim');
    expect(t('chave.inexistente')).toBe('chave.inexistente');
  });

  it('idioma desconhecido volta ao padrão', () => {
    expect(setLanguage('fr')).toBe('pt-BR');
  });
});
