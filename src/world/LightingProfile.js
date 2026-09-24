import * as THREE from 'three';

/**
 * Luz do dia conforme a ALTURA (GDD §3), não o tempo real. Cada chave fica no meio da faixa
 * do GDD, para cada faixa mostrar seu caráter; entre chaves a interpolação é suave.
 *
 *   0–60 fim de tarde · 60–160 hora dourada · 160–320 pôr do sol
 *   320–420 último sol · 420–520 crepúsculo · 520–600 noite estrelada
 */
export const KEYFRAMES = [
  {
    height: 30, name: 'fimDeTarde',
    skyTop: '#9dbbe0', skyHorizon: '#ffd6b0', skyBottom: '#f0c6a4',
    sun: '#ffe0b0', light: '#ffd29a', lightIntensity: 2.6, sunElevation: 16,
    hemiSky: '#d6e2f0', hemiGround: '#c29a7c', hemiIntensity: 1.9,
    fog: '#f3d5bf', stars: 0, windows: 0, cloudGlow: '#fff0e4', cloudGlowIntensity: 0.55, exposure: 1,
  },
  {
    height: 110, name: 'horaDourada',
    skyTop: '#f2a9b0', skyHorizon: '#ffb06a', skyBottom: '#f0a878',
    sun: '#ffc27a', light: '#ffb070', lightIntensity: 2.4, sunElevation: 9,
    hemiSky: '#f3c5b5', hemiGround: '#b98470', hemiIntensity: 1.7,
    fog: '#f6c09a', stars: 0, windows: 0.05, cloudGlow: '#ffd0b0', cloudGlowIntensity: 0.55, exposure: 1,
  },
  {
    height: 240, name: 'porDoSol',
    skyTop: '#b9a0d0', skyHorizon: '#ff8f7a', skyBottom: '#e89080',
    sun: '#ff9f80', light: '#ff8f7a', lightIntensity: 2.0, sunElevation: 3.5,
    hemiSky: '#c8a8d0', hemiGround: '#a0707a', hemiIntensity: 1.5,
    fog: '#eea28e', stars: 0, windows: 0.2, cloudGlow: '#ffb0a0', cloudGlowIntensity: 0.55, exposure: 1,
  },
  {
    height: 370, name: 'ultimoSol',
    skyTop: '#7b67b3', skyHorizon: '#c9a0d8', skyBottom: '#b48cc0',
    sun: '#ffb8c0', light: '#ffb8c0', lightIntensity: 1.3, sunElevation: 0.8,
    hemiSky: '#a996cc', hemiGround: '#7a6480', hemiIntensity: 1.3,
    fog: '#b69ac8', stars: 0.1, windows: 0.45, cloudGlow: '#f0a8c0', cloudGlowIntensity: 0.45, exposure: 1.05,
  },
  {
    height: 470, name: 'crepusculo',
    skyTop: '#26336e', skyHorizon: '#7d66ae', skyBottom: '#5f4f8a',
    sun: '#9fb2e6', light: '#9fb2e6', lightIntensity: 0.8, sunElevation: -3,
    hemiSky: '#6d6fa8', hemiGround: '#3d3656', hemiIntensity: 1.0,
    fog: '#5a5088', stars: 0.45, windows: 0.8, cloudGlow: '#8f86c0', cloudGlowIntensity: 0.25, exposure: 1.1,
  },
  {
    height: 560, name: 'noite',
    skyTop: '#0b1231', skyHorizon: '#2a3464', skyBottom: '#1d2346',
    sun: '#b8c8ff', light: '#b8c8ff', lightIntensity: 0.5, sunElevation: -12,
    hemiSky: '#3a4478', hemiGround: '#141428', hemiIntensity: 0.6,
    fog: '#232a52', stars: 1, windows: 1, cloudGlow: '#4a5288', cloudGlowIntensity: 0.15, exposure: 1.15,
  },
];

const COLOR_KEYS = ['skyTop', 'skyHorizon', 'skyBottom', 'sun', 'light', 'hemiSky', 'hemiGround', 'fog', 'cloudGlow'];
const NUMBER_KEYS = ['lightIntensity', 'sunElevation', 'hemiIntensity', 'stars', 'windows', 'cloudGlowIntensity', 'exposure'];

// Cores pré-convertidas (interpolação em espaço linear)
const PRE = KEYFRAMES.map((k) => {
  const out = { ...k };
  for (const key of COLOR_KEYS) out[key] = new THREE.Color(k[key]);
  return out;
});

const smooth = (t) => t * t * (3 - 2 * t);

/** Cria um objeto de perfil reutilizável (evita alocação por frame). */
export function createProfile() {
  const p = { height: 0, index: 0 };
  for (const key of COLOR_KEYS) p[key] = new THREE.Color();
  for (const key of NUMBER_KEYS) p[key] = 0;
  return p;
}

/** Preenche `out` com o perfil de luz para a altura dada (metros). */
export function sampleProfile(height, out = createProfile()) {
  let i = 0;
  while (i < PRE.length - 2 && height > PRE[i + 1].height) i++;
  const a = PRE[i];
  const b = PRE[i + 1];
  const t = smooth(Math.min(Math.max((height - a.height) / (b.height - a.height), 0), 1));
  for (const key of COLOR_KEYS) out[key].copy(a[key]).lerp(b[key], t);
  for (const key of NUMBER_KEYS) out[key] = a[key] + (b[key] - a[key]) * t;
  out.height = height;
  out.index = t < 0.5 ? i : i + 1;
  return out;
}
