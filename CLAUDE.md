# MIRANTE — guia do projeto

Jogo mobile 3D (Android + iOS) em que um personagem pequeno com cachecol vermelho sobe uma cidade
inteira até o topo da Torre Farol (600 m). Contemplativo, sem violência, ~1 hora de jogo.
Stack: Vite 8 + JavaScript (ES modules) + Three.js 0.186.0, empacotado com Capacitor 8.
100% offline; toda arte e áudio são gerados por código (sem imagens, modelos ou arquivos de áudio).

**Fonte da verdade:** `docs/GDD.md`. Leia as seções relevantes da etapa atual antes de agir.

## Etapa atual

**Etapa 0 – Fundação: concluída, aguardando feedback do usuário.**
Próxima: Etapa 1 – Mundo visível (cidade procedural, Torre Farol detalhada, céu, fog, câmera orbitando).
Antes de começar cada etapa: apresentar plano curto e esperar aprovação (GDD §11).

## Estrutura de pastas

Projeto na **raiz do repositório** (não numa subpasta `mirante/`).

    index.html              ponto de entrada (CSS base + src/main.js)
    capacitor.config.json   appId provisório com.seuestudio.mirante; SystemBars oculto; splash
    vite.config.js          base './', define __MIRANTE_DEBUG__, config do Vitest
    docs/GDD.md             especificação completa
    android/ ios/           projetos nativos (gerados pelo Capacitor, com ajustes manuais abaixo)
    scripts/snapshot.mjs    capturas headless (Playwright)
    tests/                  testes Vitest (*.test.js)
    store/                  textos das lojas etc. (Etapa 10)
    src/
      main.js               boot: idioma, plataforma, jogo, pausa, botão voltar, debug
      config.js             todos os valores de ajuste (render, mundo, cores, jogador)
      platform/             ÚNICO acesso a APIs nativas: env, Storage, Haptics, Lifecycle,
                            Orientation, StatusBar, KeepAwake, index.js (initPlatform)
      core/                 Game (renderer/cena/câmera), Loop, Events, Random (seed), dispose
      world/                Sky (shader gradiente), Lighting, Tower (provisória), PreviewWorld (provisório)
      ui/                   base.css, Dialog (confirmação), PauseVeil
      i18n/                 index.js (t, detectLanguage), pt-BR.js, en.js
      debug/                DebugPanel (+ debug.css)
      player/ camera/ levels/ mechanics/ npc/ audio/   vazias por enquanto

## Comandos

    npm run dev            servidor Vite com --host (http://localhost:5173, ?debug=1 abre o painel)
    npm run build          build de produção (com debug)
    npm run build:release  build de release (debug removido)
    npm run validate       Vitest (+ RouteValidator a partir da Etapa 3). Deve passar antes de commit.
    npm run snapshot       capturas 844×390 em snapshots/ (falha se houver erro no console)
    npm run android        build + cap sync + cap run android (emulador/aparelho)
    npm run android:open   build + cap sync + abre no Android Studio
    npm run android:apk    build + cap sync + gradlew assembleDebug (checa erros de build nativo)
    npm run ios            build + cap sync + abre no Xcode (só no Mac)
    npm run assets         (Etapa 10) ícones e splash

## Convenções

- Código do jogo nunca chama plugins do Capacitor diretamente: só via `src/platform/`, com fallback para navegador.
- Nenhum texto fixo no código: tudo em `src/i18n/` (pt-BR padrão, en incluído; teste garante as mesmas chaves).
- Valores de ajuste em `src/config.js`. Aleatoriedade sempre via `createRandom(seed)`.
- Níveis são dados declarativos em `src/levels/`, separados da lógica.
- Ao descarregar algo: `disposeObject(root)` (geometrias, materiais, texturas).
- APIs nativas e salvamento sempre em try/catch; o jogo funciona mesmo se falharem.
- Debug: código atrás de `if (__MIRANTE_DEBUG__)` + `import()` dinâmico, para sumir do build de release.
- Nada carregado da internet em tempo de execução.
- UI com cara de mundo do jogo (papel, lanterna, luz quente): classes `.paper` e `.lantern-btn`.
  Evitar pílulas genéricas, fonte mono, emoji, gradiente roxo-azulado (GDD §8). Respeitar `--safe-*`.
- Sem dependências além das previstas no GDD §2 (e Vitest/Playwright do §11) sem perguntar.
- Commits pequenos, descritivos, em português.
- Fim de cada etapa: build, validate, snapshot (analisar imagens), commit, atualizar este arquivo,
  resumo + "Como testar" + problemas conhecidos + próximos passos. Depois, parar e aguardar feedback.

## Ajustes manuais nos projetos nativos (preservar ao regenerar)

- Android `AndroidManifest.xml`: `android:screenOrientation="sensorLandscape"` na activity.
  Permissão INTERNET mantida só para live reload; remover/revisar na Etapa 10.
- Android `MainActivity.java`: modo imersivo (barras ocultas, reaparecem com deslize temporário).
- iOS `Info.plist`: só paisagem (iPhone e iPad), `UIStatusBarHidden`, `UIRequiresFullScreen`.

## Skills instaladas (.claude/skills)

De majidmanzarpour/threejs-game-skills (MIT): threejs-gameplay-systems, threejs-aaa-graphics-builder,
threejs-game-ui-designer, threejs-debug-profiler, threejs-qa-release. Geradores de assets por IA
excluídos de propósito. Se uma skill conflitar com o GDD (ex.: sugerir TypeScript), o GDD vence.

## Decisões tomadas

- Projeto na raiz do repositório em vez de `mirante/`.
- Tone mapping Neutral (preserva melhor os tons pastel que o ACES).
- Torre usa materiais sem fog + emissivo "enevoado" para nunca sumir na distância.
- Idioma: qualquer variante `pt*` → pt-BR; qualquer outro → en.
- No navegador, Esc funciona como botão voltar do Android.
- Ao voltar do segundo plano, o jogo fica pausado até o próximo toque (GDD §2).
- Desenvolvimento num container na nuvem (efêmero), sem KVM: não roda emulador. O usuário liberou
  dl.google.com; em cada sessão nova, rode `./scripts/cloud-android-sdk.sh` (instala SDK em ~/android-sdk
  e usa o espelho do Maven Central do Google, pois repo.maven.apache.org responde 429) e depois
  `npm run android:apk` antes de entregar etapas. Emulador/aparelho: no computador do usuário (Windows).
  O Chromium local roda o snapshot com SwiftShader (FPS baixo no headless é esperado).
- versionName 1.0.0 / versionCode 1 em android/app/build.gradle.

## Contexto do usuário

- Usa **Windows** e testa no **emulador** do Android Studio. Não tem Mac: build iOS exigirá um Mac
  (ou serviço de Mac na nuvem) na Etapa 10.
- Pediu para avisar quando algo estiver bloqueado e precisar de permissão.

## Pendências com o usuário

- appId definitivo (`com.SEUESTUDIO.mirante`) — perguntar antes da Etapa 10.
- Alerta moderado do `npm audit` (uuid via xcode, dependência só do @capacitor/cli, não vai no app).
