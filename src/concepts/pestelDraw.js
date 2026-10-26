// Draws the PESTEL moves as overlay shapes: the six lenses, the letter strip, one shift (what changed, then who
// gained), the head of a shift on the five-forces cross, and Deere's chain with the scarce spot.
// Pure: data and seconds-since-start in, shapes out. Chart frame: x -8..8, content y -3.9..3.0.

import { text, line, rect, wrap, PAL } from './kit.js';
import { ramp, mix } from '../anim.js';
import { LENSES, CHAIN, CHAIN_X, NODE, scarceAt, coverage, stripXs, fmtBar } from './pestel.js';

const U = 0.09; // one U in frame units
const LETTER = PAL.amber, DIM = '#4F4F4F';
export const TONE = { gain: PAL.cyan, loss: PAL.pink, deere: PAL.deere };

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
export const mixHex = (a, b, f) => {
  const A = hex(a), B = hex(b), k = Math.max(0, Math.min(1, f));
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
};

// Wrap each part separately, so a "\n" in the data forces a line break.
const lines = (s, n) => String(s).split('\n').map(p => wrap(p, n)).join('\n');

// Multi-line text whose first line sits at y (drawShapes centres a block on its anchor).
function topText(s, [x, y], size, o = {}) {
  const n = String(s).split('\n').length;
  return text(s, [x, y - ((n - 1) * size * U * 1.18) / 2], { size, ...o });
}

// ---------------- move 1: the six lenses ----------------
// Letters, words and definitions only, big and white: she speaks to the examples (LENSES keeps them).
export const LENS_COLS = { x0: -6.25, dx: 2.5, letterY: 0.8, wordY: -0.45, defY: -1.1, defSize: 2.8, defWrap: 16 };
export function drawLenses(t) {
  const out = [], C = LENS_COLS;
  LENSES.forEach((l, i) => {
    const x = C.x0 + C.dx * i, s = 0.25 + 0.3 * i;
    const a = ramp(t, s, 0.55), w = ramp(t, s + 0.25, 0.5), d = ramp(t, s + 0.4, 0.5);
    out.push(text(l.letter, [x, C.letterY + 0.3 * (1 - a)], { size: 11, weight: 700, color: LETTER, o: a, glow: true }));
    out.push(text(l.word, [x, C.wordY], { size: 3.4, weight: 600, o: w }));
    out.push(topText(wrap(l.def, C.defWrap), [x, C.defY], C.defSize, { color: PAL.white, o: d }));
  });
  return out;
}

// ---------------- the letter strip (moves 2 and 3): click a letter to jump to it ----------------
// layout: {x0, dx, y, size, hit: [half width, half height], wordY?, wordSize?}
export const STRIP_SHIFTS = { x0: -3.75, dx: 1.5, y: 2.3, size: 4.4, hit: [0.6, 0.45], wordY: 1.8, wordSize: 1.6 };
export const STRIP_FORCES = { x0: -7.15, dx: 0.72, y: 2.92, size: 3.4, hit: [0.33, 0.3] };
// active: the lens shown; tau: seconds since it became active; prev: the one before (fades out)
export function drawStrip(lenses, L, active, tau, { words = true, prev = null } = {}) {
  const out = [], xs = stripXs(lenses.length, L.x0, L.dx), lit = ramp(tau, 0, 0.35), un = 1 - lit;
  lenses.forEach((l, i) => {
    const x = xs[i];
    out.push(text(l.letter, [x, L.y], { size: L.size, weight: 700, color: DIM }));
    const o = i === active ? lit : i === prev ? un : 0;
    if (o > 0.003) out.push(text(l.letter, [x, L.y], { size: L.size, weight: 700, color: LETTER, o, glow: true }));
    if (words && L.wordY != null) {
      out.push(text(l.word, [x, L.wordY], { size: L.wordSize, color: '#6A6A6A' }));
      if (o > 0.003) out.push(text(l.word, [x, L.wordY], { size: L.wordSize, weight: 600, color: PAL.white, o }));
    }
  });
  return out;
}

// ---------------- move 2: one shift. What changed (left) → who gained or what moved (right) ----------------
export const SHIFT_L = { x0: -6.7, headY: 0.45, subY: -0.18, detailY: -0.8, ax: [-0.62, 0.62], x1: 1.0,
  barXs: [1.9, 3.75], barHalf: 0.6, barH: 1.4, negBase: -2.25, negH: 1.15, posBase: -3.0 };
// The bars' type and spacing, PESTEL's; stage 5's tailwind passes bigger ones (drawShift's opts.layout).
const BAR_TYPE = { valueSize: 2.6, labelSize: 1.9, valueGap: 0.32, labelGap: 0.3, white: false, lead: 0 };
// opts: just a headline and the two bars, for stage 5's tailwind (src/scenes/dynamics.js); without it, PESTEL's shift.
//   head (default s.change), caption (what the bars count, centred over them at captionY), fmt (a function of a bar,
//   or fmtBar's 'pct' / 'num'), layout: overrides of SHIFT_L and BAR_TYPE (headX, headY, headSize, captionY,
//   captionSize, lineX0, barXs, ...; white: true for white values; lead: seconds the bars start sooner).
export function drawShift(s, bars, tau, opts = null) {
  if (opts) return headAndBars(s, bars, tau, opts);
  const out = [], L = SHIFT_L, col = TONE[s.tone] || PAL.cyan;
  const c = ramp(tau, 0.05, 0.4), d = ramp(tau, 0.25, 0.45), g = ramp(tau, 0.5, 0.45), e = ramp(tau, 0.85, 0.45);
  out.push(text(s.change, [L.x0, L.headY], { anchor: 'start', size: 3.4, weight: 500, o: c }));
  out.push(text(s.when, [L.x0, L.subY], { anchor: 'start', size: 2.2, color: '#9A9A9A', o: c }));
  out.push(topText(lines(s.detail, 46), [L.x0, L.detailY], 2.0, { anchor: 'start', color: '#C8C8C8', o: d }));
  if (g > 0.003) out.push(line([L.ax[0], L.headY], [mix(L.ax[0], L.ax[1], g), L.headY], { color: LETTER, w: 0.34, arrow: 1, o: 1, glow: true }));
  out.push(text(s.effect, [L.x1, L.headY], { anchor: 'start', size: 3.4, weight: 600, color: col, o: e }));
  out.push(topText(lines(s.effectDetail, 46), [L.x1, L.subY], 2.0, { anchor: 'start', color: '#C8C8C8', o: ramp(tau, 1.05, 0.45) }));
  if (bars && bars.length) out.push(...evidenceBars(bars, s.fmt, col, tau));
  return out;
}

// Just the headline and the bars (drawShift's opts), the bars building a little after the headline.
function headAndBars(s, bars, tau, { head = s.change, caption = '', fmt = s.fmt, layout = {} } = {}) {
  const L = { ...SHIFT_L, ...BAR_TYPE, ...layout }, col = TONE[s.tone] || PAL.cyan, out = [];
  out.push(text(head, [L.headX ?? L.x0, L.headY], { anchor: 'start', size: L.headSize ?? 3.4, weight: 500, o: ramp(tau, 0.05, 0.4) }));
  if (caption) {
    const cx = (L.barXs[0] + L.barXs[Math.max(0, (bars?.length || 1) - 1)]) / 2;
    out.push(text(caption, [cx, L.captionY], { size: L.captionSize ?? 2.6, o: ramp(tau, 0.25, 0.4) }));
  }
  if (bars && bars.length) out.push(...evidenceBars(bars, fmt, col, tau + L.lead, L));
  return out;
}

// Two bars, before and after, growing from a zero line (it rises when a value is negative).
function evidenceBars(bars, fmt, col, tau, L = { ...SHIFT_L, ...BAR_TYPE }) {
  const out = [], neg = bars.some(b => b.v < 0), base = neg ? L.negBase : L.posBase, H = neg ? L.negH : L.barH;
  const max = Math.max(...bars.map(b => Math.abs(b.v))) || 1, o = ramp(tau, 1.05, 0.4);
  const value = b => (typeof fmt === 'function' ? fmt(b) : fmtBar(b, fmt));
  out.push(line([L.lineX0 ?? L.x1, base], [L.barXs[bars.length - 1] + L.barHalf + 0.6, base], { color: '#5A5A5A', w: 0.14, o }));
  bars.forEach((b, j) => {
    const x = L.barXs[j], g = ramp(tau, 1.25 + 0.4 * j, 0.7), h = (b.v / max) * H * g, up = b.v >= 0 ? 1 : -1;
    const c = j === bars.length - 1 ? col : '#7A7A7A';
    if (Math.abs(h) > 0.005) out.push(rect([x - L.barHalf, base], [x + L.barHalf, base + h], { fill: c, fo: 0.5, stroke: c, w: 0.14, o: 1, glow: j > 0 }));
    out.push(text(value(b), [x, base + h + L.valueGap * up], { size: L.valueSize, weight: 600, color: j > 0 && !L.white ? col : PAL.white,
      o: ramp(tau, 1.6 + 0.4 * j, 0.4) }));
    out.push(text(b.label, [x, base - L.labelGap * up], { size: L.labelSize, color: PAL.white, o }));
  });
  return out;
}

// ---------------- move 3: the shift's name over the five-forces cross (top left, under the strip) ----------------
export function drawForceHead(s, tau, prev = null) {
  const out = [], a = ramp(tau, 0.05, 0.35), z = 1 - ramp(tau, 0, 0.25);
  const head = (sh, o) => {
    out.push(text(sh.change, [-7.3, 2.25], { anchor: 'start', size: 2.8, weight: 500, o }));
    out.push(text(sh.when, [-7.3, 1.8], { anchor: 'start', size: 1.9, color: '#9A9A9A', o }));
  };
  if (prev && z > 0.003) head(prev, z);
  head(s, a);
  return out;
}

// ---------------- move 4: Deere's chain; the glow marks where value is scarce ----------------
export function drawChain(year, t) {
  const out = [], g = scarceAt(year), a = ramp(t, 0.1, 0.6), ga = ramp(t, 0.9, 0.6);
  out.push(text('John Deere', [-7.3, 2.55], { anchor: 'start', size: 3.2, weight: 600, color: PAL.deere, o: a }));
  const y0 = NODE.y - NODE.h - 0.35, y1 = NODE.y + NODE.h + 0.35;
  if (ga > 0.003) {
    out.push(rect([g.x - g.half - 0.18, y0 - 0.18], [g.x + g.half + 0.18, y1 + 0.18], { fill: LETTER, fo: 0.07, r: 1.8, o: ga }));
    out.push(rect([g.x - g.half, y0], [g.x + g.half, y1], { fill: LETTER, fo: 0.16, stroke: LETTER, w: 0.24, r: 1.4, o: ga, glow: true }));
    out.push(text('Scarce', [g.x, y1 + 0.45], { size: 2.4, weight: 600, color: LETTER, o: ga, glow: true }));
  }
  CHAIN.forEach((name, i) => {
    const x = CHAIN_X[i], c = coverage(i, g) * ga, o = ramp(t, 0.15 + 0.15 * i, 0.5);
    out.push(rect([x - NODE.half, NODE.y - NODE.h], [x + NODE.half, NODE.y + NODE.h],
      { stroke: mixHex('#6A6A6A', LETTER, c), w: 0.2 + 0.06 * c, r: 0.9, fill: '#000', fo: 0.88, o, glow: c > 0.5 }));
    out.push(text(name, [x, NODE.y], { size: 2.7, weight: 600, color: mixHex('#E6E6E6', '#FFFFFF', c), o }));
    if (i < CHAIN.length - 1) {
      out.push(line([x + NODE.half + 0.08, NODE.y], [CHAIN_X[i + 1] - NODE.half - 0.12, NODE.y],
        { color: PAL.grey, w: 0.16, arrow: 1, o: ramp(t, 0.5 + 0.15 * i, 0.4) }));
    }
  });
  return out;
}
