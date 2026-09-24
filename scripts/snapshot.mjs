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

const shots = [
  { name: 'etapa0-inicio', query: '', viewport: LANDSCAPE },
  { name: 'etapa0-debug', query: '?debug=1', viewport: LANDSCAPE },
  { name: 'etapa0-sair', query: '', viewport: LANDSCAPE, action: (page) => page.keyboard.press('Escape') },
  { name: 'etapa0-retrato', query: '', viewport: PORTRAIT },
  { name: 'etapa0-en', query: '', viewport: LANDSCAPE, locale: 'en-US', action: (page) => page.keyboard.press('Escape') },
];

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
    for (const shot of shots) {
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
      await page.waitForSelector('html[data-ready="true"]', { timeout: 30000 });
      await page.waitForTimeout(2500);
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
