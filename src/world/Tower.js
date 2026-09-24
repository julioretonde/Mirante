import * as THREE from 'three';
import { config } from '../config.js';

/**
 * Torre Farol (versão provisória da Etapa 0: silhueta com recuos e farol pulsante).
 * A Etapa 1 detalha a arquitetura. Materiais sem fog para a torre nunca sumir na distância;
 * as cores já são "enevoadas" para parecer longe.
 */
export class Tower {
  constructor() {
    const H = config.world.towerHeight;
    this.group = new THREE.Group();
    this.group.position.fromArray(config.world.towerPosition);

    // Emissivo suave simula a névoa iluminada pelo sol: a face à sombra não fica escura demais.
    const hazy = (color, haze) =>
      new THREE.MeshLambertMaterial({ color, emissive: haze, emissiveIntensity: 0.45, fog: false });
    const stone = hazy('#ecdccb', '#b99a8e');
    const glass = hazy('#a9b6cc', '#9a93a8');
    const glassDark = hazy('#8e9cb6', '#8a86a0');
    const steel = hazy('#b7a3a6', '#9f8a92');

    const box = (w, h, d, y, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.y = y + h / 2;
      this.group.add(m);
      return m;
    };

    // Base de pedra clara + corpo de vidro com recuos escalonados
    box(70, 40, 70, 0, stone);
    box(50, 170, 50, 40, glass);
    box(54, 4, 54, 210, stone);
    box(40, 130, 40, 214, glassDark);
    box(44, 4, 44, 344, stone);
    box(30, 110, 30, 348, glass);
    box(34, 4, 34, 458, steel);

    // Estrutura de aço exposta: quatro colunas finas e anéis
    const top = 462;
    const frameH = 78;
    for (const [x, z] of [
      [-12, -12],
      [12, -12],
      [-12, 12],
      [12, 12],
    ]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(2.4, frameH, 2.4), steel);
      c.position.set(x, top + frameH / 2, z);
      this.group.add(c);
    }
    for (let i = 1; i <= 3; i++) {
      const ring = new THREE.Mesh(new THREE.BoxGeometry(27, 1.6, 27), steel);
      ring.position.y = top + (frameH * i) / 3;
      this.group.add(ring);
    }

    // Agulha e antena
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(2, 9, H - 540 - 14, 8), steel);
    needle.position.y = 540 + (H - 540 - 14) / 2;
    this.group.add(needle);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 14, 6), steel);
    antenna.position.y = H - 7;
    this.group.add(antenna);

    // Farol: núcleo, halo pulsante e feixe que varre o céu
    this.beaconY = H - 18;
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 12, 8),
      new THREE.MeshBasicMaterial({ color: '#fff4d6', fog: false, toneMapped: false }),
    );
    core.position.y = this.beaconY;
    this.group.add(core);

    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: '#ffe2a8',
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    );
    this.halo.position.y = this.beaconY;
    this.group.add(this.halo);

    const beamGeo = new THREE.ConeGeometry(26, 520, 24, 1, true);
    beamGeo.translate(0, -260, 0); // ponta no farol
    beamGeo.rotateZ(Math.PI / 2); // aponta na horizontal (+X)
    this.beam = new THREE.Mesh(beamGeo, makeBeamMaterial());
    this.beamPivot = new THREE.Group();
    this.beamPivot.position.y = this.beaconY;
    this.beamPivot.rotation.z = 0.12; // levemente para cima
    this.beamPivot.add(this.beam);
    this.group.add(this.beamPivot);
  }

  update(t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * ((Math.PI * 2) / 3.2));
    const s = 40 + pulse * 26;
    this.halo.scale.set(s, s, 1);
    this.halo.material.opacity = 0.55 + pulse * 0.45;
    this.beamPivot.rotation.y = t * 0.35;
    this.beam.material.uniforms.opacity.value = 0.1 + pulse * 0.08;
  }
}

/** Feixe que some ao longo do comprimento e nas bordas (sem "tampa" visível). */
function makeBeamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color('#ffe7b8') },
      opacity: { value: 0.12 },
      length: { value: 520 },
    },
    vertexShader: /* glsl */ `
      uniform float length;
      varying float vAlong;
      varying float vFacing;
      void main() {
        vAlong = clamp(position.x / length, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFacing = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float opacity;
      varying float vAlong;
      varying float vFacing;
      void main() {
        float fade = pow(1.0 - vAlong, 2.2) * smoothstep(0.0, 0.6, vFacing);
        gl_FragColor = vec4(color, opacity * fade);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,240,200,0.8)');
  g.addColorStop(0.5, 'rgba(255,210,150,0.18)');
  g.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
