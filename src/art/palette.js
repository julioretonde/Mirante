// =============================================================================
//  Paleta do jogo — 32 cores (máximo permitido)
// -----------------------------------------------------------------------------
//  Todas as matrizes de pixels em src/art usam UM caractere por pixel, que é o
//  índice da cor nesta paleta escrito em base 32:
//
//     .  transparente
//     0 tinta      1 noite      2 crepúsculo 3 ardósia   4 pedra     5 névoa
//     6 neve       7 casca esc. 8 casca      9 madeira   a areia
//     b vinho      c carmim     d escarlate  e brasa     f ouro
//     g pinho esc. h pinho      i folha      j lima
//     k marinho    l azul prof. m azul       n céu       o gelo
//     p petróleo   q turquesa   r menta
//     s violeta e. t violeta    u orquídea   v pêssego
// =============================================================================

export const PALETTE = [
  '#120e1c', // 0 tinta (contorno)
  '#231c33', // 1 noite
  '#3a3052', // 2 crepúsculo
  '#5a5173', // 3 ardósia
  '#8a82a0', // 4 pedra
  '#c1bcd3', // 5 névoa
  '#f4f1e8', // 6 neve
  '#3b2426', // 7 casca escura
  '#6b4131', // 8 casca
  '#a56a40', // 9 madeira
  '#deaf74', // a areia
  '#5d1b30', // b vinho
  '#a3263c', // c carmim (capa)
  '#e0503f', // d escarlate
  '#f2913f', // e brasa
  '#fbd55c', // f ouro
  '#173427', // g pinho escuro
  '#27593a', // h pinho
  '#45914a', // i folha
  '#9ccb5b', // j lima
  '#16264a', // k marinho
  '#244580', // l azul profundo
  '#3b7dc0', // m azul
  '#72bbe6', // n céu
  '#c2e9f3', // o gelo
  '#1c4a55', // p petróleo
  '#33918a', // q turquesa
  '#80d2b2', // r menta
  '#40245e', // s violeta escuro
  '#794697', // t violeta
  '#c97ac5', // u orquídea
  '#f6b69d', // v pêssego
];

/** Nomes -> índices, para usar em código. */
export const C = Object.freeze({
  INK: 0, NIGHT: 1, DUSK: 2, SLATE: 3, STONE: 4, MIST: 5, SNOW: 6,
  BARK_DK: 7, BARK: 8, WOOD: 9, SAND: 10,
  WINE: 11, CRIMSON: 12, SCARLET: 13, EMBER: 14, GOLD: 15,
  PINE_DK: 16, PINE: 17, LEAF: 18, LIME: 19,
  NAVY: 20, DEEP_BLUE: 21, BLUE: 22, SKY: 23, ICE: 24,
  TEAL_DK: 25, TEAL: 26, MINT: 27,
  VIOLET_DK: 28, VIOLET: 29, ORCHID: 30, PEACH: 31,
});

/** Converte o caractere da matriz em índice (-1 = transparente). */
export function codeToIndex(ch) {
  if (ch === '.' || ch === ' ') return -1;
  const n = parseInt(ch, 32);
  return Number.isNaN(n) ? -1 : n;
}

/** '#rrggbb' -> [r, g, b] */
export function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export const PALETTE_RGB = PALETTE.map(hexToRgb);
