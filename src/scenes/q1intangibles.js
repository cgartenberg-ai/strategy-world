// Q1's evidence for "economic transformation": intangible assets as a share of shareholders' equity, the
// average US public company each fiscal year since 1970 (her first chart with Elaine, made for a general
// audience). A smooth glowing line draws itself left to right, a soft fading area under it and a bright dot riding
// the tip; the two ends are written as big numbers. The line passes through every year's value (monotone cubic, so
// it never overshoots between years). Data: q1_heights.json `intangibles` (pipeline: code/q1_intangibles.py,
// methods §13). Pure layout here (tests/q1intangibles.test.js). q1.js shows it as the full chart (z = 1) when Q1's
// third tile ("Intangibles") is clicked; the small version (z = 0) is no longer shown there.

import { text, line, circle, poly, PAL } from '../concepts/kit.js';
import { ramp } from '../anim.js';

export const TITLE = 'What are companies made of?';
export const CHART = { x0: -6.0, x1: 5.0, y0: -2.9, y1: 2.0 };
export const DRAW = { start: 0.9, span: 5.0 };

// lime, like the green dots of her chart
const GREEN = PAL.deere;
const TIP = '#F4FFE8', GRID = '#2a2a2a', BASE = '#4a4a4a', LABEL = PAL.white;
// the area under the line: bands from the line down to a fraction of its height, stacked so the fill fades
// evenly from the line to the baseline (the overlay has no gradients)
const BANDS = 10, BAND_FO = 0.03;

export const xOf = (year, first, last, L = CHART) => L.x0 + ((year - first) / Math.max(1, last - first)) * (L.x1 - L.x0);
export const yOf = (v, yMax, L = CHART) => L.y0 + (v / yMax) * (L.y1 - L.y0);
export const pctLabel = v => `${Math.round(v * 100)}%`;

// top of the share axis: 40%, or the next 5% step above the data
export function yMaxOf(values) {
  const hi = Math.max(0, ...values.filter(v => v != null));
  return Math.max(0.4, Math.ceil(hi * 20 - 1e-9) / 20);
}

// faint gridlines every 20% up to the top
export function gridOf(yMax) {
  const out = [];
  for (let k = 1; k * 0.2 <= yMax + 1e-9; k++) out.push(k * 0.2);
  return out;
}

export function decades(first, last) {
  const out = [];
  for (let y = Math.ceil(first / 10) * 10; y <= last; y += 10) out.push(y);
  return out;
}

// Monotone cubic (Fritsch-Carlson) through [x, y] points sorted by x: `per` samples per gap, through every point.
export function monotoneSamples(pts, per = 6) {
  const n = pts.length;
  if (n < 2) return pts.map(p => [p[0], p[1]]);
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1][0] - pts[i][0]); m.push((pts[i + 1][1] - pts[i][1]) / dx[i]); }
  const tg = new Array(n);
  tg[0] = m[0]; tg[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) tg[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { tg[i] = 0; tg[i + 1] = 0; continue; }
    const a = tg[i] / m[i], b = tg[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); tg[i] = k * a * m[i]; tg[i + 1] = k * b * m[i]; }
  }
  const out = [[pts[0][0], pts[0][1]]];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], y1 = pts[i + 1][1], h = dx[i];
    for (let j = 1; j <= per; j++) {
      if (j === per) { out.push([pts[i + 1][0], y1]); continue; }
      const u = j / per, u2 = u * u, u3 = u2 * u;
      out.push([x0 + u * h, (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * tg[i]
        + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * tg[i + 1]]);
    }
  }
  return out;
}

// The part of the line drawn so far (p from 0 to 1 across the x range), ending exactly at the tip.
export function curveTo(samples, p) {
  if (p >= 1) return samples;
  const xa = samples[0][0], cut = xa + Math.max(0, p) * (samples[samples.length - 1][0] - xa), out = [samples[0]];
  for (let i = 1; i < samples.length; i++) {
    const [x, y] = samples[i];
    if (x <= cut) { out.push(samples[i]); continue; }
    const [px, py] = samples[i - 1];
    if (cut > px) out.push([cut, py + ((cut - px) / (x - px)) * (y - py)]);
    break;
  }
  return out;
}

// 0 -> 1 across the years, easing in and out (+ 0 turns the sine ease's -0 into 0)
export const drawProgress = (t, D = DRAW) => ramp(t, D.start, D.span, 'inOutSine') + 0;

// white -> green as the call-out grows (exactly each at the ends)
const mixHex = (a, b, z) => (z <= 0 ? a : z >= 1 ? b : `#${[1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - z)
  + parseInt(b.slice(i, i + 2), 16) * z).toString(16).padStart(2, '0')).join('')}`);

// The chart in the flat shot's frame. L is the box the line fills (CHART on the full stage); z runs from the small
// call-out (0: the line, its two end numbers in white and its first and last years) to the full chart (1: with its
// label, gridlines, share axis and decades, the numbers in green). draw sets how fast the line draws itself. head
// is the small version's short title, which grows into the label: {text, dx, dy (frame units left of and above the
// box), size}, with the small sizes of its numbers and years (U) and how far below the axis the years sit.
export function intangiblesShapes(d, t, { L = CHART, z = 1, draw = DRAW, head = null } = {}) {
  const Y = d.years, V = d.values, first = Y[0], last = Y[Y.length - 1];
  const yMax = yMaxOf(V), X = y => xOf(y, first, last, L), Yv = v => yOf(v, yMax, L);
  const S = (small, big) => small * (1 - z) + big * z;
  const h = { dx: 0.95, dy: 0.8, size: 2.5, numbers: 2.2, years: 1.6, yearsOff: 0.16, ...head };
  const o = ramp(t, 0.1, 0.6), dz = ramp(z, 0.45, 0.45), out = [];
  const add = s => { if ((s.o ?? 1) > 0) out.push(s); }; // what the small version leaves out is not drawn at all

  // frame: what is plotted, a baseline and a couple of gridlines, years on the decades
  const labAt = [L.x0 - S(h.dx, 0.95), L.y1 + S(h.dy, 0.8)], labSize = S(h.size, 2.5);
  add(text(d.label || 'Intangible assets as a share of shareholders’ equity', labAt,
    { anchor: 'start', size: labSize, color: LABEL, o: o * dz }));
  if (head) add(text(head.text, labAt, { anchor: 'start', size: labSize, color: LABEL, o: o * (1 - dz) }));
  for (const v of gridOf(yMax)) add(line([L.x0, Yv(v)], [L.x1, Yv(v)], { color: GRID, w: 0.07, o: o * dz }));
  out.push(line([L.x0, L.y0], [L.x1, L.y0], { color: BASE, w: 0.09, o }));
  for (const v of [0, ...gridOf(yMax)]) {
    add(text(pctLabel(v), [L.x0 - 0.3, Yv(v)], { anchor: 'end', size: 1.9, color: PAL.white, o: o * dz }));
  }
  const yearAt = (y, op) => add(text(String(y), [X(y), L.y0 - S(h.yearsOff, 0.48)], { size: S(h.years, 1.9), color: PAL.white, o: op }));
  if (decades(first, last)[0] !== first) yearAt(first, o * (1 - dz));
  for (const y of decades(first, last)) yearAt(y, y === first ? o : o * dz);

  // the line, the area under it, the dot at its tip
  const pts = [];
  Y.forEach((y, i) => { if (V[i] != null) pts.push([X(y), Yv(V[i])]); });
  if (!pts.length) return out;
  const drawn = curveTo(monotoneSamples(pts, 6), drawProgress(t, draw));
  if (drawn.length > 1) {
    for (let k = 0; k < BANDS; k++) {
      const f = k / BANDS, under = drawn.map(([x, y]) => [x, L.y0 + (y - L.y0) * f]).reverse();
      out.push(poly([...drawn, ...under], { closed: true, fill: GREEN, fo: BAND_FO, w: 0 }));
    }
    out.push(poly(drawn, { stroke: GREEN, w: S(0.9, 1.8), o: 0.16 }));
    out.push(poly(drawn, { stroke: GREEN, w: S(0.32, 0.55), glow: true }));
  }
  const tip = drawn[drawn.length - 1], tipO = ramp(t, draw.start - 0.3, 0.4);
  out.push(circle(tip, { r: S(1.3, 2.6), fill: GREEN, fo: 0.22, o: tipO }));
  out.push(circle(tip, { r: S(0.6, 1.15), fill: TIP, stroke: GREEN, w: S(0.12, 0.2), o: tipO, glow: true }));

  // the two ends as big numbers: 1970 above the start, the latest year beside the end (small: under the axis)
  const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1];
  const firstV = V.find(v => v != null), lastI = V.length - 1 - [...V].reverse().findIndex(v => v != null);
  const numC = mixHex(PAL.white, GREEN, dz);
  out.push(text(pctLabel(firstV), [sx + S(0.1, 0.25), sy + S(0.24, 0.75)],
    { size: S(h.numbers, 4.6), weight: 600, color: numC, o: ramp(t, draw.start - 0.2, 0.6), glow: true }));
  const endO = ramp(t, draw.start + draw.span - 0.2, 0.6);
  out.push(text(pctLabel(V[lastI]), [ex + S(0.12, 0.45), ey],
    { anchor: 'start', size: S(h.numbers, 5.0), weight: 600, color: numC, o: endO, glow: true }));
  add(text(String(Y[lastI]), [ex + 0.47, ey - 0.55], { anchor: 'start', size: 2.1, color: PAL.white, o: endO * dz }));
  add(text(String(Y[lastI]), [X(Y[lastI]), L.y0 - S(h.yearsOff, 0.48)], { size: S(h.years, 1.9), color: PAL.white, o: o * (1 - dz) }));
  return out;
}

// The flat shot shows the frame from x -8..8 and y -4.5..4.5; these put frame drawings onto the stage (fractions,
// 0..1 from the top left) so they hold still under any camera, and back. Shapes sized in U only.
const toStage = ([x, y]) => [(x + 8) / 16, (4.5 - y) / 9];
export function flatToScreen(shapes) {
  return shapes.map(({ frame, ...s }) => {
    const r = { ...s, screen: true };
    if (s.at) r.at = toStage(s.at);
    if (s.a) r.a = toStage(s.a);
    if (s.b) r.b = toStage(s.b);
    if (s.pts) r.pts = s.pts.map(toStage);
    return r;
  });
}
// a stage box {x0, x1, y0 (top), y1 (bottom)} as a frame box {x0, x1, y0 (bottom), y1 (top)}
export const screenToFlat = b => ({ x0: b.x0 * 16 - 8, x1: b.x1 * 16 - 8, y0: 4.5 - b.y1 * 9, y1: 4.5 - b.y0 * 9 });
