// The value stick as she draws it, plus her "wedge" I-beams. Shapes for overlay.shapes, in the
// fixed chart frame (x -8..8, y -4.5..4.5). Levels are frame y values: {wts, c, p, wtp}.
//
// Stick: a wide bar on "$ per unit" (up) x "units sold" (across) axes. Bottom edge is
// Willingness to sell, then Cost, Price, and Willingness to pay at the top. Bands: Customers keep
// (WTP-P), Firm keeps (P-C), Suppliers keep (C-WTS). A "Value created" bracket on the right.

import { PAL, text, line, rect, circle, brace } from './kit.js';
import { mix } from '../anim.js';

export const LV = (wts, c, p, wtp) => ({ wts, c, p, wtp });
export const mixLv = (a, b, f) => ({ wts: mix(a.wts, b.wts, f), c: mix(a.c, b.c, f), p: mix(a.p, b.p, f), wtp: mix(a.wtp, b.wtp, f) });

const BANDS = [['p', 'wtp', 'surplus', 'Customers keep'], ['c', 'p', 'profit', 'Firm keeps'], ['wts', 'c', 'supplier', 'Suppliers keep']];
const EDGES = [['wtp', 'Willingness to pay'], ['p', 'Price'], ['c', 'Cost'], ['wts', 'Willingness to sell']];
export const SIZES = { label: 1.9, axis: 1.5, lever: 2.4 };

// A line with a soft bloom drawn as a wide faint stroke underneath. (The SVG glow filter drops perfectly
// horizontal or vertical lines: their bounding box has no area.)
export function glowLine(a, b, { color = PAL.white, w = 0.3, o = 1, dash = null, bloom = 0.22 } = {}) {
  if (o <= 0.003) return [];
  return [line(a, b, { color, w: w * 3.4, o: o * bloom, dash }), line(a, b, { color, w, o, dash })];
}

// opts (all opacities 0..1, multiplied by o):
//   grow    0..1, the stick unfolds from `origin` (a point) to full size
//   axes, axisWords, edges (level labels), words (band labels), value ("Value created" bracket), fill
//   ghosts  [{y, o}] dashed lines where an edge used to be
//   axisTop top of the vertical axis (default: a little above willingness to pay)
export function stick({ x, w = 2.2, lv, o = 1, grow = 1, origin = null, axes = 1, axisWords = 1, edges = 1, words = 1,
  value = 0, fill = 1, ghosts = [], axisTop = null, size = SIZES.label }) {
  const out = [];
  if (o <= 0.003) return out;
  const [ox, oy] = origin || [x, (lv.wts + lv.wtp) / 2];
  const X = v => ox + (v - ox) * grow, Y = v => oy + (v - oy) * grow;
  const x0 = X(x - w / 2), x1 = X(x + w / 2);
  const full = grow >= 0.999 ? 1 : 0;

  for (const [loK, hiK, colK, label] of BANDS) {
    const lo = Y(lv[loK]), hi = Y(lv[hiK]), col = PAL[colK];
    if (hi - lo <= 0.002) continue;
    out.push(rect([x0, lo], [x1, hi], { fill: col, fo: 0.45 * fill, stroke: col, w: 0.14, o, glow: x1 - x0 > 0.05 }));
    const wo = o * words * full * Math.min(1, Math.max(0, (hi - lo - 0.36) / 0.12));
    if (wo > 0.01) out.push(text(label, [(x0 + x1) / 2, (lo + hi) / 2], { size, o: wo, weight: 500 }));
  }
  for (const k of ['p', 'c']) out.push(line([x0, Y(lv[k])], [x1, Y(lv[k])], { color: PAL.white, w: 0.16, o: o * 0.9 }));
  for (const g of ghosts) {
    if ((g.o ?? 1) > 0.01) out.push(line([x0 - 0.05, g.y], [x1 + 0.05, g.y], { color: PAL.white, w: 0.15, dash: [0.9, 0.7], o: o * (g.o ?? 1) * 0.75 }));
  }

  const xa = x0 - 0.22; // vertical axis just left of the stick, as on her slides
  const top = axisTop ?? lv.wtp + 0.42;
  const ao = o * axes * grow;
  if (ao > 0.01) {
    out.push(line([xa, Y(lv.wts)], [xa, Y(top)], { color: PAL.white, w: 0.16, o: ao }));
    out.push(line([xa, Y(lv.wts)], [x1 + 0.5, Y(lv.wts)], { color: PAL.white, w: 0.16, o: ao }));
    if (axisWords > 0.01) {
      out.push(text('$ per unit', [xa, Y(top) + 0.22], { size: SIZES.axis, color: PAL.white, o: ao * axisWords }));
      out.push(text('units sold', [x1 + 0.5, Y(lv.wts) - 0.32], { size: SIZES.axis, color: PAL.white, anchor: 'end', o: ao * axisWords }));
    }
  }
  const eo = o * edges * full;
  if (eo > 0.01) {
    for (const [k, label] of EDGES) {
      const y = lv[k];
      out.push(line([xa - 0.1, y], [xa, y], { color: PAL.white, w: 0.16, o: eo }));
      out.push(text(label, [xa - 0.2, y], { anchor: 'end', size, o: eo }));
    }
  }
  const vo = o * value * full;
  if (vo > 0.01) out.push(...valueCreated(x1, lv.wts, lv.wtp, { o: vo, size }));
  return out;
}

// Her "Value created" bracket: two thin lines from the stick's corners meeting beside the label.
export function valueCreated(x1, lo, hi, { o = 1, size = SIZES.label, label = 'Value created' } = {}) {
  const m = (lo + hi) / 2, tip = [x1 + 0.5, m];
  return [
    line([x1 + 0.08, hi], tip, { color: PAL.white, w: 0.11, o: o * 0.85 }),
    line([x1 + 0.08, lo], tip, { color: PAL.white, w: 0.11, o: o * 0.85 }),
    text(label, [x1 + 0.62, m], { anchor: 'start', size, o }),
  ];
}

// A lever's label with a thin leader line to the point it moves (as on her slides).
export function leader(label, at, to, { o = 1, size = SIZES.lever, color = PAL.white } = {}) {
  if (o <= 0.003) return [];
  return [
    line([at[0] - 0.14, at[1]], to, { color, w: 0.13, o: o * 0.85 }),
    circle(to, { r: 0.5, fill: color, o }),
    text(label, at, { anchor: 'start', size, color, o, weight: 500 }),
  ];
}

// Her wedge I-beam: a plain vertical line with serifs, from willingness to sell up to willingness to pay.
export function ibeam(x, lo, hi, { color = PAL.white, o = 1, w = 0.62, lw = 0.42, dash = null, bloom = 0.22 } = {}) {
  if (o <= 0.003) return [];
  const s = { color, w: lw, o, dash, bloom };
  return [...glowLine([x, lo], [x, hi], s), ...glowLine([x - w / 2, hi], [x + w / 2, hi], s),
    ...glowLine([x - w / 2, lo], [x + w / 2, lo], s)];
}

// The wedge: the stretch of your beam between two levels lights amber, with a brace and its label.
// ghost: what is left once you are gone, a dashed glowing outline.
export function wedge(x, lo, hi, { o = 1, side = 1, label = 'Added value', sub = '', size = 2.4, subSize = 1.7,
  ghost = 0, labelO = 1 } = {}) {
  if (o <= 0.003 || hi - lo < 0.01) return [];
  const out = [], half = 0.3;
  const solid = o * (1 - ghost), g = o * ghost;
  if (solid > 0.003) {
    out.push(rect([x - half, lo], [x + half, hi], { fill: PAL.amber, fo: 0.16, o: solid, glow: true }));
    const e = Math.min(0.07, (hi - lo) / 3); // round caps would poke past the serifs
    out.push(...glowLine([x, lo + e], [x, hi - e], { color: PAL.amber, w: 0.7, o: solid, bloom: 0.35 }));
  }
  if (g > 0.003) {
    out.push(rect([x - half, lo], [x + half, hi], { fill: PAL.amber, fo: 0.1, o: g, glow: true }));
    out.push(...dashedBox(x - half, lo, x + half, hi, { color: PAL.amber, o: g }));
  }
  const bx = x + side * (half + 0.18);
  out.push(brace(bx, lo, hi, side, { stroke: PAL.amber, w: 0.22, o }));
  const tx = bx + side * 0.44, an = side > 0 ? 'start' : 'end';
  const lo2 = o * labelO;
  if (lo2 > 0.01) {
    const m = (lo + hi) / 2;
    out.push(text(label, [tx, sub ? m + 0.17 : m], { anchor: an, size, color: PAL.amber, o: lo2, weight: 500 }));
    if (sub) out.push(text(sub, [tx, m - 0.26], { anchor: an, size: subSize, color: PAL.grey, o: lo2 }));
  }
  return out;
}

export function dashedBox(x0, y0, x1, y1, { color = PAL.white, o = 1, w = 0.2 } = {}) {
  const s = { color, w, o, dash: [0.7, 0.5] };
  return [...glowLine([x0, y0], [x1, y0], s), ...glowLine([x1, y0], [x1, y1], s),
    ...glowLine([x1, y1], [x0, y1], s), ...glowLine([x0, y1], [x0, y0], s)];
}
