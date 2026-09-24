import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.35 }, uSize: { value: 0.78 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uStrength, uSize;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= mix(1.0, smoothstep(uSize, uSize - 0.5, d), uStrength);
      gl_FragColor = c;
    }`,
};

/**
 * Pós-processamento leve (só no preset Alto): bloom apenas no que é mais claro que branco
 * (janelas acesas, farol, sol) e vinheta suave. OutputPass faz tone mapping e sRGB por último.
 */
export class PostFX {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.35, 1.05);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new ShaderPass(VignetteShader));
    this.composer.addPass(new OutputPass());
  }

  setSize(width, height, pixelRatio) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  render() {
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
  }
}
