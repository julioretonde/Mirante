// =============================================================================
//  Legenda dos caracteres usados nos mapas das telas (src/levels/*.js)
// -----------------------------------------------------------------------------
//  Cada tela é uma lista de 40 strings com 22 caracteres cada (tiles 8x8).
//  A primeira string é a linha do TOPO da tela e a última é a linha de BAIXO.
//
//  Sólidos (colidem):
//    #  bloco principal do bioma (terra, pedra, tijolo, alvenaria, rocha)
//    T  bloco secundário (tronco, coluna, pilar, parede de gelo)
//    =  plataforma / beiral (galho, laje, viga de madeira, degrau, beiral)
//    M  chapéu de cogumelo gigante (o caule é desenhado automaticamente)
//    C  nuvem sólida (no céu)
//    I  gelo — sólido e ESCORREGADIO (atrito baixo ao andar e aterrissar)
//
//  Especiais (não colidem):
//    <  zona de vento soprando para a ESQUERDA (só age com o jogador no ar)
//    >  zona de vento soprando para a DIREITA
//    P  posição inicial do jogador (apenas na primeira tela)
//    G  estrela do topo — objetivo final (canto superior esquerdo de 16x16)
//    .  vazio (espaço também vale como vazio)
//
//  Decorações (não colidem, apenas visuais). A letra é interpretada de acordo
//  com o bioma da tela; veja src/art/decor.js:
//    m cogumelo   f samambaia/grama   v cipó/musgo pendurado   l folhagem
//    c coluna ao fundo   r entulho   b estandarte   w janela gótica
//    h corrente   t tocha   g vitral   k sino   n vela   s pingentes de gelo
//    p pinheirinho   x rachadura   o cristais   u bandeirola
// =============================================================================

/** Tipos de colisão guardados na grade do mundo. */
export const T_EMPTY = 0;
export const T_SOLID = 1;
export const T_ICE = 2;

/** Caractere -> tipo de colisão. */
export const SOLID_CHARS = Object.freeze({
  '#': T_SOLID,
  T: T_SOLID,
  '=': T_SOLID,
  M: T_SOLID,
  C: T_SOLID,
  I: T_ICE,
});

/** Caractere -> direção do vento (-1 esquerda, +1 direita). */
export const WIND_CHARS = Object.freeze({ '<': -1, '>': 1 });

/** Caracteres que valem como espaço vazio (sem decoração). */
export const EMPTY_CHARS = '. ';

/** Todos os caracteres válidos em um mapa. */
export const VALID_CHARS = '.# T=MCI<>PGmfvlcrbwhtgknspxou';

export function isSolidChar(ch) {
  return SOLID_CHARS[ch] !== undefined;
}
