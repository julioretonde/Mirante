// =============================================================================
//  Mundo: a torre inteira montada a partir das telas de src/levels
// -----------------------------------------------------------------------------
//  Coordenadas do mundo (em pixels):
//    - x cresce para a direita, de 0 a 176 (22 colunas de 8 px)
//    - y cresce para BAIXO. A linha 0 é o topo da última tela (a mais alta).
//  As telas são numeradas de baixo para cima: tela 0 = a primeira do jogo.
//
//  Este módulo não usa DOM: ele também roda no Node (validador de fases).
// =============================================================================

import { COLS, ROWS_PER_SCREEN, TILE, SCREEN_H, PHYSICS } from '../config.js';
import { SOLID_CHARS, WIND_CHARS, T_EMPTY } from '../levels/legend.js';

export class World {
  /**
   * @param {Array<{name:string, biome:string, map:string[]}>} screens
   *        telas em ordem de baixo para cima (índice 0 = primeira tela).
   */
  constructor(screens) {
    this.screens = screens;
    this.count = screens.length;
    this.cols = COLS;
    this.rows = ROWS_PER_SCREEN * this.count;
    this.width = this.cols * TILE;
    this.height = this.rows * TILE;

    /** Tipo de colisão por tile (0 vazio, 1 sólido, 2 gelo). */
    this.tiles = new Uint8Array(this.cols * this.rows);
    /** Vento por tile (-1, 0, +1). */
    this.wind = new Int8Array(this.cols * this.rows);
    /** Caractere original de cada tile (para o desenho). */
    this.chars = new Array(this.rows);

    this.start = null; // {x, y} posição inicial (canto sup. esq. da caixa)
    this.goal = null; // {x, y, w, h} retângulo da estrela final

    for (let s = 0; s < this.count; s++) {
      const map = screens[s].map;
      const baseRow = this.screenTopRow(s);
      for (let r = 0; r < ROWS_PER_SCREEN; r++) {
        const line = map[r] || '';
        const row = baseRow + r;
        this.chars[row] = line;
        for (let c = 0; c < this.cols; c++) {
          const ch = line[c] || '.';
          const i = row * this.cols + c;
          const solid = SOLID_CHARS[ch];
          if (solid !== undefined) this.tiles[i] = solid;
          const w = WIND_CHARS[ch];
          if (w !== undefined) this.wind[i] = w;
          if (ch === 'P' && !this.start) {
            this.start = {
              x: c * TILE + TILE / 2 - PHYSICS.PLAYER_W / 2,
              y: (row + 1) * TILE - PHYSICS.PLAYER_H,
            };
          }
          if (ch === 'G' && !this.goal) {
            this.goal = { x: c * TILE, y: row * TILE, w: 16, h: 16 };
          }
        }
      }
    }
    if (!this.start) {
      // Sem 'P': começa no centro do chão da primeira tela.
      this.start = { x: this.width / 2 - PHYSICS.PLAYER_W / 2, y: this.height - TILE - PHYSICS.PLAYER_H };
    }
  }

  /** Linha (do mundo) do topo da tela s. */
  screenTopRow(s) {
    return (this.count - 1 - s) * ROWS_PER_SCREEN;
  }

  /** y (px) do topo da tela s. */
  screenTopY(s) {
    return this.screenTopRow(s) * TILE;
  }

  /** Índice da tela que contém a coordenada y (limitado ao mundo). */
  screenAtY(y) {
    const s = this.count - 1 - Math.floor(y / SCREEN_H);
    return s < 0 ? 0 : s >= this.count ? this.count - 1 : s;
  }

  /** Tela de um tile pela linha. */
  screenAtRow(r) {
    return this.screenAtY(r * TILE);
  }

  /** Bioma da tela s. */
  biomeOf(s) {
    return this.screens[s].biome;
  }

  /** Fora do mundo conta como sólido (paredes da torre, teto e chão). */
  tileAt(c, r) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return 1;
    return this.tiles[r * this.cols + c];
  }

  isSolid(c, r) {
    return this.tileAt(c, r) !== T_EMPTY;
  }

  charAt(c, r) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return '#';
    const line = this.chars[r];
    return (line && line[c]) || '.';
  }

  windAtTile(c, r) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return 0;
    return this.wind[r * this.cols + c];
  }

  /**
   * Posição de "teleporte" de uma tela (usada no modo debug): o primeiro
   * espaço livre sobre um chão, procurando de baixo para cima e do centro
   * para as bordas.
   */
  spawnPointFor(s) {
    const top = this.screenTopRow(s);
    const order = [];
    for (let d = 0; d < this.cols; d++) {
      const c = (this.cols >> 1) + (d % 2 === 0 ? d / 2 : -(d + 1) / 2);
      if (c >= 0 && c < this.cols) order.push(c);
    }
    for (let r = top + ROWS_PER_SCREEN - 1; r > top + 2; r--) {
      for (const c of order) {
        if (c + 1 >= this.cols) continue;
        const floor = this.isSolid(c, r) && this.isSolid(c + 1, r);
        if (!floor) continue;
        let free = true;
        for (let rr = r - 2; rr < r && free; rr++) {
          if (this.isSolid(c, rr) || this.isSolid(c + 1, rr)) free = false;
        }
        if (free) {
          return { x: c * TILE + TILE - PHYSICS.PLAYER_W / 2, y: r * TILE - PHYSICS.PLAYER_H };
        }
      }
    }
    return { x: this.width / 2, y: this.screenTopY(s) + 100 };
  }
}
