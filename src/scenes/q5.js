// Q5: Who captures the value when everyone contributes to creating it?
// Deere's 2026 coalition drawn as her hexagon (slide 25). One stick of value created for the farmer,
// banded by what each participant brings. Then the "disappear tomorrow" test, one participant per
// click: the part others can replace greys out ("others step in") and only its added value leaves
// the stick. Last, every band stands up as a column: what each brings vs what it can capture.
// Magnitudes are illustrative and live in src/concepts/valuecapture.js.

import { TITLES, go, dur } from './common.js';
import { SHOTS } from '../rigmath.js';
import { ramp, mix } from '../anim.js';
import { ease, clamp01 } from '../tween.js';
import { text, line, rect, circle, PAL, wrap } from '../concepts/kit.js';
import { coalition, stack, captureOrder } from '../concepts/valuecapture.js';

const UW = 0.09; // world units per U (the stage is 9 units = 100 U tall)
const GREY = '#8A8A8A', EDGE = '#8A8A8A'; // lines and greyed bands only: words stay white
const WA = 2.0; // the walk-away line's size (U)

// Her circles: dark fill, bright outline. Slots go counter-clockwise from the right (60° apart).
// Words are white or a participant's band colour, never grey (tests/q5.test.js).
export const LOOK = {
  deere: { fill: '#063D58', stroke: '#66D5E5', band: PAL.deere, name: 'Deere', one: 'Deere' },
  farmer: { fill: '#0B3A24', stroke: '#22C28E', band: '#22C28E', name: 'Farmer', one: 'Farmer', slot: 0, side: 'right' },
  dealers: { fill: '#2B2416', stroke: PAL.amber, band: PAL.amber, name: 'Independent\ndealers', one: 'Independent dealers', slot: 1, side: 'above' },
  software: { fill: '#0B2A63', stroke: PAL.blue, band: PAL.blue, name: 'Agronomy\nsoftware', one: 'Agronomy software', slot: 2, side: 'above' },
  ai: { fill: '#3A0B29', stroke: PAL.pink, band: PAL.pink, name: 'Connectivity\nand AI', one: 'Connectivity and AI', slot: 3, side: 'left' },
  rivals: { fill: '#161616', stroke: '#9A9A9A', name: 'Rival equipment\nmakers', slot: 5, side: 'right', apart: 1.2 },
};
// five around Deere (her coalition picture, without an empty seat); rivals sit apart on dashed lines
const RING = ['farmer', 'dealers', 'software', 'ai', 'rivals']; // by slot
const ORDER = ['farmer', 'software', 'deere', 'dealers', 'ai'];        // the stick, bottom to top

// The coalition big and centred (first beat), then small on the left beside the stick.
const BIG = { cx: 0, cy: -0.3, R: 2.45, rc: 0.95, r: 0.56, size: 2.2, deere: 2.8 };
const SMALL = { cx: -3.9, cy: -0.4, R: 1.85, rc: 0.66, r: 0.42, size: 2.0, deere: 2.1 };
const lerpL = (A, B, f) => Object.fromEntries(Object.keys(A).map(k => [k, mix(A[k], B[k], f)]));

// The stick: value created for the farmer (100 value units) and the slot its added value moves to.
const ST = { x0: 0.75, x1: 2.55, y0: -3.2, h: 5.5, gap: 0.3 };
const sy = v => ST.y0 + (v * ST.h) / 100;
// The closing row: every band stands up as a column (bigger scale), largest added value first.
const COL = { x: [-5.2, -2.85, -0.5, 1.85, 4.2], w: 1.3, base: -2.3, scale: 0.125 };

const sub = (p, a, b) => ease.inOutCubic(clamp01((p - a) / (b - a)));
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, f) => `#${hx(a).map((v, i) => Math.round(v + (hx(b)[i] - v) * f).toString(16).padStart(2, '0')).join('')}`;
const lines = s => String(s).split('\n').length;

// Phases of one participant walking away, from its progress p (0 = in, 1 = gone).
// c: the circle steps out; g: the replaceable part greys; sx: the added value slides out of the stick;
// drop: the stick closes the gap; sr: the piece rises to the gap at the top; l: its labels.
const phases = p => ({ c: sub(p, 0, 0.35), g: sub(p, 0.1, 0.32), sx: sub(p, 0.3, 0.5), drop: sub(p, 0.48, 0.72),
  sr: sub(p, 0.55, 0.85), l: sub(p, 0.8, 1) });

// Node centres for a layout; departed nodes drift outward (Deere, at the centre, just dims).
function nodes(L, out = {}) {
  const N = { deere: { x: L.cx, y: L.cy, r: L.rc } };
  RING.forEach((k, slot) => {
    const th = (slot * 2 * Math.PI) / RING.length + 0.1, look = LOOK[k] || {};
    const R = L.R * (look.apart || 1) + 0.55 * (out[k] || 0);
    N[k] = { x: L.cx + R * Math.cos(th), y: L.cy + R * Math.sin(th), r: L.r, th };
  });
  return N;
}

function nameAt(n, side, size, nl) {
  const lh = size * 1.18 * UW, h = nl * lh, gap = 0.14;
  if (side === 'right') return { at: [n.x + n.r + gap, n.y], anchor: 'start' };
  if (side === 'left') return { at: [n.x - n.r - gap, n.y], anchor: 'end' };
  if (side === 'above') return { at: [n.x, n.y + n.r + gap + h / 2], anchor: 'middle' };
  return { at: [n.x, n.y - n.r - gap - h / 2], anchor: 'middle' };
}

// A dashed circle (her open seat), drawn as short arcs.
function dashedCircle(c, r, o, color = GREY) {
  const out = [], n = 18;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI, a1 = a0 + (0.55 / n) * 2 * Math.PI;
    out.push(line([c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0)], [c[0] + r * Math.cos(a1), c[1] + r * Math.sin(a1)],
      { color, w: 0.3, o }));
  }
  return out;
}

// A segment between two circles, trimmed at their rims (so nothing pokes into the open seat).
function rim(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  return [[a.x + ux * a.r, a.y + uy * a.r], [b.x - ux * b.r, b.y - uy * b.r]];
}

// The hexagon: per-node build progress (spokes, circles), ring edges, names, departures, fade.
function hexagon(L, { spoke = () => 1, pop = () => 1, ring = 1, names = 1, out = {}, fade = 1, skip = new Set() } = {}) {
  const N = nodes(L, out), S = [], C0 = N.deere;
  const R = (k, i) => ({ ...N[k], r: N[k].r * Math.max(0.01, Math.min(1, pop(i))) });
  const C = { ...C0, r: C0.r * Math.max(0.01, Math.min(1, pop(-1))) };
  const dim = k => 1 - 0.7 * (out[k] || 0);
  const edgeStyle = (a, b) => {
    if (a === 'open' || b === 'open') return { o: 0.3, dash: [0.6, 0.7] };
    if (a === 'rivals' || b === 'rivals') return { o: 0.6, dash: [0.9, 0.7] };
    return { o: 0.85 };
  };
  const edge = (A, B, o, dash) => line(A, B, { color: EDGE, w: 0.32, o, dash });
  // spokes from Deere to every seat
  RING.forEach((k, i) => {
    const p = spoke(i); if (p <= 0) return;
    const st = edgeStyle('deere', k), [A, B] = rim(C, R(k, i));
    S.push(edge(A, [mix(A[0], B[0], p), mix(A[1], B[1], p)], st.o * fade * dim(k) * dim('deere'), st.dash));
  });
  // the ring: each seat to its neighbour, growing out from the middle
  if (ring > 0) RING.forEach((k, i) => {
    const k2 = RING[(i + 1) % RING.length], st = edgeStyle(k, k2), [A, B] = rim(R(k, i), R(k2, (i + 1) % RING.length));
    const o = st.o * fade * dim(k) * dim(k2);
    if (ring >= 1) { S.push(edge(A, B, o, st.dash)); return; }
    const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    S.push(edge(m, [mix(m[0], A[0], ring), mix(m[1], A[1], ring)], o, st.dash),
      edge(m, [mix(m[0], B[0], ring), mix(m[1], B[1], ring)], o, st.dash));
  });
  // circles over the lines (a black disc first, so a dimmed circle still hides its lines)
  const disc = (n, r, lk, o, w) => [circle([n.x, n.y], { rw: r, fill: '#000', fo: 1, o: fade }),
    circle([n.x, n.y], { rw: r, fill: lk.fill, fo: 1, stroke: lk.stroke, w, o, glow: true })];
  RING.forEach((k, i) => {
    const p = pop(i), n = N[k]; if (p <= 0) return;
    if (k === 'open') { S.push(...dashedCircle([n.x, n.y], n.r * p, 0.45 * fade)); return; }
    const lk = LOOK[k];
    if (!skip.has(k)) S.push(...disc(n, n.r * p, lk, fade * dim(k), 0.45));
    if (names > 0) {
      const lab = nameAt(n, lk.side, L.size, lines(lk.name));
      // a walked-away name stays white (a dimmed one reads grey); its circle and lines dim instead
      S.push(text(lk.name, lab.at, { anchor: lab.anchor, size: L.size, o: names * fade * Math.min(1, p) }));
    }
  });
  const pc = pop(-1);
  if (pc > 0 && !skip.has('deere')) {
    const lk = LOOK.deere, od = fade * dim('deere');
    S.push(...disc(C, C.r * pc, lk, od, 0.5),
      text('Deere', [C.x, C.y], { size: L.deere, weight: 600, color: PAL.deere, o: fade * Math.min(1, pc * 1.5) }));
  }
  return S;
}

export function q5Scene(ctx) {
  const VC = ctx.data.concepts?.value_capture || { participants: [], source_line: '' };
  const P = coalition(VC.participants || []);
  const by = Object.fromEntries(P.map(p => [p.key, p]));
  const parts = ORDER.filter(k => by[k]).map(k => by[k]);     // contributors, stick order
  const capture = captureOrder(parts);
  const source = VC.source_line || 'Illustrative.';

  // ---- who has walked away: progress per participant on the beat clock (survives clicks) ----
  const anim = new Map();
  const LEAVE = 2.6, BACK = 1.1;
  let lastT = 0;
  const clock = () => (performance.now() - ctx.t0) / 1000;
  const progress = (k, t) => {
    const a = anim.get(k); if (!a) return 0;
    return a.from + (a.to - a.from) * (a.d > 0 ? clamp01((t - a.at) / a.d) : 1);
  };
  const outAt = t => Object.fromEntries(parts.map(p => [p.key, progress(p.key, t)]));
  function walk(key, t) { // send `key` away (null: everyone back); whoever was out comes back first
    const returning = parts.some(p => p.key !== key && progress(p.key, t) > 0.001);
    for (const { key: k } of parts) {
      const cur = progress(k, t), to = k === key ? 1 : 0;
      anim.set(k, { from: cur, to, at: t + (to && returning ? 0.7 : 0), d: Math.abs(to - cur) * (to ? LEAVE : BACK) });
    }
  }
  function carryOver(instant, key) { // on entering a beat: keep what was on screen, then animate to this beat
    const now = instant ? null : outAt(lastT);
    anim.clear();
    if (now) for (const k in now) anim.set(k, { from: now[k], to: now[k], at: 0, d: 0 });
    if (instant) { if (key) anim.set(key, { from: 1, to: 1, at: 0, d: 0 }); }
    else walk(key, 0);
  }
  const anyOut = () => parts.some(p => progress(p.key, lastT) > 0.001);

  // ---- the stick, with rising bands (q: 0 at the circle, 1 in place) and departures ----
  function stickShapes(t, { rise = () => 1, labelO = 1 } = {}) {
    const out = outAt(t), ph = Object.fromEntries(parts.map(p => [p.key, phases(out[p.key])]));
    const S0 = stack(parts), S = stack(parts, Object.fromEntries(parts.map(p => [p.key, ph[p.key].drop])));
    const N = nodes(SMALL, Object.fromEntries(parts.map(p => [p.key, ph[p.key].c])));
    const shapes = [], top = [];
    const { x0, x1 } = ST, wPiece = x1 - x0, xp = x1 + ST.gap;
    let ghost = 0;
    parts.forEach((p, i) => {
      const lk = LOOK[p.key], b = S.bands[i], b0 = S0.bands[i], f = ph[p.key], q = rise(i);
      if (q <= 0) return;
      if (q < 1) { // rising out of its circle: a rounded square that becomes the band
        const n = N[p.key], e = ease.inOutCubic(q);
        const a = [mix(n.x - n.r, x0, e), mix(n.y - n.r, sy(b0.lo), e)], c = [mix(n.x + n.r, x1, e), mix(n.y + n.r, sy(b0.hi), e)];
        shapes.push(rect(a, c, { fill: lk.band, fo: 0.42, stroke: lk.band, w: 0.12, r: (n.r / UW) * (1 - e), o: Math.min(1, q * 4), glow: true }));
        return;
      }
      const nameO = labelO * (1 - f.g);
      if (out[p.key] <= 0.001) { // whole band
        shapes.push(rect([x0, sy(b.lo)], [x1, sy(b.hi)], { fill: lk.band, fo: 0.42, stroke: lk.band, w: 0.12, glow: true }));
      } else {
        const repC = mixHex(lk.band, GREY, f.g);
        if (b.rep[1] - b.rep[0] > 1e-6) {
          shapes.push(rect([x0, sy(b.rep[0])], [x1, sy(b.rep[1])], { fill: repC, fo: mix(0.42, 0.36, f.g), stroke: repC, w: 0.12 }));
          if ((b.rep[1] - b.rep[0]) * ST.h / 100 > 0.26) // "others step in", once it has greyed
            top.push(text('Others step in', [(x0 + x1) / 2, sy((b.rep[0] + b.rep[1]) / 2)], { size: 2.0, o: f.l }));
        }
        // the irreplaceable part: slides out of the stick, then rises to the gap it leaves at the top
        const hgt = (p.added * ST.h) / 100, ylo = mix(sy(b.lo), sy(S0.full - p.added), f.sr), dx = (xp - x0) * f.sx;
        shapes.push(rect([x0 + dx, ylo], [x0 + dx + wPiece, ylo + Math.max(hgt, 0.035)], { fill: lk.band, fo: 0.6, stroke: lk.band, w: 0.18, glow: true }));
        if (f.g > 0 && f.sx < 1) top.push(line([x0, sy(b.lo) + hgt], [x1, sy(b.lo) + hgt], { color: '#FFFFFF', w: 0.16, o: f.g * (1 - f.sx) }));
        if (f.l > 0) {
          const ym = ylo + Math.max(hgt, 0.035) / 2, lx = xp + wPiece + 0.22;
          const wa = wrap(p.walkAway, 24);
          top.push(text('Added value', [lx, ym], { anchor: 'start', size: 2.1, weight: 500, color: lk.band, o: f.l }),
            text(wa, [lx, ym - 0.38 - ((lines(wa) - 1) * WA * 1.18 * UW) / 2], { anchor: 'start', size: WA, o: f.l }));
        }
        ghost = Math.max(ghost, f.drop);
      }
      if (nameO > 0.003 && b.hi - b.lo > 4) top.push(text(lk.one, [(x0 + x1) / 2, sy((b.lo + b.hi) / 2)], { size: 1.9, o: nameO }));
    });
    if (ghost > 0) top.push(line([x0 - 0.1, sy(S0.full)], [xp + wPiece + 0.1, sy(S0.full)], { color: '#FFFFFF', w: 0.18, o: 0.7 * ghost, dash: [0.8, 0.6] }));
    top.push(text('Value created for the farmer', [(x0 + x1) / 2, sy(S0.full) + 0.32], { size: 2.0, o: labelO * Math.min(1, rise(parts.length - 1)) }));
    return shapes.concat(top);
  }

  // hexagon on the small layout with the current departures
  const smallHex = (t, extra = {}) => {
    const out = outAt(t);
    return hexagon(SMALL, { out: Object.fromEntries(parts.map(p => [p.key, phases(out[p.key]).c])), ...extra });
  };

  // ---- clicking a circle runs its disappear test ----
  function hit(at) {
    if (!at) return null;
    const x = at[0], y = ctx.world.ty(at[1]);
    const out = outAt(clock());
    const N = nodes(SMALL, Object.fromEntries(parts.map(p => [p.key, phases(out[p.key]).c])));
    for (const p of parts) {
      const n = N[p.key];
      if ((x - n.x) ** 2 + (y - n.y) ** 2 < (n.r + 0.12) ** 2) return p.key;
    }
    return null;
  }
  const pointer = ({ type, at }) => {
    const k = hit(at);
    if (type === 'hover') return k ? 'grab' : false;
    if (type !== 'down' || !k) return false;
    const t = clock(), gone = progress(k, t) > 0.5 && anim.get(k)?.to === 1;
    walk(gone ? null : k, t);
    return true;
  };

  function setup(instant) {
    ctx.overlay.reset({ title: TITLES.q5, source });
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
    ctx.world.plates.set([], { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setTargets(new Map(), { duration: dur(ctx, 900) });
    ctx.allowOrbit = false;
    go(ctx, SHOTS.flat, 1200, instant);
  }

  // ---- the beats ----
  const coalitionBeat = {
    id: 'q5-coalition',
    enter(instant) { setup(instant); anim.clear(); },
    draw: t => {
      lastT = t;
      return hexagon(BIG, {
        pop: i => (i < 0 ? ramp(t, 0, 0.8, 'outQuart') : ramp(t, 0.85 + 0.16 * i, 0.55, 'outQuart')),
        spoke: i => ramp(t, 0.55 + 0.16 * i, 0.5),
        ring: ramp(t, 1.9, 0.9),
        names: ramp(t, 2.3, 0.7),
      });
    },
  };

  const stickBeat = {
    id: 'q5-stick',
    enter(instant) { setup(instant); carryOver(instant, null); },
    draw: t => {
      lastT = t;
      const f = ramp(t, 0, 1.3);
      if (f < 1) return hexagon(lerpL(BIG, SMALL, f));
      const rise = i => ramp(t, 1.3 + 0.32 * i, 1.0);
      return smallHex(t).concat(stickShapes(t, { rise }));
    },
    pointer,
  };

  const walkBeat = key => ({
    id: `q5-walkaway-${key}`,
    enter(instant) { setup(instant); carryOver(instant, key); },
    draw: t => { lastT = t; return smallHex(t).concat(stickShapes(t)); },
    pointer,
  });

  let T0 = 0;
  const captureBeat = {
    id: 'q5-capture',
    enter(instant) { setup(instant); T0 = !instant && anyOut() ? 1.1 : 0; carryOver(instant, null); },
    draw: t => {
      lastT = t;
      if (t > T0 + 3.6) ctx.overlay.caption('Scarcity, not size');
      const split = ramp(t, T0, 0.7), hexO = 1 - ramp(t, T0 + 0.2, 0.7);
      const walk = i => ramp(t, T0 + 0.3 + 0.08 * i, 1.1), fly = i => ramp(t, T0 + 1.2 + 0.15 * i, 1.1);
      const S0 = stack(parts), shapes = [], top = [];
      if (hexO > 0) {
        if (split <= 0) return smallHex(t).concat(stickShapes(t));
        shapes.push(...hexagon(SMALL, { fade: hexO, skip: new Set(parts.map(p => p.key)) }));
      }
      const N = nodes(SMALL);
      capture.forEach((p, ci) => {
        const lk = LOOK[p.key], i = parts.indexOf(p), b = S0.bands[i], k = fly(ci), e = ease.inOutCubic(k);
        const cx = COL.x[ci], hw = COL.w / 2, cs = COL.scale;
        const lit0 = [[ST.x0, sy(b.lit[0])], [ST.x1, sy(b.lit[1])]], rep0 = [[ST.x0, sy(b.rep[0])], [ST.x1, sy(b.rep[1])]];
        const lit1 = [[cx - hw, COL.base], [cx + hw, COL.base + p.added * cs]];
        const rep1 = [[cx - hw, COL.base + p.added * cs], [cx + hw, COL.base + p.brings * cs]];
        const M = (A, B) => [[mix(A[0][0], B[0][0], e), mix(A[0][1], B[0][1], e)], [mix(A[1][0], B[1][0], e), mix(A[1][1], B[1][1], e)]];
        const repC = mixHex(lk.band, GREY, split), lit = M(lit0, lit1), rep = M(rep0, rep1);
        if (p.brings - p.added > 1e-6) shapes.push(rect(rep[0], rep[1], { fill: repC, fo: mix(0.42, 0.36, split), stroke: repC, w: 0.12 }));
        shapes.push(rect(lit[0], [lit[1][0], Math.max(lit[1][1], lit[0][1] + 0.035)], { fill: lk.band, fo: mix(0.42, 0.6, split), stroke: lk.band, w: mix(0.12, 0.18, split), glow: true }));
        // its circle flies from the coalition to the foot of its column
        const n = N[p.key], ew = ease.inOutCubic(walk(ci)), fx = mix(n.x, cx, ew), fyy = mix(n.y, COL.base - 0.38, ew), fr = mix(n.r, 0.2, ew);
        top.push(circle([fx, fyy], { rw: fr, fill: lk.fill, fo: 1, stroke: lk.stroke, w: 0.4, glow: true }));
        if (p.key === 'deere') top.push(text('Deere', [fx, fyy], { size: mix(SMALL.deere, 1.1, ew), weight: 600, color: PAL.deere, o: 1 - ew }));
        top.push(text(lk.one, [cx, COL.base - 0.85], { size: 2.0, o: ramp(t, T0 + 1.2 + 0.1 * ci, 0.6) }));
      });
      const xa = COL.x[0] - COL.w / 2 - 0.2, xb = COL.x[COL.x.length - 1] + COL.w / 2 + 0.2;
      shapes.unshift(line([xa, COL.base], [xb, COL.base], { color: GREY, w: 0.16, o: 0.6 * ramp(t, T0 + 1.2, 0.6) }));
      const lo = ramp(t, T0 + 2.9, 0.7);
      if (lo > 0) {
        const f0 = capture[0], fx0 = COL.x[0] - COL.w / 2 - 0.25;
        top.push(text('Can capture\nup to', [fx0, COL.base + (f0.added * COL.scale) / 2], { anchor: 'end', size: 2.1, weight: 500, o: lo }));
        const z = capture[capture.length - 1], zx = COL.x[capture.length - 1] + COL.w / 2 + 0.25;
        top.push(text('Others step in', [zx, COL.base + ((z.added + z.brings) / 2) * COL.scale], { anchor: 'start', size: 2.0, o: lo }));
      }
      return shapes.concat(top);
    },
  };

  return {
    id: 'q5',
    beats: [coalitionBeat, stickBeat, ...['ai', 'software', 'dealers', 'deere'].map(walkBeat), captureBeat],
  };
}
