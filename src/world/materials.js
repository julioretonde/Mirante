import * as THREE from 'three';
import { config } from '../config.js';
import { SLOT, createAtlasTextures } from './atlas.js';

/**
 * Materiais do mundo. A cidade inteira (prédios, telhados, calçadas, props) usa UM material
 * com o atlas de texturas: cada vértice escolhe a região (atributo `atlas` = [região, escala])
 * e o shader repete a região com fract(). Resultado: um draw call por bloco da cidade.
 */

/** Uniforms compartilhados: um ajuste acende a cidade inteira. */
export const windowUniforms = {
  uLitRatio: { value: 0 },
  /** Cor do céu refletida pelas fachadas de vidro (atualizada pela luz por altura). */
  uSkyReflect: { value: new THREE.Color('#ffd6b0') },
};

const GRID = 4.0;
const INSET = 4 / 256; // margem dentro de cada região (evita sangrar a vizinha nos mipmaps)

/** Injeta o atlas, o toldo listrado, as janelas acesas por hash e (opcional) fog reduzido. */
function atlasMaterial({ fogScale = 1, maps }) {
  const mat = new THREE.MeshLambertMaterial({
    map: maps.map,
    emissiveMap: maps.emissiveMap,
    emissive: new THREE.Color(config.colors.windowGlow),
    emissiveIntensity: 0,
    vertexColors: true,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLitRatio = windowUniforms.uLitRatio;
    shader.uniforms.uSkyReflect = windowUniforms.uSkyReflect;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec2 atlas;\nvarying vec2 vAtlas;\nvarying vec2 vCityUv;',
      )
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvAtlas = atlas;\nvCityUv = uv;');

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uLitRatio;
        uniform vec3 uSkyReflect;
        varying vec2 vAtlas;
        varying vec2 vCityUv;
        vec2 atlasUv(vec2 cellUv, out vec2 ddx, out vec2 ddy) {
          float slot = vAtlas.x;
          vec2 origin = vec2(mod(slot, ${GRID.toFixed(1)}), floor(slot / ${GRID.toFixed(1)})) / ${GRID.toFixed(1)};
          float span = (1.0 - 2.0 * ${INSET.toFixed(5)}) / ${GRID.toFixed(1)};
          ddx = dFdx(cellUv) * span;
          ddy = dFdy(cellUv) * span;
          return origin + ${INSET.toFixed(5)} / ${GRID.toFixed(1)} + fract(cellUv) * span;
        }`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec2 cellUv = vCityUv * vAtlas.y;
        vec2 aDx, aDy;
        vec2 aUv = atlasUv(cellUv, aDx, aDy);
        diffuseColor *= textureGrad( map, aUv, aDx, aDy );`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
        if ( abs( vAtlas.x - ${SLOT.stripes.toFixed(1)} ) < 0.5 ) {
          float stripe = step( 0.5, fract( vCityUv.x ) );
          diffuseColor.rgb *= mix( vec3( 0.98, 0.96, 0.92 ), vColor.rgb, stripe );
        } else {
          diffuseColor.rgb *= vColor.rgb;
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `
        {
          vec3 mask = textureGrad( emissiveMap, aUv, aDx, aDy ).rgb;
          vec2 cellId = floor( vCityUv + 0.0001 ) + vec2( vAtlas.x * 17.0, 0.0 );
          float h = fract( sin( dot( cellId, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
          bool always = abs( vAtlas.x - ${SLOT.lamp.toFixed(1)} ) < 0.5;
          // Vidro acende menos (janelas grandes: poucas bastam para ler "escritório à noite")
          float ratio = uLitRatio * ( abs( vAtlas.x - ${SLOT.glass.toFixed(1)} ) < 0.5 ? 0.55 : 1.0 );
          float lit = always ? 1.4 : step( 1.0 - ratio, h ) * ( 0.55 + 0.6 * fract( h * 7.13 ) );
          totalEmissiveRadiance *= mask * lit;
          // Vidro espelhado: reflete o céu, mais forte em ângulos rasantes (Fresnel)
          if ( abs( vAtlas.x - ${SLOT.glass.toFixed(1)} ) < 0.5 ) {
            float fres = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 2.5 );
            totalEmissiveRadiance += uSkyReflect * ( 0.1 + 0.55 * fres ) * ( 1.0 - lit * mask.r );
          }
        }`,
      );

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
  mat.customProgramCacheKey = () => `mirante-atlas:${fogScale}`;
  return mat;
}

function fogScaled(material, fogScale) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      /* glsl */ `
      #ifdef USE_FOG
        float fogFactor = smoothstep( fogNear, fogFar, vFogDepth * ${fogScale.toFixed(3)} );
        gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
      #endif`,
    );
  };
  material.customProgramCacheKey = () => `mirante-fog:${fogScale}`;
  return material;
}

/** Textura de chão: manchas suaves e grão, funciona para calçamento e grama. */
function groundTexture(maxAnisotropy) {
  const s = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, s, s);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * s;
    const y = rnd() * s;
    const r = 10 + rnd() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() < 0.5;
    g.addColorStop(0, dark ? 'rgba(60,50,40,0.05)' : 'rgba(255,255,240,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    // Desenha com wrap para a textura repetir sem costura
    for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
  }
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(60,50,40,0.07)' : 'rgba(255,255,255,0.1)';
    ctx.fillRect(rnd() * s, rnd() * s, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createMaterials(renderer) {
  const maxAnisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy() ?? 4, 8);
  const maps = createAtlasTextures(maxAnisotropy);
  const towerFog = config.world.towerFogScale;

  const lib = {
    city: atlasMaterial({ maps }),
    tower: atlasMaterial({ maps, fogScale: towerFog }),
    lantern: fogScaled(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), towerFog * 0.5),
    terrain: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: groundTexture(maxAnisotropy) }),
    nature: new THREE.MeshLambertMaterial({ vertexColors: true }),
  };
  lib.windowMaterials = [lib.city, lib.tower];
  return lib;
}
