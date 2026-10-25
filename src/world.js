// The world: every firm is one persistent object drawn as a light (point sprite)
// and/or a tower (instanced box). Scenes hand it target layouts; it morphs between them.

import * as THREE from '../vendor/three/three.module.js';
import { ease, clamp01 } from './tween.js';
import { hexToRgb, PLATE_HEX } from './colors.js';
import { rand, yTransform, FRAME } from './layouts.js';

const S = 12; // x y z | r g b | size alpha | tower towerBase towerW towerD
const X = 0, R = 3, SIZE = 6, ALPHA = 7, TOWER = 8, BASE = 9, TW = 10, TD = 11;

const POINT_VS = `
attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
uniform float uProj; uniform float uHalo;
varying vec3 vColor; varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aAlpha > 0.001 ? uHalo * aSize * uProj / max(-mv.z, 0.001) : 0.0;
  vColor = aColor; vAlpha = aAlpha;
}`;
const POINT_FS = `
uniform float uHalo; uniform float uGlow;
varying vec3 vColor; varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float edge = 1.0 / uHalo;                 // core radius as a fraction of the sprite radius
  float core = 1.0 - smoothstep(edge * 0.82, edge, r);
  float glow = exp(-r * r * 9.0) * uGlow;
  float a = clamp(core + glow * (1.0 - core), 0.0, 1.0) * vAlpha;
  gl_FragColor = vec4(vColor, a);
}`;
const TOWER_VS = `
varying vec3 vColor; varying vec3 vN; varying float vH;
void main() {
  vColor = instanceColor; vN = normal; vH = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const TOWER_FS = `
varying vec3 vColor; varying vec3 vN; varying float vH;
void main() {
  float s = vN.y > 0.5 ? 1.0 : (vN.y < -0.5 ? 0.25 : (abs(vN.x) > 0.5 ? 0.58 : 0.78));
  float lift = vN.y > 0.5 ? 1.0 : mix(0.55, 1.0, vH);   // faces brighten toward the top
  gl_FragColor = vec4(vColor * s * lift, 1.0);
}`;

export class World {
  constructor(canvas, ids) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x000000, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 5000);

    this.ids = ids;
    this.index = new Map(ids.map((id, i) => [id, i]));
    const N = (this.N = ids.length);
    this.cur = new Float32Array(N * S);
    this.from = new Float32Array(N * S);
    this.to = new Float32Array(N * S);
    this.delay = new Float32Array(N);
    this.trans = null;

    // lights
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(new Float32Array(N), 1).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(new Float32Array(N), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos);
    g.setAttribute('aColor', this.aCol);
    g.setAttribute('aSize', this.aSize);
    g.setAttribute('aAlpha', this.aAlpha);
    this.pointUniforms = { uProj: { value: 1000 }, uHalo: { value: 5.0 }, uGlow: { value: 0.32 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      vertexShader: POINT_VS, fragmentShader: POINT_FS, uniforms: this.pointUniforms,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;

    // towers
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    this.towers = new THREE.InstancedMesh(box, new THREE.ShaderMaterial({
      vertexShader: TOWER_VS, fragmentShader: TOWER_FS,
    }), N);
    this.towers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.towers.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
    this.towers.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.towers.frustumCulled = false;

    // Everything sits in one group whose vertical scale can animate (the chart's y-axis range).
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.root.add(this.towers, this.points);
    this.plates = new Plates(this.root);
    this.ground = new Ground(this.root);
    this.yA = 1; this.yB = 0; this.yAnim = null;
  }

  // Show returns in [a, b] across the chart's height (animated). Default range: setYRange().
  setYRange(a = FRAME.roaMin, b = FRAME.roaMax, { duration = 1600, now = performance.now() } = {}) {
    const { A, B } = yTransform(a, b);
    if (duration <= 0) { this.yA = A; this.yB = B; this.yAnim = null; this._applyY(); return; }
    this.yAnim = { fA: this.yA, fB: this.yB, A, B, start: now, dur: duration };
  }
  _applyY() { this.root.scale.y = this.yA; this.root.position.y = this.yB; }
  ty(y) { return this.yA * y + this.yB; }

  setSize(w, h, dpr) {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.cssW = w; this.cssH = h;
  }

  setGlow(glow = 0.32, halo = 5.0) {
    this.pointUniforms.uGlow.value = glow;
    this.pointUniforms.uHalo.value = halo;
  }

  _write(arr, i, a) {
    const o = i * S;
    arr[o] = a.x; arr[o + 1] = a.y; arr[o + 2] = a.z;
    arr[o + 3] = a.color[0]; arr[o + 4] = a.color[1]; arr[o + 5] = a.color[2];
    arr[o + SIZE] = a.size; arr[o + ALPHA] = a.alpha;
    arr[o + TOWER] = a.tower; arr[o + BASE] = a.towerBase; arr[o + TW] = a.towerW; arr[o + TD] = a.towerD;
  }

  visible(i) {
    const o = i * S;
    return this.cur[o + ALPHA] > 0.01 || Math.abs(this.cur[o + TOWER]) > 1e-4;
  }

  // Animate to a layout. Firms not in `agents` fade out where they are.
  // appearFrom(id, agent) may return [x,y,z] for where a newly appearing firm starts.
  setTargets(agents, { duration = 1600, stagger = 0, staggerBy = 'random', easing = 'inOutCubic',
    appearFrom = null, now = performance.now() } = {}) {
    this.from.set(this.cur);
    this.to.set(this.cur);
    let xmin = Infinity, xmax = -Infinity;
    for (const a of agents.values()) { xmin = Math.min(xmin, a.x); xmax = Math.max(xmax, a.x); }
    for (let i = 0; i < this.N; i++) {
      const id = this.ids[i], o = i * S, a = agents.get(id);
      if (a) {
        this._write(this.to, i, a);
        if (!this.visible(i)) { // appear in place instead of flying in from a stale position
          const start = appearFrom ? appearFrom(id, a) : null;
          this.from[o] = start ? start[0] : a.x;
          this.from[o + 1] = start ? start[1] : a.y;
          this.from[o + 2] = start ? start[2] : a.z;
          for (let k = R; k < R + 3; k++) this.from[o + k] = this.to[o + k];
          this.from[o + SIZE] = a.size; this.from[o + TOWER] = 0;
          this.from[o + BASE] = a.towerBase; this.from[o + TW] = a.towerW; this.from[o + TD] = a.towerD;
        }
      } else {
        this.to[o + ALPHA] = 0; this.to[o + TOWER] = 0;
      }
      const f = staggerBy === 'x' && a && xmax > xmin ? (a.x - xmin) / (xmax - xmin) : rand(id * 31 + 7)();
      this.delay[i] = f * stagger;
    }
    if (duration <= 0) { this.cur.set(this.to); this.trans = null; return; }
    this.trans = { start: now, dur: duration, stagger, ease: ease[easing] || ease.inOutCubic };
  }

  // Jump straight to a layout (time-lapse frames).
  setNow(agents) {
    for (let i = 0; i < this.N; i++) {
      const a = agents.get(this.ids[i]), o = i * S;
      if (a) this._write(this.cur, i, a);
      else { this.cur[o + ALPHA] = 0; this.cur[o + TOWER] = 0; }
    }
    this.to.set(this.cur);
    this.trans = null;
  }

  // Recolor some objects in place; positions (and any running transition) are untouched.
  setColors(colors) {
    for (const [id, c] of colors) {
      const i = this.index.get(id);
      if (i === undefined) continue;
      const o = i * S + R;
      for (const arr of [this.cur, this.from, this.to]) { arr[o] = c[0]; arr[o + 1] = c[1]; arr[o + 2] = c[2]; }
    }
  }

  // Place some objects right now without disturbing anything else (or any running transition).
  setSome(agents) {
    for (const [id, a] of agents) {
      const i = this.index.get(id);
      if (i === undefined) continue;
      this._write(this.cur, i, a); this._write(this.from, i, a); this._write(this.to, i, a);
    }
  }

  busy() { return !!this.trans || !!this.yAnim || this.plates.busy() || this.ground.busy(); }

  update(now) {
    const tr = this.trans;
    if (tr) {
      const total = tr.dur * (1 + tr.stagger);
      const el = now - tr.start;
      for (let i = 0; i < this.N; i++) {
        const t = tr.ease(clamp01((el - this.delay[i] * tr.dur) / tr.dur));
        const o = i * S;
        for (let k = 0; k < S; k++) this.cur[o + k] = this.from[o + k] + (this.to[o + k] - this.from[o + k]) * t;
      }
      if (el >= total) { this.cur.set(this.to); this.trans = null; }
    }
    if (this.yAnim) {
      const a = this.yAnim, t = ease.inOutCubic(clamp01((now - a.start) / a.dur));
      this.yA = a.fA + (a.A - a.fA) * t; this.yB = a.fB + (a.B - a.fB) * t;
      if (t >= 1) this.yAnim = null;
    }
    this._applyY();
    this.plates.update(now);
    this.ground.update(now);
    this._upload();
  }

  _upload() {
    const P = this.aPos.array, C = this.aCol.array, Z = this.aSize.array, A = this.aAlpha.array;
    const M = this.towers.instanceMatrix.array, TC = this.towers.instanceColor.array;
    for (let i = 0; i < this.N; i++) {
      const o = i * S;
      P[i * 3] = this.cur[o]; P[i * 3 + 1] = this.cur[o + 1]; P[i * 3 + 2] = this.cur[o + 2];
      C[i * 3] = this.cur[o + 3]; C[i * 3 + 1] = this.cur[o + 4]; C[i * 3 + 2] = this.cur[o + 5];
      Z[i] = this.cur[o + SIZE]; A[i] = Math.max(0, this.cur[o + ALPHA]);
      const h = this.cur[o + TOWER], w = this.cur[o + TW], d = this.cur[o + TD], m = i * 16;
      M.fill(0, m, m + 16);
      if (Math.abs(h) > 1e-4 && w > 1e-5) {
        M[m] = w; M[m + 5] = Math.abs(h); M[m + 10] = d; M[m + 15] = 1;
        M[m + 12] = this.cur[o]; M[m + 13] = this.cur[o + BASE] + Math.min(0, h); M[m + 14] = this.cur[o + 2];
      }
      const dim = h < 0 ? 0.42 : 1;
      TC[i * 3] = this.cur[o + 3] * dim; TC[i * 3 + 1] = this.cur[o + 4] * dim; TC[i * 3 + 2] = this.cur[o + 5] * dim;
    }
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aAlpha.needsUpdate = true;
    this.towers.instanceMatrix.needsUpdate = true;
    this.towers.instanceColor.needsUpdate = true;
  }

  render() {
    const buf = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.pointUniforms.uProj.value = buf.y / Math.tan((this.camera.fov * Math.PI) / 360);
    this.renderer.render(this.scene, this.camera);
  }

  // data coordinates -> stage CSS pixels (applies the animated y-axis range)
  project(x, y, z) { return this.projectFrame(x, this.ty(y), z); }

  // chart-frame coordinates (fixed, e.g. labels under the chart) -> stage CSS pixels
  projectFrame(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return [(v.x + 1) / 2 * this.cssW, (1 - v.y) / 2 * this.cssH, v.z];
  }

  position(id) {
    const i = this.index.get(id);
    if (i === undefined) return null;
    const o = i * S, h = this.cur[o + TOWER];
    const y = Math.abs(h) > 1e-4 && this.cur[o + ALPHA] < 0.01 ? this.cur[o + BASE] + Math.max(0, h) : this.cur[o + 1];
    return { x: this.cur[o], y, z: this.cur[o + 2], alpha: this.cur[o + ALPHA], tower: h, size: this.cur[o + SIZE] };
  }

  // stage pixel -> data coordinates on the chart plane (z = 0), undoing the y-axis range
  unproject(px, py) {
    const ndc = new THREE.Vector2((px / this.cssW) * 2 - 1, 1 - (py / this.cssH) * 2);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit)) return null;
    return [hit.x, (hit.y - this.yB) / this.yA];
  }

  // nearest visible firm to a stage pixel (concept lights too when `any`)
  pick(px, py, radius = 16, { any = false, filter = null } = {}) {
    let best = null, bestD = radius * radius;
    for (let i = 0; i < this.N; i++) {
      if (!this.visible(i) || (!any && this.ids[i] < 0)) continue; // negative ids are drawn objects, not firms
      if (filter && !filter(this.ids[i])) continue;
      const p = this.position(this.ids[i]);
      const [sx, sy] = this.project(p.x, p.y, p.z);
      const d = (sx - px) ** 2 + (sy - py) ** 2;
      if (d < bestD) { bestD = d; best = this.ids[i]; }
    }
    return best;
  }

  presentIds() {
    const s = new Set();
    for (let i = 0; i < this.N; i++) if (this.visible(i)) s.add(this.ids[i]);
    return s;
  }
}

// Industry average volumes: a translucent block from zero to the average, with a bright lid.
// Seen head-on it is exactly a bar of the bar chart.
class Plates {
  constructor(scene) {
    this.scene = scene; this.items = []; this.anim = null;
    this.color = new THREE.Color(...hexToRgb(PLATE_HEX));
  }
  _ensure(n) {
    while (this.items.length < n) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
        color: this.color, transparent: true, opacity: 0, depthWrite: false }));
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
        color: this.color, transparent: true, opacity: 0, depthWrite: false }));
      body.renderOrder = 5; lid.renderOrder = 6;
      this.scene.add(body, lid);
      this.items.push({ body, lid, cur: { x: 0, w: 0, base: 0, top: 0, depth: 0.01, o: 0, body: 0.2, lid: 0.95 } });
    }
  }
  // body/lid: opacity of the block and of its top. 3D views want a faint "water level";
  // head-on views want a bright line on top of a solid-looking bar.
  set(list, { duration = 1600, opacity = 1, depth = null, body = 0.3, lid = 1.0, now = performance.now() } = {}) {
    this._ensure(list.length);
    this.items.forEach((it, k) => {
      const p = list[k];
      it.from = { ...it.cur };
      it.to = p ? { x: p.x, w: p.width, base: p.base, top: p.top, depth: depth ?? p.zDepth * 2, o: p.opacity ?? opacity, body, lid }
        : { ...it.cur, o: 0 };
      if (p && it.cur.o < 0.01) it.from = { ...it.to, top: p.base, o: 0 };
      if (p) { // each bar in its sector's color (falls back to the plate blue)
        const c = p.color ? new THREE.Color(...hexToRgb(p.color)) : this.color;
        it.body.material.color.copy(c); it.lid.material.color.copy(c);
      }
    });
    this.anim = duration > 0 ? { start: now, dur: duration } : null;
    if (!this.anim) this.items.forEach(it => { it.cur = { ...it.to }; this._apply(it); });
  }
  busy() { return !!this.anim; }
  // live recolor (rgb arrays, 0-1), e.g. while a scene alternates color codings
  tint(colors) {
    this.items.forEach((it, k) => {
      const c = colors[k]; if (!c) return;
      it.body.material.color.setRGB(c[0], c[1], c[2]); it.lid.material.color.setRGB(c[0], c[1], c[2]);
    });
  }
  update(now) {
    if (!this.anim) return;
    const t = ease.inOutCubic(clamp01((now - this.anim.start) / this.anim.dur));
    for (const it of this.items) {
      for (const k of Object.keys(it.to)) it.cur[k] = it.from[k] + (it.to[k] - it.from[k]) * t;
      this._apply(it);
    }
    if (t >= 1) this.anim = null;
  }
  _apply(it) {
    const c = it.cur, lo = Math.min(c.base, c.top), h = Math.max(Math.abs(c.top - c.base), 1e-4);
    it.body.position.set(c.x, lo + h / 2, 0);
    it.body.scale.set(Math.max(c.w, 1e-4), h, Math.max(c.depth, 1e-3));
    it.body.material.opacity = c.body * c.o;
    it.lid.position.set(c.x, c.top, 0);
    it.lid.scale.set(Math.max(c.w, 1e-4), 0.03, Math.max(c.depth, 1e-3) + 0.002);
    it.lid.material.opacity = c.lid * c.o;
    it.body.visible = it.lid.visible = c.o > 0.005;
  }
}

// Dark ground strips under each industry ridge (landscape only).
class Ground {
  constructor(scene) { this.scene = scene; this.meshes = []; this.o = 0; this.anim = null; }
  set(bands, { base = 0, depth = 5, opacity = 1, duration = 1600, now = performance.now() } = {}) {
    while (this.meshes.length < bands.length) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        color: this.meshes.length % 2 ? 0x070b16 : 0x0b1222, transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
      this.scene.add(m); this.meshes.push(m);
    }
    this.meshes.forEach((m, k) => {
      const b = bands[k];
      m.visible = !!b;
      if (b) { m.position.set(b.x, base - 0.002, 0); m.scale.set(b.width, depth, 1); }
    });
    this.anim = { from: this.o, to: opacity, start: now, dur: Math.max(duration, 1) };
  }
  busy() { return !!this.anim; }
  update(now) {
    if (!this.anim) return;
    const t = clamp01((now - this.anim.start) / this.anim.dur);
    this.o = this.anim.from + (this.anim.to - this.anim.from) * t;
    this.meshes.forEach(m => { m.material.opacity = this.o; });
    if (t >= 1) this.anim = null;
  }
}
