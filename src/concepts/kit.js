// Drawing kit for the concept scenes: palette, neon cards, pills, arrows, braces, value sticks.
// Everything returns plain shape objects for overlay.shapes (see drawShapes in overlay.js).
// Coordinates are the fixed chart frame of the flat shot (frame: true): x from -8 to 8, y from -4.5 to 4.5;
// the title sits above y ≈ 3.2 and the source line below y ≈ -4.1.

export const PAL = {
  white: '#FFFFFF', grey: '#8A8A8A', dim: '#3A3A3A', faint: '#1F1F1F',
  blue: '#4A97F5', sky: '#66BFFF', deepBlue: '#007DD6', cyan: '#64E2ED', pink: '#FF2EA4', amber: '#FFC46B',
  // value stick bands (her greens and blue, brightened for glow on black)
  surplus: '#22C28E', profit: '#3F8FE8', supplier: '#A2C93A',
  deere: '#9BE15D',
};

const F = o => ({ frame: true, ...o });

export const text = (t, at, o = {}) => F({ k: 'text', text: t, at, size: 1.6, color: PAL.white, ...o });
export const line = (a, b, o = {}) => F({ k: 'line', a, b, color: PAL.white, w: 0.2, ...o });
export const rect = (a, b, o = {}) => F({ k: 'rect', a, b, ...o });
export const circle = (at, o = {}) => F({ k: 'circle', at, ...o });
export const ellipse = (at, rx, ry, o = {}) => F({ k: 'ellipse', at, rx, ry, ...o });
export const poly = (pts, o = {}) => F({ k: 'poly', pts, ...o });
export const arrow = (a, b, o = {}) => line(a, b, { arrow: 1, ...o });

// Rough wrap by characters, for labels inside boxes and ovals.
export function wrap(t, max = 18) {
  const out = []; let cur = '';
  for (const w of String(t).split(/\s+/)) {
    if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out.join('\n');
}

// A pill tag like "Core" / "Major" / "Important" on the Deere map.
export function pill(x, y, label, color, { o = 1, w = 0.75, h = 0.24, size = 1.05 } = {}) {
  return [
    rect([x - w / 2, y - h / 2], [x + w / 2, y + h / 2], { stroke: color, w: 0.14, r: 0.9, fill: '#000', fo: 0.6, o }),
    text(label, [x, y], { size, color, o }),
  ];
}

// Neon card: rounded outline with a coloured header strip and rows of text (+ optional pill per row).
export function card({ x0, y0, x1, y1, color, title, rows = [], o = 1, rowH = 0.27, size = 1.15, headSize = 1.3 }) {
  const out = [
    rect([x0, y0], [x1, y1], { stroke: color, w: 0.18, r: 0.6, fill: '#000', fo: 0.75, o, glow: true }),
    rect([x0, y1 - 0.34], [x1, y1], { fill: color, fo: 0.85, r: 0.6, o }),
    text(title, [x0 + 0.12, y1 - 0.17], { anchor: 'start', size: headSize, weight: 600, o }),
  ];
  rows.forEach((r, i) => {
    const y = y1 - 0.34 - rowH * (i + 0.75);
    const ro = o * (r.o ?? 1);
    out.push(text(r.text, [x0 + 0.14, y], { anchor: 'start', size, color: r.color || PAL.white, o: ro }));
    if (r.tag) out.push(...pill(x1 - 0.48, y, r.tag, r.tagColor || PAL.white, { o: ro }));
  });
  return out;
}

// Curly brace from (x, y0) to (x, y1); opens to the right when side > 0.
export function brace(x, y0, y1, side = 1, o = {}) {
  const m = (y0 + y1) / 2, d = 0.14 * side, pts = [[x, y0], [x + d, y0 + (m - y0) * 0.15], [x + d, m - 0.05],
    [x + 2 * d, m], [x + d, m + 0.05], [x + d, y1 - (y1 - m) * 0.15], [x, y1]];
  return poly(pts, { stroke: PAL.white, w: 0.16, ...o });
}

// The value stick as she draws it: a wide bar on "$ per unit" x "units sold" axes.
// Levels are in frame y; bands: customers keep (WTP-P), firm keeps (P-C), suppliers keep (C-WTS).
export function valueStick({ x, w = 2.4, wts, c, p, wtp, o = 1, labels = true, bandLabels = true, axes = true,
  colors = {}, labelSide = 'left', ticks = true }) {
  const col = { surplus: PAL.surplus, profit: PAL.profit, supplier: PAL.supplier, ...colors };
  const x0 = x - w / 2, x1 = x + w / 2, out = [];
  if (axes) {
    out.push(line([x0 - 0.35, wts], [x0 - 0.35, wtp + 0.55], { color: PAL.white, w: 0.18, o }));
    out.push(line([x0 - 0.35, wts], [x1 + 0.6, wts], { color: PAL.white, w: 0.18, o }));
    out.push(text('$ per unit', [x0 - 0.35, wtp + 0.75], { size: 1.2, color: PAL.grey, o }));
    out.push(text('units sold', [x1 + 0.6, wts - 0.28], { size: 1.2, color: PAL.grey, anchor: 'end', o }));
  }
  const band = (lo, hi, color) => rect([x0, lo], [x1, hi], { fill: color, fo: 0.42, stroke: color, w: 0.12, o, glow: true });
  if (wtp > p) out.push(band(p, wtp, col.surplus));
  if (p > c) out.push(band(c, p, col.profit));
  if (c > wts) out.push(band(wts, c, col.supplier));
  for (const yv of [p, c]) out.push(line([x0, yv], [x1, yv], { color: PAL.white, w: 0.14, o }));
  if (ticks) {
    const lx = labelSide === 'left' ? x0 - 0.5 : x1 + 0.2, an = labelSide === 'left' ? 'end' : 'start';
    const tk = [['Willingness to pay', wtp], ['Price', p], ['Cost', c], ['Willingness to sell', wts]];
    if (labels) for (const [t, yv] of tk) out.push(text(t, [lx, yv], { anchor: an, size: 1.25, color: PAL.white, o }));
  }
  if (bandLabels) {
    const lab = (t, lo, hi) => { if (hi - lo > 0.32) out.push(text(t, [x, (lo + hi) / 2], { size: 1.25, o })); };
    lab('Customers keep', p, wtp); lab('Firm keeps', c, p); lab('Suppliers keep', wts, c);
  }
  return out;
}

// A light (point sprite) for the world: concept objects use CONCEPT ids from anim.js.
export function light(x, y, { size = 0.06, color = [1, 1, 1], alpha = 1 } = {}) {
  return { x, y, z: 0, size, color, alpha, tower: 0, towerBase: 0, towerW: 0.1, towerD: 0.1 };
}
