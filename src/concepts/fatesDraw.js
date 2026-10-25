// Drawing for Q1's last move: what became of 1970's top ten. `c` is the clock year (the trace grows with it),
// `t` seconds since the move began (the frame fades in). Each company's own light rides the head of its trace.
// `focus` (a company id or null) brightens one trace and dims the rest; clicking a name sets it (q1.js).

import { FATE, rankY, yearX, tracePieces, headAt, spreadLabels } from './fates.js';
import { text, line, rect, circle, poly, light, PAL } from './kit.js';
import { ramp } from '../anim.js';
import { hexToRgb } from '../colors.js';

const clamp01 = v => Math.max(0, Math.min(1, v));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const withYear = (note, year) => (/\b(1[89]|20)\d\d\b/.test(note) ? note : `${note}, ${year}`);
const fmt = n => n.toLocaleString('en-US');
const toHex = rgb => `#${rgb.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`;

// Companies in the same sector get the sector's colour, a lighter shade, then a deeper one, so lines stay apart.
export function fateColors(F, sectorHex) {
  const seen = new Map(), out = new Map();
  for (const f of F.firms) {
    const j = seen.get(f.sector) || 0; seen.set(f.sector, j + 1);
    const c = hexToRgb(sectorHex[f.sector] || sectorHex.Other);
    const s = j === 0 ? c : j === 1 ? c.map(v => v + (1 - v) * 0.5) : c.map(v => v * 0.74);
    out.set(f.id, toHex(s));
  }
  return out;
}

const LEFT_GAP = 0.215, RIGHT_GAP = 0.25;
const lastRank = (F, f) => f.ranks[F.years.length - 1];
const survivors = F => F.firms.filter(f => !f.exit && lastRank(F, f) != null);

// Where the names sit: 1970 names down the left; survivors' ranks and names at the right (shown at the end).
export function fateLabelSpots(F) {
  const ly = spreadLabels(F.firms.map(f => rankY(f.ranks[0])), LEFT_GAP);
  const left = F.firms.map((f, i) => ({ id: f.id, side: 'left', x: FATE.x0 - 0.3, y: ly[i], py: rankY(f.ranks[0]) }));
  const ends = survivors(F), py = ends.map(f => rankY(lastRank(F, f))), ry = spreadLabels(py, RIGHT_GAP);
  const right = ends.map((f, i) => ({ id: f.id, side: 'right', x: FATE.x1 + 1.18, y: ry[i], py: py[i] }));
  return { left, right };
}

export function fateHeads(F, c, sectorHex, focus = null) {
  const cols = fateColors(F, sectorHex), m = new Map();
  for (const f of F.firms) {
    const p = headAt(f.ranks, F.years, c);
    if (p) m.set(f.id, light(p[0], p[1], { size: f.id === focus ? 0.13 : 0.1, color: hexToRgb(cols.get(f.id)),
      alpha: focus == null || f.id === focus ? 1 : 0.25 }));
  }
  return m;
}

// a label with a dark backing so it reads over the lines (width estimated from its length)
function tag(out, s, at, { size = 1.15, color = '#dcdcdc', o = 1 } = {}) {
  const w = s.length * size * 0.09 * 0.52, h = size * 0.09 * 1.25;
  out.push(rect([at[0] - 0.05, at[1] - h / 2], [at[0] + w + 0.05, at[1] + h / 2], { fill: '#000', fo: 0.78, o }));
  out.push(text(s, at, { anchor: 'start', size, color, o }));
}

export function fateShapes(F, c, t, sectorHex, focus = null) {
  const Y = F.years, y0 = Y[0], y1 = Y[Y.length - 1], L = FATE, out = [];
  const X = y => yearX(y, y0, y1);
  const o = ramp(t, 0.3, 0.9);
  const cols = fateColors(F, sectorHex), col = f => cols.get(f.id);
  const dim = f => (focus == null || f.id === focus ? 1 : 0.22);
  const at = (f, y) => { const i = Y.indexOf(y); return i >= 0 && f.ranks[i] != null ? [X(y), rankY(f.ranks[i])] : null; };
  const spots = fateLabelSpots(F);

  // frame: header, the top-ten band, rank guides, years
  out.push(text(`${y0}'s top ten: rank each December among all listed US companies (${fmt(F.n_ranked[Y.length - 1])} in ${y1})`,
    [-7.4, L.yTop + 0.55], { anchor: 'start', size: 1.5, color: '#9a9a9a', o }));
  out.push(rect([L.x0, rankY(10.5)], [L.x1, rankY(0.82)], { fill: '#FFFFFF', fo: 0.05, o }));
  out.push(text('Top ten', [L.x1 - 0.08, (rankY(10.5) + rankY(0.82)) / 2], { anchor: 'end', size: 1.2, color: PAL.white, o }));
  for (const r of [100, 1000]) {
    out.push(line([L.x0, rankY(r)], [L.x1, rankY(r)], { color: '#2a2a2a', w: 0.07, o }));
    out.push(text(`#${fmt(r)}`, [L.x0 - 0.22, rankY(r)], { anchor: 'end', size: 1.2, color: PAL.white, o }));
  }
  for (const y of Y.filter(y => y % 10 === 0 || y === y1)) {
    if (y !== y1 && y1 - y < 4) continue; // keep the last year's label clear
    out.push(line([X(y), L.yBot - 0.05], [X(y), L.yBot - 0.14], { color: '#5a5a5a', w: 0.07, o }));
    out.push(text(String(y), [X(y), L.yBot - 0.34], { size: 1.15, color: PAL.white, o }));
  }
  if (c > y0 && c < y1) out.push(line([X(c), L.yTop + 0.12], [X(c), L.yBot - 0.05], { color: '#3a3a3a', w: 0.06 }));

  // 1970 names down the left, in their line's colour, joined to where each starts
  F.firms.forEach((f, i) => {
    const s = spots.left[i];
    out.push(text(f.name, [s.x, s.y], { anchor: 'end', size: 1.3, color: col(f), weight: f.id === focus ? 600 : 400, o: o * dim(f) }));
    out.push(line([L.x0 - 0.24, s.y], [L.x0 - 0.03, s.py], { color: col(f), w: 0.06, o: o * dim(f) }));
  });

  // traces (the focused one drawn last, on top), breaks, moments, exits
  const order = focus == null ? F.firms : [...F.firms.filter(f => f.id !== focus), ...F.firms.filter(f => f.id === focus)];
  for (const f of order) {
    const C = col(f), d = dim(f);
    for (const pts of tracePieces(f.ranks, Y, c)) {
      if (pts.length > 1) out.push(poly(pts, { stroke: C, w: f.id === focus ? 0.34 : 0.24, o: 0.95 * d, glow: d === 1 }));
    }
    for (const n of f.notes || []) {
      const show = clamp01((c - n.year) / 1.5) * d;
      if (show <= 0) continue;
      if (n.where === 'gap') {
        const i = Y.indexOf(n.year), a = at(f, Y[i - 1]), b = at(f, Y[i + 1]);
        if (a && b && c >= Y[i + 1]) out.push(line(a, b, { color: C, w: 0.1, dash: [0.5, 0.6], o: 0.7 * d }));
        const p = a || b;
        if (p) tag(out, `${cap(n.note)} ${n.year}`, [p[0] + 0.12, p[1] - 0.24], { o: show });
      } else if (n.where === 'event') {
        const p = headAt(f.ranks, Y, n.year);
        if (p) {
          out.push(circle(p, { r: 0.45, fill: '#000', stroke: C, w: 0.14, o: show }));
          tag(out, `${cap(n.note)} ${n.year}`, [p[0] + 0.1, p[1] + 0.22], { o: show });
        }
      }
    }
    if (f.exit) {
      const p = at(f, f.exit.last_ranked), show = clamp01((c - f.exit.last_ranked) / 1.2) * d;
      if (p && show > 0) {
        const k = 0.085;
        out.push(line([p[0] - k, p[1] - k], [p[0] + k, p[1] + k], { color: '#f0f0f0', w: 0.13, o: show }));
        out.push(line([p[0] - k, p[1] + k], [p[0] + k, p[1] - k], { color: '#f0f0f0', w: 0.13, o: show }));
        const note = (f.notes || []).find(n => n.where === 'exit');
        const what = note ? withYear(note.note, f.exit.year) : `${f.exit.kind}, ${f.exit.year}`;
        tag(out, `${f.name_last} · ${what}`, [p[0] + 0.16, p[1] - 0.2], { o: show });
      }
    }
  }

  // survivors: rank and today's name at the right, once the clock reaches the last year
  const endO = clamp01((c - (y1 - 1.5)) / 1.5);
  if (endO > 0) {
    for (const s of spots.right) {
      const f = F.firms.find(x => x.id === s.id), e = endO * dim(f);
      out.push(line([L.x1 + 0.06, s.py], [L.x1 + 0.22, s.y], { color: col(f), w: 0.06, o: e }));
      out.push(text(`#${fmt(lastRank(F, f))}`, [L.x1 + 1.05, s.y], { anchor: 'end', size: 1.4, weight: 600, color: col(f), o: e }));
      out.push(text(f.name_last, [s.x, s.y], { anchor: 'start', size: 1.4, color: '#f2f2f2', o: e }));
    }
  }
  return out;
}
