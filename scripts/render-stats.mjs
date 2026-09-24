/**
 * Diagnóstico de renderização por vista: draw calls, triângulos, geometrias, texturas,
 * programas e triângulos por camada do mundo. Uso: npm run stats [-- rua,topo [alta]]
 * Orçamento mobile (skill threejs-aaa-graphics-builder): ≤150 calls, ≤300k triângulos.
 */
import { startGame, waitForFrames } from './lib/harness.mjs';

const views = (process.argv[2] ?? 'rua,telhados,aerea,vidro,jardins,topo').split(',');
const quality = process.argv[3] ?? 'media'; // preset do celular
const game = await startGame(5198);
const rows = [];
try {
  for (const view of views) {
    const page = await game.browser.newPage({ viewport: { width: 844, height: 390 } });
    await page.goto(`${game.url}?view=${view}&quality=${quality}`);
    await waitForFrames(page);
    rows.push({
      view,
      ...(await page.evaluate(() => {
        const { world, game } = window.__mirante;
        const tri = (root) => {
          let n = 0;
          root.traverse((m) => {
            if (!m.isMesh || !m.geometry) return;
            const g = m.geometry;
            const count = g.index ? g.index.count : g.attributes.position.count;
            n += (count / 3) * (m.isInstancedMesh ? m.count : 1);
          });
          return Math.round(n / 1000) + 'k';
        };
        const info = game.renderer.info;
        // Frame comum (sombra reaproveitada) e frame com o mapa de sombra refeito
        game.renderer.shadowMap.needsUpdate = false;
        game.renderer.render(game.scene, game.camera);
        const plain = { calls: info.render.calls, tris: info.render.triangles };
        game.renderer.shadowMap.needsUpdate = true;
        game.renderer.render(game.scene, game.camera);
        const withShadow = { calls: info.render.calls, tris: info.render.triangles };
        return {
          calls: plain.calls,
          triangles: Math.round(plain.tris / 1000) + 'k',
          'c/ sombra': `${withShadow.calls} / ${Math.round(withShadow.tris / 1000)}k`,
          geometries: info.memory.geometries,
          textures: info.memory.textures,
          programs: info.programs.length,
          'terreno*': tri(world.terrain.group),
          'natureza*': tri(world.nature.group),
          'props*': tri(world.props.group),
          'torre*': tri(world.tower.group),
          'cidade LOD atual*': (() => {
            let n = 0;
            let near = 0;
            for (const c of world.city.chunks) {
              const level = c.getCurrentLevel();
              if (level === 0) near++;
              n += Number(tri(c.levels[level].object).replace('k', ''));
            }
            return `${n}k (${near}/${world.city.chunks.length} perto)`;
          })(),
        };
      })),
    });
    await page.close();
  }
} finally {
  await game.close();
}
console.table(rows);
console.log('* triângulos totais da camada (antes de culling/LOD)');
