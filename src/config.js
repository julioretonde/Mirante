/**
 * Valores de ajuste do jogo. Tudo que for "número mágico" de gameplay ou render mora aqui.
 * Valores de movimentação vêm do GDD §5 (ainda não usados na Etapa 0).
 */
export const config = {
  render: {
    maxPixelRatio: 2,
    fov: 55,
    near: 0.3,
    far: 4000,
    shadowMapSize: 1024,
  },

  world: {
    towerHeight: 600,
    // Torre fica ao norte (−Z); o jogador nasce ao sul, na parte mais baixa.
    towerPosition: [0, 0, -700],
    fogNear: 60,
    fogFar: 900,
  },

  colors: {
    background: '#2b2140',
    // Faixa 0–60 m (fim de tarde), GDD §3
    skyTop: '#8fb4d9',
    skyHorizon: '#ffd3b0',
    skyBottom: '#f3c6a6',
    sun: '#ffd29a',
    sunLight: '#ffd29a',
    hemiSky: '#cfe0f0',
    hemiGround: '#b98a6e',
    // Linguagem visual de escalada
    accent: '#ff9e5e',
    accent2: '#f2c14e',
    secret: '#5ec8c0',
    // Cidade dessaturada
    cream: '#efe3cf',
    terracotta: '#c98b6b',
    sage: '#9fb49a',
    slate: '#8a9bab',
    scarf: '#d8343a',
  },

  player: {
    walkSpeed: 5,
    jumpHeight: 2.2,
    jumpDistance: 4.5,
    coyoteTime: 0.12,
    jumpBuffer: 0.12,
    airControl: 0.6,
    fallGravityMultiplier: 1.6,
    doubleJumpHeight: 1.6,
    glideMaxDistance: 12,
  },

  loop: {
    maxDelta: 0.1,
  },
};
