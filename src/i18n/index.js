import ptBR from './pt-BR.js';
import en from './en.js';

export const DEFAULT_LANGUAGE = 'pt-BR';
export const dictionaries = { 'pt-BR': ptBR, en };
export const languages = Object.keys(dictionaries);

let current = DEFAULT_LANGUAGE;

/** Português para qualquer variante "pt"; inglês para os demais idiomas. */
export function detectLanguage(preferred = globalThis.navigator?.languages ?? [globalThis.navigator?.language]) {
  const list = (Array.isArray(preferred) ? preferred : [preferred]).filter(Boolean);
  if (list.length === 0) return DEFAULT_LANGUAGE;
  return list[0].toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export function setLanguage(lang) {
  current = dictionaries[lang] ? lang : DEFAULT_LANGUAGE;
  if (typeof document !== 'undefined') document.documentElement.lang = current;
  return current;
}

export function getLanguage() {
  return current;
}

/** t('chave', { nome: 'Ana' }) substitui {nome} no texto. */
export function t(key, params) {
  const text = dictionaries[current][key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}
