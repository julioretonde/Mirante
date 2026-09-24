import { config } from '../config.js';
import { createRandom } from '../core/Random.js';
import { footprintHeights, terrainHeight } from './heightfield.js';

/**
 * Layout procedural da cidade (dados puros, sem Three.js).
 * A rota principal é desenhada à mão depois (src/levels); aqui só reservamos o corredor dela
 * e a praça da torre, e preenchemos o resto com bairros que têm identidade de zona (GDD §7).
 */

/** Estilos de edifício: tamanho de lote, quadras, andares e paletas. */
export const STYLES = {
  house: {
    lot: 9, block: 4, street: 6, fill: 0.92, size: [6.5, 8.2], floors: [2, 4], floorH: 3,
    roof: 'gable', wall: 'house',
  },
  old: {
    lot: 14, block: 3, street: 7, fill: 0.9, size: [10.5, 12.8], floors: [4, 15], floorH: 3.2,
    roof: 'flat', wall: 'old',
  },
  market: {
    lot: 12, block: 3, street: 10, fill: 0.9, size: [9, 11], floors: [2, 4], floorH: 3.3,
    roof: 'gable', wall: 'house',
  },
  construction: {
    lot: 26, block: 2, street: 12, fill: 0.8, size: [17, 22], floors: [8, 30], floorH: 3.5,
    roof: 'flat', wall: 'office',
  },
  office: {
    lot: 24, block: 2, street: 12, fill: 0.85, size: [15, 20], floors: [8, 26], floorH: 3.5,
    roof: 'flat', wall: 'office',
  },
  glass: {
    lot: 42, block: 2, street: 16, fill: 0.8, size: [24, 32], floors: [22, 64], floorH: 3.5,
    roof: 'flat', wall: 'glass', chamfer: true,
  },
};

const PARK_STYLES = new Set(['house', 'old', 'market', 'office', 'glass', 'construction']);

/** Bairros: cada lote pertence ao bairro de âncora mais próxima (Voronoi ponderado). */
export const DISTRICTS = [
  {
    id: 'vale', zone: 1, center: [0, 300], style: 'house', weight: 1,
    walls: ['#efe3cf', '#e8c9a8', '#d9a283', '#f2d8bc', '#e0cdb0'],
    roofs: ['#b86f55', '#a95f48', '#c47a5a'],
  },
  {
    id: 'telhados', zone: 2, center: [-80, 205], style: 'old', weight: 1,
    walls: ['#ebbfb0', '#dcab72', '#ecd0ab', '#d69c88', '#f1dcc4'],
    roofs: ['#a06050', '#b67758', '#8f5a4c'],
  },
  {
    id: 'mercado', zone: 3, center: [-45, 120], style: 'market', weight: 0.8,
    walls: ['#f3d6ae', '#b5d6cb', '#f5c1b1', '#ecdd9c', '#cfc2e4'],
    roofs: ['#c0735a', '#b8654f', '#d08a64'],
  },
  {
    id: 'obras', zone: 4, center: [85, 25], style: 'construction', weight: 0.9,
    walls: ['#cfcac1', '#bab5ad', '#ddd7cb', '#c8bfae'],
    roofs: ['#9d988f', '#8e8a84'],
  },
  {
    id: 'vidro', zone: 5, center: [30, -150], style: 'glass', weight: 1.15,
    walls: ['#7eaab2', '#8fb9bf', '#6b97a3', '#a3c3c6'],
    roofs: ['#56737c', '#627f86'],
  },
  // Periferias (preenchem as encostas; sem zona jogável)
  { id: 'leste-sul', zone: 0, center: [270, 270], style: 'house', weight: 1.1, walls: ['#efe3cf', '#e5c4a0', '#d9b193', '#c9c2a8'], roofs: ['#b06c55', '#a45f4a'] },
  { id: 'oeste-sul', zone: 0, center: [-280, 290], style: 'house', weight: 1.1, walls: ['#efe3cf', '#e8c9a8', '#cdbb9e', '#e6cfb6'], roofs: ['#b86f55', '#9f604c'] },
  { id: 'leste-meio', zone: 0, center: [280, 90], style: 'old', weight: 1.1, walls: ['#e3c1ae', '#d8b88e', '#e9d5bb', '#c9ad97'], roofs: ['#9a6252', '#a8705a'] },
  { id: 'oeste-meio', zone: 0, center: [-290, 60], style: 'old', weight: 1.1, walls: ['#e7c3b4', '#d6ae80', '#eadac2', '#cfa996'], roofs: ['#a06050', '#8f5a4c'] },
  { id: 'leste-norte', zone: 0, center: [270, -210], style: 'office', weight: 1.1, walls: ['#c9c6c0', '#b9c3c7', '#d7cfc4', '#a9b7bd'], roofs: ['#8b8a88', '#7d8487'] },
  { id: 'oeste-norte', zone: 0, center: [-270, -190], style: 'office', weight: 1.1, walls: ['#cfc9c0', '#b6c1c6', '#dcd2c6', '#aebbbf'], roofs: ['#8b8a88', '#7d8487'] },
  { id: 'norte', zone: 0, center: [0, -390], style: 'office', weight: 0.9, walls: ['#cfc9c0', '#b9c3c7', '#d7cfc4'], roofs: ['#8b8a88'] },
];

/**
 * Corredor da rota principal (linha central em XZ). Os níveis desenhados à mão ocupam
 * esta faixa; o gerador não coloca prédios nela.
 */
export const ROUTE = [
  [0, 360],
  [0, 300],
  [-10, 262],
  [-50, 232],
  [-80, 190],
  [-72, 150],
  [-45, 118],
  [-20, 98],
  // Linha do bonde: do mercado ao canteiro de obras
  [40, 62],
  [72, 28],
  [66, -20],
  [40, -80],
  [22, -140],
  [10, -200],
  [0, -250],
];

/** Cidade ocupa um "quadrado arredondado" (superelipse): 0 no centro, 1 na borda. */
export function cityEdge(x, z) {
  const half = config.world.citySize / 2;
  return Math.pow(Math.pow(Math.abs(x) / half, 4) + Math.pow(Math.abs(z) / half, 4), 1 / 4);
}

export function distanceToRoute(x, z) {
  let best = Infinity;
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const [ax, az] = ROUTE[i];
    const [bx, bz] = ROUTE[i + 1];
    const vx = bx - ax;
    const vz = bz - az;
    const len2 = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / len2));
    best = Math.min(best, Math.hypot(x - (ax + vx * t), z - (az + vz * t)));
  }
  return best;
}

function districtAt(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dist = Math.hypot(x - d.center[0], z - d.center[1]) / d.weight;
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

/** Posição do lote i numa grade com quadras de `block` lotes separadas por ruas. */
function lotCoord(i, style) {
  return i * style.lot + Math.floor(i / style.block) * style.street;
}

/**
 * Gera a lista de prédios e marcos (guindastes). Determinística para a mesma seed.
 * @returns {{ buildings: object[], cranes: object[], parks: object[] }}
 */
export function generateCityLayout(seed = config.world.seed) {
  const rnd = createRandom(seed);
  const half = config.world.citySize / 2;
  const [towerX, towerZ] = config.world.towerPosition;
  const plaza = config.world.towerPlazaRadius;
  const routeClear = config.world.routeHalfWidth;
  const [spawnX, , spawnZ] = config.world.spawn;

  const buildings = [];
  const grid = new Map(); // hash espacial para evitar sobreposição
  const CELL = 48;
  const key = (cx, cz) => `${cx},${cz}`;

  const overlaps = (b) => {
    const minCx = Math.floor((b.x - b.w / 2) / CELL);
    const maxCx = Math.floor((b.x + b.w / 2) / CELL);
    const minCz = Math.floor((b.z - b.d / 2) / CELL);
    const maxCz = Math.floor((b.z + b.d / 2) / CELL);
    for (let cx = minCx - 1; cx <= maxCx + 1; cx++) {
      for (let cz = minCz - 1; cz <= maxCz + 1; cz++) {
        for (const o of grid.get(key(cx, cz)) ?? []) {
          if (Math.abs(o.x - b.x) * 2 < o.w + b.w + 1 && Math.abs(o.z - b.z) * 2 < o.d + b.d + 1) return true;
        }
      }
    }
    return false;
  };

  const parks = [];
  const insertPark = (p) => {
    const k = key(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(p);
    parks.push(p);
  };

  const insert = (b) => {
    const k = key(Math.floor(b.x / CELL), Math.floor(b.z / CELL));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(b);
    buildings.push(b);
  };

  // Bairros mais densos primeiro: o Centro de Vidro reserva espaço antes dos vizinhos.
  const order = ['glass', 'construction', 'office', 'market', 'old', 'house'];
  for (const styleName of order) {
    const style = STYLES[styleName];
    const count = Math.ceil((config.world.citySize + 200) / style.lot);
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        const cx = -half - 100 + lotCoord(i, style) + style.lot / 2;
        const cz = -half - 100 + lotCoord(j, style) + style.lot / 2;
        if (cityEdge(cx, cz) > 0.97) continue;
        const district = districtAt(cx, cz);
        if (district.style !== styleName) continue;
        if (!rnd.chance(style.fill)) {
          // Lote vazio vira praça (com grama e árvores) nos bairros de escala humana
          if (PARK_STYLES.has(styleName) && rnd.chance(0.6)) {
            const pw = Math.min(style.lot - 1, 30);
            const park = { x: cx, z: cz, w: pw, d: pw, seed: rnd.int(0, 9999), district: district.id };
            const r = pw * 0.7;
            const ok =
              Math.hypot(cx - towerX, cz - towerZ) > plaza + r &&
              distanceToRoute(cx, cz) > routeClear + r * 0.75 &&
              footprintHeights(cx, cz, pw, pw).max - footprintHeights(cx, cz, pw, pw).min < 4 &&
              !overlaps(park);
            if (ok) {
              park.ground = footprintHeights(cx, cz, pw, pw).min;
              insertPark(park);
            }
          }
          continue;
        }

        const w = rnd.range(style.size[0], style.size[1]);
        const d = rnd.range(style.size[0], style.size[1]);
        const x = cx + rnd.range(-0.4, 0.4) * (style.lot - w);
        const z = cz + rnd.range(-0.4, 0.4) * (style.lot - d);
        const radius = Math.hypot(w, d) / 2;

        if (Math.hypot(x - towerX, z - towerZ) < plaza + radius) continue;
        if (distanceToRoute(x, z) < routeClear + radius * 0.75) continue;
        if (Math.hypot(x - spawnX, z - spawnZ) < 10 + radius) continue;

        const { min, max } = footprintHeights(x, z, w, d);
        if (max - min > 9) continue; // encosta íngreme demais para um prédio

        // Mais ao norte, mais alto (a cidade "sobe" rumo à torre)
        const north = Math.min(Math.max((spawnZ - z) / (spawnZ - towerZ), 0), 1);
        const [f0, f1] = style.floors;
        let floors = Math.round(f0 + (f1 - f0) * Math.pow(rnd.next(), 1.6) * (0.55 + 0.45 * north));
        if (styleName === 'glass') {
          // Os mais altos ficam perto do centro do bairro
          const dc = Math.hypot(x - district.center[0], z - district.center[1]);
          floors = Math.round(floors * (1 - Math.min(dc / 260, 0.6)));
        }
        floors = Math.max(f0, floors);
        let height = floors * style.floorH;
        height = Math.min(height, config.world.maxBuildingHeight);

        const b = {
          id: buildings.length,
          x, z, w, d,
          ground: min - 1.5, // afunda um pouco para nunca "flutuar" na encosta
          top: max + height,
          height,
          floors,
          style: styleName,
          wall: style.wall,
          roof: style.roof,
          chamfer: !!style.chamfer,
          district: district.id,
          zone: district.zone,
          wallColor: rnd.pick(district.walls),
          roofColor: rnd.pick(district.roofs),
          seed: rnd.int(0, 9999),
          // Detalhes consumidos pelos props
          unfinished: styleName === 'construction' && rnd.chance(0.45),
          chimney: styleName === 'house' && rnd.chance(0.5),
          waterTank: (styleName === 'old' || styleName === 'office') && rnd.chance(0.45),
          antenna: styleName !== 'house' && styleName !== 'market' && rnd.chance(0.35),
          awnings: styleName === 'market' ? 2 : styleName === 'house' && rnd.chance(0.25) ? 1 : 0,
          setbacks: styleName === 'glass' && height > 90 ? rnd.int(1, 2) : 0,
        };
        if (overlaps(b)) continue;
        insert(b);
      }
    }
  }

  // Marcos do Centro de Vidro: o mais alto (≈ torre ÷ 2,5) e dois vizinhos, perto do centro do bairro
  const vidro = DISTRICTS.find((d) => d.id === 'vidro');
  const glass = buildings
    .filter((b) => b.style === 'glass')
    .sort(
      (a, b) =>
        Math.hypot(a.x - vidro.center[0], a.z - vidro.center[1]) - Math.hypot(b.x - vidro.center[0], b.z - vidro.center[1]),
    );
  const landmarkHeights = [config.world.maxBuildingHeight, 196, 178];
  glass.slice(0, landmarkHeights.length).forEach((b, i) => {
    const floors = Math.floor(landmarkHeights[i] / STYLES.glass.floorH);
    b.floors = floors;
    b.height = floors * STYLES.glass.floorH;
    b.top = b.ground + 1.5 + b.height;
    b.setbacks = 2;
    b.antenna = true;
    b.landmark = true;
  });

  // Guindastes no canteiro de obras, ao lado de prédios inacabados
  const cranes = [];
  const unfinished = buildings.filter((b) => b.unfinished).sort((a, b) => b.height - a.height);
  for (const b of unfinished.slice(0, 5)) {
    const side = rnd.chance(0.5) ? 1 : -1;
    const x = b.x + side * (b.w / 2 + 4);
    const z = b.z;
    cranes.push({
      x, z,
      ground: terrainHeight(x, z) - 1,
      height: b.height + rnd.range(18, 30),
      jib: rnd.range(38, 55),
      rotation: rnd.range(0, Math.PI * 2),
      seed: rnd.int(0, 9999),
    });
  }

  return { buildings, cranes, parks };
}
