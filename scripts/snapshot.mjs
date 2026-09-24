/**
 * Verificação visual: abre o jogo num Chromium headless em viewport de celular (paisagem)
 * e salva capturas em snapshots/. Uso: npm run snapshot
 *
 * Primeira vez no seu computador: npx playwright install chromium
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { startGame, waitForFrames } from './lib/harness.mjs';

const OUT = path.resolve('snapshots');
const LANDSCAPE = { width: 844, height: 390 };
const PORTRAIT = { width: 390, height: 844 };

const escape = (page) => page.keyboard.press('Escape');

// Cada captura abre o jogo numa vista fixa (?view) e, se preciso, numa altura de luz (?height).
const shots = [
  { name: 'etapa1-rua', query: '?view=rua', viewport: LANDSCAPE },
  { name: 'etapa1-telhados', query: '?view=telhados', viewport: LANDSCAPE },
  { name: 'etapa1-aerea', query: '?view=aerea', viewport: LANDSCAPE },
  { name: 'etapa1-vidro', query: '?view=vidro', viewport: LANDSCAPE },
  { name: 'etapa1-jardins', query: '?view=jardins', viewport: LANDSCAPE },
  { name: 'etapa1-topo', query: '?view=topo', viewport: LANDSCAPE },
  { name: 'etapa1-luz-por-do-sol', query: '?view=aerea&height=240', viewport: LANDSCAPE },
  { name: 'etapa1-luz-crepusculo', query: '?view=aerea&height=470', viewport: LANDSCAPE },
  { name: 'etapa1-alta-rua', query: '?view=rua&quality=alta', viewport: LANDSCAPE },
  { name: 'etapa1-alta-noite', query: '?view=telhados&height=560&quality=alta', viewport: LANDSCAPE },
  {
    name: 'etapa1-voo',
    query: '?fly=1',
    viewport: LANDSCAPE,
    action: async (page) => {
      // Anda para a frente pela rua e olha um pouco para cima
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(2500);
      await page.keyboard.up('KeyW');
    },
  },
  { name: 'etapa1-debug', query: '?view=rua&debug=1', viewport: LANDSCAPE },
  { name: 'etapa1-sair', query: '?view=rua', viewport: LANDSCAPE, action: escape },
  { name: 'etapa1-retrato', query: '', viewport: PORTRAIT },
  { name: 'etapa1-en', query: '?view=rua', viewport: LANDSCAPE, locale: 'en-US', action: escape },
];

const only = process.argv[2] ? new RegExp(process.argv[2]) : null;

async function main() {
  await mkdir(OUT, { recursive: true });
  const game = await startGame(5199);
  const { url, browser } = game;

  const errors = [];
  try {
    for (const shot of shots.filter((s) => !only || only.test(s.name))) {
      const context = await browser.newContext({
        viewport: shot.viewport,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        locale: shot.locale ?? 'pt-BR',
      });
      const page = await context.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`[${shot.name}] ${msg.text()}`);
      });
      page.on('pageerror', (err) => errors.push(`[${shot.name}] ${err.message}`));

      await page.goto(url + shot.query);
      await waitForFrames(page);
      await page.waitForTimeout(500);
      if (shot.action) {
        await shot.action(page);
        await page.waitForTimeout(400);
      }
      const file = path.join(OUT, `${shot.name}.png`);
      await page.screenshot({ path: file });
      console.log('✔', path.relative(process.cwd(), file));
      await context.close();
    }
  } finally {
    await game.close();
  }

  if (errors.length) {
    console.error('\nErros no console:\n' + errors.join('\n'));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
