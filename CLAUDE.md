# MIRANTE — guia do projeto

Jogo mobile 3D (Android + iOS) em que um personagem pequeno com cachecol vermelho sobe uma cidade
inteira até o topo da Torre Farol (600 m). Contemplativo, sem violência, ~1 hora de jogo.
Stack: Vite + JavaScript (ES modules) + Three.js, empacotado com Capacitor. 100% offline;
toda arte e áudio são gerados por código (sem imagens, modelos ou arquivos de áudio).

**Fonte da verdade:** `docs/GDD.md`. Leia as seções relevantes da etapa atual antes de agir.

## Etapa atual

**Etapa 0 – Fundação** — GDD salvo e CLAUDE.md criado. Plano da etapa apresentado; aguardando aprovação.

## Estrutura de pastas

O projeto fica na **raiz do repositório** (não numa subpasta `mirante/`).

    index.html, capacitor.config.json, CLAUDE.md
    docs/GDD.md          especificação completa
    store/               textos das lojas, política de privacidade, checklist (Etapa 10)
    scripts/             geração de ícone e splash
    android/ ios/        gerados pelo Capacitor
    src/
      main.js, config.js
      platform/  core/  player/  camera/  world/  levels/  mechanics/
      npc/  audio/  ui/  i18n/  debug/
    .claude/skills/      skills de Three.js (ver abaixo)

Existe hoje: `docs/`, `.claude/skills/`, `README.md`, `CLAUDE.md`. O restante será criado na Etapa 0.

## Comandos (planejados; confirmar quando existirem)

    npm run dev        servidor Vite com --host
    npm run build      build de produção
    npm run android    build + cap sync + abrir/rodar no Android
    npm run ios        build + cap sync + abrir no Xcode
    npm run assets     gera ícones e splash
    npm run snapshot   capturas headless (Playwright, 844×390) em snapshots/
    npm run validate   Vitest + RouteValidator de todas as zonas (deve passar antes de cada commit)

## Convenções

- Código do jogo nunca chama plugins do Capacitor diretamente: só via `src/platform/`, com fallback para navegador.
- Nenhum texto fixo no código: tudo em `src/i18n/` (pt-BR padrão, en incluído).
- Valores de movimentação e tuning em `src/config.js`.
- Níveis são dados declarativos em `src/levels/`, separados da lógica.
- Ao descarregar zonas: `dispose()` em geometrias, materiais e texturas.
- Salvamento e APIs nativas sempre em try/catch; o jogo funciona mesmo se falharem.
- Nada carregado da internet em tempo de execução.
- Sem dependências além das previstas no GDD §2 (e Vitest/Playwright do §11) sem perguntar.
- Commits pequenos, descritivos, em português.
- Ao final de cada etapa: build, teste no navegador (e Android), commit, atualizar este arquivo,
  resumo + "Como testar" + problemas conhecidos + próximos passos. Depois, parar e aguardar feedback.

## Skills instaladas (.claude/skills)

De majidmanzarpour/threejs-game-skills (MIT): threejs-gameplay-systems, threejs-aaa-graphics-builder,
threejs-game-ui-designer, threejs-debug-profiler, threejs-qa-release. As skills de geração de assets
por IA foram excluídas de propósito. Quando uma skill conflitar com o GDD (ex.: sugerir TypeScript), o GDD vence.

## Decisões tomadas

- Projeto na raiz do repositório em vez de `mirante/`.
- O desenvolvimento acontece num container na nuvem, sem Android SDK (dl.google.com bloqueado) e
  sem aparelho conectado. Builds e testes em Android/iOS são feitos no computador do usuário.

## Pendências com o usuário

- appId definitivo (`com.SEUESTUDIO.mirante`) — perguntar antes da Etapa 10.
