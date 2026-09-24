# PROMPT: Crie o jogo mobile 3D "MIRANTE"

Você é um desenvolvedor sênior de jogos mobile, especialista em Three.js, Capacitor, Web Audio API, game feel e design de níveis de plataforma 3D. Sua tarefa é construir, em etapas incrementais e sempre jogáveis, um jogo 3D chamado **MIRANTE**, publicado como **app instalável na Google Play Store (Android) e na Apple App Store (iOS)**. O jogo deve durar aproximadamente **1 hora** para um jogador médio no caminho principal. Siga esta especificação com rigor. Quando algo não estiver especificado, tome a decisão que melhor sirva à visão descrita na seção 1.

---

## 0. PRIMEIRA AÇÃO

Antes de escrever qualquer código do jogo:
1. Salve esta especificação completa em docs/GDD.md. Ela é a fonte da verdade do projeto.
2. Crie um CLAUDE.md na raiz com: resumo do jogo, estrutura de pastas, convenções de código, comandos, etapa atual e decisões tomadas. Atualize esse arquivo ao final de cada etapa, para que qualquer sessão futura consiga retomar o trabalho.
3. Inicialize um repositório git e faça um commit ao final de cada etapa.
4. Sempre que um passo depender de mim (instalar Android Studio ou Xcode, criar contas, assinar builds, digitar senhas), pare e me dê instruções claras, passo a passo, em português.

---

## 1. VISÃO DO JOGO

O jogador nasce no ponto mais baixo de uma cidade: uma rua estreita num vale, entre casinhas. No horizonte ergue-se **a Torre Farol**, um arranha-céu colossal, muito mais alto que todo o resto, com uma luz pulsante no topo, visível de qualquer ponto do mapa. O objetivo é chegar ao topo dela.

A sensação central é esta: **"parece impossível, mas é possível"**. No início a torre deve parecer absurda, inalcançável. Ao longo de cerca de uma hora, o jogador atravessa e sobe a cidade inteira: bairros antigos, mercados, canteiros de obras, arranha-céus, jardins suspensos, o interior da própria torre e, por fim, sua agulha acima das nuvens. Ao olhar para trás, ele vê o caminho percorrido lá embaixo e sente orgulho. O jogo é contemplativo, acolhedor e sem violência. Não há inimigos. O único adversário é a altura.

Pilares de design:
1. **Verticalidade legível:** o jogador sempre sabe para onde subir, sem precisar de setas.
2. **Punição gentil:** cair não gera frustração. Você volta ao último checkpoint rapidamente.
3. **Progressão sensorial:** quanto mais alto, mais o céu, a luz, o vento e a música mudam.
4. **Toque bom:** controles responsivos e movimentação gostosa (game feel acima de tudo).
5. **Variedade constante:** cada zona tem identidade visual própria, pelo menos uma mecânica nova e um momento marcante. A duração vem de conteúdo e descoberta, nunca de dificuldade artificial, backtracking longo, trechos repetidos ou grind.

---

## 2. PLATAFORMA E REQUISITOS TÉCNICOS

### Produto final
- App nativo instalável para **Android** (Google Play, formato AAB assinado) e **iOS** (App Store).
- Orientação **paisagem** travada. Funciona **100% offline**.
- **Versão 1:** sem anúncios, sem compras dentro do app e sem coleta de dados ou rastreamento. Isso simplifica a aprovação nas lojas e a política de privacidade.

### Arquitetura
- O jogo é feito em **Vite + JavaScript moderno (ES modules) + Three.js** (via npm, versão fixa) e empacotado como app nativo com **Capacitor** (versão estável atual), com as plataformas android e ios.
- Durante o desenvolvimento, o jogo também roda no navegador, para iteração rápida.
- **Plugins:**
  - oficiais do Capacitor: @capacitor/app, @capacitor/haptics, @capacitor/preferences, @capacitor/status-bar, @capacitor/splash-screen e @capacitor/screen-orientation;
  - da comunidade: @capacitor-community/keep-awake;
  - ferramenta de ícones: @capacitor/assets.
- **Camada de plataforma (src/platform/):** abstrai tudo que é nativo (vibração, armazenamento, ciclo de vida, orientação, barra de status, tela ligada), com fallback automático para o navegador. O código do jogo nunca chama plugins diretamente, só essa camada.

### Sem internet e sem assets externos
- Nada é carregado de CDN ou da internet em tempo de execução.
- Nenhuma imagem, modelo ou arquivo de áudio: toda geometria, textura (via canvas, quando necessário) e som é gerado por código.
- Fonte: use a fonte do sistema ou empacote localmente uma fonte com licença OFL (ex.: Nunito ou Quicksand, em .woff2 dentro do projeto).

### Estrutura de pastas (sugerida)
    mirante/
      index.html
      CLAUDE.md
      capacitor.config.json
      docs/GDD.md
      store/        (textos das lojas, política de privacidade, checklist)
      scripts/      (geração de ícone e splash)
      android/      (gerado pelo Capacitor)
      ios/          (gerado pelo Capacitor)
      src/
        main.js, config.js
        platform/   (Haptics, Storage, Lifecycle, Orientation, StatusBar, KeepAwake)
        core/       (Game, Loop, Input, SaveSystem, Events)
        player/     (Player, CharacterController, Scarf, Animator, Abilities)
        camera/     (ThirdPersonCamera, Cinematics)
        world/      (CityGenerator, Sky, Lighting, Tower, Props, Clouds, Birds)
        levels/     (schema.js, zone1.js ... zone8.js, summit.js)
        mechanics/  (Awning, Ladder, Pipe, Rope, MovingPlatform, Zipline, Crane,
                     AirVent, Lever, Counterweight, Gear, Elevator, Tram, Wind)
        npc/        (Npc, dialogues)
        audio/      (AudioEngine, Music, Ambience, Sfx, Reverb)
        ui/         (HUD, Menus, Settings, Album, Joystick)
        i18n/       (pt-BR.js, en.js)
        debug/      (DebugPanel, RouteValidator, Telemetry, PhotoMode)

### Dados de nível
Cada zona é um módulo de dados declarativo (plataformas, mecânicas, checkpoints, coletáveis, NPCs, gatilhos), separado da lógica. Isso facilita ajustar a rota sem mexer no motor.

### Física
- Character controller próprio, com colisão cápsula vs. caixas (AABB/OBB) e raycasts para chão, parede e borda.
- Use **grade espacial (spatial hash)** para as consultas de colisão.
- Não use motor de física pesado.

### Streaming e memória
- Apenas a zona atual e as vizinhas ficam ativas (colisão, animação, mecânicas). O resto da cidade é renderizado como malha de baixo detalhe mesclada.
- A Torre Farol é sempre visível.
- Ao descarregar uma zona, chame dispose() em geometrias, materiais e texturas, para evitar vazamento de memória, que no celular fecha o app.

### Desempenho
Os aparelhos-alvo são um Android intermediário de cerca de 3 anos e um iPhone 11 ou superior. A meta é 60 fps, com mínimo aceitável de 30 fps. Para isso:
- use InstancedMesh e merge de geometrias;
- limite o devicePixelRatio a 2;
- use uma única luz direcional com sombra, com shadow map pequeno que segue o jogador;
- aplique fog para esconder a distância;
- use LOD simples para prédios distantes;
- ofereça três presets de qualidade (Baixa, Média, Alta), com detecção automática inicial baseada no FPS medido.

### Comportamento de app nativo
- **Ciclo de vida:**
  - ao ir para segundo plano: pausar o jogo, suspender o AudioContext e salvar;
  - ao voltar: abrir o menu de pausa e retomar o áudio no próximo toque;
  - tratar interrupções como ligações e alarmes.
- **Botão voltar do Android:**
  - durante o jogo, abre ou fecha a pausa;
  - nos menus, volta uma tela;
  - na tela inicial, pede confirmação para sair.
- **Tela:** modo imersivo, com barra de status oculta e barra de navegação do Android escondida quando possível. A tela fica ligada durante o gameplay (keep-awake), mas não nos menus.
- **Safe areas:** respeite notch, ilha dinâmica e barra de gestos (env(safe-area-inset-*)). Botões e HUD nunca ficam embaixo dessas áreas.
- **Toque:** bloqueie zoom, scroll, seleção de texto, menu de toque longo e bounce do WebView.
- **Vibração:** sempre pelo plugin Haptics, porque navigator.vibrate não funciona no iOS.
- **Salvamento:** pelo plugin Preferences, que é mais confiável que localStorage no iOS, com fallback para localStorage no navegador. Tudo dentro de try/catch. O jogo deve funcionar mesmo se o salvamento falhar.
- **Permissões:** apenas as estritamente necessárias. Remova do manifesto Android qualquer permissão não usada.

### Identidade do app
- **Nome:** Mirante.
- **appId:** com.SEUESTUDIO.mirante. Pergunte-me o identificador definitivo antes da Etapa 10.
- **Versão:** 1.0.0 (versionCode e build number coerentes).
- **Ícone e splash:** gerados por um script em scripts/, sem arte externa. O script renderiza a silhueta da Torre Farol com a luz do topo e um cachecol vermelho esvoaçando sobre um gradiente de pôr do sol. Gera um PNG de 1024×1024 sem transparência (exigência da Apple) e um splash no mesmo estilo. A partir deles, o @capacitor/assets gera todos os tamanhos, incluindo ícone adaptativo no Android.

### Idiomas
Os textos ficam em src/i18n. O idioma padrão é português do Brasil, com inglês incluído, e o jogo detecta o idioma do aparelho. Nenhum texto fica fixo no código.

### Scripts npm
- **dev:** servidor Vite com --host, para testar no navegador do computador e do celular.
- **build:** build de produção.
- **android:** build + cap sync + abrir ou rodar no Android.
- **ios:** build + cap sync + abrir no Xcode.
- **assets:** gera ícones e splash.

---

## 3. DIREÇÃO DE ARTE

### Estilo
Low-poly estilizado com sombreamento suave, na linha de *Alba: A Wildlife Adventure*, *A Short Hike* e *Monument Valley* em 3D. Use formas limpas, cantos levemente chanfrados nos prédios principais e janelas como recortes ou retângulos emissivos. Não busque realismo.

### Paleta e iluminação progressiva
A luz do dia avança conforme a **altura do jogador**, e não conforme o tempo real. Interpole suavemente céu, fog, cor da luz e intensidade entre as faixas abaixo:

| Altura | Momento | Céu | Luz principal | Clima |
|---|---|---|---|---|
| 0–60 m | Fim de tarde | Pêssego → azul claro | Dourada quente (#FFD29A) | Aconchegante |
| 60–160 m | Hora dourada | Laranja → rosa | Âmbar (#FFB070) | Esperança |
| 160–320 m | Pôr do sol | Coral → lilás | Rosa alaranjado (#FF8F7A) | Épico |
| 320–420 m | Último sol | Lilás → violeta | Rosada suave, raios de luz | Sereno |
| 420–520 m | Crepúsculo | Violeta → azul profundo | Azulada + janelas acesas | Solitário, bonito |
| 520–600 m | Noite estrelada | Azul marinho + estrelas | Luar + farol | Triunfo sereno |

- As janelas dos prédios acendem gradualmente conforme escurece, com emissivos em amarelo quente. A cidade lá embaixo vira um mar de luzes.
- Use um céu em gradiente, via shader simples ou esfera com vertex colors, com sol baixo e nuvens low-poly. Na zona final, o jogador **atravessa a camada de nuvens** e a cidade some por baixo delas.
- Adicione pós-processamento leve apenas no preset Alto: bloom sutil nas luzes e vinheta suave.

### Linguagem visual de escalada (essencial)
Todo elemento escalável ou interativo do caminho principal recebe um **detalhe na cor de destaque coral/mostarda (#FF9E5E / #F2C14E)**: bordas de telhado, toldos, canos, escadas, andaimes, alças. O resto da cidade usa tons dessaturados (creme, terracota suave, verde-sálvia, azul acinzentado). Rotas alternativas e segredos usam um detalhe **turquesa discreto (#5EC8C0)**.

### Identidade visual por zona
Cada zona tem uma paleta secundária, props e materiais próprios (ver seção 7), para que o jogador sinta que viajou por lugares diferentes.

### Personagem
Um personagem pequeno e fofo feito de primitivas: corpo em cápsula, cabeça redonda, apenas dois olhinhos e um **cachecol longo e vermelho**. O cachecol tem física simples de corrente de pontos e reage ao vento. **O cachecol cresce** a cada habilidade conquistada (ver seção 5). Todas as animações são procedurais:
- squash & stretch no pulo e na aterrissagem;
- balanço ao andar e inclinação nas curvas;
- pose de agarrar bordas e de pendurar em cordas;
- pose de planar;
- sentar nos mirantes;
- respiração leve quando parado.

### A Torre Farol
Tem cerca de **600 m**, o equivalente a aproximadamente 2,5× o segundo prédio mais alto (cerca de 240 m). A silhueta é esguia, com recuos escalonados, base de pedra clara, corpo de vidro, estrutura de aço exposta na parte superior e agulha com antena. Uma luz de farol pulsa lentamente e varre o céu. A torre deve ser visível **de todo o mapa**. Garanta que ela nunca seja engolida pelo fog, usando fog reduzido para ela ou um impostor.

### Cidade
Ocupa cerca de 800 × 800 m, num vale em anfiteatro. O ponto de nascimento fica no sul, na parte mais baixa. A Torre fica no norte, no ponto mais alto. A rota principal serpenteia pela cidade, combinando subida e travessia horizontal. Em alguns momentos é preciso descer um pouco para avançar, o que cria ritmo.

A cidade é gerada proceduralmente com seed fixa para preencher o cenário. A **rota principal e as rotas secretas são desenhadas à mão** nos módulos de nível.

Detalhes de vida: caixas d'água, antenas, varais com roupas balançando, vasos de plantas, placas de néon (que acendem à noite), pombos que voam quando o jogador se aproxima, fumaça de chaminés, cortinas nas janelas, pipas no céu e bondinho circulando.

---

## 4. DIREÇÃO DE ÁUDIO (100% Web Audio API, procedural)

O áudio deve ser suave, orgânico e relaxante, com uma trilha ambiente no estilo lo-fi/ambient. Use a escala de **Ré maior pentatônica** a cerca de 76 BPM. O AudioContext inicia no primeiro toque, é suspenso quando o app vai para segundo plano e é retomado ao voltar.

### Música adaptativa em camadas
A trilha tem 8 camadas, uma por zona. Cada zona alcançada adiciona sua camada com fade-in de 4 s. Ao descer de zona, a camada correspondente faz fade-out.
1. **Rua do Vale:** pad quente de acordes (osciladores detuned + filtro passa-baixa), progressão D – Bm – G – A.
2. **Telhados:** + baixo suave e redondo.
3. **Mercado:** + percussão leve e orgânica (clicks, shaker de ruído filtrado).
4. **Obras:** + arpejo pulsante suave.
5. **Centro de Vidro:** + melodia de caixinha de música/marimba com delay.
6. **Jardins:** + flauta sintética (seno com vibrato) e acordes mais abertos.
7. **Coração da Torre:** + tique-taque rítmico de engrenagens integrado ao groove.
8. **Agulha:** + sinos altos e shimmer com reverb longo. A percussão sai, deixando o espaço mais aberto.
9. **Topo:** swell final em que todas as camadas sobem, com uma melodia resolutiva inédita.

Para evitar cansaço ao longo de 1 hora, a música deve **variar**: pelo menos 3 variações de progressão harmônica, melodias geradas por regras dentro da escala (não um loop fixo), e momentos de respiro em que só o pad toca por 20–30 s. Implemente o reverb com ConvolverNode e impulso gerado por ruído com decaimento exponencial. Monitore o custo de CPU do áudio: no preset Baixo, reduza vozes e reverb.

### Ambiente dinâmico por altura e zona
- **Baixo:** zumbido de cidade (ruído rosa filtrado), passarinhos, sininho de bicicleta distante, rádio longínquo.
- **Mercado:** murmúrio abafado de vozes (ruído formantado) e toldos tremulando.
- **Obras:** metal rangendo, polias.
- **Jardins:** água corrente, grilos, folhas.
- **Interior da torre:** ecos, engrenagens, zumbido elétrico grave.
- **Alto:** vento em rajadas, com ruído filtrado e cutoff modulado. O som da cidade quase some.
- **Topo:** silêncio quase total, com vento suave e a música.

### Efeitos sonoros
Todos devem ser curtos, suaves, afinados na escala da música e com leve variação de pitch a cada disparo:
- passos com timbre diferente para madeira, metal, concreto, grama e vidro;
- pulo (pluck ascendente);
- pulo duplo (pluck mais agudo);
- aterrissagem (thud com volume proporcional à queda);
- agarrar borda e corda;
- tirolesa (chiado metálico contínuo);
- trampolim (boing);
- alavanca (clack);
- planar (sopro suave contínuo);
- checkpoint (acorde de sino);
- nova habilidade (fanfarra curta e delicada);
- coletável (nota da escala que forma melodia na sequência);
- NPC falando (blips melódicos, estilo *Animal Crossing*);
- queda fora do mapa (whoosh descendente suave).

### Mixagem
Use um master com compressor leve, volumes separados para Música e Efeitos nas configurações e ducking da música em cinemáticas e diálogos.

---

## 5. MECÂNICAS, HABILIDADES E CONTROLES

### Controles de toque
- **Metade esquerda da tela:** joystick virtual flutuante.
- **Metade direita, arrastar:** orbitar a câmera.
- **Botão grande à direita:** Pular. Segurar faz um pulo mais alto. No ar, após conquistar a habilidade, segurar ativa o planar.
- **Botão contextual:** "Agarrar", "Interagir" ou "Sentar", que aparece só quando relevante.
- Suporte a multitoque completo, vibração leve via Haptics (configurável) e botões semitransparentes com área de toque generosa.
- Suporte opcional a controle de jogo (gamepad) via Gamepad API.

### Controles de teclado (apenas para testes no navegador)
WASD para mover, mouse para câmera, Espaço para pular e planar, e E para interagir.

### Movimentação base (valores iniciais, todos no config.js)
- Velocidade de andar: 5 m/s, com aceleração e desaceleração suaves.
- Pulo: cerca de 2,2 m de altura. Alcance horizontal: cerca de 4,5 m.
- **Coyote time** de 0,12 s e **jump buffer** de 0,12 s.
- Controle aéreo de 60%.
- Gravidade maior na descida que na subida, para um pulo "crocante".
- **Agarrar bordas** automaticamente durante a queda.

### Habilidades progressivas (o cachecol cresce)
Ao final de algumas zonas existe uma **Grande Lanterna**. Acendê-la dispara uma cinemática curta: o cachecol cresce e brilha, e o jogador ganha uma habilidade.

| Onde | Habilidade | Métrica |
|---|---|---|
| Fim da Zona 1 | Pulo duplo | +1,6 m |
| Fim da Zona 3 | Pulo na parede | apenas em paredes com detalhe coral |
| Fim da Zona 5 | Planar com o cachecol | queda lenta, até cerca de 12 m horizontais por planeio |

O design de cada zona deve explorar a nova habilidade de forma crescente: apresentar com segurança, depois combinar com as anteriores. Os segredos de zonas antigas podem exigir habilidades futuras (revisita opcional após zerar).

### Elementos de travessia (introduzir aos poucos, conforme a seção 7)
- Caixas e muros.
- Toldo-trampolim.
- Escadas de incêndio e de mão.
- Canos escaláveis.
- Varais e pranchas estreitas.
- Cordas de balanço.
- Plataformas móveis e andaimes de limpador de janela.
- Tirolesas.
- Guindastes com braço giratório.
- Vigas que balançam.
- Alavancas e contrapesos.
- Dutos de ar que lançam para cima.
- Cipós e jardins verticais.
- Engrenagens giratórias.
- Pêndulos.
- Elevadores de carga.
- Bondinho (trecho de transporte e descanso).
- Rajadas de vento com aviso visual (folhas e partículas) e sonoro antes de cada rajada.

### Quebra-cabeças ambientais
São leves e sem texto. Por exemplo: puxar uma alavanca para mover um andaime, girar um guindaste para criar uma ponte, usar um contrapeso para subir uma plataforma ou ativar dutos em sequência. Cada um deve levar entre 30 s e 2 min e ser resolvível só olhando o ambiente.

### Checkpoints e quedas
Os checkpoints são **lanternas de papel** que acendem ao toque, com partículas e sino. Há uma a cada 20–35 m de subida ou a cada 60–90 s de jogo, totalizando cerca de 35 no jogo.

Ao cair demais, acontece um fade em branco quente e o jogador renasce na última lanterna em menos de 1,5 s. Não há vidas nem game over.

### Assistência anti-frustração
Após 4 quedas no mesmo trecho, um **fio de luz tênue** mostra brevemente o próximo salto. Isso pode ser desativado nas configurações.

### Coletáveis e segredos
- **60 notas musicais luminosas** espalhadas em rotas alternativas (turquesa). Cada uma toca uma nota. Coletar todas as de uma zona desbloqueia uma variação musical daquela zona.
- **10 mirantes secretos:** bancos escondidos com vista especial. Ao sentar, a câmera faz uma panorâmica cinematográfica e uma "foto" (captura estilizada do canvas) é salva no **Álbum** do menu, dentro do armazenamento do app.
- **Recompensas:** cachecóis de cores diferentes (dourado ao completar tudo).

### Moradores (NPCs)
Há um ou dois moradores por zona, feitos de primitivas no mesmo estilo do personagem. Eles falam frases curtas em balões, com voz em blips melódicos. As falas evoluem com o progresso: primeiro duvidam ("Até lá em cima? Hehe, boa sorte."), depois se admiram ("Olha só onde você chegou!"). Alguns dão dicas de segredos. Todas as falas ficam no i18n.

Exemplos:
- a vó regando plantas na janela;
- o menino com a pipa;
- o vendedor do mercado;
- a operária do guindaste;
- o limpador de janelas;
- a jardineira;
- o relojoeiro dentro da torre;
- o faroleiro no topo, que recebe o jogador no final.

---

## 6. CÂMERA

- Terceira pessoa com seguimento suave e colisão por raycast.
- A câmera se reposiciona atrás do jogador após 2 s sem input de câmera. Esse comportamento é desativável.
- O FOV aumenta levemente com a velocidade, nas tirolesas e ao planar.
- Em trechos específicos, gatilhos de câmera podem enquadrar melhor, como uma vista lateral num corredor de vento. Sempre com transições suaves.
- **Momentos cinematográficos (todos puláveis com um toque):**
  - **Intro:** a câmera começa no rosto do personagem na rua, sobe lentamente em panorâmica pela Torre Farol até a luz do topo, com a música apenas no pad. O título "MIRANTE" aparece e a câmera volta ao jogador.
  - **Entrada de zona:** o nome da zona aparece suavemente, com a altitude, e a câmera faz uma breve olhada para cima mostrando o objetivo.
  - **Grandes Lanternas:** cinemática curta da nova habilidade.
  - **Bondinho:** a câmera faz panorâmica pela cidade durante o trajeto.
  - **Nuvens:** ao atravessar a camada de nuvens, desacelera brevemente para o jogador ver o céu estrelado surgir.
  - **Topo:** o controle é desativado. O faroleiro recebe o jogador e o personagem senta na beira. A câmera orbita com a cidade iluminada lá embaixo e mostra o caminho percorrido como uma linha de luz ligando todas as lanternas acesas. Seguem estatísticas (tempo, quedas, notas, mirantes), créditos curtos e as opções "Explorar livremente" e "Seleção de zona".

---

## 7. DESIGN DE NÍVEL: 8 ZONAS + TOPO (cerca de 60 min)

Projete a rota respeitando **estritamente** as métricas da seção 5. Gaps obrigatórios devem ter no máximo 85% do alcance máximo da habilidade disponível naquele ponto. Cada zona segue o ritmo: **apresentar a novidade com segurança → praticar → combinar → momento marcante → descanso com vista**.

| # | Zona | Altura | Tempo alvo | Novidade | Momento marcante |
|---|---|---|---|---|---|
| 1 | Rua do Vale | 0–40 m | 5 min | Andar, pular, toldos, escadas | Seguir um gato pelos telhados das casinhas |
| 2 | Telhados do Bairro Antigo | 40–90 m | 7 min | Pulo duplo, agarrar bordas, varais, canos | Travessia sobre a rua por um varal cheio de roupas coloridas |
| 3 | Mercado dos Toldos | 90–140 m | 7 min | Cordas de balanço, cascata de toldos | Descida e subida pela cascata de toldos coloridos |
| — | Linha do Bonde | transição | 1–2 min | Trajeto (descanso) | Panorâmica da cidade ao pôr do sol |
| 4 | Canteiro de Obras | 140–220 m | 9 min | Pulo na parede, plataformas móveis, guindastes, tirolesas, alavancas | Subir e cavalgar o braço giratório do guindaste |
| 5 | Centro de Vidro | 220–320 m | 9 min | Dutos de ar, limpadores de janela, néon, puzzles de sequência | Escalar a fachada espelhada que reflete o pôr do sol |
| 6 | Jardins Suspensos | 320–420 m | 7 min | Planar, cipós, correntes de ar suaves | Primeiro planeio longo entre dois jardins, com pétalas voando |
| 7 | Coração da Torre | 420–510 m | 8 min | Interior: engrenagens, pêndulos, elevadores de carga, contrapesos | Subir pelo mecanismo do pêndulo gigante |
| 8 | A Agulha | 510–600 m | 7 min | Exterior final: vento em rajadas, vigas de aço, combinação de tudo | Atravessar as nuvens e ver as estrelas |
| ★ | O Mirante (topo) | 600 m | 2 min | Cinemática final | Encontro com o faroleiro |

Detalhes por zona:
- **Zona 1:** tutorial sem texto, com pegadas luminosas que ensinam cada ação e somem. Paleta terracota e creme.
- **Zona 2:** ruas estreitas com prédios de 4 a 15 andares, caixas d'água, pombos e jardins de telhado. Paleta rosa e ocre.
- **Zona 3:** toldos listrados, bandeirinhas, barracas e lanternas penduradas. Paleta vibrante, mas suave.
- **Zona 4:** andaimes, vigas amarelas, lonas e cones. Tem 2 puzzles de alavanca e contrapeso. Paleta amarelo-mostarda e cinza.
- **Zona 5:** arranha-céus de vidro com reflexo simulado por envmap gerado, placas de néon e antenas. Tem 1 puzzle de sequência de dutos. Paleta azul-petróleo e coral.
- **Zona 6:** área de respiro, mais calma e bonita, com fontes, árvores, cipós e borboletas. Paleta verde e lavanda.
- **Zona 7:** interior da torre, fechado, com janelões e engrenagens de latão. Luz quente artificial contrasta com o crepúsculo lá fora. Tem 2 puzzles mecânicos.
- **Zona 8:** estrutura de aço exposta, vento forte e nuvens. É a zona mais desafiadora, com checkpoints mais frequentes (a cada 15–20 m).

Cada zona contém cerca de 7 notas musicais, 1 a 2 mirantes secretos, 1 a 2 NPCs e entre 3 e 5 checkpoints, além da Grande Lanterna quando aplicável.

**Validação:** o RouteValidator percorre a rota principal de cada zona e sinaliza em vermelho qualquer salto obrigatório impossível com as habilidades disponíveis naquele ponto.

---

## 8. INTERFACE (UI)

Nos menus e no HUD, evite: botões em formato de pílula genéricos, rótulos numerados como "01 / 02 / 03", textos em fonte monoespaçada, gradientes roxo-azulados genéricos, ícones feitos com emoji e cards com sombra pesada. A interface deve parecer parte do mundo do jogo (papel, lanternas, luz quente), e não um site.
Minimalista e elegante, com cantos arredondados, vidro fosco sutil (com fallback) e respeito às safe areas.
- **Medidor de altura:** barra vertical fina com a silhueta da Torre, marcadores das 8 zonas e um ponto indicando o jogador, mais a altura em metros.
- **Tela inicial:** céu animado, título "MIRANTE" e os botões "Novo jogo", "Continuar" (com zona e % concluído), "Álbum" e "Configurações".
- **Pausa:** Continuar, Voltar ao checkpoint, Mapa de progresso (lista de zonas com notas e mirantes encontrados), Álbum, Configurações e Menu.
- **Seleção de zona:** desbloqueada após zerar.
- **Configurações:** idioma, volume de música, volume de efeitos, sensibilidade da câmera, inverter eixo Y, qualidade gráfica, vibração, assistência (fio de luz), mostrar FPS e "Apagar progresso" (com confirmação).
- **Créditos:** incluem as licenças das bibliotecas usadas (Three.js, Capacitor e a fonte, se houver).

---

## 9. MODO DEBUG, TELEMETRIA E MODO FOTO

O modo debug só existe em builds de desenvolvimento e é removido no build de release. É ativado pela URL ?debug=1 no navegador ou por um toque triplo no canto superior esquerdo. Oferece:
- contador de FPS e de draw calls;
- teletransporte para qualquer zona ou checkpoint;
- câmera livre (voo);
- visualização das colisões;
- concessão de qualquer habilidade;
- slider de altura para testar a iluminação;
- execução do RouteValidator.

A **telemetria local** registra o tempo gasto em cada zona e o número de quedas por trecho entre checkpoints. O painel de debug mostra esses dados, para eu calibrar a dificuldade e a duração do jogo. Nada é enviado para a internet.

O **modo foto** esconde o HUD, permite posicionar a câmera livremente e exporta capturas nas resoluções exigidas pelas lojas. Ele serve para gerar as screenshots da página do jogo na Play Store e na App Store.

---

## 10. PROCESSO DE ENTREGA EM ETAPAS (muito importante)

Construa em etapas. **Ao final de CADA etapa:**
1. rode o build e corrija todos os erros;
2. confirme que o jogo roda no navegador (npm run dev) e, a partir da Etapa 0, também no Android (npx cap run android, via emulador ou aparelho por cabo USB);
3. faça commit no git;
4. atualize o CLAUDE.md;
5. me entregue um resumo curto do que foi feito, uma lista "Como testar" com 3 a 5 itens (incluindo atalhos de debug para ir direto ao conteúdo novo), problemas conhecidos e o que vem a seguir.

Depois de cada entrega, **pare e aguarde meu feedback** antes de seguir.

- **Etapa 0 – Fundação:** projeto Vite, estrutura de pastas, GDD.md, CLAUDE.md e git. Capacitor configurado com android e ios, camada de plataforma com fallbacks e orientação paisagem. Uma cena 3D simples rodando no navegador e num aparelho Android. Guie-me na instalação do Android Studio, se necessário.
- **Etapa 1 – Mundo visível:** cidade procedural + Torre Farol de 600 m + céu + iluminação de fim de tarde + fog, com câmera orbitando. Objetivo: validar a estética e a imponência da torre.
- **Etapa 2 – Personagem e controles:** personagem com cachecol, joystick, câmera em terceira pessoa, andar e pular, vibração, teclado para testes.
- **Etapa 3 – Física, Zona 1 e salvamento:** colisão com grade espacial, coyote time, jump buffer, agarrar bordas, toldos, checkpoints, respawn, salvamento via Preferences, ciclo de vida do app, botão voltar do Android e a Grande Lanterna do pulo duplo.
- **Etapa 4 – Zonas 2 e 3 + Bonde:** novas mecânicas, iluminação progressiva, janelas acendendo, medidor de altura, nomes de zona e Grande Lanterna do pulo na parede.
- **Etapa 5 – Zonas 4 e 5:** guindastes, tirolesas, alavancas, dutos, puzzles e Grande Lanterna do planar.
- **Etapa 6 – Zonas 6, 7, 8 e Topo:** jardins, interior da torre, agulha, nuvens, vento e cinemática final com estatísticas.
- **Etapa 7 – Áudio completo:** música adaptativa em 8 camadas com variação, ambientes por zona, todos os efeitos e tratamento de interrupções.
- **Etapa 8 – Vida e segredos:** NPCs e diálogos (pt-BR e en), notas musicais, mirantes secretos, Álbum e cachecóis.
- **Etapa 9 – Polimento:** intro cinematográfica, menus completos, assistência, partículas, pombos, pipas, otimização (testar desempenho num aparelho real), presets de qualidade, telemetria, modo foto e seleção de zona.
- **Etapa 10 – Preparação para as lojas:**
  - Ícone e splash gerados pelo script e aplicados com @capacitor/assets.
  - appId definitivo, nome e versão.
  - Revisão de permissões e remoção do modo debug do release.
  - Política de privacidade em store/privacy-policy.md e numa versão HTML simples para eu hospedar, declarando que o app não coleta dados.
  - Textos das lojas em pt-BR e en (título, subtítulo, descrição curta de até 80 caracteres, descrição longa e palavras-chave).
  - Sugestão de classificação etária e respostas para os questionários de privacidade e segurança de dados das lojas.
  - Screenshots geradas com o modo foto.
  - Build de release Android (AAB assinado): guie-me para eu mesmo criar o keystore e digitar as senhas. Nunca grave senhas ou o keystore no repositório; adicione-os ao .gitignore.
  - Build iOS: passo a passo para gerar o archive no Xcode e enviar pelo App Store Connect.
  - Checklist final de publicação em store/checklist.md.

---

## 11. MÉTODO DE TRABALHO NO CLAUDE CODE

- **Início de cada sessão:** leia o CLAUDE.md e as seções do GDD relevantes para a etapa atual antes de qualquer ação.
- **Planejar antes de codar:** no início de cada etapa, apresente um plano curto (arquivos que serão criados ou alterados, decisões técnicas, riscos) e aguarde minha aprovação.
- **Verificação visual automática:** instale o Playwright como dependência de desenvolvimento e crie o script npm run snapshot. Ele abre o jogo num navegador headless com viewport de celular em paisagem (ex.: 844×390), usa os atalhos do modo debug para ir a pontos-chave (início, cada zona, menus) e salva capturas de tela em snapshots/. Antes de entregar cada etapa, rode o script, analise as imagens e corrija o que estiver visualmente errado (objetos fora do lugar, telas pretas, UI cortada, iluminação estranha). Adicione snapshots/ ao .gitignore.
- **Testes automáticos:** use Vitest para testar a lógica que não depende de tela, como o character controller (pulo, gravidade, coyote time, colisão), o sistema de salvamento e o RouteValidator. Crie o script npm run validate, que roda os testes e o validador de rota de todas as zonas. Ele deve passar antes de cada commit.
- **CLAUDE.md enxuto:** mantenha-o com no máximo cerca de 150 linhas (visão geral, estrutura, comandos, convenções, etapa atual e decisões importantes). Detalhes de design ficam no GDD.
- **Dependências:** não adicione nenhuma biblioteca além das previstas na seção 2 sem me perguntar antes.
- **Commits:** pequenos e descritivos, em português, ao longo da etapa, e não apenas um no final.
- **Dúvidas:** se algo no GDD estiver ambíguo ou contraditório, pergunte em vez de supor. Se precisar desviar do GDD por motivo técnico, explique o motivo e registre a decisão no CLAUDE.md.

Comece agora apenas pela Etapa 0. Ao terminar, pare e aguarde meu feedback.