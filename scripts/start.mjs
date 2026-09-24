#!/usr/bin/env node
// =============================================================================
//  npm start — o jeito mais fácil de jogar
// -----------------------------------------------------------------------------
//  1. confere a versão do Node;
//  2. instala as dependências que estiverem faltando (npm install);
//  3. sobe o servidor de desenvolvimento acessível pela rede local (--host);
//  4. mostra o link local, o link da rede Wi-Fi e um QR code para o celular;
//  5. abre o jogo no navegador do computador.
//  Variáveis opcionais: PORT=5173, NO_OPEN=1 (não abrir o navegador).
// =============================================================================

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const isWin = process.platform === 'win32';
const color = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = color('1');
const green = color('32');
const cyan = color('36');
const yellow = color('33');
const red = color('31');
const dim = color('2');

// 1) Node -----------------------------------------------------------------------
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 19)) {
  console.error(red(bold('\n  Seu Node.js é muito antigo (' + process.version + ').')));
  console.error('  Instale a versão LTS (22 ou mais nova) em https://nodejs.org e rode de novo.\n');
  process.exit(1);
}

// 2) Dependências -------------------------------------------------------------
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
const missing = deps.filter((d) => !fs.existsSync(path.join('node_modules', ...d.split('/'), 'package.json')));
if (missing.length) {
  console.log(cyan(bold('\n  Instalando o que falta (' + missing.join(', ') + ')...\n')));
  const r = spawnSync(isWin ? 'npm.cmd' : 'npm', ['install', '--no-audit', '--no-fund'], {
    stdio: 'inherit',
    shell: isWin,
  });
  if (r.status !== 0) {
    console.error(red(bold('\n  Não foi possível instalar as dependências. Verifique sua internet e tente de novo.\n')));
    process.exit(1);
  }
}

// 3) Servidor -----------------------------------------------------------------
const { createServer } = await import('vite');
const qrcode = (await import('qrcode-terminal')).default;

const port = Number(process.env.PORT) || 5173;
const server = await createServer({
  configFile: path.join(root, 'vite.config.js'),
  server: { host: true, port, open: false },
  clearScreen: false,
  logLevel: 'warn',
});
await server.listen();

const urls = server.resolvedUrls || { local: [], network: [] };
const local = urls.local[0] || `http://localhost:${port}/`;

/** Prefere endereços de Wi-Fi/LAN comuns e evita adaptadores virtuais. */
function score(u) {
  const host = new URL(u).hostname;
  if (/^192\.168\.56\./.test(host)) return 5; // VirtualBox
  if (/^172\.(17|18|19)\./.test(host)) return 4; // Docker/WSL
  if (/^192\.168\./.test(host)) return 0;
  if (/^10\./.test(host)) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return 2;
  return 3;
}
const network = [...(urls.network || [])].sort((a, b) => score(a) - score(b));
const lan = network[0];

// 4) Links + QR code ----------------------------------------------------------
const line = '═'.repeat(58);
console.log('\n' + yellow(line));
console.log(bold(yellow('   ASCENDA ')) + '— o jogo está rodando!');
console.log(yellow(line));
console.log(`\n   ${bold('No computador:')}  ${green(bold(local))}`);
if (lan) {
  console.log(`   ${bold('No celular   :')}  ${cyan(bold(lan))}`);
  for (const other of network.slice(1)) console.log(dim(`                   (ou ${other})`));
  console.log(`\n   ${bold('Aponte a câmera do celular para o QR code abaixo')}`);
  console.log(dim('   (o celular precisa estar na MESMA rede Wi-Fi do computador)\n'));
  qrcode.generate(lan, { small: true }, (qr) => {
    console.log(
      qr
        .split('\n')
        .map((l) => '   ' + l)
        .join('\n')
    );
  });
} else {
  console.log(yellow('\n   Nenhuma rede local encontrada: conecte o computador ao Wi-Fi para jogar no celular.'));
}
console.log(`\n   ${dim('Para parar o servidor: Ctrl+C')}`);
console.log(yellow(line) + '\n');

// 5) Abre o navegador ---------------------------------------------------------
function openBrowser(url) {
  if (process.env.NO_OPEN || process.env.CI) return;
  try {
    let child;
    if (isWin) child = spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true });
    else if (process.platform === 'darwin') child = spawn('open', [url], { detached: true, stdio: 'ignore' });
    else child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    child.on('error', () => console.log(dim('   (abra o link acima no navegador)')));
    child.unref();
  } catch {
    console.log(dim('   (abra o link acima no navegador)'));
  }
}
openBrowser(local);

const stop = async () => {
  await server.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
