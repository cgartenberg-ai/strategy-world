// Drawing Ryanair's activity system: plain shapes for overlay.shapes. Shared by the stage-4 reveal
// (src/scenes/feasibility.js) and the old system moves, q6-system ... q6-pull (src/scenes/q6.js).
// Every word is white; a "dim" bubble (one pulled out of the system) gets a thinner, darker outline, not grey words.

import { line, ellipse, text, poly } from './kit.js';
import { mixPt } from '../anim.js';
import { hexToRgb } from '../colors.js';

// Ryanair colours from her slides
export const RY = { hub: '#007DD6', hubEdge: '#3DA2F0', link: '#007DD6', edge: '#4A97F5', text: '#FFFFFF',
  dimEdge: '#2E557A', dimHub: '#0B2740' };

const clamp01 = v => Math.max(0, Math.min(1, v));
export const hexMix = (h1, h2, f) => {
  const a = hexToRgb(h1), b = hexToRgb(h2), c = a.map((v, i) => Math.round((v + (b[i] - v) * clamp01(f)) * 255));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

// Glowing line as layered strokes: the SVG glow filter drops perfectly level or upright lines
// (its region comes from a zero-height bounding box), so straight lines glow this way instead.
export const neon = (a, b, { color, w, o = 1, halo = 1 }) => [
  line(a, b, { color, w: w * 3.4, o: o * 0.12 * halo }),
  line(a, b, { color, w: w * 1.9, o: o * 0.28 * halo }),
  line(a, b, { color, w, o }),
];

export const BEND = { 'bridges|fees': 0.62 }; // links that bow to pass under a neighbouring oval

// One frame of the system laid out as L (layoutSystem). st:
//   nodeO(id) opacity; linkF(k) drawn fraction of link k (it grows from st.from(l), default its first end)
//   dx shift; pos(id) a position override; scale(id) oval size factor; alpha overall opacity
//   hl(id) -> {c, k, halo} highlight; pulse(id) -> 0..1 glow; dim(id) bool; linkStyle(k, l) -> {color, w, o, from}
//   under_(id) draw order (higher first); stubs, under, over: extra shapes; bend: links that bow (default BEND)
//   linkW: {hub, act} link widths in U; edgeW: activity outline width in U
export function drawSystem(L, st) {
  const out = [...(st.under || [])], A0 = st.alpha ?? 1, bend0 = st.bend || BEND;
  const lw = { hub: 0.85, act: 0.46, ...(st.linkW || {}) }, edgeW = st.edgeW ?? 0.3;
  const P = id => (st.pos && st.pos(id)) || [L.byId.get(id).x + (st.dx || 0), L.byId.get(id).y];
  L.links.forEach((l, k) => {
    const f = st.linkF(k);
    if (f <= 0.001) return;
    const style = st.linkStyle ? st.linkStyle(k, l) : null;
    const first = style?.from ?? (st.from ? st.from(l) : l.a);
    const other = first === l.a ? l.b : l.a;
    const A = P(first), B = P(other), E = mixPt(A, B, f);
    const pu = st.pulse ? Math.max(st.pulse(l.a), st.pulse(l.b)) : 0;
    const col = style?.color || hexMix(RY.link, '#7CC4FF', pu);
    const w = (l.hub ? lw.hub : lw.act) * (style?.w ?? 1) * (1 + 0.5 * pu), o = (style?.o ?? 1) * A0;
    const bend = bend0[`${l.a}|${l.b}`] ?? bend0[`${l.b}|${l.a}`];
    if (bend) { // routed under a neighbour, as on her slide
      const Cp = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - bend], pts = [];
      for (let i = 0; i <= 20; i++) {
        const u = (i / 20) * f;
        pts.push([(1 - u) ** 2 * A[0] + 2 * (1 - u) * u * Cp[0] + u * u * B[0], (1 - u) ** 2 * A[1] + 2 * (1 - u) * u * Cp[1] + u * u * B[1]]);
      }
      out.push(poly(pts, { stroke: col, w, o, glow: true }));
    } else out.push(...neon(A, E, { color: col, w, o }));
  });
  out.push(...(st.stubs || []));
  const order = st.under_ ? [...L.nodes].sort((a, b) => st.under_(b.id) - st.under_(a.id)) : L.nodes;
  for (const n of order) {
    const o = st.nodeO(n.id) * A0;
    if (o <= 0.003) continue;
    const [x, y] = P(n.id), s = st.scale ? st.scale(n.id) : 1;
    const rx = n.rx * s, ry2 = n.ry * s, h = st.hl ? st.hl(n.id) : null, pu = st.pulse ? st.pulse(n.id) : 0;
    const dim = st.dim && st.dim(n.id);
    if (h && (h.halo ?? h.k) > 0.01) out.push(ellipse([x, y], rx + 0.13, ry2 + 0.13, { fill: h.c, fo: 0.28, o: o * (h.halo ?? h.k), glow: true }));
    if (n.hub) {
      out.push(ellipse([x, y], rx + 0.1 + 0.06 * pu, ry2 + 0.1 + 0.06 * pu, { fill: RY.hub, fo: 0.22 + 0.25 * pu, o, glow: true }));
      const hEdge = h && h.k > 0.01 ? hexMix(RY.hubEdge, h.c, Math.min(1, h.k * 2)) : hexMix(RY.hubEdge, '#BFE4FF', pu);
      out.push(ellipse([x, y], rx, ry2, { fill: dim ? RY.dimHub : RY.hub, stroke: dim ? RY.dimEdge : hEdge,
        w: dim ? 0.12 : 0.25 + (h ? 0.25 * h.k : 0), o, glow: !dim }));
      for (const [t, wo] of n.words || [[n.text, 1]]) {
        if (o * wo > 0.003) out.push(text(t, [x, y], { size: n.size * s, weight: 700, color: RY.text, o: o * wo }));
      }
    } else {
      const edge = dim ? RY.dimEdge : h && h.k > 0.01 ? hexMix(RY.edge, h.c, Math.min(1, h.k * 2)) : hexMix(RY.edge, '#BFE4FF', pu);
      out.push(ellipse([x, y], rx, ry2, { fill: '#000', fo: 1, stroke: edge,
        w: dim ? 0.12 : edgeW + 0.25 * pu + (h ? 0.2 * h.k : 0), o, glow: !dim }));
      for (const [t, wo] of n.words || [[n.text, 1]]) { // words: two wraps cross-fading (mixLayout)
        if (o * wo > 0.003) out.push(text(t, [x, y], { size: n.size * s, color: RY.text, o: o * wo }));
      }
    }
  }
  out.push(...(st.over || []));
  return out;
}

// The stage-4 map's look (src/scenes/feasibility.js): heavier links than the old moves' (drawSystem's defaults).
export const BUILD_LOOK = { linkW: { hub: 1.0, act: 0.5 }, edgeW: 0.3 };

// The name over the system, top left under the header: which Ryanair is on screen. Shared by stage 4's map and by
// the pull and the copy, so it stays put from one to the next.
export const RY_NAME = { launch: 'Ryanair at launch', relaunch: 'Ryanair at relaunch' };
export const NAME = { at: [-7.33, 2.45], size: 3.2 };
export const nameLabel = (t, o = 1) => text(t, NAME.at, { anchor: 'start', size: NAME.size, weight: 600, color: '#FFFFFF', o });

// ---------------- Ryanair at launch: pillars that don't fit ----------------
// Slate pillars (not Ryanair blue) and red, jagged links that flicker live and hold still in an export still.
export const LAUNCH_LOOK = { fill: '#363D47', edge: '#8F9AA8', clash: '#FF3B5C', clashW: 0.45, amp: 0.2, seg: 0.34 };
const EXPORT_T = 1e5; // export stills run the clock from far in the past: living effects rest
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

// A jagged line from A to B (whole, before growing): zigzag about the straight line, its kinks a little uneven.
// live: the crackle (a new pattern a few times a second, by t); at rest a fixed one.
export function clashPoints(A, B, { key = 0, t = 1e6, amp = LAUNCH_LOOK.amp, seg = LAUNCH_LOOK.seg } = {}) {
  const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const n = Math.max(6, 2 * Math.round(len / seg / 2)), live = t < EXPORT_T, frame = live ? Math.floor(t * 5) : -1;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, j = i === 0 || i === n ? 0 : (i % 2 ? 1 : -1) * (live ? 0.4 + 1.2 * hash(i + key * 31, frame) : 0.45 + 1.1 * hash(i, key)); // uneven, like a spark
    pts.push([A[0] + dx * u + nx * amp * j, A[1] + dy * u + ny * amp * j, u]);
  }
  return pts;
}
// The points of a polyline (with u, 0..1 along it) between u0 and u1.
function cut(pts, u0, u1) {
  const out = [], at = (p, q, u) => { const f = (u - p[2]) / (q[2] - p[2] || 1); return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]; };
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    if (q[2] < u0 || p[2] > u1) continue;
    if (!out.length) out.push(p[2] >= u0 ? [p[0], p[1]] : at(p, q, u0));
    out.push(q[2] <= u1 ? [q[0], q[1]] : at(p, q, u1));
  }
  return out;
}
// How much a clash flickers at time t (1 at rest): mostly steady, with quick dips.
export function flicker(t, key = 0) {
  if (!(t < EXPORT_T)) return 1;
  const h = hash(Math.floor(t * 9), key + 7);
  return h < 0.18 ? 0.45 + h : 0.82 + 0.18 * hash(Math.floor(t * 9), key + 3);
}

// One frame of Ryanair at launch, laid out as LL (layoutLaunch). st:
//   alpha; nodeO(id) opacity; scale(id) oval size factor; shake(id) -> [dx, dy]; flash(id) -> 0..1 (outline turns red)
//   clashF(k) -> 0..1: clash k grows from both its pillars until the halves meet in the middle; spark(k) -> 0..1, the
//   flash where they meet (null: none); word(k) -> a short word on the link, or ''; t: seconds (flicker; huge = still)
// Every shape is tagged launch: true; each clash's own stroke clash: 'a|b'.
export function drawLaunch(LL, st) {
  const out = [], A0 = st.alpha ?? 1, t = st.t ?? 1e6, Lk = LAUNCH_LOOK, over = [];
  const P = id => { const n = LL.byId.get(id), d = st.shake ? st.shake(id) : [0, 0]; return [n.x + d[0], n.y + d[1]]; };
  LL.clashes.forEach((c, k) => {
    const f = st.clashF(k), o = A0 * Math.min(st.nodeO(c.a), st.nodeO(c.b)) * flicker(t, k);
    if (f <= 0.001 || o <= 0.003) return;
    const key = `${c.a}|${c.b}`, pts = clashPoints(P(c.a), P(c.b), { key: k + 1, t });
    const parts = f >= 0.999 ? [cut(pts, 0, 1)] : [cut(pts, 0, f / 2), cut(pts, 1 - f / 2, 1)];
    for (const q of parts) {
      if (q.length < 2) continue;
      out.push(poly(q, { stroke: Lk.clash, w: Lk.clashW * 3.2, o: o * 0.22, launch: true }));
      out.push(poly(q, { stroke: Lk.clash, w: Lk.clashW, o, glow: true, launch: true, clash: key }));
    }
    const sp = st.spark ? st.spark(k) : null, mid = mixPt(P(c.a), P(c.b), 0.5);
    if (sp != null && sp > 0 && sp < 1) {
      over.push(ellipse(mid, 0.25 + 0.9 * sp, 0.2 + 0.6 * sp, { stroke: Lk.clash, w: 0.35, o: A0 * (1 - sp), glow: true, launch: true }));
    }
    const word = st.word ? st.word(k) : '';
    if (word && f >= 0.999) over.push(text(word, [mid[0], mid[1] + 0.42], { size: 2.0, weight: 600, color: '#FFFFFF', o, launch: true }));
  });
  for (const n of LL.nodes) {
    const o = st.nodeO(n.id) * A0;
    if (o <= 0.003) continue;
    const [x, y] = P(n.id), s = st.scale ? st.scale(n.id) : 1, fl = st.flash ? st.flash(n.id) : 0;
    const rx = n.rx * s, ry = n.ry * s;
    out.push(ellipse([x, y], rx + 0.1, ry + 0.1, { fill: Lk.fill, fo: 0.3, o, glow: true, launch: true }));
    out.push(ellipse([x, y], rx, ry, { fill: Lk.fill, stroke: hexMix(Lk.edge, Lk.clash, fl), w: 0.25 + 0.15 * fl, o, launch: true }));
    out.push(text(n.text, [x, y], { size: n.size * s, weight: 700, color: '#FFFFFF', o, launch: true }));
  }
  return out.concat(over);
}
