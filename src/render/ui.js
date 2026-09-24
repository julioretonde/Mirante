// =============================================================================
//  Interface desenhada em pixel art: HUD, botões, barra de carga, faixa com o
//  nome do bioma, menus, título, tela final, controles de toque e debug.
// =============================================================================

import { VIEW_W, VIEW_H, PHYSICS, TILE, WORLD_X_OFFSET } from '../config.js';
import { PALETTE } from '../art/palette.js';
import {
  BTN_ARROW,
  BTN_JUMP,
  ICON_PAUSE,
  ICON_SOUND_ON,
  ICON_SOUND_OFF,
  ICON_TIME,
  ICON_JUMP,
  ICON_FALL,
  CURSOR,
} from '../art/ui.js';
import { sprite, text, textWidth, rect, panel, ditherRect, titleLogo } from './gfx.js';

/** Formata frames (60 Hz) como H:MM:SS ou M:SS. */
export function formatTime(frames) {
  const total = Math.floor(frames / 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Regiões clicáveis fixas (coordenadas internas)
export const UI_REGIONS = {
  pause: { x: 158, y: 0, w: 22, h: 20 },
  sound: { x: 138, y: 0, w: 20, h: 20 },
  dbgPrev: { x: 60, y: 0, w: 22, h: 16 },
  dbgNext: { x: 98, y: 0, w: 22, h: 16 },
};

export function hit(region, x, y) {
  return x >= region.x && x < region.x + region.w && y >= region.y && y < region.y + region.h;
}

export function drawHUD(ctx, stats, visible) {
  if (!visible) return;
  const o = { outline: 0 };
  ctx.drawImage(sprite(ICON_TIME), 3, 3);
  text(ctx, formatTime(stats.frames), 12, 3, 6, o);
  ctx.drawImage(sprite(ICON_JUMP), 3, 13);
  text(ctx, String(stats.jumps), 12, 13, 6, o);
  ctx.drawImage(sprite(ICON_FALL), 3, 23);
  text(ctx, String(stats.falls), 12, 23, 6, o);
}

export function drawTopButtons(ctx, muted) {
  ctx.drawImage(sprite(muted ? ICON_SOUND_OFF : ICON_SOUND_ON), 142, 3);
  ctx.drawImage(sprite(ICON_PAUSE), 164, 3);
}

/** Barra de carga discreta acima do cavaleiro. */
export function drawChargeBar(ctx, cx, top, ratio, frame) {
  const w = 14;
  const x = Math.round(cx - w / 2);
  const y = Math.round(top - 6);
  rect(ctx, x, y, w, 4, 0);
  const inner = Math.round((w - 2) * ratio);
  const col = ratio < 0.5 ? 15 : ratio < 0.85 ? 14 : 13;
  if (inner > 0) rect(ctx, x + 1, y + 1, inner, 2, ratio >= 1 && (frame >> 2) % 2 ? 6 : col);
}

/** Faixa com o nome do bioma ao entrar nele. */
export function drawBanner(ctx, title, subtitle, t, total) {
  // entra deslizando e sai "pontilhando"
  const inT = Math.min(1, t / 16);
  const outT = Math.max(0, (t - (total - 20)) / 20);
  const y = Math.round(-18 + inT * 60);
  const w = Math.max(textWidth(title), textWidth(subtitle)) + 20;
  const x = Math.round((VIEW_W - w) / 2);
  panel(ctx, x, y, w, 26, 1, 15);
  text(ctx, title, VIEW_W / 2, y + 5, 15, { align: 'center', shadow: 0 });
  text(ctx, subtitle, VIEW_W / 2, y + 15, 5, { align: 'center' });
  if (outT > 0) ditherRect(ctx, x, y, w, 26, 0, outT > 0.5 ? 2 : 4);
}

/**
 * Menu vertical centralizado. items: [{label}], selected: índice.
 * Retorna as regiões clicáveis de cada item.
 */
export function drawMenu(ctx, items, selected, y0, frame, opts = {}) {
  const lineH = opts.lineH || 14;
  const regions = [];
  const w = Math.max(...items.map((i) => textWidth(i.label))) + 34;
  const h = items.length * lineH + 12;
  const x = Math.round((VIEW_W - w) / 2);
  if (!opts.noPanel) panel(ctx, x, y0, w, h, 1, 5);
  items.forEach((it, i) => {
    const y = y0 + 8 + i * lineH;
    const sel = i === selected;
    const col = it.disabled ? 3 : sel ? 15 : 6;
    text(ctx, it.label, VIEW_W / 2 + 4, y, col, { align: 'center', shadow: 0 });
    if (sel) {
      const bob = (frame >> 4) % 2;
      ctx.drawImage(sprite(CURSOR), Math.round(VIEW_W / 2 - textWidth(it.label) / 2 - 10 - bob), y + 1);
    }
    regions.push({ x, y: y - 3, w, h: lineH, index: i });
  });
  return regions;
}

export function drawTitle(ctx, frame, hint) {
  const logo = titleLogo();
  const lx = Math.round((VIEW_W - logo.width) / 2);
  const ly = 44 + Math.round(Math.sin(frame * 0.04) * 2);
  ctx.drawImage(logo, lx, ly);
  text(ctx, 'A LENDA DA ESTRELA CAÍDA', VIEW_W / 2, ly + logo.height + 6, 5, { align: 'center', outline: 0 });
  if (hint && (frame >> 5) % 2 === 0) text(ctx, hint, VIEW_W / 2, 214, 6, { align: 'center', outline: 0 });
}

export function drawFooter(ctx, str) {
  text(ctx, str, VIEW_W / 2, VIEW_H - 22, 5, { align: 'center', outline: 0 });
}

/** Painel de estatísticas da tela final. */
export function drawEndScreen(ctx, stats, frame, isRecord) {
  text(ctx, 'VOCÊ ALCANÇOU', VIEW_W / 2, 58, 15, { align: 'center', outline: 0 });
  text(ctx, 'O TOPO!', VIEW_W / 2, 70, 15, { align: 'center', outline: 0 });
  text(ctx, 'A ESTRELA VOLTOU AO CÉU.', VIEW_W / 2, 88, 5, { align: 'center', outline: 0 });
  panel(ctx, 30, 108, 120, 66, 1, 15);
  const rows = [
    [ICON_TIME, 'TEMPO', formatTime(stats.frames)],
    [ICON_JUMP, 'PULOS', String(stats.jumps)],
    [ICON_FALL, 'QUEDAS', String(stats.falls)],
  ];
  rows.forEach(([icon, label, value], i) => {
    const y = 118 + i * 16;
    ctx.drawImage(sprite(icon), 40, y);
    text(ctx, label, 50, y, 5);
    text(ctx, value, 140, y, 6, { align: 'right' });
  });
  if (isRecord && (frame >> 4) % 2 === 0) text(ctx, 'NOVO RECORDE!', VIEW_W / 2, 182, 14, { align: 'center', outline: 0 });
  text(ctx, 'OBRIGADO POR JOGAR!', VIEW_W / 2, 206, 6, { align: 'center', outline: 0 });
  if (frame > 90 && (frame >> 5) % 2 === 0) text(ctx, 'TOQUE PARA VOLTAR', VIEW_W / 2, 250, 4, { align: 'center', outline: 0 });
}

// ---------------------------------------------------- controles de toque ----
/**
 * Desenha os botões de toque. Em 'strip' ficam na faixa abaixo do jogo; em
 * 'overlay' ficam por cima da parte de baixo da tela, semitransparentes.
 */
export function drawControls(ctx, mode, h, pressed) {
  const cy = mode === 'strip' ? Math.round(h / 2) : VIEW_H - 20;
  const by = cy - 13;
  const buttons = [
    { spr: BTN_ARROW, flip: true, x: 22 - 13, on: pressed.left },
    { spr: BTN_ARROW, flip: false, x: 67 - 13, on: pressed.right },
    { spr: BTN_JUMP, flip: false, x: 135 - 20, on: pressed.jump },
  ];
  if (mode === 'strip') {
    rect(ctx, 0, 0, VIEW_W, h, 1);
    rect(ctx, 0, 0, VIEW_W, 1, 0);
    ditherRect(ctx, 0, 1, VIEW_W, 1, 2);
    rect(ctx, 90, 6, 1, h - 12, 2);
  }
  for (const b of buttons) {
    ctx.globalAlpha = b.on ? 0.95 : mode === 'strip' ? 0.7 : 0.38;
    ctx.drawImage(sprite(b.spr, b.flip), b.x, by + (b.on ? 1 : 0));
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ debug ---
export function drawDebug(ctx, g) {
  const { world, player, screen, fps } = g;
  const camTop = world.screenTopY(screen);
  const OX = WORLD_X_OFFSET;
  // tiles sólidos da tela
  const top = world.screenTopRow(screen);
  ctx.globalAlpha = 0.5;
  for (let r = top; r < top + 40; r++)
    for (let c = 0; c < world.cols; c++) {
      const t = world.tileAt(c, r);
      if (t) {
        ctx.strokeStyle = t === 2 ? PALETTE[23] : PALETTE[13];
        ctx.strokeRect(OX + c * TILE + 0.5, (r - top) * TILE + 0.5, TILE - 1, TILE - 1);
      }
      const w = world.windAtTile(c, r);
      if (w) {
        ctx.fillStyle = PALETTE[24];
        ctx.fillRect(OX + c * TILE + (w > 0 ? 5 : 1), (r - top) * TILE + 3, 2, 2);
      }
    }
  ctx.globalAlpha = 1;
  // caixa do jogador
  const b = player.body;
  ctx.strokeStyle = PALETTE[19];
  ctx.strokeRect(Math.round(OX + b.x) + 0.5, Math.round(b.y - camTop) + 0.5, PHYSICS.PLAYER_W - 1, PHYSICS.PLAYER_H - 1);
  // objetivo
  if (world.goal && world.screenAtY(world.goal.y) === screen) {
    ctx.strokeStyle = PALETTE[15];
    ctx.strokeRect(OX + world.goal.x + 0.5, world.goal.y - camTop + 0.5, world.goal.w - 1, world.goal.h - 1);
  }
  // trajetória prevista
  if (g.preview) {
    ctx.fillStyle = PALETTE[15];
    const p = g.preview;
    for (let i = 0; i < p.length; i += 6) {
      const x = p[i] + PHYSICS.PLAYER_W / 2;
      const y = p[i + 1] + PHYSICS.PLAYER_H - camTop;
      if (y > -4 && y < VIEW_H + 4) ctx.fillRect(Math.round(OX + x), Math.round(y), 1, 1);
    }
  }
  // painel
  const lines = [
    `FPS ${fps}`,
    `TELA ${screen + 1}/${world.count}`,
    world.screens[screen].name,
    `X ${b.x.toFixed(1)} Y ${(b.y - camTop).toFixed(1)}`,
    `VX ${b.vx.toFixed(2)} VY ${b.vy.toFixed(2)}`,
    `${b.onGround ? (b.onIce ? 'GELO' : 'CHAO') : 'AR'} ${player.charging ? 'CARGA ' + player.charge : ''}`,
  ];
  rect(ctx, 0, 36, 92, lines.length * 9 + 3, 0);
  lines.forEach((l, i) => text(ctx, l, 2, 38 + i * 9, i === 0 ? 19 : 6));
  // botões de teleporte
  text(ctx, '<T', UI_REGIONS.dbgPrev.x + 4, 4, 15, { outline: 0 });
  text(ctx, 'T>', UI_REGIONS.dbgNext.x + 4, 4, 15, { outline: 0 });
}
