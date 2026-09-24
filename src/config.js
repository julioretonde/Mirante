/**
 * Valores de ajuste do jogo. Tudo que for "número mágico" de gameplay ou render mora aqui.
 * Coordenadas: +X leste, −Z norte, Y altitude em metros (0 = rua onde o jogador nasce).
 */
export const config = {
  render: {
    maxPixelRatio: 2,
    fov: 55,
    near: 0.5,
    far: 5000,
    shadowMapSize: 1024,
    shadowBox: 70, // meia-largura da caixa de sombra que segue a câmera/jogador
  },

  world: {
    seed: 1987,
    citySize: 800, // cidade ocupa [-400, 400] em X e Z
    chunkSize: 100,
    lodDistance: 270, // além disso, cada bloco da cidade usa a versão simplificada
    spawn: [0, 0, 340],
    towerPosition: [0, -320], // X, Z (a base fica no ponto mais alto do vale)
    towerBaseAltitude: 40,
    summitAltitude: 600, // mirante no topo da torre
    antennaTop: 640,
    maxBuildingHeight: 225, // segundo prédio mais alto ≈ 600/2,5 (GDD §3)
    towerPlazaRadius: 85,
    routeHalfWidth: 8,
    fogNear: 140,
    fogFar: 1500,
    towerFogScale: 0.3, // torre recebe só 30% do fog para nunca sumir
  },

  colors: {
    background: '#2b2140',
    // Linguagem visual de escalada (GDD §3)
    accent: '#ff9e5e',
    accent2: '#f2c14e',
    secret: '#5ec8c0',
    scarf: '#d8343a',
    windowGlow: '#ffc977',
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

  camera: {
    showcaseHold: 14, // segundos em cada vista da câmera de vitrine
    showcaseBlend: 3.5,
    idleResume: 10, // volta ao modo automático após N s sem toque
  },

  loop: {
    maxDelta: 0.1,
  },
};
