// What became of 1970's top ten (Q1's last move): each December's rank among all listed companies,
// on a log scale so #1 to #3,000 fits; a missing year splits a trace (bankrupt and relisted); a trace that
// stops is a company that left. Pure geometry here; drawing in fatesDraw.js. Chart-frame coordinates.

export const FATE = { x0: -5.0, x1: 3.6, yTop: 2.1, yBot: -3.25, maxRank: 5000 };

export const rankY = (r, L = FATE) => L.yTop - (Math.log10(r) / Math.log10(L.maxRank)) * (L.yTop - L.yBot);
export const yearX = (y, y0, y1, L = FATE) => L.x0 + ((y - y0) / (y1 - y0)) * (L.x1 - L.x0);

const pt = (ranks, years, i, L) => [yearX(years[i], years[0], years[years.length - 1], L), rankY(ranks[i], L)];
const lerp2 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

// The trace up to clock year c, as runs of consecutive ranked years ([[x, y], ...] each).
export function tracePieces(ranks, years, c, L = FATE) {
  const pieces = [];
  let cur = [], i = 0;
  for (; i < years.length && years[i] <= c; i++) {
    if (ranks[i] == null) { if (cur.length) pieces.push(cur); cur = []; continue; }
    cur.push(pt(ranks, years, i, L));
  }
  const k = i - 1; // last year reached
  if (k >= 0 && k + 1 < years.length && ranks[k] != null && ranks[k + 1] != null && c > years[k]) {
    cur.push(lerp2(pt(ranks, years, k, L), pt(ranks, years, k + 1, L), (c - years[k]) / (years[k + 1] - years[k])));
  }
  if (cur.length) pieces.push(cur);
  return pieces;
}

// Where the company's light is at clock year c, or null (before the start, in a missing year, after it left).
export function headAt(ranks, years, c, L = FATE) {
  if (c < years[0]) return null;
  let k = 0;
  while (k + 1 < years.length && years[k + 1] <= c) k++;
  if (ranks[k] == null) return null;
  if (c <= years[k] || k + 1 >= years.length) return pt(ranks, years, k, L);
  if (ranks[k + 1] == null) return null;
  return lerp2(pt(ranks, years, k, L), pt(ranks, years, k + 1, L), (c - years[k]) / (years[k + 1] - years[k]));
}

// Spread labels vertically so neighbours are at least `gap` apart, keeping their order (top first) and
// keeping each crowded group centred on where its labels belong (pool-adjacent-violators, exact).
export function spreadLabels(ys, gap) {
  const order = ys.map((_, i) => i).sort((a, b) => ys[b] - ys[a] || a - b);
  const groups = []; // {n, sum}: sum of (target + index-in-group * gap); top = sum / n
  for (const i of order) {
    groups.push({ n: 1, sum: ys[i] });
    while (groups.length > 1) {
      const b = groups[groups.length - 1], a = groups[groups.length - 2];
      const aBottom = a.sum / a.n - (a.n - 1) * gap, bTop = b.sum / b.n;
      if (aBottom - bTop >= gap - 1e-12) break;
      groups.splice(-2, 2, { n: a.n + b.n, sum: a.sum + b.sum + a.n * gap * b.n });
    }
  }
  const out = new Array(ys.length);
  let j = 0;
  for (const g of groups) {
    const top = g.sum / g.n;
    for (let k = 0; k < g.n; k++) out[order[j++]] = top - k * gap;
  }
  return out;
}
