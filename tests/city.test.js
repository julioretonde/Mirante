import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { generateCityLayout, distanceToRoute, cityEdge, ROUTE } from '../src/world/cityLayout.js';
import { terrainHeight } from '../src/world/heightfield.js';

const layout = generateCityLayout();
const { buildings } = layout;

describe('Layout da cidade', () => {
  it('é determinístico para a mesma seed', () => {
    const again = generateCityLayout();
    expect(again.buildings.length).toBe(buildings.length);
    expect(again.buildings.map((b) => [b.x, b.z, b.height])).toEqual(buildings.map((b) => [b.x, b.z, b.height]));
  });

  it('muda com outra seed', () => {
    const other = generateCityLayout(config.world.seed + 1);
    expect(other.buildings.map((b) => b.x)).not.toEqual(buildings.map((b) => b.x));
  });

  it('tem uma cidade cheia (centenas de prédios de todos os estilos)', () => {
    expect(buildings.length).toBeGreaterThan(1000);
    for (const style of ['house', 'old', 'market', 'construction', 'office', 'glass']) {
      expect(buildings.some((b) => b.style === style)).toBe(true);
    }
  });

  it('fica dentro dos limites da cidade', () => {
    for (const b of buildings) expect(cityEdge(b.x, b.z)).toBeLessThanOrEqual(1);
  });

  it('nenhum prédio se sobrepõe a outro', () => {
    const sorted = [...buildings].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      for (let j = i + 1; j < sorted.length && sorted[j].x - a.x < 40; j++) {
        const b = sorted[j];
        const overlapX = Math.abs(a.x - b.x) * 2 < a.w + b.w;
        const overlapZ = Math.abs(a.z - b.z) * 2 < a.d + b.d;
        expect(overlapX && overlapZ).toBe(false);
      }
    }
  });

  it('deixa livre o corredor da rota principal e a praça da torre', () => {
    const [tx, tz] = config.world.towerPosition;
    for (const b of buildings) {
      expect(distanceToRoute(b.x, b.z)).toBeGreaterThan(config.world.routeHalfWidth);
      expect(Math.hypot(b.x - tx, b.z - tz)).toBeGreaterThan(config.world.towerPlazaRadius);
    }
  });

  it('a torre tem ≈ 2,5× a altura do segundo prédio mais alto (GDD §3)', () => {
    const tallest = Math.max(...buildings.map((b) => b.height));
    expect(tallest).toBeLessThanOrEqual(config.world.maxBuildingHeight);
    expect(tallest).toBeGreaterThan(200);
    const towerHeight = config.world.summitAltitude - config.world.towerBaseAltitude;
    expect(towerHeight / tallest).toBeGreaterThanOrEqual(2.3);
    expect(towerHeight / tallest).toBeLessThanOrEqual(2.7);
  });

  it('a cidade sobe rumo à torre (prédios do norte são mais altos, em média)', () => {
    const avg = (list) => list.reduce((s, b) => s + b.height, 0) / list.length;
    const south = buildings.filter((b) => b.z > 150);
    const north = buildings.filter((b) => b.z < -100);
    expect(avg(north)).toBeGreaterThan(avg(south) * 3);
  });

  it('tem guindastes no canteiro de obras', () => {
    expect(layout.cranes.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Terreno', () => {
  const [sx, , sz] = config.world.spawn;

  it('o ponto de nascimento é o mais baixo do vale', () => {
    const spawnH = terrainHeight(sx, sz);
    expect(spawnH).toBeCloseTo(0, 5);
    for (let x = -400; x <= 400; x += 25) {
      for (let z = -400; z <= 400; z += 25) {
        expect(terrainHeight(x, z)).toBeGreaterThanOrEqual(spawnH - 1e-6);
      }
    }
  });

  it('a base da torre fica no alto, ao norte', () => {
    const [tx, tz] = config.world.towerPosition;
    expect(terrainHeight(tx, tz)).toBeGreaterThan(config.world.towerBaseAltitude - 3);
    expect(terrainHeight(tx, tz)).toBeLessThan(config.world.towerBaseAltitude + 5);
  });

  it('a rota vai do nascimento até perto da torre', () => {
    const [x0, z0] = ROUTE[0];
    const [x1, z1] = ROUTE[ROUTE.length - 1];
    expect(Math.hypot(x0 - sx, z0 - sz)).toBeLessThan(30);
    const [tx, tz] = config.world.towerPosition;
    expect(Math.hypot(x1 - tx, z1 - tz)).toBeLessThan(config.world.towerPlazaRadius);
  });
});
