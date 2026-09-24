// =============================================================================
//  O jogo: máquina de estados (título, jogando, pausa, final...), ligação entre
//  física, desenho, som, partículas, salvamento e modo debug.
// =============================================================================

import { PHYSICS as P, VIEW_W, VIEW_H, WORLD_X_OFFSET } from '../config.js';
import { SCREENS, BIOMES } from '../levels/index.js';
import { PALETTE, codeToIndex } from '../art/palette.js';
import { KNIGHT_FRAMES, KNIGHT_OFFSET_X, KNIGHT_W } from '../art/knight.js';
import { BIOME_BAR } from '../art/backgrounds.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Particles } from './particles.js';
import { touchesRect, simulateJump } from './physics.js';
import { WorldView } from '../render/world-view.js';
import { sprite, ditherRect, rect, text } from '../render/gfx.js';
import {
  drawHUD,
  drawTopButtons,
  drawChargeBar,
  drawBanner,
  drawMenu,
  drawTitle,
  drawFooter,
  drawEndScreen,
  drawControls,
  drawDebug,
  UI_REGIONS,
  hit,
  formatTime,
} from '../render/ui.js';
import { loadGame, saveGame, clearGame, loadSettings, saveSettings } from '../core/save.js';
import { vibrate } from '../platform/haptics.js';

const OX = WORLD_X_OFFSET;
const BANNER_FRAMES = 170;
const ENDING_FRAMES = 330;
const SUBTITLES = {
  forest: 'O COMEÇO DA SUBIDA',
  ruins: 'PEDRAS E MUSGO',
  castle: 'AS MURALHAS',
  cathedral: 'O CORAÇÃO DA TORRE',
  sky: 'GELO E VENTO',
};

export class Game {
  constructor({ display, input, audio, debug, version }) {
    this.display = display;
    this.input = input;
    this.audio = audio;
    this.debug = debug;
    this.version = version || '';
    this.world = new World(SCREENS);
    this.view = new WorldView(this.world, BIOMES);
    this.particles = new Particles();
    this.settings = loadSettings();
    this.audio.setMuted(this.settings.muted);

    this.frame = 0;
    this.state = 'title';
    this.menuIndex = 0;
    this.menuRegions = [];
    this.menuItems = [];
    this.confirm = null;
    this.banner = null;
    this.shake = 0;
    this.stateTime = 0;
    this.saveTimer = 0;
    this.walkSound = 0;
    this.preview = null;
    this.endStats = null;
    this.isRecord = false;

    this._newRun();
    this.saved = loadGame();
    this.input.hitUI = (x, y) => this._hitUI(x, y);
    this.input.setMode('ui');
  }

  // ------------------------------------------------------------ partidas ---
  _newRun() {
    this.player = new Player(this.world);
    this.frames = 0;
    this.screen = this.world.screenAtY(this.player.body.y + P.PLAYER_H / 2);
    this.maxBiome = BIOMES.findIndex((b) => b.id === this.world.biomeOf(this.screen));
    this.star = { hidden: false, rise: 0 };
    this.particles.clear();
  }

  _stats() {
    return { frames: this.frames, jumps: this.player.jumps, falls: this.player.falls };
  }

  save() {
    if (this.state === 'title' || this.state === 'ending' || this.state === 'endScreen') return;
    saveGame({
      ...this.player.serialize(),
      frames: this.frames,
      jumps: this.player.jumps,
      falls: this.player.falls,
      maxBiome: this.maxBiome,
    });
  }

  _startNew() {
    clearGame();
    this.saved = null;
    this._newRun();
    this._enterPlaying(true);
  }

  _continue() {
    const s = this.saved || loadGame();
    this._newRun();
    if (s) {
      this.player.restore(s);
      this.player.jumps = s.jumps || 0;
      this.player.falls = s.falls || 0;
      this.frames = s.frames || 0;
      this.maxBiome = s.maxBiome || 0;
    }
    this.screen = this.world.screenAtY(this.player.body.y + P.PLAYER_H / 2);
    this._enterPlaying(false);
  }

  _enterPlaying(showBanner) {
    this.state = 'playing';
    this.stateTime = 0;
    this.input.setMode('game');
    const biome = this.world.biomeOf(this.screen);
    this.audio.playMusic(biome);
    if (showBanner) this._showBanner(biome);
  }

  _showBanner(biome) {
    const info = BIOMES.find((b) => b.id === biome);
    this.banner = { title: info.name.toUpperCase(), sub: SUBTITLES[biome] || '', t: 0 };
  }

  // ------------------------------------------------------------ interface ---
  _hitUI(x, y) {
    if (this.state === 'playing') {
      if (hit(UI_REGIONS.pause, x, y)) return 'pause';
      if (hit(UI_REGIONS.sound, x, y)) return 'sound';
      if (this.debug && hit(UI_REGIONS.dbgPrev, x, y)) return 'dbgPrev';
      if (this.debug && hit(UI_REGIONS.dbgNext, x, y)) return 'dbgNext';
    }
    return null;
  }

  toggleMute() {
    this.settings.muted = !this.settings.muted;
    this.audio.setMuted(this.settings.muted);
    saveSettings(this.settings);
  }

  toggleHUD() {
    this.settings.hud = !this.settings.hud;
    saveSettings(this.settings);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.audio.chargeStop();
    this.player.charging = false;
    this.player.charge = 0;
    this.state = 'paused';
    this.menuIndex = 0;
    this.input.setMode('ui');
    this.save();
  }

  resume() {
    this.state = 'playing';
    this.input.setMode('game');
  }

  onHidden() {
    if (this.state === 'playing') this.pause();
    else this.save();
    this.audio.suspend();
  }

  onVisible() {
    this.audio.resume();
  }

  _menuFor(state) {
    const hasSave = !!this.saved;
    switch (state) {
      case 'titleMenu':
        return [
          { label: 'CONTINUAR', action: () => this._continue(), disabled: !hasSave },
          { label: 'NOVO JOGO', action: () => (hasSave ? this._ask('APAGAR O PROGRESSO?', () => this._startNew(), 'titleMenu') : this._startNew()) },
        ];
      case 'paused':
        return [
          { label: 'CONTINUAR', action: () => this.resume() },
          { label: 'SOM: ' + (this.settings.muted ? 'DESLIGADO' : 'LIGADO'), action: () => this.toggleMute() },
          { label: 'HUD: ' + (this.settings.hud ? 'VISÍVEL' : 'OCULTO'), action: () => this.toggleHUD() },
          { label: 'REINICIAR', action: () => this._ask('RECOMEÇAR DO ZERO?', () => this._startNew(), 'paused') },
          { label: 'TELA INICIAL', action: () => this._toTitle() },
        ];
      case 'confirm':
        return [
          { label: 'SIM', action: () => this.confirm.yes() },
          { label: 'NÃO', action: () => this._back(this.confirm.back) },
        ];
      default:
        return [];
    }
  }

  _ask(question, yes, back) {
    this.confirm = { question, yes, back };
    this.state = 'confirm';
    this.menuIndex = 1;
  }

  _back(state) {
    this.state = state;
    this.menuIndex = 0;
  }

  _toTitle() {
    this.save();
    this.saved = loadGame();
    this.state = 'title';
    this.stateTime = 0;
    this.input.setMode('ui');
    this.audio.chargeStop();
    this.audio.setWind(0);
    this.audio.playMusic('title');
    this.banner = null;
  }

  _handleMenuInput(pending) {
    const items = this._menuFor(this.state);
    const enabled = (i) => items[i] && !items[i].disabled;
    const move = (d) => {
      let i = this.menuIndex;
      for (let k = 0; k < items.length; k++) {
        i = (i + d + items.length) % items.length;
        if (enabled(i)) break;
      }
      if (i !== this.menuIndex) this.audio.uiMove();
      this.menuIndex = i;
    };
    if (!enabled(this.menuIndex)) move(1);
    for (const k of pending.keys) {
      if (k === 'ArrowUp' || k === 'KeyW') move(-1);
      else if (k === 'ArrowDown' || k === 'KeyS') move(1);
      else if (k === 'Enter' || k === 'Space' || k === 'NumpadEnter') {
        this.audio.uiSelect();
        items[this.menuIndex].action();
        return;
      } else if (k === 'Escape' || k === 'KeyP') {
        if (this.state === 'paused') {
          this.resume();
          return;
        }
        if (this.state === 'confirm') {
          this._back(this.confirm.back);
          return;
        }
        if (this.state === 'titleMenu') {
          this.state = 'title';
          return;
        }
      }
    }
    for (const t of pending.taps) {
      const r = this.menuRegions.find((m) => t.x >= m.x && t.x < m.x + m.w && t.y >= m.y && t.y < m.y + m.h);
      if (r && enabled(r.index)) {
        this.menuIndex = r.index;
        this.audio.uiSelect();
        items[r.index].action();
        return;
      }
    }
  }

  // ------------------------------------------------------------- update ----
  update() {
    this.frame++;
    this.stateTime++;
    const pending = this.input.consume();
    if (this.shake > 0) this.shake--;
    if (this.banner) {
      this.banner.t++;
      if (this.banner.t > BANNER_FRAMES) this.banner = null;
    }

    switch (this.state) {
      case 'title': {
        if (pending.taps.length || pending.keys.some((k) => k === 'Space' || k === 'Enter' || k === 'NumpadEnter')) {
          this.audio.uiSelect();
          this.saved = loadGame();
          if (this.saved) {
            this.state = 'titleMenu';
            this.menuIndex = 0;
          } else this._startNew();
        }
        this._ambient(0);
        break;
      }
      case 'titleMenu':
      case 'paused':
      case 'confirm':
        this._handleMenuInput(pending);
        this._ambient(this.state === 'titleMenu' ? 0 : this.screen);
        break;
      case 'playing':
        this._updatePlaying(pending);
        break;
      case 'ending':
        this._updateEnding();
        break;
      case 'endScreen':
        this.particles.update(this.world, this.world.screenTopY(this.screen));
        if (this.stateTime > 90 && (pending.taps.length || pending.keys.some((k) => k === 'Space' || k === 'Enter'))) {
          this.audio.uiSelect();
          this._toTitle();
        }
        break;
      default:
        break;
    }
  }

  _ambient(s) {
    const entry = this.view.screenCanvas(s);
    const camTop = this.world.screenTopY(s);
    this.particles.ambient(entry.biome, camTop, entry.emitters.map((e) => ({ x: e.x - OX, y: e.y })), entry.windCells);
    this.particles.update(this.world, camTop);
  }

  _updatePlaying(pending) {
    // botões da interface e atalhos
    for (const u of pending.ui) {
      if (u.id === 'pause') return this.pause();
      if (u.id === 'sound') this.toggleMute();
      if (u.id === 'dbgPrev') this._teleportScreen(this.screen - 1);
      if (u.id === 'dbgNext') this._teleportScreen(this.screen + 1);
    }
    for (const k of pending.keys) {
      if (k === 'Escape' || k === 'KeyP') return this.pause();
      if (k === 'KeyM') this.toggleMute();
      if (k === 'KeyH') this.toggleHUD();
      if (this.debug && (k === 'BracketRight' || k === 'PageUp')) this._teleportScreen(this.screen + 1);
      if (this.debug && (k === 'BracketLeft' || k === 'PageDown')) this._teleportScreen(this.screen - 1);
    }
    if (this.debug) {
      for (const t of pending.taps) {
        if (t.shift) {
          const camTop = this.world.screenTopY(this.screen);
          this.player.teleport(t.x - OX - P.PLAYER_W / 2, camTop + t.y - P.PLAYER_H);
        }
      }
    }

    const ctl = {
      dir: this.input.dir(),
      jumpHeld: this.input.jumpHeld(),
      jumpPressed: pending.jumpPressed > 0,
      jumpReleased: pending.jumpReleased > 0,
      releaseDir: pending.jumpReleased > 0 ? pending.releaseDir : this.input.dir(),
    };
    const pl = this.player;
    const events = pl.update(ctl);
    this.frames++;
    for (const ev of events) this._onEvent(ev);

    // passos
    if (pl.walking) {
      if (++this.walkSound % 14 === 1) this.audio.step();
    } else this.walkSound = 0;

    // vento
    this.audio.setWind(pl.inWind ? 1 : this.world.biomeOf(this.screen) === 'sky' ? 0.25 : 0);

    // troca de tela instantânea
    const b = pl.body;
    const s = this.world.screenAtY(b.y + P.PLAYER_H / 2);
    if (s !== this.screen) this._changeScreen(s);

    // objetivo final: é preciso POUSAR ao lado da estrela
    if (this.world.goal && b.onGround && touchesRect(b, this.world.goal)) this._startEnding();

    // prévia de trajetória no modo debug
    this.preview = null;
    if (this.debug && pl.charging) {
      this.preview = simulateJump(this.world, b, pl.charge, this.input.dir(), { path: true, maxFrames: 400 }).path;
    }

    if (++this.saveTimer >= 300) {
      this.saveTimer = 0;
      this.save();
    }
    this._ambient(this.screen);
  }

  _changeScreen(s) {
    const prevBiome = this.world.biomeOf(this.screen);
    this.screen = s;
    // partículas de ambiente pertencem a uma tela; poeira pode continuar
    this.particles.list = this.particles.list.filter((p) => p.kind === 'dust' || p.kind === 'spark');
    const biome = this.world.biomeOf(s);
    if (biome !== prevBiome) {
      this.audio.playMusic(biome);
      const bi = BIOMES.findIndex((b) => b.id === biome);
      if (bi > this.maxBiome) {
        this.maxBiome = bi;
        this._showBanner(biome);
        this.save();
      }
    }
  }

  _teleportScreen(s) {
    if (s < 0 || s >= this.world.count) return;
    const sp = this.world.spawnPointFor(s);
    this.player.teleport(sp.x, sp.y);
    this._changeScreen(s);
  }

  _onEvent(ev) {
    const pl = this.player;
    switch (ev.type) {
      case 'chargeStart':
        this.audio.chargeStart((P.CHARGE_FRAMES / 60) * 1.02);
        break;
      case 'jump':
        this.audio.jump(ev.charge / P.CHARGE_FRAMES);
        this.particles.dust(ev.x, ev.y, 3 + Math.round((ev.charge / P.CHARGE_FRAMES) * 4), 0.7);
        break;
      case 'land':
        this.audio.land(ev.dist);
        if (ev.dist > 12) this.particles.dust(ev.x, ev.y, Math.min(10, 3 + Math.round(ev.dist / 20)), 1);
        this.save();
        break;
      case 'splat':
        this.audio.splat();
        this.particles.dust(ev.x, ev.y, 16, 1.7);
        this.shake = 10;
        vibrate(70);
        this.save();
        break;
      case 'bounce':
        this.audio.bounce();
        this.particles.bump(ev.x, ev.y);
        break;
      case 'ceiling':
        this.audio.ceiling();
        this.particles.bump(ev.x, ev.y);
        break;
      default:
        break;
    }
    void pl;
  }

  // --------------------------------------------------------------- final ----
  _startEnding() {
    this.state = 'ending';
    this.stateTime = 0;
    this.input.setMode('ui');
    this.audio.chargeStop();
    this.audio.setWind(0);
    this.audio.stopMusic();
    this.audio.starChime();
    this.player.cheering = true;
    this.player.charging = false;
    this.endStats = this._stats();
    const best = this.settings.best;
    this.isRecord = !best || this.endStats.frames < best.frames;
    if (this.isRecord) {
      this.settings.best = this.endStats;
      saveSettings(this.settings);
    }
    clearGame();
    this.saved = null;
  }

  _updateEnding() {
    const t = this.stateTime;
    const pl = this.player;
    pl.update({ dir: 0, jumpHeld: false, jumpPressed: false, jumpReleased: false, releaseDir: 0 });
    const g = this.world.goal;
    if (t === 50) this.audio.fanfare();
    if (t > 50) this.star.rise = -Math.pow((t - 50) / 10, 1.6);
    if (t % 3 === 0) this.particles.sparkles(g.x + 8, g.y + 8 + this.star.rise, 2, 8);
    if (t === 40) this.particles.sparkles(g.x + 8, g.y + 8, 30, 14);
    this.particles.update(this.world, this.world.screenTopY(this.screen));
    if (t >= ENDING_FRAMES) {
      this.state = 'endScreen';
      this.stateTime = 0;
      this.star.hidden = true;
      this.audio.playMusic('title');
    }
  }

  // -------------------------------------------------------------- render ----
  render(alpha) {
    const d = this.display;
    const ctx = d.bctx;
    const s = this.state === 'title' || this.state === 'titleMenu' ? 0 : this.screen;
    const camTop = this.world.screenTopY(s);
    d.barColor = PALETTE[codeToIndex(BIOME_BAR[this.world.biomeOf(s)] || '0')];

    ctx.save();
    if (this.shake > 0) ctx.translate(((this.shake >> 1) % 2 ? 1 : -1) * Math.min(2, this.shake >> 2), 0);
    this.view.drawBackground(ctx, s, this.frame);
    this.view.drawScreen(ctx, s);
    this.view.drawAnimated(ctx, s, this.frame, this.star);
    this.particles.draw(ctx, camTop, OX, 'back');
    const showPlayer = this.state !== 'endScreen';
    if (showPlayer) this._drawPlayer(ctx, camTop, alpha, s);
    this.particles.draw(ctx, camTop, OX, 'front');
    ctx.restore();

    const touch = this.input.touchSeen;
    const L = d.layout;
    const mode = L.stripH ? 'strip' : 'overlay';
    switch (this.state) {
      case 'title':
      case 'titleMenu': {
        ditherRect(ctx, 0, 0, VIEW_W, VIEW_H, 0, 4);
        drawTitle(ctx, this.frame, this.state === 'title' ? 'TOQUE PARA COMEÇAR' : null);
        if (this.state === 'titleMenu') {
          this.menuRegions = drawMenu(ctx, this._menuFor('titleMenu'), this.menuIndex, 150, this.frame);
        }
        drawFooter(ctx, 'SEGURE E SOLTE PARA PULAR');
        text(ctx, this.version, VIEW_W - 3, VIEW_H - 9, 3, { align: 'right' });
        if (this.settings.best && this.state === 'title') {
          text(ctx, 'RECORDE ' + formatTime(this.settings.best.frames), VIEW_W / 2, VIEW_H - 36, 15, { align: 'center', outline: 0 });
        }
        break;
      }
      case 'playing':
        this._drawPlayingUI(ctx);
        break;
      case 'paused':
      case 'confirm': {
        this._drawPlayingUI(ctx);
        ditherRect(ctx, 0, 0, VIEW_W, VIEW_H, 0, 2);
        if (this.state === 'paused') {
          text(ctx, 'PAUSADO', VIEW_W / 2, 96, 15, { align: 'center', outline: 0 });
          this.menuRegions = drawMenu(ctx, this._menuFor('paused'), this.menuIndex, 112, this.frame);
        } else {
          text(ctx, this.confirm.question, VIEW_W / 2, 120, 15, { align: 'center', outline: 0 });
          this.menuRegions = drawMenu(ctx, this._menuFor('confirm'), this.menuIndex, 136, this.frame);
        }
        break;
      }
      case 'ending': {
        const t = this.stateTime;
        if (t > ENDING_FRAMES - 60) {
          const k = (t - (ENDING_FRAMES - 60)) / 60;
          if (k > 0.66) rect(ctx, 0, 0, VIEW_W, VIEW_H, 6);
          else ditherRect(ctx, 0, 0, VIEW_W, VIEW_H, 6, k > 0.33 ? 2 : 4);
        }
        break;
      }
      case 'endScreen':
        ditherRect(ctx, 0, 0, VIEW_W, VIEW_H, 0, 2);
        drawEndScreen(ctx, this.endStats, this.stateTime, this.isRecord);
        break;
      default:
        break;
    }

    if (this.debug && (this.state === 'playing' || this.state === 'paused')) {
      drawDebug(ctx, { world: this.world, player: this.player, screen: this.screen, fps: this.fps || 0, frame: this.frame, preview: this.preview });
    }

    // controles de toque
    const showControls = touch && this.state === 'playing';
    if (showControls) {
      const pressed = { left: this.input.dirPressed(-1), right: this.input.dirPressed(1), jump: this.input.jumpHeld() };
      if (mode === 'strip') drawControls(d.sctx, 'strip', L.stripH, pressed);
      else drawControls(ctx, 'overlay', 0, pressed);
    } else if (L.stripH) {
      rect(d.sctx, 0, 0, VIEW_W, L.stripH, codeToIndex(BIOME_BAR[this.world.biomeOf(s)] || '0'));
    }
    d.present();
  }

  _drawPlayingUI(ctx) {
    const pl = this.player;
    if (pl.charging) {
      const b = pl.body;
      const camTop = this.world.screenTopY(this.screen);
      drawChargeBar(ctx, OX + b.x + P.PLAYER_W / 2, b.y - camTop - 2, pl.chargeRatio, this.frame);
    }
    if (this.banner) drawBanner(ctx, this.banner.title, this.banner.sub, this.banner.t, BANNER_FRAMES);
    drawHUD(ctx, this._stats(), this.settings.hud);
    drawTopButtons(ctx, this.settings.muted);
  }

  _drawPlayer(ctx, camTop, alpha, s) {
    const pl = this.player;
    const b = pl.body;
    let x = pl.prevX + (b.x - pl.prevX) * alpha;
    let y = pl.prevY + (b.y - pl.prevY) * alpha;
    if (this.state === 'title' || this.state === 'titleMenu') {
      x = this.world.start.x;
      y = this.world.start.y;
    }
    const name = this.state === 'title' || this.state === 'titleMenu' ? (this.frame % 70 < 40 ? 'idle1' : 'idle2') : pl.frameName();
    const flip = pl.facing < 0;
    let dx = 0;
    if (pl.charging && this.state === 'playing') {
      // treme levemente conforme a carga aumenta
      const r = pl.chargeRatio;
      if (r > 0.3 && (this.frame >> 1) % 2 === 0) dx = Math.random() < r ? (Math.random() < 0.5 ? -1 : 1) : 0;
    }
    const px = Math.round(OX + x) - (flip ? KNIGHT_W - P.PLAYER_W - KNIGHT_OFFSET_X : KNIGHT_OFFSET_X) + dx;
    const py = Math.round(y + P.PLAYER_H - camTop) - 16;
    ctx.drawImage(sprite(KNIGHT_FRAMES[name], flip), px, py);
    void s;
  }
}

