// Positioning: compete to be the best, or to be unique? Pure (no DOM, no three.js).
//
// Customers are points in a taste space; firms are points in the same space.
//   1. Each customer buys from the nearest firm (the car closest to what it wants).
//   2. A firm's margin depends on how close its nearest rival is: a rival right next to you can
//      undercut you for the same customers, so prices fall to cost; a rival far away cannot.
//      margin = 1 - exp(-distance to nearest rival / scale): 0 when two firms sit on the same spot,
//      rising with the gap and levelling off toward 1 (the most customers would ever pay).

import { rand } from '../layouts.js';

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// index of the nearest firm for each customer
export function assign(customers, firms) {
  return customers.map(c => {
    let best = 0, bd = Infinity;
    firms.forEach((f, i) => {
      const d = (c[0] - f[0]) ** 2 + (c[1] - f[1]) ** 2;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  });
}

// distance from each firm to its nearest rival (Infinity when it has none)
export function rivalDistance(firms) {
  return firms.map((f, i) => {
    let d = Infinity;
    firms.forEach((g, j) => { if (j !== i) d = Math.min(d, dist(f, g)); });
    return d;
  });
}

export function margins(firms, { scale = 1 } = {}) {
  return rivalDistance(firms).map(d => (Number.isFinite(d) ? 1 - Math.exp(-d / scale) : 1));
}

// Everything a scene needs at once: who buys from whom, how many each firm wins, and its margin.
export function market(customers, firms, opts = {}) {
  const a = assign(customers, firms);
  const counts = firms.map(() => 0);
  for (const i of a) counts[i]++;
  return { assign: a, counts, margins: margins(firms, opts) };
}

// Customers with varied tastes, clustered in segments: [{at:[x,y], sd:[sx,sy], w}], deterministic by seed.
// Segment sizes follow the weights; positions are normal around each centre.
export function tastes(segments, n, seed = 1) {
  const R = rand(seed * 7349 + 17);
  const total = segments.reduce((s, g) => s + g.w, 0);
  const out = [];
  let acc = 0;
  segments.forEach((g, k) => {
    const prev = Math.round((acc / total) * n);
    acc += g.w;
    const m = (k === segments.length - 1 ? n : Math.round((acc / total) * n)) - prev;
    for (let i = 0; i < m; i++) {
      const u = Math.max(1e-9, R()), v = R(), r = Math.sqrt(-2 * Math.log(u));
      out.push([g.at[0] + g.sd[0] * r * Math.cos(2 * Math.PI * v), g.at[1] + g.sd[1] * r * Math.sin(2 * Math.PI * v)]);
    }
  });
  return out;
}
