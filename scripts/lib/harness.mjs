/** Utilitários comuns dos scripts que abrem o jogo num Chromium headless. */
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

/** Usa o Chromium pré-instalado do ambiente, se houver (evita baixar outro). */
export async function findChromium() {
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

export async function startGame(port) {
  const server = await createServer({ logLevel: 'error', server: { port, host: '127.0.0.1' } });
  await server.listen();
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  return {
    url: `http://127.0.0.1:${server.config.server.port}/`,
    browser,
    async close() {
      await browser.close();
      await server.close();
    },
  };
}

/** Espera o jogo iniciar e renderizar alguns frames (o SwiftShader do headless é lento). */
export async function waitForFrames(page, seconds = 0.6) {
  await page.waitForSelector('html[data-ready="true"]', { timeout: 60000 });
  await page.waitForFunction((s) => (window.__mirante?.game.loop.elapsed ?? 1) > s, seconds, { timeout: 60000 });
}
