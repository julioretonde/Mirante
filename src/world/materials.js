import * as THREE from 'three';
import { config } from '../config.js';

/**
 * Biblioteca de materiais da cidade. Texturas de fachada são desenhadas em canvas (nada externo).
 * Cada textura é 1 vão × 1 andar; as UVs das paredes estão em vãos/andares, então repetem em escala real.
 * O branco da textura é tingido pela cor do vértice (cor do prédio).
 */

/** Uniforms compartilhados por todas as janelas: um ajuste acende a cidade inteira. */
export const windowUniforms = {
  uLitRatio: { value: 0 },
};

const TILE = 128;

function canvasTexture(draw, { srgb = true, maxAnisotropy = 4 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE;
  const ctx = canvas.getContext('2d');
  draw(ctx, TILE);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/** Desenha parede + janela; `mask` desenha só a área que acende à noite. */
const FACADES = {
  house(ctx, s, mask) {
    ctx.fillStyle = mask ? '#000' : '#fbf7f1';
    ctx.fillRect(0, 0, s, s);
    if (!mask) {
      ctx.fillStyle = '#ece4da';
      ctx.fillRect(0, 0, s, 5); // linha do piso
      ctx.fillStyle = '#b6c7bd';
      ctx.fillRect(s * 0.2, s * 0.24, s * 0.1, s * 0.52); // venezianas
      ctx.fillRect(s * 0.7, s * 0.24, s * 0.1, s * 0.52);
      ctx.fillStyle = '#fffaf2';
      ctx.fillRect(s * 0.29, s * 0.22, s * 0.42, s * 0.56); // moldura
    }
    ctx.fillStyle = mask ? '#fff' : '#4b4f63';
    ctx.fillRect(s * 0.33, s * 0.26, s * 0.34, s * 0.48);
    if (!mask) {
      ctx.fillStyle = '#e9e0d4';
      ctx.fillRect(s * 0.26, s * 0.74, s * 0.48, s * 0.05); // peitoril
    }
  },
  old(ctx, s, mask) {
    ctx.fillStyle = mask ? '#000' : '#fbf7f1';
    ctx.fillRect(0, 0, s, s);
    if (!mask) {
      ctx.fillStyle = '#e8dfd3';
      ctx.fillRect(0, 0, s, 7);
      ctx.fillStyle = '#fffaf3';
      ctx.fillRect(s * 0.27, s * 0.14, s * 0.46, s * 0.7);
    }
    ctx.fillStyle = mask ? '#fff' : '#474b5e';
    ctx.fillRect(s * 0.31, s * 0.19, s * 0.38, s * 0.6);
    if (!mask) {
      ctx.fillStyle = '#fbf7f1';
      ctx.fillRect(s * 0.49, s * 0.19, s * 0.02, s * 0.6); // divisória
      ctx.fillStyle = '#6d6a70';
      ctx.fillRect(s * 0.22, s * 0.8, s * 0.56, s * 0.04); // grade da sacada
      for (let i = 0; i < 7; i++) ctx.fillRect(s * (0.23 + i * 0.08), s * 0.8, 2, s * 0.12);
    }
  },
  office(ctx, s, mask) {
    ctx.fillStyle = mask ? '#000' : '#f7f5f1';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = mask ? '#fff' : '#56617a';
    ctx.fillRect(0, s * 0.3, s, s * 0.46);
    if (!mask) {
      ctx.fillStyle = '#e6e2dc';
      ctx.fillRect(0, s * 0.3, 4, s * 0.46); // montante
      ctx.fillStyle = '#7c89a3';
      ctx.fillRect(0, s * 0.3, s, 4);
    }
  },
  glass(ctx, s, mask) {
    if (mask) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s * 0.06, s * 0.12, s * 0.88, s * 0.76);
      return;
    }
    const g = ctx.createLinearGradient(0, s, 0, 0);
    g.addColorStop(0, '#9fb3c4');
    g.addColorStop(0.55, '#e9f1f4');
    g.addColorStop(1, '#c9d9e3');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#f4f1ec';
    ctx.fillRect(0, 0, s, s * 0.08); // laje
    ctx.fillRect(0, 0, s * 0.05, s); // montante
  },
  // Coração da Torre: janelões altos (GDD §7, Zona 7)
  heart(ctx, s, mask) {
    ctx.fillStyle = mask ? '#000' : '#fbf6ee';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = mask ? '#fff' : '#4d5068';
    ctx.fillRect(s * 0.14, s * 0.1, s * 0.72, s * 0.82);
    if (!mask) {
      ctx.fillStyle = '#d7b98a'; // caixilho de latão
      ctx.fillRect(s * 0.48, s * 0.1, s * 0.04, s * 0.82);
      ctx.fillRect(s * 0.14, s * 0.5, s * 0.72, s * 0.03);
    }
  },
};

/**
 * Injeta no shader: (1) janelas acesas por vão/andar via hash (cada janela decide sozinha),
 * (2) escala de fog (a torre recebe menos névoa para nunca sumir).
 */
function patch(material, { windows = false, fogScale = 1 } = {}) {
  if (!windows && fogScale === 1) return material;
  material.onBeforeCompile = (shader) => {
    if (windows) {
      shader.uniforms.uLitRatio = windowUniforms.uLitRatio;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uLitRatio;')
        .replace(
          '#include <emissivemap_fragment>',
          /* glsl */ `
          #ifdef USE_EMISSIVEMAP
            vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
            vec2 cellId = floor( vEmissiveMapUv + 0.0001 );
            float h = fract( sin( dot( cellId, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
            float lit = step( 1.0 - uLitRatio, h );
            totalEmissiveRadiance *= emissiveColor.rgb * lit * ( 0.7 + 0.6 * fract( h * 7.13 ) );
          #endif`,
        );
    }
    if (fogScale !== 1) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <fog_fragment>',
        /* glsl */ `
        #ifdef USE_FOG
          float fogFactor = smoothstep( fogNear, fogFar, vFogDepth * ${fogScale.toFixed(3)} );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
        #endif`,
      );
    }
  };
  material.customProgramCacheKey = () => `mirante:${windows ? 'w' : ''}:${fogScale}`;
  return material;
}

function facadeMaterial(kind, maxAnisotropy, extra = {}) {
  const draw = FACADES[kind];
  const map = canvasTexture((ctx, s) => draw(ctx, s, false), { maxAnisotropy });
  const emissiveMap = canvasTexture((ctx, s) => draw(ctx, s, true), { maxAnisotropy });
  const mat = new THREE.MeshLambertMaterial({
    map,
    emissiveMap,
    emissive: new THREE.Color(config.colors.windowGlow),
    emissiveIntensity: 0,
    vertexColors: true,
  });
  return patch(mat, { windows: true, ...extra });
}

/** Toldo listrado: alterna branco e a cor do vértice (UV.x em larguras de listra). */
function stripedMaterial(maxAnisotropy) {
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    map: canvasTexture(
      (ctx, s) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, s, s);
      },
      { maxAnisotropy },
    ),
  });
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      /* glsl */ `
      #if defined( USE_COLOR )
        float stripe = step( 0.5, fract( vMapUv.x ) );
        diffuseColor.rgb *= mix( vec3( 0.98, 0.96, 0.92 ), vColor.rgb, stripe );
      #endif`,
    );
  };
  mat.customProgramCacheKey = () => 'mirante:stripes';
  return mat;
}

export function createMaterials(renderer) {
  const maxAnisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy() ?? 4, 4);
  const towerFog = config.world.towerFogScale;

  const lib = {
    wall: {
      house: facadeMaterial('house', maxAnisotropy),
      old: facadeMaterial('old', maxAnisotropy),
      office: facadeMaterial('office', maxAnisotropy),
      glass: facadeMaterial('glass', maxAnisotropy),
    },
    plain: new THREE.MeshLambertMaterial({ vertexColors: true }),
    awning: stripedMaterial(maxAnisotropy),
    terrain: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    tower: {
      plain: patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { fogScale: towerFog }),
      glass: facadeMaterial('glass', maxAnisotropy, { fogScale: towerFog }),
      heart: facadeMaterial('heart', maxAnisotropy, { fogScale: towerFog }),
      lantern: patch(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), { fogScale: towerFog * 0.5 }),
    },
  };

  /** Todos os materiais com janelas, para o LightingProfile ajustar o brilho. */
  lib.windowMaterials = [...Object.values(lib.wall), lib.tower.glass, lib.tower.heart];
  return lib;
}
