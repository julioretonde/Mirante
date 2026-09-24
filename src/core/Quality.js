/**
 * Presets de qualidade (GDD §2 e §3). Na Etapa 9 a escolha inicial passa a considerar o FPS
 * medido; por enquanto: app/celular → média, computador → alta. `?quality=` força um preset.
 */
export const QUALITY = {
  baixa: { name: 'baixa', dpr: 1.25, shadowMapSize: 512, antialias: false, post: false },
  media: { name: 'media', dpr: 1.75, shadowMapSize: 1024, antialias: true, post: false },
  // Só no Alto: bloom sutil nas luzes e vinheta suave
  alta: { name: 'alta', dpr: 2, shadowMapSize: 2048, antialias: true, post: true },
};

export function detectQuality({ isNative = false, search = globalThis.location?.search ?? '' } = {}) {
  const forced = new URLSearchParams(search).get('quality');
  if (forced && QUALITY[forced]) return QUALITY[forced];
  if (isNative) return QUALITY.media;
  const touch = (globalThis.navigator?.maxTouchPoints ?? 0) > 0;
  const small = Math.min(globalThis.innerWidth ?? 1920, globalThis.innerHeight ?? 1080) < 600;
  return touch && small ? QUALITY.media : QUALITY.alta;
}
