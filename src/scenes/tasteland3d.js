// The mountain range of customer tastes as a 3D terrain in the world (stage 3's "best for whom?"; src/concepts/
// tasteland.js has the shape and the builds). A dark, faintly shaded surface, so near ridges hide far ones and the range
// stands in silhouette, with a fine wireframe draped over it (lines along x and z, a soft glow, brighter higher up).
// It rises out of the flat ground; when an airline plants its flag, its mountain's wireframe turns amber (as the lit
// parts of the airlines' value sticks), the light pouring down from the summit.
// One mesh, added to the world's scene once, the first time the move comes in; it fades out by itself when another
// move is on (its own onBeforeRender), so the rest of the app never has to know about it.

import * as THREE from '../../vendor/three/three.module.js';
import { LAND, PEAKS, height, peakShare, summit } from '../concepts/tasteland.js';
import { hexToRgb } from '../colors.js';
import { PAL } from '../concepts/kit.js';

export const TERRAIN = { mesh: 0.2, fadeOut: 0.5, cold: PAL.sky, hot: PAL.amber };

export function buildTerrain({ nx = LAND.nx, nz = LAND.nz } = {}) {
  const n = (nx + 1) * (nz + 1);
  const pos = new Float32Array(n * 3), H = new Float32Array(n), Wt = new Float32Array(n * 3), D = new Float32Array(n);
  let i = 0;
  for (let j = 0; j <= nz; j++) {
    const z = LAND.z[0] + ((LAND.z[1] - LAND.z[0]) * j) / nz;
    for (let k = 0; k <= nx; k++, i++) {
      const x = LAND.x[0] + ((LAND.x[1] - LAND.x[0]) * k) / nx;
      pos[i * 3] = x; pos[i * 3 + 2] = z;
      H[i] = height(x, z);
      Wt.set(peakShare(x, z), i * 3);
      D[i] = Math.min(1, Math.hypot(x / LAND.x[1], z / LAND.z[1]) / 1.25); // rises from the middle out
    }
  }
  const idx = new Uint32Array(nx * nz * 6);
  let q = 0;
  for (let j = 0; j < nz; j++) for (let k = 0; k < nx; k++) {
    const a = j * (nx + 1) + k, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.set([a, c, b, b, c, d], q); q += 6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aH', new THREE.BufferAttribute(H, 1));
  geo.setAttribute('aW', new THREE.BufferAttribute(Wt, 3));
  geo.setAttribute('aD', new THREE.BufferAttribute(D, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

const VS = `
attribute float aH; attribute vec3 aW; attribute float aD;
uniform float uRise;
varying float vH; varying vec3 vW; varying vec3 vP;
void main() {
  float r = clamp(uRise * 1.5 - aD * 0.5, 0.0, 1.0);
  r = r * r * (3.0 - 2.0 * r);
  vH = aH * r; vW = aW; vP = vec3(position.x, vH, position.z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(vP, 1.0);
}`;

const FS = `
uniform float uO; uniform float uMesh; uniform vec3 uLit; uniform vec3 uTopH;
uniform vec3 uCold; uniform vec3 uHot; uniform vec4 uRim;
varying float vH; varying vec3 vW; varying vec3 vP;
// distance (in pixels) to the nearest whole value of v
float px(float v) { return abs(fract(v + 0.5) - 0.5) / max(fwidth(v), 1e-5); }
float wire(float v, float w) { float d = px(v); return (1.0 - smoothstep(w * 0.5, w * 0.5 + 1.0, d)) + 0.1 * exp(-d * d / 9.0); }
// a mountain lit from the top down: everything above its level, which falls from the summit to the ground
float pour(float share, float lit, float top) {
  float level = top * (1.0 - lit) - 0.05;
  return share * smoothstep(level - 0.12, level + 0.02, vH) * step(0.001, lit);
}
void main() {
  float rim = smoothstep(uRim.x, uRim.x + 1.8, vP.x) * smoothstep(uRim.y, uRim.y - 1.8, vP.x)
    * smoothstep(uRim.z, uRim.z + 1.0, vP.z) * smoothstep(uRim.w, uRim.w - 0.9, vP.z);
  float ht = clamp(vH / 2.6, 0.0, 1.0);
  float lit = clamp(pour(vW.x, uLit.x, uTopH.x) + pour(vW.y, uLit.y, uTopH.y) + pour(vW.z, uLit.z, uTopH.z), 0.0, 1.0);
  // the rock: a faint light from the upper left on the slopes
  vec3 n = normalize(cross(dFdx(vP), dFdy(vP)));
  if (n.y < 0.0) n = -n;
  float shade = 0.35 + 0.65 * max(0.0, dot(n, normalize(vec3(-0.5, 0.75, 0.45))));
  float mesh = max(wire(vP.x / uMesh, 1.1), wire(vP.z / uMesh, 1.1));
  vec3 cold = uCold * (0.14 + 0.8 * ht + 0.3 * max(vW.x, max(vW.y, vW.z))); // the named mountains a little brighter
  vec3 col = mix(cold, uHot * (0.7 + 0.35 * ht), lit);
  vec3 fill = (vec3(0.012, 0.03, 0.065) + col * 0.05) * shade;
  gl_FragColor = vec4((fill + col * mesh * (0.55 + 0.45 * shade)) * rim, uO);
}`;

// The terrain, added to scene (the world's three.js scene). isActive(): is its move the one on screen?
export function createTasteland(scene, { isActive = () => true, grid = {} } = {}) {
  const v3 = hex => new THREE.Vector3(...hexToRgb(hex));
  const uniforms = {
    uO: { value: 0 }, uRise: { value: 0 }, uMesh: { value: TERRAIN.mesh },
    uLit: { value: new THREE.Vector3() }, uTopH: { value: new THREE.Vector3(...PEAKS.map(p => summit(p)[1])) },
    uCold: { value: v3(TERRAIN.cold) }, uHot: { value: v3(TERRAIN.hot) },
    uRim: { value: new THREE.Vector4(LAND.x[0], LAND.x[1], LAND.z[0], LAND.z[1]) },
  };
  const mesh = new THREE.Mesh(buildTerrain(grid), new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, uniforms, transparent: true, depthWrite: true, side: THREE.DoubleSide,
  }));
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.visible = false;
  scene.add(mesh);
  let last = null;
  const api = {
    mesh,
    show() { mesh.visible = true; last = null; },
    // the builds at this moment (landscapeState); the mountains light in PEAKS order
    set(St) {
      uniforms.uO.value = St.o;
      uniforms.uRise.value = St.rise;
      uniforms.uLit.value.fromArray(PEAKS.map(p => St.air.find(a => a.key === p.airline)?.lit ?? 0));
    },
    // every frame it is drawn: once another move is on, it fades, then hides
    tick(now) {
      const dt = last == null ? 0 : Math.max(0, (now - last) / 1000);
      last = now;
      if (isActive()) return;
      uniforms.uO.value = Math.max(0, uniforms.uO.value - dt / TERRAIN.fadeOut);
      if (uniforms.uO.value <= 0) mesh.visible = false;
    },
  };
  mesh.onBeforeRender = () => api.tick(performance.now());
  return api;
}
