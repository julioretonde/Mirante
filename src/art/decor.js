// =============================================================================
//  Decorações (não colidem) — matrizes de índices da paleta
// -----------------------------------------------------------------------------
//  Cada letra minúscula no mapa de uma tela vira um destes desenhos, conforme
//  o bioma da tela (DECOR_BY_BIOME). `anchor` define onde o desenho encosta:
//    'floor'   apoiado no chão (base do desenho na base da célula)
//    'ceil'    pendurado no teto (topo do desenho no topo da célula)
//    'free'    canto superior esquerdo na célula
//  `frames` > 1 indica animação (quadros empilhados em `anim`).
// =============================================================================

const MUSHROOM = [
  '........',
  '..0000..',
  '.0dd6d0.',
  '0d6ddd60',
  '00000000',
  '..0a60..',
  '..0a60..',
  '..0000..',
];

const FERN = [
  '........',
  '....i...',
  '..i.ij.j',
  '.jii.ii.',
  'i.jiihi.',
  '..hiih..',
  '.h.hh.h.',
  '...hh...',
];

const VINE = [
  '..h.....',
  '..hi....',
  '...h.i..',
  '..ih....',
  '..h.....',
  '.ihi....',
  '..h.....',
  '..j.....',
];

const LEAVES = [
  '.....hh.........',
  '...hhiihh..hh...',
  '..hiijjiihhiih..',
  '.hiijjiiiiijjih.',
  '.hiiiihhiijjiih.',
  'hiijiihgghiiiihh',
  'hijjiihgghiijjih',
  '.hiiihggghhiiih.',
  '..hhhggg.ghhhh..',
  '...gg.....gg....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const MOSS = [
  'hihhihhi',
  'h.hh.h.h',
  'h.h..h.i',
  'i.h..i..',
  '..i..h..',
  '..h.....',
  '..j.....',
  '........',
];

const BG_COLUMN = [
  '..2..3..',
  '.22.232.',
  '22323232',
  '.323232.',
  '.323232.',
  '.323232.',
  '.323232.',
  '.323232.',
  '.323232.',
  '.323232.',
  '.323232.',
  '.323232.',
  '.323232.',
  '2222222.',
  '32323232',
  '22222222',
];

const RUBBLE = [
  '........',
  '........',
  '........',
  '........',
  '...00...',
  '..0450.0',
  '.045430.',
  '04433320',
];

const BANNER = [
  '09999990',
  '0cccccc0',
  '0cdddcc0',
  '0cdffcc0',
  '0cffffc0',
  '0cdffcc0',
  '0cdffcc0',
  '0cdddcc0',
  '0cccccc0',
  '0cccccc0',
  '0cbccbc0',
  '0cccccc0',
  '0cc00cc0',
  '0c0..0c0',
  '00....00',
  '........',
];

const WINDOW = [
  '......0000......',
  '....00eeee00....',
  '...0effffffe0...',
  '..0efff00fffe0..',
  '..0eff0ee0ffe0..',
  '.0eff0effe0ffe0.',
  '.0ef0efffe0fe0..',
  '.0ef0efffe0fe0..',
  '.0000000000000..',
  '.0ef0efffe0fe0..',
  '.0ef0efffe0fe0..',
  '.0ef0efffe0fe0..',
  '.0ef0eeeee0fe0..',
  '.0000000000000..',
  '.0ef0efffe0fe0..',
  '.0ef0efffe0fe0..',
  '.0ee0eeeee0ee0..',
  '.0000000000000..',
  '.2222222222222..',
  '.3333333333333..',
  '................',
  '................',
  '................',
  '................',
];

const CHAIN = [
  '...33...',
  '..3..3..',
  '...33...',
  '...44...',
  '..4..4..',
  '...44...',
  '...33...',
  '..3..3..',
];

const TORCH = [
  // quadro 1
  [
    '...d....',
    '...de...',
    '..deed..',
    '..defe..',
    '..efffe.',
    '..effe..',
    '...ee...',
    '..0990..',
    '..0980..',
    '...00...',
    '..0330..',
    '0333330.',
    '...33...',
    '...33...',
    '...22...',
    '........',
  ],
  // quadro 2
  [
    '....d...',
    '...ed...',
    '..deed..',
    '..efed..',
    '.efffe..',
    '..effe..',
    '...ee...',
    '..0990..',
    '..0980..',
    '...00...',
    '..0330..',
    '0333330.',
    '...33...',
    '...33...',
    '...22...',
    '........',
  ],
  // quadro 3
  [
    '........',
    '...d.d..',
    '..deed..',
    '..deffe.',
    '..efffe.',
    '..effe..',
    '...ee...',
    '..0990..',
    '..0980..',
    '...00...',
    '..0330..',
    '0333330.',
    '...33...',
    '...33...',
    '...22...',
    '........',
  ],
];

const STAINED_GLASS = [
  '.......00.......',
  '.....00mm00.....',
  '....0mmnnmm0....',
  '...0mnnffnnm0...',
  '..0mn0ffff0nm0..',
  '..0m0dff6fd0m0..',
  '.0mn0dfffff0nm0.',
  '.0nn00dddd00nn0.',
  '.0000000000000..',
  '.0jj0mmnnm0uu0..',
  '.0ji0mnnnm0ut0..',
  '.0ij0mn6nm0tu0..',
  '.0ii0mnnnm0tt0..',
  '.0000000000000..',
  '.0dd0uutuu0jj0..',
  '.0de0utttu0ji0..',
  '.0ed0tuuut0ij0..',
  '.0dd0ttttt0ii0..',
  '.0000000000000..',
  '.0mm0ffeff0mm0..',
  '.0mn0feeef0nm0..',
  '.0000000000000..',
  '.1111111111111..',
  '.2222222222222..',
];

const BELL = [
  [
    '.......00.......',
    '.......99.......',
    '......0990......',
    '.....0faa90.....',
    '....0faaaa90....',
    '....0ffaaa90....',
    '...0ffaaaa990...',
    '...0faaaaaa90...',
    '...0faaaaa990...',
    '..0ffaaaaaa990..',
    '..0ffffffff990..',
    '.0f9999999999e0.',
    '.00000000000000.',
    '.......0e0......',
    '........0.......',
    '................',
  ],
  [
    '.......00.......',
    '.......99.......',
    '.......0990.....',
    '......0faa90....',
    '.....0faaaa90...',
    '.....0ffaaa90...',
    '....0ffaaaa990..',
    '....0faaaaaa90..',
    '....0faaaaa990..',
    '...0ffaaaaaa990.',
    '...0ffffffff990.',
    '..0f9999999999e0',
    '..00000000000000',
    '..........0e0...',
    '...........0....',
    '................',
  ],
];

const CANDLE = [
  [
    '...d....',
    '...fd...',
    '..0fe...',
    '...0....',
    '..0660..',
    '..0650..',
    '..0550..',
    '.004400.',
  ],
  [
    '....d...',
    '...df...',
    '...ef0..',
    '....0...',
    '..0660..',
    '..0650..',
    '..0550..',
    '.004400.',
  ],
];

const ICICLES = [
  '66o66o66',
  '.6o.6o6.',
  '.o..o.o.',
  '.o..o...',
  '....o...',
  '........',
  '........',
  '........',
];

const PINE = [
  '.......0........',
  '......060.......',
  '.....06h60......',
  '.....0hhh0......',
  '....06hhh60.....',
  '....0hhghh0.....',
  '...066hhh660....',
  '...0hhghhhh0....',
  '..06hhhhghh60...',
  '..0hhghhhhhh0...',
  '.066hhhhgh6660..',
  '.0hhhhghhhhhh0..',
  '.00000000000000.',
  '.......88.......',
  '.......87.......',
  '......0770......',
];

const BUNTING = [
  '4.......',
  '.44.....',
  '...444..',
  '.d...44f',
  '.dd...ff',
  '.d.....f',
  '........',
  '........',
];

const CRYSTALS = [
  '........',
  '........',
  '....6...',
  '..o.o6..',
  '..onon..',
  '.6onnm..',
  '.onnmm.o',
  '0mmmm00n',
];

/** Estrela do topo (objetivo final) — 3 quadros de brilho. */
export const STAR = [
  [
    '.......00.......',
    '......0ff0......',
    '......0ff0......',
    '.....0f66f0.....',
    '000000f66f000000',
    '0fffff6666fffff0',
    '.0ff66666666ff0.',
    '..0ff666666ff0..',
    '...0ff6666ff0...',
    '...0ff6666ff0...',
    '..0ff6ffff6ff0..',
    '..0f66f00f66f0..',
    '.0ff6f0..0f6ff0.',
    '.0fff0....0fff0.',
    '.0ff0......0ff0.',
    '.000........000.',
  ],
  [
    '.......00.......',
    '......0ff0......',
    '......0f60......',
    '.....0f66f0.....',
    '000000f66f000000',
    '0ffff666666ffff0',
    '.0f6666666666f0.',
    '..0f66666666f0..',
    '...0f666666f0...',
    '...0ff6666ff0...',
    '..0ff66ff66ff0..',
    '..0f66f00f66f0..',
    '.0ff6f0..0f6ff0.',
    '.0f6f0....0f6f0.',
    '.0ff0......0ff0.',
    '.000........000.',
  ],
];

/** Tabela de decorações por bioma (mesma letra pode mudar de bioma p/ bioma). */
export const DECOR_BY_BIOME = {
  forest: {
    m: { anim: [MUSHROOM], anchor: 'floor' },
    f: { anim: [FERN], anchor: 'floor' },
    v: { anim: [VINE], anchor: 'ceil' },
    l: { anim: [LEAVES], anchor: 'free' },
    r: { anim: [RUBBLE], anchor: 'floor' },
  },
  ruins: {
    v: { anim: [MOSS], anchor: 'ceil' },
    c: { anim: [BG_COLUMN], anchor: 'floor' },
    r: { anim: [RUBBLE], anchor: 'floor' },
    f: { anim: [FERN], anchor: 'floor' },
    l: { anim: [LEAVES], anchor: 'free' },
  },
  castle: {
    b: { anim: [BANNER], anchor: 'ceil' },
    w: { anim: [WINDOW], anchor: 'free' },
    h: { anim: [CHAIN], anchor: 'ceil' },
    t: { anim: TORCH, anchor: 'free', speed: 7, embers: true },
    v: { anim: [MOSS], anchor: 'ceil' },
  },
  cathedral: {
    g: { anim: [STAINED_GLASS], anchor: 'free' },
    k: { anim: BELL, anchor: 'ceil', speed: 50 },
    n: { anim: CANDLE, anchor: 'floor', speed: 9 },
    h: { anim: [CHAIN], anchor: 'ceil' },
    w: { anim: [WINDOW], anchor: 'free' },
    b: { anim: [BANNER], anchor: 'ceil' },
  },
  sky: {
    s: { anim: [ICICLES], anchor: 'ceil' },
    p: { anim: [PINE], anchor: 'floor' },
    u: { anim: [BUNTING], anchor: 'free' },
    o: { anim: [CRYSTALS], anchor: 'floor' },
  },
};
