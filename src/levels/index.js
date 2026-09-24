// =============================================================================
//  Índice das fases: junta as telas de cada bioma, de baixo para cima.
// -----------------------------------------------------------------------------
//  Para criar uma tela nova basta adicionar um objeto { name, map } na lista
//  do bioma desejado (ex.: src/levels/forest.js). A ordem das telas no arquivo
//  é de BAIXO para CIMA. Depois rode `npm run validate-levels`.
// =============================================================================

import { COLS, ROWS_PER_SCREEN } from '../config.js';
import { VALID_CHARS } from './legend.js';
import forest from './forest.js';
import ruins from './ruins.js';
import castle from './castle.js';
import cathedral from './cathedral.js';
import sky from './sky.js';

/** Biomas em ordem de subida. `bar` é a cor das barras laterais da tela. */
export const BIOMES = [
  { id: 'forest', name: 'Floresta Densa', screens: forest },
  { id: 'ruins', name: 'Ruínas Antigas', screens: ruins },
  { id: 'castle', name: 'Muralhas do Castelo', screens: castle },
  { id: 'cathedral', name: 'Catedral da Torre', screens: cathedral },
  { id: 'sky', name: 'Picos Nevados', screens: sky },
];

/** Lista final de telas (índice 0 = primeira tela, embaixo). */
export const SCREENS = BIOMES.flatMap((b) => b.screens.map((s) => ({ ...s, biome: b.id })));

export function biomeInfo(id) {
  return BIOMES.find((b) => b.id === id);
}

/** Confere tamanho e caracteres de todas as telas. Retorna lista de erros. */
export function checkLevelFormat(screens = SCREENS) {
  const errors = [];
  let starts = 0;
  let goals = 0;
  screens.forEach((scr, i) => {
    const tag = `Tela ${i + 1} (${scr.name || 'sem nome'})`;
    if (!Array.isArray(scr.map)) {
      errors.push(`${tag}: campo "map" ausente`);
      return;
    }
    if (scr.map.length !== ROWS_PER_SCREEN) {
      errors.push(`${tag}: tem ${scr.map.length} linhas, esperado ${ROWS_PER_SCREEN}`);
    }
    scr.map.forEach((line, r) => {
      if (line.length !== COLS) {
        errors.push(`${tag}, linha ${r + 1}: tem ${line.length} colunas, esperado ${COLS}`);
      }
      for (const ch of line) {
        if (!VALID_CHARS.includes(ch)) errors.push(`${tag}, linha ${r + 1}: caractere inválido "${ch}"`);
        if (ch === 'P') starts++;
        if (ch === 'G') goals++;
      }
    });
  });
  if (starts !== 1) errors.push(`Deve existir exatamente 1 "P" (início); encontrados ${starts}`);
  if (goals !== 1) errors.push(`Deve existir exatamente 1 "G" (estrela final); encontrados ${goals}`);
  return errors;
}
