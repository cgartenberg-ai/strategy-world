// Where every firm should be in each scene. Pure: returns plain objects.
//
// World units: the flat chart plane is z = 0; the camera frames 16 x 9 units.
// The flat chart is exactly the head-on view of the 3D landscape: same x bands,
// same vertical scale, so tilting the camera turns one into the other.

import { profitColor, sectorColor, hexToRgb, TAG, SECTOR_HEX } from './colors.js';

// Q2/Q3 color = the industry's sector, as in Q1 (height already shows profit). Older bundles: by profit.
const firmColor = (ind, v) => (ind.sector ? sectorColor(ind.sector) : profitColor(v));
import { ease, clamp01 } from './tween.js';

export const FRAME = {
  xMin: -6.3, xMax: 7.5, yMin: -3.0, yMax: 3.0,
  roaMin: -0.30, roaMax: 0.40,
  viewHeight: 9.0, viewWidth: 16.0,
};

export function roaToY(r) {
  const { roaMin, roaMax, yMin, yMax } = FRAME;
  const clipped = r > roaMax ? 1 : r < roaMin ? -1 : 0;
  const v = Math.max(roaMin, Math.min(roaMax, r));
  return { y: yMin + ((v - roaMin) / (roaMax - roaMin)) * (yMax - yMin), clipped };
}

export function yToRoa(y) {
  const { roaMin, roaMax, yMin, yMax } = FRAME;
  return roaMin + ((y - yMin) / (yMax - yMin)) * (roaMax - roaMin);
}

export const bandWidth = n => (FRAME.xMax - FRAME.xMin) / n;
export const bandCenters = n => Array.from({ length: n }, (_, i) => FRAME.xMin + bandWidth(n) * (i + 0.5));

// Small deterministic random numbers keyed by firm id, so a firm sits in the same place every run.
export function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pack dots sideways so they don't overlap. Vertical positions never change.
// radius: one number, or one per dot (dots sized by market value).
export function beeswarm(ys, center, halfWidth, radius, seed = 1) {
  const rad = Array.isArray(radius) ? radius : ys.map(() => radius);
  const rMax = Math.max(...rad, 0);
  const order = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]);
  const xs = new Array(ys.length);
  const placed = []; // [y, x, r], y ascending
  const R = rand(seed);
  let lo = 0;
  for (const [y, i] of order) {
    const r = rad[i], step = r;
    while (lo < placed.length && placed[lo][0] < y - r - rMax) lo++;
    let chosen = null;
    for (let k = 0; k * step <= halfWidth; k++) {
      for (const sgn of k === 0 ? [1] : [1, -1]) {
        const x = center + sgn * k * step;
        let ok = true;
        for (let j = lo; j < placed.length; j++) {
          const dx = placed[j][1] - x, dy = placed[j][0] - y, rr = (r + placed[j][2]) ** 2 * 0.9;
          if (dx * dx + dy * dy < rr) { ok = false; break; }
        }
        if (ok) { chosen = x; break; }
      }
      if (chosen !== null) break;
    }
    if (chosen === null) chosen = center + (R() * 2 - 1) * halfWidth;
    xs[i] = chosen;
    placed.push([y, chosen, r]);
    placed.sort((a, b) => a[0] - b[0]);
  }
  return xs;
}

// Q3 dot radius from market value: even steps per tenfold, from $500m (and below) to $5 trillion.
export const DOT_R = { lo: 0.028, hi: 0.09, mvLo: 5e8, mvHi: 5e12 };
export function dotRadius(mv) {
  const { lo, hi, mvLo, mvHi } = DOT_R;
  if (!(mv > 0)) return lo;
  const t = clamp01((Math.log10(mv) - Math.log10(mvLo)) / (Math.log10(mvHi) - Math.log10(mvLo)));
  return lo + (hi - lo) * t;
}
// market value sits at [4] in the landscape bundle and last ([5]) in the banks bundle
const mvOf = f => (typeof f[4] === 'number' ? f[4] : typeof f[5] === 'number' ? f[5] : null);

const agent = (o) => Object.assign({
  x: 0, y: 0, z: 0, size: 0.05, color: [1, 1, 1], alpha: 1,
  tower: 0, towerBase: 0, towerW: 0.1, towerD: 0.1,
}, o);

// ---------------- Q2: the 3D profit landscape ----------------
export function landscape(q2, { zDepth = 2.4, seed = 11 } = {}) {
  const n = q2.industries.length, c = bandCenters(n), w = bandWidth(n);
  const base = roaToY(0).y;
  const agents = new Map();
  for (const [id, k, v] of q2.firms) {
    const R = rand(seed * 100003 + id);
    const top = roaToY(v).y;
    agents.set(id, agent({
      x: c[k] + (R() - 0.5) * w * 0.55, z: (R() - 0.5) * 2 * zDepth, y: top,
      size: 0.05, color: firmColor(q2.industries[k], v), alpha: 0,
      tower: top - base, towerBase: base, towerW: Math.min(0.11, w * 0.11), towerD: 0.11,
    }));
  }
  const plates = q2.industries.map((ind, k) => ({
    industry: ind.industry, x: c[k], width: w * 0.8, base, top: roaToY(ind.mean_of_means).y,
    zDepth, median: roaToY(ind.median).y, q1: roaToY(ind.q1).y, q3: roaToY(ind.q3).y,
    color: ind.sector ? SECTOR_HEX[ind.sector] || SECTOR_HEX.Other : null,
  }));
  return { agents, plates, base };
}

// ---------------- Q2's opening: the same towers, jumbled and coloured by size ----------------
// Every tower keeps its height (its return); only where it stands changes: anywhere on the floor, industries mixed.
export function scramble(agents, { x0 = FRAME.xMin + 0.3, x1 = FRAME.xMax - 0.3, zDepth = 2.4, seed = 7 } = {}) {
  const out = new Map();
  for (const [id, a] of agents) {
    const R = rand(seed * 100003 + id);
    out.set(id, { ...a, x: x0 + R() * (x1 - x0), z: (R() - 0.5) * 2 * zDepth });
  }
  return out;
}

// Company size as a colour, smaller to larger, by rank of market value (so the colours spread evenly).
export const SIZE_HEX = ['#5B6CFF', '#E0559A', '#FFC46B'];
export function sizeColors(firms) {
  const stops = SIZE_HEX.map(hexToRgb);
  const ramp = t => {
    const s = Math.min(1, Math.max(0, t)) * (stops.length - 1), i = Math.min(Math.floor(s), stops.length - 2), f = s - i;
    return stops[i].map((v, j) => v + (stops[i + 1][j] - v) * f);
  };
  const valued = firms.filter(f => typeof mvOf(f) === 'number').sort((a, b) => mvOf(a) - mvOf(b));
  const out = new Map(), n = Math.max(1, valued.length - 1);
  valued.forEach((f, i) => out.set(f[0], ramp(i / n)));
  for (const f of firms) if (!out.has(f[0])) out.set(f[0], ramp(0.5));
  return out;
}

// ---------------- Q2/Q3: the same view, head on ----------------
export function flat(q2, { radius = 0.05, seed = 11, sized = true } = {}) { // sized: by log market value
  const n = q2.industries.length, c = bandCenters(n), w = bandWidth(n);
  const base = roaToY(0).y;
  const agents = new Map();
  const clipped = q2.industries.map(() => ({ above: 0, below: 0 }));
  q2.industries.forEach((ind, k) => {
    const firms = q2.firms.filter(f => f[1] === k);
    const ys = firms.map(f => roaToY(f[2]).y);
    const rs = firms.map(f => (sized ? dotRadius(mvOf(f)) : radius));
    const xs = beeswarm(ys, c[k], Math.min(w * 0.47, 1.1), rs, seed + k); // wide bands stay compact
    firms.forEach((f, i) => {
      const r = roaToY(f[2]);
      if (r.clipped > 0) clipped[k].above++;
      if (r.clipped < 0) clipped[k].below++;
      agents.set(f[0], agent({
        x: xs[i], y: r.y, z: 0, size: rs[i], color: firmColor(ind, f[2]), alpha: 1,
        tower: 0, towerBase: base, towerW: Math.min(0.11, w * 0.11), towerD: 0.11,
      }));
    });
  });
  const plates = landscape(q2).plates;
  return { agents, plates, base, clipped };
}

// ---------------- Q1: the commanding heights ----------------
export const HEIGHTS = { ground: -2.7, maxHeight: 5.0, bigStep: 0.95, smallStep: 0.1, bigW: 0.62, smallW: 0.07 };

// One fixed scale for the whole century: the largest share ever reaches maxHeight.
export function shareScale(q1) {
  if (!q1._k) q1._k = HEIGHTS.maxHeight / Math.max(1e-9, ...q1.frames.map(f => (f.sky[0] ? f.sky[0][3] : 0)));
  return q1._k;
}

function rankX(r, nBig) {
  const { xMin } = FRAME, { bigStep, smallStep } = HEIGHTS;
  if (r <= nBig) return xMin + bigStep * (r - 0.5);
  return xMin + bigStep * nBig + 0.35 + smallStep * (r - nBig - 0.5);
}

function heightsYear(q1, frame, nTowers, nBig, metric) {
  const out = new Map();
  if (!frame) return out;
  for (const e of frame.sky) {
    const [id, rank, , , si] = e;
    if (rank > nTowers) break;
    const big = rank <= nBig;
    out.set(id, {
      x: rankX(rank, nBig), value: metric(e, frame), rank,
      towerW: big ? HEIGHTS.bigW : HEIGHTS.smallW, color: sectorColor(q1.sectors[si]),
    });
  }
  return out;
}

// metric(skyEntry, frame) -> the quantity towers show (default: share of total market value);
// scale(value) -> tower height. Values are interpolated between years, then scaled.
export function heightsAt(q1, yearFloat, opts = {}) {
  const y0 = Math.floor(yearFloat);
  return { ...heightsMix(q1, y0, y0 + 1, yearFloat - y0, opts), year: yearFloat };
}

// Morph from year ya to year yb (f in [0, 1]); firms leaving shrink away, newcomers rise.
export function heightsMix(q1, ya, yb, f, { nTowers = 50, nBig = 10, metric = e => e[3], scale = null } = {}) {
  const byYear = q1._byYear || (q1._byYear = new Map(q1.frames.map(fr => [fr.year, fr])));
  const toH = scale || (v => v * shareScale(q1));
  const a = heightsYear(q1, byYear.get(ya), nTowers, nBig, metric);
  const b = f > 1e-9 ? heightsYear(q1, byYear.get(yb), nTowers, nBig, metric) : a;
  const offX = rankX(nTowers + 6, nBig);
  const agents = new Map();
  const ids = new Set([...a.keys(), ...b.keys()]);
  for (const id of ids) {
    const p = a.get(id), q = b.get(id);
    const from = p || { x: offX, value: 0, towerW: q.towerW, color: q.color };
    const to = q || { x: offX, value: 0, towerW: p.towerW, color: p.color };
    const t = f;
    const tx = f * f * (3 - 2 * f); // rank swaps happen quickly mid-move; towers rest in their slots
    const value = from.value + (to.value - from.value) * t;
    agents.set(id, agent({
      x: from.x + (to.x - from.x) * tx, y: HEIGHTS.ground, z: 0, value,
      tower: toH(value), towerBase: HEIGHTS.ground,
      towerW: from.towerW + (to.towerW - from.towerW) * t, towerD: from.towerW + (to.towerW - from.towerW) * t,
      color: (q || p).color, alpha: 0, size: 0.05,
      rank: (q || p).rank,
    }));
  }
  const near = byYear.get(f < 0.5 ? ya : yb) || byYear.get(ya);
  return { agents, podium: near ? near.sky.slice(0, nBig).map(s => s[0]) : [], year: ya + (yb - ya) * f, frame: near };
}

// A play clock that stops on chosen years: clock i is stops[i]; within each step the first `hold`
// of the time stays put, the rest eases to the next stop. `shown` is the year to display.
export function stopClock(clock, stops, hold = 0.65) {
  const n = stops.length - 1, i = Math.max(0, Math.min(n, Math.floor(clock + 1e-9)));
  if (i >= n) return { i: n, ya: stops[n], yb: stops[n], f: 0, shown: stops[n] };
  const u = clock - i, f = ease.inOutCubic(clamp01((u - hold) / (1 - hold)));
  const ya = stops[i], yb = stops[i + 1];
  return { i, ya, yb, f, shown: Math.round(ya + (yb - ya) * f) };
}

// ---------------- Q7: cohorts over time ----------------
const TAG_RGB = { top: hexToRgb(TAG.top), bottom: hexToRgb(TAG.bottom), middle: hexToRgb(TAG.middle) };

// How a cohort's firm looks, by its group: the fifths in their colours, the middle smaller and fainter
// (weight scales its opacity). cohortAt takes another look to restyle the scatter (all one colour, say).
export const COHORT_LOOK = (group, radius) => (group === 'middle'
  ? { color: TAG_RGB.middle, size: radius * 0.8, weight: 0.4 }
  : { color: TAG_RGB[group], size: radius, weight: 1 });

export function cohortAt(q7c, offset, { xMax = FRAME.xMin + 7.4, seed = 29, radius = 0.045, range = null, look = COHORT_LOOK } = {}) {
  const i0 = Math.floor(offset), f = offset - i0;
  const Y = range ? v => roaToY(Math.max(range[0], Math.min(range[1], v))).y : v => roaToY(v).y; // keep dots on the chart
  const agents = new Map();
  for (const firm of q7c.firms) {
    const R = rand(seed * 7919 + firm.permco);
    const x = FRAME.xMin + R() * (xMax - FRAME.xMin);
    const v0 = firm.path[i0], v1 = f > 1e-9 ? firm.path[i0 + 1] : v0;
    let y, alpha;
    if (v0 == null) { y = Y(0); alpha = 0; }
    else if (v1 == null) { y = Y(v0); alpha = 1 - f; }
    else { y = Y(v0 + (v1 - v0) * f); alpha = 1; }
    if (range) { // past the chart's edge a dot fades out instead of piling up
      const v = v0 == null ? 0 : v1 == null ? v0 : v0 + (v1 - v0) * f;
      alpha *= clamp01(1 - Math.max(0, range[0] - v, v - range[1]) / 0.03);
    }
    const L = look(firm.group, radius);
    agents.set(firm.permco, agent({
      x, y, z: 0, size: L.size, color: L.color, alpha: alpha * L.weight, group: firm.group,
    }));
  }
  return { agents };
}

// ---------------- camera that frames the chart plane ----------------
export function flatCamera(fovDeg, target = [0, 0, 0]) {
  const d = FRAME.viewHeight / 2 / Math.tan((fovDeg * Math.PI) / 360);
  return { position: [target[0], target[1], target[2] + d], target: target.slice(), fov: fovDeg };
}

// ---------------- rescalable vertical axis ----------------
// Map the return range [a, b] onto the chart's full height: y' = A*y + B applied to the whole world.
export function yTransform(a, b) {
  const { roaMin, roaMax, yMin, yMax } = FRAME;
  const H = yMax - yMin, R = roaMax - roaMin;
  const A = R / (b - a);
  return { A, B: yMin + ((roaMin - a) * H) / (b - a) - A * yMin };
}

// Round axis ticks (0 and 1-2-5 steps) up to max.
export function niceTicks(max, target = 4) {
  if (!(max > 0)) return [0];
  const raw = max / target, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map(m => m * mag).find(s => s >= raw) || 10 * mag;
  const out = [];
  for (let v = 0; v <= max * 1.0001; v += step) out.push(Math.round(v / step) * step);
  return out;
}

// ---------------- Q7: the two group medians traced over time ----------------
export function traceAt(c, offset, { x0, x1 }) {
  const n = c.years.length - 1;
  const X = o => x0 + (o / n) * (x1 - x0);
  const at = (arr, o) => {
    const i = Math.min(n, Math.floor(o)), f = o - i, v0 = arr[i], v1 = arr[Math.min(n, i + 1)];
    const v = v0 == null ? v1 : v1 == null || f < 1e-9 ? v0 : v0 + (v1 - v0) * f;
    return roaToY(v ?? 0).y;
  };
  const path = arr => {
    const pts = [];
    for (let i = 0; i <= Math.floor(offset); i++) if (arr[i] != null) pts.push([X(i), roaToY(arr[i]).y]);
    if (offset - Math.floor(offset) > 1e-9) pts.push([X(offset), at(arr, offset)]);
    return pts;
  };
  const s = c.summary, all = c._medianAll || (c._medianAll = cohortMedian(c));
  return {
    top: { x: X(offset), y: at(s.median_top, offset) }, bottom: { x: X(offset), y: at(s.median_bottom, offset) },
    all: { x: X(offset), y: at(all, offset) },
    pathTop: path(s.median_top), pathBottom: path(s.median_bottom), pathAll: path(all), X,
  };
}

// Median return of every firm in the cohort still reporting, for each year (the white line).
export function cohortMedian(c) {
  return c.years.map((_, i) => {
    const v = (c.firms || []).map(f => f.path[i]).filter(x => x != null).sort((a, b) => a - b);
    if (!v.length) return null;
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  });
}

// Q1 axis top for any moment: the largest value seen so far (times headroom), eased between years.
// It never shrinks, so a market fall reads as towers falling, not as the axis moving.
export function growingAxis(q1, metric, headroom = 1.12) {
  const fs = q1.frames, first = fs[0].year;
  const run = [];
  fs.forEach((f, i) => { run[i] = Math.max(i ? run[i - 1] : 0, f.sky[0] ? metric(f.sky[0], f) : 0); });
  return y => {
    const t = Math.max(0, Math.min(fs.length - 1, y - first)), i = Math.floor(t), f = t - i;
    const v = f > 1e-9 ? run[i] + (run[i + 1] - run[i]) * f : run[i];
    return v * headroom;
  };
}

// ---------------- Q7: the collapse into two typical-firm dots ----------------
// Negative ids are drawn objects, not firms: group dots per cohort, and a pool of copies that fly.
export const Q7_IDS = {
  agg: (k, group) => -(101 + 2 * k + (group === 'top' ? 0 : 1)),
  copy: j => -1000 - j,
};
export const AGG_SIZE = 0.13;

// p in [0, 1]: each tagged firm sends a copy of its light along a curve into its group's dot
// (dest.top / dest.bottom). The scatter itself stays put. The group dot grows as copies arrive.
export function collapseAt(c, p, scatter, dest, { pool, k = 0, seed = 41 } = {}) {
  const agents = new Map();
  const prog = { top: [0, 0], bottom: [0, 0] }; // [sum of progress, count]
  let j = 0;
  for (const f of c.firms) {
    if (f.group === 'middle') continue;
    const s = scatter.get(f.permco);
    if (!s || s.alpha <= 0 || j >= pool) continue;
    const d = dest[f.group];
    const delay = rand(seed * 131 + f.permco)() * 0.45;
    const t = ease.inOutCubic(clamp01((p - delay) / 0.55));
    const cx = s.x + (d.x - s.x) * 0.55, cy = s.y; // leave sideways, then turn in
    const u = 1 - t;
    const alpha = clamp01(t / 0.06) * (t < 0.85 ? 1 : (1 - t) / 0.15);
    agents.set(Q7_IDS.copy(j++), agent({
      x: u * u * s.x + 2 * u * t * cx + t * t * d.x, y: u * u * s.y + 2 * u * t * cy + t * t * d.y,
      size: s.size, color: s.color, alpha,
    }));
    prog[f.group][0] += t; prog[f.group][1] += 1;
  }
  for (; j < pool; j++) agents.set(Q7_IDS.copy(j), agent({ alpha: 0 }));
  for (const g of ['top', 'bottom']) {
    const m = prog[g][1] ? prog[g][0] / prog[g][1] : 1;
    agents.set(Q7_IDS.agg(k, g), agent({
      x: dest[g].x, y: dest[g].y, size: AGG_SIZE * (0.3 + 0.7 * m), color: TAG_RGB[g], alpha: clamp01(m * 1.6),
    }));
  }
  return agents;
}
