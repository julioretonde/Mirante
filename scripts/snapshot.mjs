/**
 * Verificação visual: abre o jogo num Chromium headless em viewport de celular (paisagem)
 * e salva capturas em snapshots/. Uso: npm run snapshot
 *
 * Primeira vez no seu computador: npx playwright install chromium
 */
import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const OUT = path.resolve('snapshots');
const LANDSCAPE = { width: 844, height: 390 };
const PORTRAIT = { width: 390, height: 844 };

/** Usa o Chromium pré-instalado do ambiente, se houver (evita baixar outro). */
async function findChromium() {
  if (process.env.MIRANTE_CHROMIUM) return process.env.MIRANTE_CHROMIUM;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base || !existsSync(base)) return undefined;
  const dirs = (await readdir(base)).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const exe = path.join(base, d, 'chrome-linux', 'chrome');
    if (existsSync(exe)) return exe;
  }
  return undefined;
}

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
  { name: 'etapa1-debug', query: '?view=rua&debug=1', viewport: LANDSCAPE },
  { name: 'etapa1-sair', query: '?view=rua', viewport: LANDSCAPE, action: escape },
  { name: 'etapa1-retrato', query: '', viewport: PORTRAIT },
  { name: 'etapa1-en', query: '?view=rua', viewport: LANDSCAPE, locale: 'en-US', action: escape },
];

const only = process.argv[2] ? new RegExp(process.argv[2]) : null;

async function main() {
  await mkdir(OUT, { recursive: true });
  const server = await createServer({ logLevel: 'error', server: { port: 5199, host: '127.0.0.1' } });
  await server.listen();
  const url = `http://127.0.0.1:${server.config.server.port}/`;

  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });

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
      await page.waitForSelector('html[data-ready="true"]', { timeout: 60000 });
      // Espera alguns frames renderizados (o SwiftShader do headless é lento)
      await page.waitForFunction(() => (window.__mirante?.game.loop.elapsed ?? 1) > 0.6, null, { timeout: 60000 });
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
    await browser.close();
    await server.close();
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
