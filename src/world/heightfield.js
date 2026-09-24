import { config } from '../config.js';

const [SPAWN_X, , SPAWN_Z] = config.world.spawn;
const TOWER_Z = config.world.towerPosition[1];
const TOWER_BASE = config.world.towerBaseAltitude;
const HALF = config.world.citySize / 2;

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const smooth = (t) => t * t * (3 - 2 * t);

function hash(ix, iz) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruído de valor 2D suave (determinístico), em [0, 1]. */
export function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Soma de oitavas de ruído (colinas), em [0, 1]. */
export function fbm(x, z, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * f, z * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/** 0 dentro da cidade, cresce a partir da borda (mesma superelipse do layout). */
export function outsideCity(x, z) {
  const e = Math.pow(Math.pow(Math.abs(x) / HALF, 4) + Math.pow(Math.abs(z) / HALF, 4), 1 / 4);
  return clamp((e - 1) / 0.45, 0, 1);
}

/**
 * Altura do terreno (vale em anfiteatro). Função pura: usada pelo gerador, pela malha e,
 * depois, pela física. O ponto de nascimento é o mais baixo; a torre fica no alto, ao norte.
 */
export function terrainHeight(x, z) {
  const t = (SPAWN_Z - z) / (SPAWN_Z - TOWER_Z); // 0 no nascimento, 1 na torre
  let h = TOWER_BASE * smooth(clamp(t, 0, 1));
  if (t > 1) h += 90 * smooth(clamp((t - 1) / 0.8, 0, 1)); // atrás da torre, o terreno continua subindo

  // Encostas do vale a leste e oeste
  const side = Math.abs(x - SPAWN_X) / 400;
  const sideC = Math.min(side, 1.25); // limitado: longe do vale o relevo vem das colinas, não da parábola
  h += 22 * sideC * sideC * (0.5 + 0.5 * clamp(t, 0, 1));
  if (side > 1) h += 110 * smooth(clamp((side - 1) / 0.9, 0, 1));

  // O vale se fecha ao sul, logo atrás do nascimento
  // (colinas de até ~110 m; mais que isso esconderia o céu lá do alto)
  h += 110 * smooth(clamp((z - SPAWN_Z - 20) / 260, 0, 1));

  // Ondulação suave, nula perto do nascimento
  const d = Math.hypot(x - SPAWN_X, z - SPAWN_Z);
  const n = 0.5 + (Math.sin(x * 0.021 + 1.7) * Math.cos(z * 0.017 - 0.4) + Math.sin((x + z) * 0.008)) * 0.25;
  h += n * 3.5 * smooth(clamp(d / 80, 0, 1));

  // Colinas onduladas fora da cidade (anfiteatro verde, não uma rampa lisa)
  const out = outsideCity(x, z);
  if (out > 0) h += out * (fbm(x / 260, z / 260) - 0.35) * 90;
  return h;
}

/** Menor e maior altura sob um retângulo alinhado aos eixos. */
export function footprintHeights(x, z, w, d) {
  let min = Infinity;
  let max = -Infinity;
  for (const [dx, dz] of [
    [-0.5, -0.5],
    [0.5, -0.5],
    [-0.5, 0.5],
    [0.5, 0.5],
    [0, 0],
  ]) {
    const h = terrainHeight(x + dx * w, z + dz * d);
    min = Math.min(min, h);
    max = Math.max(max, h);
  }
  return { min, max };
}
