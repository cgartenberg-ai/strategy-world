// Camera rig: moves between framed shots (see rigmath.js) along eased segments.

import { camFromParams, lerpParams } from './rigmath.js';
import { ease, clamp01 } from './tween.js';

const copy = p => ({ ...p, target: p.target.slice() });

export class Rig {
  constructor(camera) {
    this.camera = camera;
    this.p = null; this.queue = []; this.seg = null;
  }
  set(p) { this.p = copy(p); this.queue = []; this.seg = null; this.apply(); }
  to(p, duration = 2000, easing = 'inOutCubic') { this.path([[p, duration, easing]]); }
  path(list, now = performance.now()) {
    this.queue = list.map(([p, d, e]) => [copy(p), d, e]);
    this.seg = null;
    this._next(now);
  }
  _next(now) {
    const n = this.queue.shift();
    if (!n) { this.seg = null; return; }
    const [p, dur, e] = n;
    if (!this.p || dur <= 0) { this.p = copy(p); this.apply(); this._next(now); return; }
    this.seg = { from: copy(this.p), to: p, start: now, dur, ease: ease[e] || ease.inOutCubic };
  }
  busy() { return !!this.seg || this.queue.length > 0; }
  nudge(daz, del, zoom = 1) {
    if (this.busy() || !this.p) return;
    this.p.az += daz;
    this.p.el = Math.max(-10, Math.min(70, this.p.el + del));
    this.p.vh = Math.max(1.5, Math.min(30, this.p.vh * zoom));
    this.apply();
  }
  update(now) {
    if (this.seg) {
      const t = clamp01((now - this.seg.start) / this.seg.dur);
      this.p = lerpParams(this.seg.from, this.seg.to, this.seg.ease(t));
      if (t >= 1) this._next(now);
    }
    this.apply();
  }
  apply() {
    if (!this.p) return;
    const c = camFromParams(this.p), cam = this.camera;
    cam.position.set(...c.position);
    cam.fov = c.fov;
    cam.near = Math.max(0.05, c.distance * 0.05);
    cam.far = c.distance * 4 + 200;
    cam.updateProjectionMatrix();
    cam.lookAt(...c.target);
  }
}
