// Camera rig: moves between framed shots (see rigmath.js) along eased segments.

import { camFromParams, lerpParams } from './rigmath.js';
import { ease, clamp01 } from './tween.js';

const copy = p => ({ ...p, target: p.target.slice() });

export class Rig {
  constructor(camera) {
    this.camera = camera;
    this.p = null; this.queue = []; this.seg = null;
    this.spinRate = 0; this.spinAz = 0; this.spinAt = null; // a slow turn on top of any move (degrees a second)
  }
  // Spin: keep turning slowly, whatever moves come and go (Q2's 3D moves); unspin folds the turn into the view so
  // the next move starts from what's on screen, and a move in progress carries on from there.
  spin(rate, now = performance.now()) { this.spinRate = rate; this.spinAt = now; }
  spinning() { return this.spinRate !== 0; }
  unspin(now = performance.now()) {
    if (!this.spinRate && !this.spinAz) return;
    const v = this.view();
    if (this.seg && v) this.seg = { ...this.seg, from: copy(v), start: now, dur: Math.max(1, this.seg.start + this.seg.dur - now) };
    if (v) this.p = v;
    this.spinRate = 0; this.spinAz = 0; this.spinAt = null;
    this.apply();
  }
  view() { return this.p ? { ...copy(this.p), az: this.p.az + this.spinAz } : null; }
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
    if (this.spinRate && this.spinAt != null) { this.spinAz += (this.spinRate * (now - this.spinAt)) / 1000; this.spinAt = now; }
    if (this.seg) {
      const t = clamp01((now - this.seg.start) / this.seg.dur);
      this.p = lerpParams(this.seg.from, this.seg.to, this.seg.ease(t));
      if (t >= 1) this._next(now);
    }
    this.apply();
  }
  apply() {
    if (!this.p) return;
    const c = camFromParams(this.view()), cam = this.camera;
    cam.position.set(...c.position);
    cam.fov = c.fov;
    cam.near = Math.max(0.05, c.distance * 0.05);
    cam.far = c.distance * 4 + 200;
    cam.updateProjectionMatrix();
    cam.lookAt(...c.target);
  }
}
