#!/usr/bin/env node
// =============================================================================
//  Validador de fases — npm run validate-levels
// -----------------------------------------------------------------------------
//  Usa EXATAMENTE a mesma física do jogo (src/game/physics.js) para explorar,
//  a partir da posição inicial, todos os lugares onde o cavaleiro consegue
//  ficar parado. De cada lugar testa:
//    - andar 1 frame para cada lado (no gelo: segurar por vários tempos);
//    - todos os pulos: cargas 0..CHARGE_FRAMES x direções (esq., vertical, dir.).
//  Depois confere:
//    1. se a estrela do topo é alcançável;
//    2. se TODA posição alcançável ainda consegue chegar ao topo (ou seja, não
//       existe buraco sem saída — o jogo não tem morte, então isso seria fatal);
//    3. se todas as telas são visitadas.
//  E mostra um relatório de dificuldade por tela: a maior "janela de carga"
//  (quantos frames seguidos de carga dão certo) do pulo mais difícil da rota
//  mais fácil. Quanto MENOR a janela, mais precisão a tela exige.
//
//  Opções:
//    --map N      desenha a tela N com as posições alcançáveis marcadas (*)
//    --links N    lista para onde cada plataforma da tela N consegue pular
//    --routes     mostra a rota mais fácil de cada tela no relatório
//    --no-report  não imprime o relatório de dificuldade
// =============================================================================

import { SCREENS, checkLevelFormat } from '../src/levels/index.js';
import { World } from '../src/game/world.js';
import { PHYSICS as P, TILE, ROWS_PER_SCREEN } from '../src/config.js';
import { stepBody, launch, touchesRect, surfaceUnder } from '../src/game/physics.js';
import { T_ICE } from '../src/levels/legend.js';

const args = process.argv.slice(2);
const argVal = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const MAP_SCREEN = argVal('--map') ? Number(argVal('--map')) : null;
const SHOW_REPORT = !args.includes('--no-report');
const SHOW_ROUTES = args.includes('--routes');

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

// -----------------------------------------------------------------------------
// 1) Formato
// -----------------------------------------------------------------------------
const formatErrors = checkLevelFormat(SCREENS);
if (formatErrors.length) {
  console.error(c.red(c.bold('Erros de formato nas fases:')));
  for (const e of formatErrors) console.error('  - ' + e);
  process.exit(1);
}

const world = new World(SCREENS);
const PW = P.PLAYER_W;
const PH = P.PLAYER_H;
const DIRS = [-1, 0, 1];
const NCH = P.CHARGE_FRAMES + 1;
const ICE_HOLDS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32];
const MAX_SIM_FRAMES = 20000;
const GOAL = -1;

// -----------------------------------------------------------------------------
// 2) Estados (posições de descanso)
// -----------------------------------------------------------------------------
let cap = 1 << 14;
let sx = new Float64Array(cap);
let sy = new Float64Array(cap);
let nStates = 0;
const index = new Map();

function keyOf(x, y) {
  return ((y + PH) / TILE) * 1048576 + Math.round(x * 4096);
}

function stateOf(x, y) {
  const k = keyOf(x, y);
  let id = index.get(k);
  if (id !== undefined) return id;
  if (nStates === cap) {
    cap *= 2;
    const nx = new Float64Array(cap);
    nx.set(sx);
    sx = nx;
    const ny = new Float64Array(cap);
    ny.set(sy);
    sy = ny;
  }
  id = nStates++;
  sx[id] = x;
  sy[id] = y;
  index.set(k, id);
  queue.push(id);
  return id;
}

/** Arestas de cada estado: [destino, janela, destino, janela, ...]. */
const edges = [];
/** Destinos de pulo por estado: Int32Array(3 * NCH) (para o relatório). */
const jumpTargets = [];
const queue = [];

const body = { x: 0, y: 0, vx: 0, vy: 0, onGround: true, onIce: false, peakY: 0, fallDist: 0 };
let warnings = [];

function resetBody(id) {
  body.x = sx[id];
  body.y = sy[id];
  body.vx = 0;
  body.vy = 0;
  body.onGround = true;
  body.onIce = surfaceUnder(world, body.x, body.y + PH, PW) === T_ICE;
  body.peakY = body.y;
  body.fallDist = 0;
}

/** Simula até o repouso. Retorna id do estado final ou GOAL. */
function runUntilRest(holdDir, holdFrames) {
  const goal = world.goal;
  for (let f = 0; f < MAX_SIM_FRAMES; f++) {
    stepBody(body, world, f < holdFrames ? holdDir : 0);
    // a estrela só conta com o cavaleiro de pé ao lado dela (igual ao jogo)
    if (body.onGround && touchesRect(body, goal)) return GOAL;
    if (f >= holdFrames - 1 && body.onGround && body.vx === 0) return stateOf(body.x, body.y);
  }
  warnings.push(`simulação não terminou em (${body.x.toFixed(1)}, ${body.y.toFixed(1)})`);
  return null;
}

function expand(id) {
  const list = [];
  const onIce = surfaceUnder(world, sx[id], sy[id] + PH, PW) === T_ICE;
  // Andar
  for (const d of [-1, 1]) {
    const holds = onIce ? ICE_HOLDS : [1];
    for (const h of holds) {
      resetBody(id);
      const t = runUntilRest(d, h);
      if (t !== null && t !== id) list.push(t, 999);
    }
  }
  // Pular
  const jt = new Int32Array(3 * NCH);
  for (let di = 0; di < 3; di++) {
    for (let ch = 0; ch < NCH; ch++) {
      resetBody(id);
      launch(body, ch, DIRS[di]);
      const t = runUntilRest(0, 0);
      jt[di * NCH + ch] = t === null ? -2 : t;
    }
  }
  jumpTargets[id] = jt;
  edges[id] = list;
}

// -----------------------------------------------------------------------------
// 3) Busca em largura a partir do início
// -----------------------------------------------------------------------------
const t0 = Date.now();
{
  // Assenta o personagem no chão a partir do 'P'.
  body.x = world.start.x;
  body.y = world.start.y;
  body.vx = 0;
  body.vy = 0;
  body.onGround = false;
  body.onIce = false;
  body.peakY = body.y;
  const s0 = runUntilRest(0, 0);
  if (s0 === GOAL || s0 === null) {
    console.error(c.red('Posição inicial inválida.'));
    process.exit(1);
  }
}
const START = 0;
for (let qi = 0; qi < queue.length; qi++) expand(queue[qi]);

// Plataforma (trecho contínuo de chão) de cada estado.
function platformOf(id) {
  const r = (sy[id] + PH) / TILE;
  const x = sx[id];
  let col = Math.floor((x + PW / 2) / TILE);
  if (!(world.isSolid(col, r) && !world.isSolid(col, r - 1))) {
    col = Math.floor(x / TILE);
    if (!(world.isSolid(col, r) && !world.isSolid(col, r - 1))) col = Math.ceil((x + PW) / TILE) - 1;
  }
  let a = col;
  while (a > 0 && world.isSolid(a - 1, r) && !world.isSolid(a - 1, r - 1)) a--;
  return r * 64 + a;
}
const platform = new Int32Array(nStates);
for (let i = 0; i < nStates; i++) platform[i] = platformOf(i);
const screenOf = new Int32Array(nStates);
for (let i = 0; i < nStates; i++) screenOf[i] = world.screenAtY(sy[i] + PH - 1);

// Converte os destinos de pulo em arestas com "janela de carga".
for (let id = 0; id < nStates; id++) {
  const jt = jumpTargets[id];
  const list = edges[id];
  for (let di = 0; di < 3; di++) {
    const base = di * NCH;
    const plat = (t) => (t === GOAL ? -1 : t < 0 ? -2 : platform[t]);
    let ch = 0;
    while (ch < NCH) {
      const p = plat(jt[base + ch]);
      let end = ch;
      while (end + 1 < NCH && plat(jt[base + end + 1]) === p) end++;
      const win = end - ch + 1;
      for (let k = ch; k <= end; k++) {
        const t = jt[base + k];
        if (t !== -2 && t !== id) list.push(t, win);
      }
      ch = end + 1;
    }
  }
}
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

// -----------------------------------------------------------------------------
// 4) Verificações
// -----------------------------------------------------------------------------
const errors = [];

// Quem alcança a estrela? (busca reversa)
const reverse = Array.from({ length: nStates }, () => []);
const reachesGoal = new Uint8Array(nStates);
const rq = [];
for (let id = 0; id < nStates; id++) {
  const list = edges[id];
  for (let k = 0; k < list.length; k += 2) {
    const t = list[k];
    if (t === GOAL) {
      if (!reachesGoal[id]) {
        reachesGoal[id] = 1;
        rq.push(id);
      }
    } else reverse[t].push(id);
  }
}
for (let qi = 0; qi < rq.length; qi++) {
  for (const p of reverse[rq[qi]]) {
    if (!reachesGoal[p]) {
      reachesGoal[p] = 1;
      rq.push(p);
    }
  }
}

if (!reachesGoal[START]) errors.push('A estrela do topo NÃO é alcançável a partir do início!');

// Telas visitadas e becos sem saída.
const visited = new Uint8Array(world.count);
const stuckByScreen = new Map();
for (let id = 0; id < nStates; id++) {
  visited[screenOf[id]] = 1;
  if (!reachesGoal[id]) {
    const s = screenOf[id];
    if (!stuckByScreen.has(s)) stuckByScreen.set(s, []);
    stuckByScreen.get(s).push(id);
  }
}
for (let s = 0; s < world.count; s++) {
  if (!visited[s]) errors.push(`Tela ${s + 1} (${SCREENS[s].name}) nunca é alcançada.`);
}
// Se nem a estrela é alcançável, todas as posições ficam "sem saída": em vez de
// listar tudo, mostra até onde dá para chegar.
if (!reachesGoal[START]) {
  let top = 0;
  for (let id = 0; id < nStates; id++) top = Math.max(top, screenOf[id]);
  errors.push(`A tela mais alta alcançada é a ${top + 1} (${SCREENS[top].name}). Verifique a saída dela para a tela ${top + 2}.`);
  stuckByScreen.clear();
}
for (const [s, ids] of stuckByScreen) {
  const rowsSet = new Set(ids.map((id) => (sy[id] + PH) / TILE - world.screenTopRow(s)));
  const where = [...rowsSet]
    .slice(0, 6)
    .map((r) => {
      const xsIn = ids.filter((id) => (sy[id] + PH) / TILE - world.screenTopRow(s) === r).map((id) => sx[id]);
      return `linha ${r} (x ${Math.min(...xsIn).toFixed(0)}..${Math.max(...xsIn).toFixed(0)})`;
    })
    .join(', ');
  errors.push(`Tela ${s + 1} (${SCREENS[s].name}): ${ids.length} posições SEM SAÍDA — ${where}`);
}

// -----------------------------------------------------------------------------
// 5) Relatório de dificuldade por tela
// -----------------------------------------------------------------------------
/**
 * Para a tela s: partindo das posições onde se entra nela (vindo de baixo),
 * qual a maior janela mínima de carga necessária para chegar a uma tela acima?
 * (Busca do "caminho mais largo" limitando-se a posições da própria tela.)
 */
function screenDifficulty(s) {
  const entries = [];
  if (s === 0) entries.push(START);
  else {
    for (let id = 0; id < nStates; id++) {
      if (screenOf[id] !== s) continue;
      // entrada = alguém de uma tela abaixo pula/cai até aqui
      for (const p of reverse[id]) {
        if (screenOf[p] < s) {
          entries.push(id);
          break;
        }
      }
    }
  }
  if (!entries.length) return { win: 0, entries: 0, route: [] };
  const isExit = (t) => t === GOAL || (t >= 0 && screenOf[t] > s);
  for (let w = NCH; w >= 1; w--) {
    const parent = new Map();
    const q = [];
    for (const e of entries) {
      parent.set(e, null);
      q.push(e);
    }
    for (let qi = 0; qi < q.length; qi++) {
      const from = q[qi];
      const list = edges[from];
      for (let k = 0; k < list.length; k += 2) {
        if (list[k + 1] < w) continue;
        const t = list[k];
        if (isExit(t)) {
          // reconstrói a rota (sequência de plataformas e janelas)
          const route = [{ id: t, win: list[k + 1] }];
          let cur = from;
          let winIn = list[k + 1];
          while (cur !== null) {
            const pr = parent.get(cur);
            route.unshift({ id: cur, win: pr ? pr.win : null });
            cur = pr ? pr.id : null;
          }
          return { win: w, entries: entries.length, route };
        }
        if (t >= 0 && !parent.has(t) && screenOf[t] === s) {
          parent.set(t, { id: from, win: list[k + 1] });
          q.push(t);
        }
      }
    }
  }
  return { win: 0, entries: entries.length, route: [] };
}

function platLabel(id) {
  if (id === GOAL) return 'ESTRELA';
  const r = (sy[id] + PH) / TILE;
  const sc = world.screenAtRow(r);
  return `T${sc + 1}:l${r - world.screenTopRow(sc)}`;
}

if (SHOW_REPORT) {
  console.log(c.bold('\nRelatório por tela') + c.dim('  (janela = frames de carga que acertam o pulo mais difícil da rota mais fácil)'));
  let lastBiome = '';
  for (let s = 0; s < world.count; s++) {
    const scr = SCREENS[s];
    if (scr.biome !== lastBiome) {
      lastBiome = scr.biome;
      console.log(c.cyan(`  [${scr.biome}]`));
    }
    const statesIn = screenOf.reduce((a, v) => a + (v === s ? 1 : 0), 0);
    const d = screenDifficulty(s);
    const bar = d.win >= 999 ? 'andando' : '█'.repeat(Math.min(d.win, 30));
    const tag = d.win === 0 ? c.red('sem rota para cima') : d.win >= 999 ? c.green(bar) : d.win >= 8 ? c.green(bar) : d.win >= 4 ? c.yellow(bar) : c.red(bar);
    console.log(
      `  ${String(s + 1).padStart(2)} ${scr.name.padEnd(24)} posições:${String(statesIn).padStart(5)}  janela:${String(d.win >= 999 ? '∞' : d.win).padStart(3)} ${tag}`
    );
    if (SHOW_ROUTES && d.route.length) {
      // mostra só as mudanças de plataforma (andar não conta)
      const parts = [];
      let last = null;
      for (const step of d.route) {
        const lab = platLabel(step.id);
        if (lab !== last) {
          parts.push((step.win && step.win < 999 ? `-(${step.win})-> ` : '') + lab);
          last = lab;
        }
      }
      console.log(c.dim('       rota: ' + parts.join(' ')));
    }
  }
}

// -----------------------------------------------------------------------------
// 6) Mapa de uma tela (depuração de level design)
// -----------------------------------------------------------------------------
if (MAP_SCREEN) {
  const s = MAP_SCREEN - 1;
  const top = world.screenTopRow(s);
  const marks = new Map();
  for (let id = 0; id < nStates; id++) {
    if (screenOf[id] !== s) continue;
    const r = (sy[id] + PH) / TILE - 1 - top;
    const col = Math.floor((sx[id] + PW / 2) / TILE);
    const k = r * 64 + col;
    const prev = marks.get(k);
    const m = reachesGoal[id] ? '*' : '!';
    if (prev !== '!') marks.set(k, m);
  }
  console.log(c.bold(`\nTela ${MAP_SCREEN} — ${SCREENS[s].name}`) + c.dim('   * = dá para ficar parado aqui   ! = beco sem saída'));
  for (let r = 0; r < ROWS_PER_SCREEN; r++) {
    let line = '';
    for (let col = 0; col < world.cols; col++) {
      const m = marks.get(r * 64 + col);
      const ch = SCREENS[s].map[r][col];
      line += m === '!' ? c.red('!') : m ? c.green('*') : ch === '.' ? c.dim('.') : ch;
    }
    console.log(`  ${String(r).padStart(2)} ${line}`);
  }
}

// -----------------------------------------------------------------------------
// 6b) Ligações entre plataformas de uma tela (--links N)
// -----------------------------------------------------------------------------
const LINKS_SCREEN = argVal('--links') ? Number(argVal('--links')) : null;
if (LINKS_SCREEN) {
  const s = LINKS_SCREEN - 1;
  const top = world.screenTopRow(s);
  const platName = (p) => {
    if (p === -1) return 'ESTRELA';
    const r = Math.floor(p / 64);
    const a = p % 64;
    let b = a;
    while (b + 1 < world.cols && world.isSolid(b + 1, r) && !world.isSolid(b + 1, r - 1)) b++;
    const sc = world.screenAtRow(r);
    const rr = r - world.screenTopRow(sc);
    return `T${sc + 1}:l${String(rr).padStart(2)} c${a}-${b}`;
  };
  const byPlat = new Map();
  for (let id = 0; id < nStates; id++) {
    if (screenOf[id] !== s) continue;
    const p = platform[id];
    if (!byPlat.has(p)) byPlat.set(p, []);
    byPlat.get(p).push(id);
  }
  console.log(c.bold(`\nLigações da tela ${LINKS_SCREEN} — ${SCREENS[s].name}`));
  const plats = [...byPlat.keys()].sort((a, b) => b - a);
  for (const p of plats) {
    const ids = byPlat.get(p);
    const xsP = ids.map((id) => sx[id]);
    console.log(c.cyan(`  ${platName(p)}  (x ${Math.min(...xsP)}..${Math.max(...xsP)}, ${ids.length} pos.)`));
    const agg = new Map();
    for (const id of ids) {
      const jt = jumpTargets[id];
      for (let di = 0; di < 3; di++) {
        for (let ch = 0; ch < NCH; ch++) {
          const t = jt[di * NCH + ch];
          if (t === -2) continue;
          const tp = t === GOAL ? -1 : platform[t];
          if (tp === p) continue;
          const k = tp + ':' + di;
          if (!agg.has(k)) agg.set(k, { tp, di, ch: new Set(), pos: new Set() });
          const a = agg.get(k);
          a.ch.add(ch);
          a.pos.add(sx[id]);
        }
      }
    }
    const rows = [...agg.values()].sort((a, b) => (a.tp === -1 ? -1e9 : a.tp) - (b.tp === -1 ? -1e9 : b.tp));
    for (const a of rows) {
      const chs = [...a.ch].sort((x, y) => x - y);
      const tRow = a.tp === -1 ? 0 : Math.floor(a.tp / 64);
      const up = a.tp === -1 || tRow < Math.floor(p / 64);
      const arrow = ['←', '↑', '→'][a.di];
      const line = `     ${arrow} ${platName(a.tp).padEnd(18)} cargas ${chs[0]}-${chs[chs.length - 1]} (${chs.length})  de ${a.pos.size} posições`;
      console.log(up ? line : c.dim(line));
    }
  }
}

// -----------------------------------------------------------------------------
// 7) Resultado
// -----------------------------------------------------------------------------
console.log(
  c.dim(`\n${world.count} telas, ${nStates} posições de descanso exploradas, ${(nStates * (3 * NCH + 2)).toLocaleString('pt-BR')} simulações em ${elapsed}s.`)
);
for (const w of warnings.slice(0, 5)) console.log(c.yellow('Aviso: ' + w));
if (errors.length) {
  console.error(c.red(c.bold(`\nFALHOU — ${errors.length} problema(s):`)));
  for (const e of errors) console.error(c.red('  ✗ ' + e));
  process.exit(1);
}
console.log(c.green(c.bold('\n✔ Todas as telas podem ser completadas até o topo, sem becos sem saída.')));
