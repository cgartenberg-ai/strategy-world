// "Best for whom?": a rugged mountain range of customer tastes, stage 3's close (her long-held picture). Pure (no DOM,
// no three.js); the terrain itself is drawn in the world by src/scenes/tasteland3d.js, the words and flags by
// drawLandscape below.
//
// The ground is every taste a traveller could have, spread out; the height is how many customers share it. Where many
// share a need, a mountain: the tallest, a sharp crag with a long ridge trailing off behind it, is price-sensitive
// leisure travellers (the lowest fare); a broad massif is time-pressed business travellers who value the network; and
// between them a small, distinctly lower peak, Aer Lingus's loyal customers: real, but not enough to sustain the
// business. Foothills and saddles between, a lower range behind; ridged noise makes every ridgeline jagged.
// Illustrative.
//
// Builds, one per click (the move is position-landscape in src/scenes/position.js):
//   0  the range rises, each mountain's name above it
//   1  Ryanair plants its flag on the lowest-fare peak (the mountain lights from the top down)
//   2  British Airways on the business-travel massif
//   3  Aer Lingus on its small peak
//   4  "Best for whom?"
// World units: x across (left to right as the airlines stood: BA, Aer Lingus, Ryanair), z towards the camera, y up.

import { ease, clamp01 } from '../tween.js';
import { rand } from '../layouts.js';
import { text, line, poly, PAL } from './kit.js';

export const HI = '#7FCBFF';              // bold words: the stage's light blue
export const LAND_SOURCE = 'Illustrative';
export const AIRLINE = { aer: 'Aer Lingus', ba: 'British Airways', ryanair: 'Ryanair' };
export const LANDING = ['ryanair', 'ba', 'aer']; // one per click
export const CLOSING = '**Best for whom?**';

// the ground's extent and its mesh resolution
export const LAND = { x: [-8.4, 8.4], z: [-4.2, 3.2], nx: 300, nz: 140 };

// ---------------- noise ----------------
// 2D gradient (Perlin) noise, about -0.7..0.7, the same every time
function perlin(seed) {
  const R = rand(seed), p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const P = new Uint16Array(512);
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const G = Array.from({ length: 16 }, (_, i) => [Math.cos((i * Math.PI) / 8), Math.sin((i * Math.PI) / 8)]);
  const f = t => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y, xi = X & 255, yi = Y & 255;
    const g = (i, j, dx, dy) => { const v = G[P[P[i] + j] & 15]; return v[0] * dx + v[1] * dy; };
    const u = f(xf), v = f(yf);
    const a = g(xi, yi, xf, yf), b = g(xi + 1, yi, xf - 1, yf), c = g(xi, yi + 1, xf, yf - 1), d = g(xi + 1, yi + 1, xf - 1, yf - 1);
    const top = a + u * (b - a), bot = c + u * (d - c);
    return top + v * (bot - top);
  };
}
const NOISE = perlin(11);
// ridged fractal noise, 0..1: sharp creases (ridgelines) where the noise crosses zero, hollows between
export function ridged(x, z, oct = 5) {
  let sum = 0, amp = 0.5, f = 1, w = 1, norm = 0;
  for (let o = 0; o < oct; o++) {
    let n = 1 - Math.abs(NOISE(x * f + o * 17.3, z * f - o * 9.1) * 1.4);
    n = Math.max(0, n); n *= n; n *= w; w = clamp01(n * 1.7);
    sum += n * amp; norm += amp; f *= 2.07; amp *= 0.5;
  }
  return sum / norm;
}

// ---------------- the mountains ----------------
// shape: 'massif' (broad, a high rugged top, steep sides) or 'crag' (a sharp point); at [x, z]; r [left, right, back,
// front] (its spread each way: unequal, so its slopes are too); h its height; rough: extra jagged rock on it; ridge: a
// long ridge trailing off it.
export const PEAKS = [
  { key: 'business', label: 'Business travel', airline: 'ba', shape: 'massif', at: [-3.6, -0.5], r: [2.1, 1.2, 1.3, 1.0], h: 1.85 },
  { key: 'loyal', label: 'Loyal customers', airline: 'aer', shape: 'crag', at: [0.3, 0.35], r: [0.42, 1.0, 0.55, 0.4], h: 0.8,
    rough: 0.9 },
  { key: 'fare', label: 'Lowest fare', airline: 'ryanair', shape: 'crag', at: [3.7, -0.5], r: [0.95, 1.6, 1.0, 0.85], h: 3.2,
    ridge: { to: [8.0, -1.5], w: 0.5, h: [0.5, 0.14] } },
];
// foothills, saddles and the lower range behind (unnamed): [x, z, spread, height]
const HILLS = [
  [-2.1, -1.3, 0.8, 0.38], [-2.2, 0.9, 0.55, 0.3], [2.35, -1.5, 0.75, 0.4], [2.1, 0.75, 0.5, 0.26], [-6.6, 0.6, 0.8, 0.45],
  [6.9, 0.4, 0.75, 0.42], [-1.4, -2.8, 1.0, 0.45], [-5.0, -3.0, 1.3, 0.8], [1.9, -3.3, 0.9, 0.3], [5.2, -3.3, 1.2, 0.6],
  [-7.2, -2.4, 1.0, 0.55], [-3.0, 2.2, 0.7, 0.18], [4.6, 2.1, 0.8, 0.2], [0.4, 2.4, 0.6, 0.14], [1.05, 0.1, 0.38, 0.32],
];

const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// a mountain's distance from its centre, in its own spreads (1 at its foot), and how far it reaches there (0..1)
function spread(p, x, z) {
  const dx = x - p.at[0], dz = z - p.at[1];
  return Math.hypot(dx / (dx < 0 ? p.r[0] : p.r[1]), dz / (dz < 0 ? p.r[2] : p.r[3]));
}
function envelope(p, x, z) {
  const d = spread(p, x, z);
  let e = p.shape === 'massif' ? 1 / (1 + d ** 4) : Math.exp(-1.7 * d ** 1.15);
  if (p.ridge) { // the ridge: falling away along a line from the summit
    const [ax, az] = p.at, [bx, bz] = p.ridge.to, vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz;
    const t = clamp01(((x - ax) * vx + (z - az) * vz) / L2), qx = ax + vx * t, qz = az + vz * t;
    const off = Math.hypot(x - qx, z - qz) / p.ridge.w;
    e = Math.max(e, (p.ridge.h[0] + (p.ridge.h[1] - p.ridge.h[0]) * t) * Math.exp(-(off ** 1.5)));
  }
  return e;
}
// flat towards the edges, so the ground ends softly
const rim = (x, z) => smooth(LAND.x[0] + 0.2, LAND.x[0] + 1.8, x) * smooth(LAND.x[1] - 0.2, LAND.x[1] - 1.8, x)
  * smooth(LAND.z[0] + 0.1, LAND.z[0] + 1.0, z) * smooth(LAND.z[1] - 0.1, LAND.z[1] - 1.0, z);

// how many customers share the taste at (x, z)
export function height(x, z) {
  const R = ridged(x * 0.85, z * 0.85), r2 = ridged(x * 1.9 + 31, z * 1.9 - 7, 4);
  let h = 0.05 + 0.13 * r2;                                              // rough ground everywhere
  for (const p of PEAKS) {
    const e = envelope(p, x, z);
    if (e < 1e-4) continue;
    const rock = p.rough ? p.rough * (ridged(x * 3.4 + 5, z * 3.4 + 2, 3) - 0.45) * e : 0;
    h += p.h * e * (0.5 + 0.42 * R + 0.22 * r2 * e + rock);
  }
  for (const [hx, hz, s, hh] of HILLS) {
    const d = Math.hypot(x - hx, (z - hz) * 1.3) / s;
    h += hh * Math.exp(-1.6 * d ** 1.3) * (0.45 + 0.9 * R);
  }
  return h * rim(x, z);
}

// how much of the height at (x, z) is each named mountain's (PEAKS order, 0..1): where its airline's light reaches
export function peakShare(x, z) {
  const own = PEAKS.map(p => envelope(p, x, z)), all = own.reduce((s, v) => s + v, 0) + 0.1;
  return own.map(v => clamp01(v / all));
}

// a mountain's summit [x, y, z]: its highest point (searched over its body, then refined)
const summits = new Map();
export function summit(p) {
  if (summits.has(p.key)) return summits.get(p.key);
  let best = [p.at[0], p.at[1]], bh = -Infinity;
  for (let x = p.at[0] - p.r[0] * 0.8; x <= p.at[0] + p.r[1] * 0.8; x += 0.03) {
    for (let z = p.at[1] - p.r[2] * 0.8; z <= p.at[1] + p.r[3] * 0.8; z += 0.03) {
      const h = height(x, z);
      if (h > bh) { bh = h; best = [x, z]; }
    }
  }
  let [x, z] = best;
  for (const step of [0.01, 0.002, 0.0004]) {
    for (let k = 0; k < 200; k++) {
      let nb = null, nh = height(x, z);
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const h = height(x + dx, z + dz);
        if (h > nh) { nh = h; nb = [x + dx, z + dz]; }
      }
      if (!nb) break;
      [x, z] = nb;
    }
  }
  const s = [x, height(x, z), z];
  summits.set(p.key, s);
  return s;
}

const fade = (c, at, d) => ease.inOutCubic(clamp01((c - at) / d));

// Everything at clock c (0..4, one per click) and t seconds after the move came in (Infinity: settled).
//   o: the terrain's opacity; rise: how far it has risen; peaks: the mountains' names;
//   air: per airline (LANDING order): o, plant (its flag going up, 0..1), lit (its mountain, from the top down);
//   closing: the closing line
export function landscapeState(c, t = Infinity) {
  return {
    o: fade(t, 0, 0.6),
    rise: fade(t, 0, 2.8),
    peaks: fade(t, 1.9, 0.8),
    air: LANDING.map((key, k) => {
      const p = c - k;
      return { key, o: fade(p, 0, 0.15), plant: ease.outQuart(clamp01(p / 0.45)), lit: fade(p, 0.3, 0.6) };
    }),
    closing: fade(c - 3, 0.1, 0.5),
  };
}

// The camera: low in front of the range, looking across it (the mountains against the black), drifting slowly round.
const DRIFT = [-7, 7];
export function landShot(f = 0) {
  return { target: [0, 1.6, -0.2], az: DRIFT[0] + (DRIFT[1] - DRIFT[0]) * f, el: 10, fov: 30, vh: 6.4 };
}

// ---------------- the words and flags, on the stage ----------------
const W = 1600 / 9;                       // the stage in U: 177.8 across, 100 down
const T = { name: 4.8, peak: 3.8, closing: 6.0, pole: 6.2, flag: [3.4, 2.3], peakUp: 9.6, nameUp: 15.0, closingY: 21 };
const onStage = ([u, v]) => [u / W, v / 100];
const S = o => ({ ...o, frame: false, screen: true });

// The words and flags for state St, placed where the camera shows the range: proj maps a world point to the stage in U
// (rigmath's projector of the camera now). Above each mountain, its name; when an airline comes, its flag goes up on
// the summit and its name above the mountain's.
export function drawLandscape(St, proj) {
  const out = [], byAirline = Object.fromEntries(PEAKS.map(p => [p.airline, p]));
  const top = p => { const [x, y, z] = summit(p); return proj([x, y * St.rise, z]); };
  if (St.peaks > 0.003) for (const p of PEAKS) {
    const s = top(p);
    out.push(text(p.label, onStage([s[0], s[1] - T.peakUp]), S({ size: T.peak, o: St.peaks })));
  }
  for (const a of St.air) {
    if (a.o <= 0.003) continue;
    const s = top(byAirline[a.key]), pole = T.pole * a.plant, tip = [s[0], s[1] - pole];
    out.push(line(onStage(s), onStage(tip), S({ color: PAL.white, w: 0.32, o: a.o, airline: a.key })));
    if (a.plant > 0.02) { // the pennant, unfurling from the top of the pole
      const fw = T.flag[0] * a.plant, fh = T.flag[1];
      out.push(poly([tip, [tip[0] + fw, tip[1] + fh / 2], [tip[0], tip[1] + fh]].map(onStage),
        S({ closed: true, fill: PAL.amber, fo: 1, stroke: PAL.amber, w: 0.12, o: a.o, airline: a.key })));
    }
    out.push(text(AIRLINE[a.key], onStage([s[0], s[1] - T.nameUp]), S({ size: T.name, weight: 500, o: a.o })));
  }
  if (St.closing > 0.003) out.push(text(CLOSING, onStage([W / 2, T.closingY]), S({ size: T.closing, weight: 500, hi: HI, o: St.closing })));
  return out;
}
