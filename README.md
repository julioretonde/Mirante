# Ascenda

**Ascenda** é um jogo de plataforma vertical de **pulo carregado** (no estilo
"rage platformer"), em pixel art 8-bit. Você controla um pequeno cavaleiro de
capa vermelha e elmo com pluma que precisa escalar uma torre imensa, através de
5 biomas e 31 telas, até recolocar a **estrela caída** no céu.

Não existe morte nem vidas: a única punição é cair… e às vezes despencar várias
telas de uma vez.

- HTML5 + JavaScript puro (módulos ES), Canvas 2D, sem engine.
- Física em **timestep fixo de 60 Hz**: o mesmo pulo é idêntico em qualquer aparelho.
- Resolução interna de **180×320** (retrato), escala inteira sem borrão.
- Toda a arte (sprites, tiles, fundos, fonte, ícones) é gerada em código.
- Todos os sons e músicas são sintetizados em tempo real (Web Audio API).
- Funciona como **PWA** (instalável e offline) e está pronto para **Capacitor**
  (APK Android / app iOS).

---

## Jeito mais fácil de jogar

1. Instale o **Node.js LTS** (versão 22 ou mais nova): <https://nodejs.org>
2. Dê **duplo clique** em:
   - **`JOGAR.bat`** no Windows
   - **`JOGAR.command`** no Mac (na primeira vez o macOS pode bloquear; clique
     com o botão direito › **Abrir** › **Abrir**)
3. Pronto: o jogo abre no navegador. No terminal aparecem o link do computador,
   o link da rede Wi-Fi e um **QR code** — aponte a câmera do celular para ele.

Os atalhos só rodam `npm start`, que também pode ser usado direto no terminal:

```bash
npm start
```

Ele instala o que estiver faltando, sobe o servidor na rede local e abre o
navegador. (Variáveis opcionais: `PORT=5180 npm start`, `NO_OPEN=1 npm start`.)

### Sem servidor e sem internet

Abra o arquivo **`jogo.html`** (na raiz do projeto) com duplo clique. Ele
contém o jogo inteiro em um único arquivo e funciona totalmente offline.
Para regenerá-lo depois de mudar o código ou as fases:

```bash
npm run build:single
```

---

## Controles

| Ação | Celular | Teclado |
|---|---|---|
| Andar (só no chão) | metade **esquerda** da tela: botões ← e → | ← → ou A D |
| Carregar o pulo | **segure** a metade **direita** da tela | segure Espaço (ou ↑ / W) |
| Pular | **solte** — a direção é a que estiver segurada no lado esquerdo naquele instante | solte o Espaço |
| Pausa | botão ❚❚ no canto superior direito | Esc ou P |
| Som | botão do alto-falante | M |
| Mostrar/ocultar HUD | menu de pausa | H |

- A força do pulo cresce enquanto você segura (até ~0,6 s). Na carga máxima o
  cavaleiro pula sozinho.
- **Não existe controle no ar.** A trajetória é decidida no instante do pulo.
- Bater numa parede no ar faz ricochetear; bater no teto faz cair.
- Quedas muito altas deixam o cavaleiro estatelado no chão por 1 segundo.
- Gelo escorrega; zonas de vento empurram para o lado enquanto você está no ar.

O jogo salva sozinho (posição, tempo, pulos e quedas). Na tela inicial aparecem
**Continuar** e **Novo jogo**.

---

## Comandos de desenvolvimento

```bash
npm install              # instala as dependências
npm run dev              # servidor de desenvolvimento (com --host)
npm run build            # build de produção da PWA em dist/
npm run preview          # serve o build de produção (com --host)
npm run build:single     # gera jogo.html (arquivo único, offline)
npm run validate-levels  # valida que todas as telas são possíveis
npm run icons            # regenera os ícones a partir da arte em código
```

---

## Testar no celular pela rede local

1. Computador e celular na **mesma rede Wi-Fi**.
2. Rode `npm start` (ou `npm run dev`).
3. Leia o QR code com a câmera do celular, ou digite o link "No celular"
   (algo como `http://192.168.0.10:5173`).

Se não abrir:

- **Windows**: na primeira vez o Firewall pergunta se o Node.js pode acessar a
  rede — permita em **Redes privadas**. Confira também se a rede Wi-Fi está
  marcada como "Privada".
- Redes de visitantes/corporativas às vezes bloqueiam a comunicação entre
  aparelhos. Teste em outra rede ou com o roteador de casa.
- No **WSL** o link de rede aponta para a máquina virtual; rode pelo Windows
  (`JOGAR.bat`).

> Pela rede local (http) dá para jogar normalmente, mas o navegador só permite
> **instalar** a PWA e usar o modo offline em endereços **https** (ou
> `localhost`). Para instalar no celular, publique o build (abaixo).

---

## PWA (instalar e jogar offline)

```bash
npm run build
```

A pasta `dist/` é um site estático completo com `manifest.webmanifest`,
ícones e `sw.js` (service worker gerado no build com a lista de todos os
arquivos). Publique a pasta em qualquer hospedagem com **https** — GitHub
Pages, Netlify, Vercel, Cloudflare Pages etc. Como os caminhos são relativos,
funciona também em subpastas.

Depois de abrir o site uma vez, o jogo funciona sem internet. No Android use
**"Instalar app"/"Adicionar à tela inicial"**; no iPhone use **Compartilhar ›
Adicionar à Tela de Início**.

Para testar o build localmente: `npm run build && npm run preview`.

---

## Gerar o APK Android e o app iOS (Capacitor)

O Capacitor 8 já está configurado (`capacitor.config.json`, `webDir: dist`).
As pastas nativas `android/` e `ios/` são criadas na primeira vez pelos
comandos abaixo.

### Android (APK)

Pré-requisitos: **Android Studio** atualizado (ele já inclui o JDK e o SDK).

```bash
npm run android:add      # só na primeira vez: build + cria a pasta android/
npm run android:open     # build + sincroniza + abre no Android Studio
```

No Android Studio: **Build › Build App Bundle(s) / APK(s) › Build APK(s)**.
O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`.

Pelo terminal (sem abrir o Android Studio):

```bash
npm run build && npx cap sync android
cd android
./gradlew assembleDebug      # no Windows: gradlew.bat assembleDebug
```

Para testar direto num celular conectado por USB (depuração USB ativada):
`npx cap run android`.

Para publicar na Play Store gere um **App Bundle assinado** em
**Build › Generate Signed App Bundle / APK** e troque o `appId`
(`com.ascenda.jogo`) em `capacitor.config.json` por um identificador seu
**antes** de rodar `android:add`.

### iOS

Pré-requisitos: um **Mac** com **Xcode** atualizado.

```bash
npm run ios:add          # só na primeira vez
npm run ios:open         # build + sincroniza + abre no Xcode
```

No Xcode escolha seu time em **Signing & Capabilities** e rode no aparelho
ou no simulador.

### Depois de mudar o jogo

Sempre que alterar o código ou as fases:

```bash
npm run cap:sync         # build + copia para android/ e ios/
```

### Ícones, tela de abertura e orientação

- `npm run icons` gera `assets/icon-only.png`, `icon-foreground.png`,
  `icon-background.png`, `splash.png` e `splash-dark.png`. Para aplicá-los aos
  projetos nativos: `npx @capacitor/assets generate`.
- A orientação **retrato** e a permissão de vibração são aplicadas
  automaticamente nos projetos nativos pelos scripts `android:*`, `ios:*` e
  `cap:sync` (via `scripts/cap-native-setup.mjs`).
- As barras do sistema começam ocultas (configuração `SystemBars` em
  `capacitor.config.json`), e a vibração usa o plugin `@capacitor/haptics`
  (que também funciona no iPhone).

---

## Estrutura do projeto

```
index.html                 página do jogo
src/
  main.js                  inicialização
  config.js                TODAS as constantes de física e tela
  core/                    display (escala inteira), input (toque/teclado),
                           loop de 60 Hz fixo, salvamento
  game/
    physics.js             física do cavaleiro (também usada pelo validador)
    world.js               a torre montada a partir das telas
    player.js              estados, animações e estatísticas
    particles.js           poeira, folhas, brasas, neve, vento…
    game.js                máquina de estados: título, jogo, pausa, final
  render/                  desenho do mundo, auto-tile, interface, texto
  art/                     paleta de 32 cores e TODA a arte em matrizes de pixels
    palette.js  knight.js  tiles.js  decor.js  backgrounds.js  font.js  ui.js
  audio/                   sintetizador chiptune, efeitos e músicas
  levels/                  as 31 telas (uma lista por bioma) e a legenda
  platform/haptics.js      vibração (navegador ou app nativo)
public/                    manifest e ícones da PWA
assets/                    imagens-fonte para ícones/splash do Capacitor
scripts/                   npm start, validador, build do jogo.html, ícones
jogo.html                  versão em arquivo único (gerada)
JOGAR.bat / JOGAR.command  atalhos de clique duplo
```

### A arte

Cada sprite é uma lista de strings; **cada caractere é o índice da cor** na
paleta de 32 cores (`0`–`9` e `a`–`v`, `.` = transparente). Exemplo do elmo do
cavaleiro em `src/art/knight.js`:

```
'.......06650....',
'......0665540...',
'......06500o0...',   <- visor com brilho (o = cor 24)
```

Os fundos com parallax são gerados proceduralmente em `src/art/backgrounds.js`
usando só cores da paleta (faixas sólidas e pontilhados, sem degradês).

---

## Criando e editando telas

As telas ficam em `src/levels/` (um arquivo por bioma), **de baixo para
cima**. Cada tela tem 40 linhas × 22 colunas de tiles 8×8:

```js
{
  name: 'Minha Tela',
  map: [
    '##..................##', // linha do TOPO da tela
    // ... 38 linhas ...
    '##====..........====##', // linha de BAIXO
  ],
},
```

Legenda (detalhes em `src/levels/legend.js`):

| Caractere | Significado |
|---|---|
| `#` | bloco principal do bioma (terra, pedra, tijolo, alvenaria, rocha) |
| `T` | bloco secundário (tronco, coluna, pilar) |
| `=` | plataforma / galho / viga / degrau |
| `M` | chapéu de cogumelo gigante (floresta) |
| `C` | nuvem sólida (céu) |
| `I` | **gelo** (escorregadio) |
| `<` `>` | **vento** para a esquerda / direita (só age no ar) |
| `P` | posição inicial (só na 1ª tela) |
| `G` | estrela final (só na última tela) |
| `.` | vazio |
| minúsculas | decorações: `m` cogumelo, `f` samambaia, `v` cipó/musgo, `l` folhagem, `c` coluna ao fundo, `r` entulho, `b` estandarte, `w` janela, `h` corrente, `t` tocha, `g` vitral, `k` sino, `n` vela, `s` pingentes de gelo, `p` pinheiro, `u` bandeirola, `o` cristais |

Depois de editar, **sempre** rode o validador:

```bash
npm run validate-levels
```

Ele simula a física real do jogo (a mesma de `src/game/physics.js`) a partir
do início, testando andar e **todas** as combinações de carga × direção de
cada lugar onde o cavaleiro consegue ficar parado. Ele falha se:

- a estrela do topo não for alcançável;
- existir algum lugar alcançável de onde não dá mais para chegar ao topo
  (um "buraco sem saída" — fatal num jogo sem morte);
- alguma tela nunca for visitada.

Também mostra um relatório de dificuldade por tela ("janela" = quantos frames
seguidos de carga acertam o pulo mais difícil da rota mais fácil). Opções úteis:

```bash
node scripts/validate-levels.mjs --routes     # mostra a rota mais fácil de cada tela
node scripts/validate-levels.mjs --map 12     # desenha a tela 12 com os pontos alcançáveis
node scripts/validate-levels.mjs --links 12   # para onde cada plataforma da tela 12 consegue pular
```

### Modo debug

Abra o jogo com **`?debug=1`** no fim do endereço
(ex.: `http://localhost:5173/?debug=1`):

- caixas de colisão, tiles sólidos, zonas de vento e a estrela;
- FPS, número/nome da tela, posição e velocidade;
- **prévia da trajetória** enquanto carrega o pulo;
- teleporte entre telas: botões **`<T`** e **`T>`** no topo, ou as teclas
  **`[`** e **`]`** (ou PageDown/PageUp);
- **Shift + clique** leva o cavaleiro até o ponto clicado.

### Ajustando a física

Todas as constantes estão em `src/config.js` (gravidade, queda máxima, força
mínima e máxima do pulo, velocidade horizontal, tempo de carga, perda no
ricochete, gelo, vento, altura do "splat"…). Depois de mudar algo, rode
`npm run validate-levels` para conferir se as fases continuam possíveis.

---

## Solução de problemas

- **"node não é reconhecido"**: instale o Node.js LTS e abra um terminal novo.
- **Porta ocupada**: `PORT=5180 npm start` (Windows PowerShell:
  `$env:PORT=5180; npm start`).
- **Sem som**: toque na tela uma vez (os navegadores só liberam áudio após um
  toque) e confira o ícone do alto-falante e o modo silencioso do celular.
- **Recomeçar do zero**: menu de pausa › Reiniciar, ou limpe os dados do site.
