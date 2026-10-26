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
      out.push(text(n.text, [x, y], { size: n.size * s, weight: 700, color: RY.text, o }));
    } else {
      const edge = dim ? RY.dimEdge : h && h.k > 0.01 ? hexMix(RY.edge, h.c, Math.min(1, h.k * 2)) : hexMix(RY.edge, '#BFE4FF', pu);
      out.push(ellipse([x, y], rx, ry2, { fill: '#000', fo: 1, stroke: edge,
        w: dim ? 0.12 : edgeW + 0.25 * pu + (h ? 0.2 * h.k : 0), o, glow: !dim }));
      out.push(text(n.text, [x, y], { size: n.size * s, color: RY.text, o }));
    }
  }
  out.push(...(st.over || []));
  return out;
}
