import { config } from '../config.js';

const [SPAWN_X, , SPAWN_Z] = config.world.spawn;
const TOWER_Z = config.world.towerPosition[1];
const TOWER_BASE = config.world.towerBaseAltitude;

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const smooth = (t) => t * t * (3 - 2 * t);

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
  h += 22 * side * side * (0.5 + 0.5 * clamp(t, 0, 1));
  if (side > 1) h += 110 * smooth(clamp((side - 1) / 0.9, 0, 1));

  // O vale se fecha ao sul, logo atrás do nascimento
  // (colinas de até ~110 m; mais que isso esconderia o céu lá do alto)
  h += 110 * smooth(clamp((z - SPAWN_Z - 20) / 260, 0, 1));

  // Ondulação suave, nula perto do nascimento
  const d = Math.hypot(x - SPAWN_X, z - SPAWN_Z);
  const n = 0.5 + (Math.sin(x * 0.021 + 1.7) * Math.cos(z * 0.017 - 0.4) + Math.sin((x + z) * 0.008)) * 0.25;
  h += n * 3.5 * smooth(clamp(d / 80, 0, 1));
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
