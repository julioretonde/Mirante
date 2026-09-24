import * as THREE from 'three';
import { createRandom } from '../core/Random.js';

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vDir = wp.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 bottomColor;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0
      ? mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.55))
      : mix(horizonColor, bottomColor, pow(clamp(-h * 4.0, 0.0, 1.0), 0.5));
    vec3 s = normalize(sunDir);
    float above = smoothstep(-0.06, 0.02, s.y);
    float m = max(dot(d, s), 0.0);
    col += sunColor * above * (pow(m, 900.0) * 1.3 + pow(m, 14.0) * 0.28 + pow(m, 3.0) * 0.08);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Céu em gradiente com sol, estrelas e lua. Acompanha a câmera. */
export class Sky {
  constructor() {
    this.group = new THREE.Group();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color() },
        horizonColor: { value: new THREE.Color() },
        bottomColor: { value: new THREE.Color() },
        sunColor: { value: new THREE.Color() },
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), this.material);
    dome.renderOrder = -2;
    dome.frustumCulled = false;
    this.group.add(dome);

    // Estrelas (só aparecem conforme escurece)
    const rnd = createRandom(4242);
    const count = 1600;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rnd.next() * Math.PI * 2;
      const y = 0.05 + rnd.next() * 0.95;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(u) * r * 3600, y * 3600, Math.sin(u) * r * 3600], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMaterial = new THREE.PointsMaterial({
      color: '#fff8e8',
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMaterial);
    this.stars.renderOrder = -1;
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    // Lua
    this.moonDir = new THREE.Vector3(0.55, 0.42, 0.72).normalize();
    this.moon = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: moonTexture(), transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }),
    );
    this.moon.position.copy(this.moonDir).multiplyScalar(3400);
    this.moon.scale.setScalar(150);
    this.moon.renderOrder = -1;
    this.group.add(this.moon);
  }

  apply(profile, sunDir) {
    const u = this.material.uniforms;
    u.topColor.value.copy(profile.skyTop);
    u.horizonColor.value.copy(profile.skyHorizon);
    u.bottomColor.value.copy(profile.skyBottom);
    u.sunColor.value.copy(profile.sun);
    u.sunDir.value.copy(sunDir);
    this.starMaterial.opacity = profile.stars;
    this.stars.visible = profile.stars > 0.01;
    this.moon.material.opacity = Math.min(profile.stars * 1.4, 1);
    this.moon.visible = profile.stars > 0.01;
  }

  update(camera) {
    this.group.position.copy(camera.position);
  }
}

function moonTexture() {
  const s = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(s / 2, s / 2, s * 0.12, s / 2, s / 2, s / 2);
  glow.addColorStop(0, 'rgba(230,236,255,0.35)');
  glow.addColorStop(1, 'rgba(230,236,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#f4f1e6';
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,196,188,0.6)';
  ctx.beginPath();
  ctx.arc(s * 0.47, s * 0.47, s * 0.03, 0, Math.PI * 2);
  ctx.arc(s * 0.55, s * 0.54, s * 0.022, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
