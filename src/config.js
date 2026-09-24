// =============================================================================
//  ASCENDA — configuração central
// -----------------------------------------------------------------------------
//  Todas as constantes de física ficam aqui. As unidades são sempre:
//    - distância  : pixels da resolução interna (180x320)
//    - tempo      : frames da simulação (1 frame = 1/60 s, timestep fixo)
//    - velocidade : pixels por frame
//    - aceleração : pixels por frame²
//
//  A simulação roda SEMPRE a 60 Hz, independentemente da taxa de quadros da
//  tela, por isso um mesmo pulo (mesma carga + mesma direção + mesma posição)
//  produz exatamente a mesma trajetória em qualquer aparelho.
//
//  Dica: valores "diádicos" (0.5, 0.25, 0.0625...) mantêm as posições exatas
//  em ponto flutuante, o que deixa o validador de fases (npm run
//  validate-levels) mais rápido e preciso. Depois de mudar qualquer valor,
//  rode o validador para garantir que todas as telas continuam possíveis.
// =============================================================================

export const PHYSICS = Object.freeze({
  /** Aceleração da gravidade (px/frame²). */
  GRAVITY: 0.3125,
  /** Velocidade máxima de queda (px/frame). */
  MAX_FALL_SPEED: 10,

  /** Força (velocidade vertical inicial) do pulo com carga mínima (px/frame). */
  JUMP_MIN_SPEED: 3,
  /** Força do pulo com carga máxima (px/frame). */
  JUMP_MAX_SPEED: 8.5,
  /** Velocidade horizontal de um pulo para a esquerda/direita (px/frame). */
  JUMP_HORIZONTAL_SPEED: 2,
  /**
   * Tempo de carga até a força máxima, em frames (36 frames = 0,6 s).
   * A força cresce linearmente com o tempo segurado. Ao atingir este valor o
   * personagem pula sozinho.
   */
  CHARGE_FRAMES: 36,

  /** Fração da velocidade horizontal mantida (e invertida) ao bater numa parede. */
  WALL_BOUNCE: 0.5,

  /** Velocidade de caminhada no chão normal (px/frame). */
  WALK_SPEED: 1,

  /** Gelo: aceleração ao andar, atrito ao soltar e velocidade máxima andando. */
  ICE_ACCEL: 0.0625,
  ICE_FRICTION: 0.0625,
  ICE_WALK_SPEED: 1,

  /** Vento: aceleração lateral enquanto estiver no ar dentro da zona. */
  WIND_ACCEL: 0.0625,
  /** Velocidade horizontal máxima que o vento consegue impor. */
  WIND_MAX_SPEED: 3,

  /** Altura de queda (px) a partir da qual o personagem cai "estatelado". */
  SPLAT_HEIGHT: 200,
  /** Duração do "splat" (frames): o personagem fica caído por 1 segundo. */
  SPLAT_FRAMES: 60,
  /** Duração da animação de aterrissagem normal (frames, só visual). */
  LAND_FRAMES: 8,

  /**
   * Tamanho máximo de cada sub-passo de movimento (px). O movimento de cada
   * frame é subdividido para nunca "atravessar" um tile (anti-túnel).
   * Precisa ser menor que o tamanho do tile.
   */
  MAX_SUBSTEP: 4,

  /** Caixa de colisão do personagem (px). O sprite tem 16x16. */
  PLAYER_W: 10,
  PLAYER_H: 14,

  /**
   * Janela (em frames) em que apertar o pulo pouco antes de aterrissar ainda
   * conta: a carga começa assim que o personagem toca o chão.
   */
  JUMP_BUFFER_FRAMES: 6,
});

/** Frequência fixa da simulação. */
export const SIM_HZ = 60;
export const STEP_MS = 1000 / SIM_HZ;

/** Resolução interna (retrato). */
export const VIEW_W = 180;
export const VIEW_H = 320;

/** Tiles de 8x8. Cada tela tem 22 colunas x 40 linhas de tiles. */
export const TILE = 8;
export const COLS = 22;
export const ROWS_PER_SCREEN = 40;
export const SCREEN_H = ROWS_PER_SCREEN * TILE; // 320
/**
 * A grade de 22 colunas ocupa 176 px; sobram 2 px de cada lado da tela, que
 * são desenhados como a parede externa da torre.
 */
export const WORLD_X_OFFSET = 2;

/** Chave usada no localStorage. */
export const SAVE_KEY = 'ascenda.save.v1';
export const SETTINGS_KEY = 'ascenda.settings.v1';
