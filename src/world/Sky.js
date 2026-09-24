import * as THREE from 'three';

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
      ? mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.6))
      : mix(horizonColor, bottomColor, pow(clamp(-h * 4.0, 0.0, 1.0), 0.5));
    float s = max(dot(d, normalize(sunDir)), 0.0);
    col += sunColor * (pow(s, 900.0) * 1.2 + pow(s, 16.0) * 0.22 + pow(s, 3.0) * 0.06);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Céu em gradiente com sol baixo. Acompanha a câmera. */
export class Sky {
  constructor({ top, horizon, bottom, sun, sunDirection }) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(top) },
        horizonColor: { value: new THREE.Color(horizon) },
        bottomColor: { value: new THREE.Color(bottom) },
        sunColor: { value: new THREE.Color(sun) },
        sunDir: { value: sunDirection.clone().normalize() },
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(3500, 32, 16), this.material);
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
  }

  update(camera) {
    this.mesh.position.copy(camera.position);
  }
}
