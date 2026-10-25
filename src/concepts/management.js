// Q5 (does management matter?): placing plants on the management-score scale from published percentiles.
// Pure, no DOM. S = {p10, p25, p50, p75, p90} (Bloom et al. 2019, online appendix Table A4).

const clamp01 = v => Math.max(0, Math.min(1, v));

// Inverse CDF through the published percentiles, straight between them; the tails extend 1.6 times the
// neighbouring gap past the 10th and 90th percentiles (kept on the 0-1 scale).
export function scoreAt(u, S) {
  const lo = clamp01(S.p10 - 1.6 * (S.p25 - S.p10)), hi = clamp01(S.p90 + 1.6 * (S.p90 - S.p75));
  const K = [[0, lo], [0.10, S.p10], [0.25, S.p25], [0.50, S.p50], [0.75, S.p75], [0.90, S.p90], [1, hi]];
  const x = clamp01(u);
  for (let i = 1; i < K.length; i++) {
    if (x <= K[i][0]) { const [u0, s0] = K[i - 1], [u1, s1] = K[i]; return s0 + ((x - u0) / (u1 - u0)) * (s1 - s0); }
  }
  return hi;
}

// n plants at evenly spaced quantiles, binned by score (bin width `bin`) and stacked within each bin:
// [{score, bin, k}] with k = 0, 1, 2, ... upward in each bin. Lower-scoring plants stack first within a bin.
export function dotHistogram(n, S, { bin = 0.025 } = {}) {
  const out = [], seen = new Map();
  for (let j = 0; j < n; j++) {
    const score = scoreAt((j + 0.5) / n, S), b = Math.min(Math.floor(score / bin), Math.round(1 / bin) - 1);
    const k = seen.get(b) || 0;
    seen.set(b, k + 1);
    out.push({ score, bin: b, k });
  }
  return out;
}

// ---- The two factories (q6-plants onward): the same inputs, outputs 100 and 192 (Syverson). ----

// Output comes out in boxes of `perBox` units; a pile fills column by column, bottom to top.
export const boxesFor = (units, perBox = 4) => Math.round(units / perBox);
export const pileSlot = (k, rows = 5) => ({ col: Math.floor(k / rows), row: k % rows });

// The race. R = {start, run, flight}: each plant launches its n boxes evenly over the same `run` seconds from
// `start`; a box lands `flight` seconds after it leaves. The counter climbs with the output and stops at `units`.
export const launchAt = (k, n, R) => R.start + ((k + 0.5) / n) * R.run;
export function countAt(t, units, R) {
  const f = (t - R.start - R.flight) / R.run;
  return f >= 1 ? units : f <= 0 ? 0 : Math.min(units, Math.floor(units * f + 1e-9));
}

// An input stream: particles `spacing` apart moving `speed` units a second along a stream `length` long.
// Slot j keeps its identity (one light each) and wraps from the end back to the start. Returns every slot,
// [{j, d, on}], d = distance along the stream, on = whether it is on the stream (off ones are hidden).
export function streamAt(tm, { length, spacing, speed, phase = 0 }) {
  const M = Math.ceil(length / spacing) + 1, P = M * spacing, out = [];
  for (let j = 0; j < M; j++) {
    const d = (((j * spacing + speed * tm + phase) % P) + P) % P;
    out.push({ j, d, on: d <= length });
  }
  return out;
}

// A factory's outline: a w x h body standing at (x0, base) under a sawtooth roof of `teeth` teeth that rise
// `rise` to the right. Points run from the bottom-left corner, up, along the roof and down the right wall.
export function factoryOutline({ x0, base, w, h, teeth = 3, rise = 0.42 }) {
  const pts = [[x0, base], [x0, base + h]], tw = w / teeth;
  for (let i = 1; i <= teeth; i++) pts.push([x0 + i * tw, base + h + rise], [x0 + i * tw, base + h]);
  pts.push([x0 + w, base]);
  return pts;
}

// A box's hop from a to b over a peak at height `top` (a quadratic curve), u from 0 to 1.
export function hop(u, a, b, top) {
  const c = [(a[0] + b[0]) / 2, 2 * top - (a[1] + b[1]) / 2], v = 1 - u;
  return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]];
}

// n lights filled like a gauge to a 0-1 share: [1, 1, ..., partial, 0, ...], summing to share * n.
export const gauge = (share, n) => Array.from({ length: n }, (_, i) => clamp01(clamp01(share) * n - i));

// The 16 MOPS management questions by area (Bloom et al. 2019): incentives are questions 9-16 (Table 6 notes);
// questions 1-5 ask about problems, indicators, their review and display boards (monitoring), 6-8 about
// targets' time frame, difficulty and awareness (targets): online appendix Table A2.
export const MOPS_AREAS = [{ name: 'Monitoring', n: 5 }, { name: 'Targets', n: 3 }, { name: 'Incentives', n: 8 }];

// ---- Q5's opening (q6-plants): the plant names, and its three clicks ----

// The weaker plant on top, the stronger below (percentiles of productivity, same narrow industry).
export const PLANT_NAMES = [['Plant A', '10th percentile'], ['Plant B', '90th percentile']];

// Three clicks: 0 the two plants, 1 the inputs line up at their doors, 2 manufacturing starts (the inputs flow
// in, the boxes stack up, the counters climb). The move's stepped clock y runs 0..2; step k begins once y passes k - 1.
export const stepsBegun = y => [true, y > 1e-6, y > 1 + 1e-6];

// How far the inputs have moved at race clock `race`: still until manufacturing starts (race = make), then with
// the race, easing to a stop over `ease` seconds once the last box has left.
export function feedAt(race, R, { make = 0.6, ease = 0.6 } = {}) {
  const stop = R.start + R.run, u = Math.min(1, Math.max(0, race - stop) / ease);
  return Math.max(0, (race <= stop ? race : stop + ease * (u - (u * u) / 2)) - make);
}

// The clocks the opening draws with at beat clock t. at = [plants, inputs, making]: the second each step began
// (null until it has). plants, inputs: seconds since that step began (-1 before it); race: the race clock R,
// 0 before manufacturing and `make` the moment it starts (so the first boxes leave within a second); feed: feedAt.
export function openingClocks(t, at, R, { make = 0.6, ease = 0.6 } = {}) {
  const since = a => (a == null ? -1 : t - a);
  const race = at[2] == null ? 0 : make + Math.max(0, t - at[2]);
  return { plants: since(at[0]), inputs: since(at[1]), race, feed: feedAt(race, R, { make, ease }) };
}
