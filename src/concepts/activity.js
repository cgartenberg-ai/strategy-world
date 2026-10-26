// Pure logic for Q6. No DOM, no three.js.
//  - Ryanair's activity system: the graph, where it sits in the frame, oval sizes for wrapped labels,
//    the build schedule, ripple distances, and where a pulled-out activity goes.
//  - The within-firm picture: a synthetic draw of plants whose between/within-firm variance split
//    matches a published share exactly.

import { wrap } from './kit.js';

export const U = 0.09; // 1% of the stage height in frame units (the frame is 9 units tall)

// ---------------- graph ----------------
export function buildGraph(ry) {
  const nodes = [
    ...ry.hubs.map(h => ({ ...h, hub: true, cluster: h.id })),
    ...ry.activities.map(a => ({ ...a, hub: false })),
  ];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const adj = new Map(nodes.map(n => [n.id, new Set()]));
  const links = [];
  for (const [a, b] of ry.links) {
    if (!byId.has(a) || !byId.has(b) || a === b || adj.get(a).has(b)) continue;
    adj.get(a).add(b); adj.get(b).add(a);
    links.push({ a, b, hub: byId.get(a).hub && byId.get(b).hub });
  }
  return { nodes, links, byId, adj };
}

// Breadth-first distances from src (0 = the node itself, 1 = its direct links, ...).
export function distances(g, src) {
  const d = new Map([[src, 0]]);
  let frontier = [src];
  while (frontier.length) {
    const next = [];
    for (const id of frontier) {
      for (const m of g.adj.get(id) || []) if (!d.has(m)) { d.set(m, d.get(id) + 1); next.push(m); }
    }
    frontier = next;
  }
  return d;
}

// ---------------- build schedule ----------------
// Stages: 'hubs' (the four themes glow in), 'hublinks' (their six links draw), then cluster names
// (each cluster's activities light up in a clockwise sweep around their hub). Any other link starts
// drawing as soon as both of its ends are on screen. Times are seconds.
export function buildSchedule(g, build, { start = 0, hubStep = 0.28, linkStep = 0.22, nodeStep = 0.2,
  stageGap = 0.45, linkDelay = 0.12, linkDur = 0.45 } = {}) {
  const nodeAt = new Map(), stageAt = {};
  const linkAt = g.links.map(() => NaN);
  let t = start;
  for (const stage of build) {
    stageAt[stage] = t;
    if (stage === 'hubs') {
      const hubs = g.nodes.filter(n => n.hub);
      hubs.forEach((n, i) => nodeAt.set(n.id, t + i * hubStep));
      t += hubs.length * hubStep + stageGap;
    } else if (stage === 'hublinks') {
      const ks = g.links.map((l, k) => (l.hub ? k : -1)).filter(k => k >= 0);
      ks.forEach((k, i) => { linkAt[k] = t + i * linkStep; });
      t += ks.length * linkStep + stageGap;
    } else {
      const hub = g.byId.get(stage);
      const ang = n => (hub ? (Math.atan2(n.x - hub.x, hub.y - n.y) + 2 * Math.PI) % (2 * Math.PI) : 0); // clockwise from 12
      const members = g.nodes.filter(n => !n.hub && n.cluster === stage).sort((a, b) => ang(a) - ang(b));
      members.forEach((n, i) => nodeAt.set(n.id, t + i * nodeStep));
      t += members.length * nodeStep + stageGap;
    }
  }
  g.links.forEach((l, k) => {
    if (Number.isFinite(linkAt[k]) || !nodeAt.has(l.a) || !nodeAt.has(l.b)) return;
    linkAt[k] = Math.max(nodeAt.get(l.a), nodeAt.get(l.b)) + linkDelay;
  });
  const ends = [...nodeAt.values(), ...linkAt.filter(Number.isFinite).map(v => v + linkDur)];
  return { nodeAt, linkAt, stageAt, end: Math.max(t, ...ends), linkDur };
}

// 0 before link k starts drawing, 1 once drawn (linear; ease it in the scene).
export function linkProgress(s, k, t, dur = s.linkDur ?? 0.45) {
  const t0 = s.linkAt[k];
  if (!Number.isFinite(t0)) return 0;
  return Math.max(0, Math.min(1, (t - t0) / dur));
}

// ---------------- the stage-4 reveal: one click per slide ----------------
// steps (ryanair.json): [{nodes, links}], what each of her slides adds. Step 0 is on screen from the start; step k
// comes in while the click clock runs from k - 1 to k. Within a step (u = 0..1 of the clock): its bubbles fade and
// grow in, in the order listed, over the first nodeSpan; a link starts drawing linkLag after the later of its new
// bubbles (links between bubbles already up draw in turn over linkSpan, or with the bubbles if there are any).
// A link waits for its bubbles even if listed earlier; a link or bubble no step lists comes with the last step.
export const STEP_TIMING = { nodeSpan: 0.55, nodeDur: 0.3, linkLag: 0.15, linkDur: 0.3, linkSpan: 0.6, oldLinksAt: 0.4 };
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function stepPlan(g, steps, T = STEP_TIMING) {
  const last = steps.length - 1;
  const nodeStep = new Map(), nodeU = new Map();
  steps.forEach((s, k) => (s.nodes || []).forEach((id, i, all) => {
    if (!g.byId.has(id) || nodeStep.has(id)) return;
    nodeStep.set(id, k);
    nodeU.set(id, k && all.length > 1 ? (T.nodeSpan * i) / (all.length - 1) : 0);
  }));
  for (const n of g.nodes) if (!nodeStep.has(n.id)) { nodeStep.set(n.id, last); nodeU.set(n.id, T.nodeSpan); }
  const listed = new Map();
  steps.forEach((s, k) => (s.links || []).forEach(([a, b]) => { if (!listed.has(pairKey(a, b))) listed.set(pairKey(a, b), k); }));
  const linkStep = g.links.map(l => Math.max(listed.get(pairKey(l.a, l.b)) ?? last, nodeStep.get(l.a), nodeStep.get(l.b)));
  const linkU = g.links.map(() => 0);
  for (let k = 1; k <= last; k++) {
    const mine = g.links.map((l, j) => j).filter(j => linkStep[j] === k);
    const old = mine.filter(j => nodeStep.get(g.links[j].a) < k && nodeStep.get(g.links[j].b) < k);
    const hasNew = [...nodeStep.values()].some(s => s === k);
    for (const j of mine) {
      const l = g.links[j], fresh = [l.a, l.b].filter(id => nodeStep.get(id) === k).map(id => nodeU.get(id) + T.linkLag);
      if (fresh.length) linkU[j] = Math.max(...fresh);
      else linkU[j] = hasNew ? T.oldLinksAt : old.length > 1 ? (T.linkSpan * old.indexOf(j)) / (old.length - 1) : 0;
    }
  }
  return { steps: steps.length, nodeStep, nodeU, linkStep, linkU, T };
}

// The map at click clock c: each bubble's opacity o and growth (0..1), each link's drawn fraction (0..1).
// At a whole number c it is exactly that slide: what it shows is all there, nothing later is.
export function stepState(plan, c) {
  const T = plan.T, f = (step, u0, dur) => (step === 0 ? 1 : Math.max(0, Math.min(1, (c - (step - 1) - u0) / dur)));
  const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), out4 = t => 1 - Math.pow(1 - t, 4);
  const node = new Map();
  for (const [id, s] of plan.nodeStep) {
    const p = f(s, plan.nodeU.get(id), T.nodeDur);
    node.set(id, { o: inOut(p), grow: out4(p), p });
  }
  const link = plan.linkStep.map((s, j) => { const p = f(s, plan.linkU[j], T.linkDur); return p > 0 && p < 1 ? inOut(p) : p; });
  return { node, link };
}

// ---------------- labels in ovals ----------------
// Helvetica advance widths (per 1000 em), close enough to Helvetica Neue for sizing ovals.
const W = { ' ': 278, ',': 278, '.': 278, '-': 333, '+': 584, i: 222, j: 222, l: 222, f: 278, t: 278, r: 333,
  I: 278, m: 833, w: 722, M: 833, W: 944, c: 500, k: 500, s: 500, v: 500, x: 500, y: 500, z: 500, F: 611, T: 611, J: 500, L: 556 };
export function textWidth(t, size, bold = false) {
  let em = 0;
  for (const ch of String(t)) em += W[ch] ?? (/[A-Z]/.test(ch) ? 690 : 556);
  return (em / 1000) * size * U * (bold ? 1.07 : 1) * 1.04;
}

// Smallest oval (rx = aspect * ry) holding the wrapped label, trying a few wrap widths (or the lines given in `text`).
export function fitOval(label, { size = 1.15, bold = false, aspect = 1.5, pad = 0.12, minRy = 0.2, widths = null, text: given = null } = {}) {
  const lh = 1.18 * size * U, half = 0.4 * size * U; // line pitch; half a glyph's height
  let best = null;
  for (const wAt of given ? [0] : widths || [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 22]) {
    const text = given || wrap(label, wAt), lines = text.split('\n'), n = lines.length;
    let ry = 0;
    lines.forEach((l, i) => {
      const dx = textWidth(l, size, bold) / 2, dy = Math.abs(i - (n - 1) / 2) * lh + half;
      ry = Math.max(ry, Math.hypot(dx / aspect, dy));
    });
    ry = Math.max(minRy, ry + pad);
    const o = { text, lines: n, rx: ry * aspect, ry };
    if (!best || o.rx * o.ry < best.rx * best.ry - 1e-9) best = o;
  }
  return best;
}

// Where the system sits in the frame: x = (sx - 0.5) * sx + ox, y = (0.5 - sy) * sy + oy, from her slide.
// Q5's old system moves (q6-system ... q6-pull) use this: small, with room at the sides for the rival and a pulled
// activity. aspect, hubAspect: the ovals' width over height.
export const SYSTEM = { sx: 15, sy: 9.0, ox: -0.35, oy: -0.2, hubSize: 1.75, actSize: 1.5, aspect: 1.5, hubAspect: 1.3 };

// The stage-4 reveal (src/scenes/feasibility.js): the same map, stretched across the stage under the two-line header,
// with bigger words in flatter ovals. wrap: hand-set line breaks; nudge: [dx, dy] in frame units off her slide's
// place, where bigger bubbles would touch (every bubble stays on the same side of the others as on her slide).
export const BUILD = {
  sx: 21.6, sy: 8.6, ox: -0.37, oy: -0.32, hubSize: 2.4, actSize: 2.0, aspect: 2.15, hubAspect: 1.45,
  wrap: {
    seats: 'No seat\nassignments', meals: 'No meals', dutyfree: 'Duty free', ads: 'Seat-back\nadvertising',
    lowit: 'Low IT\ninvestment', nobags: 'No baggage\ntransfer', incent: 'Employee\nincentives',
    maxseat: 'Max seating\nconfig', extras: 'Charge for\nadditional services', unions: 'No unions',
    fleet: 'Standardized\nfleet of 737s', bulk: 'Bulk aircraft\npurchases', ground: 'Outsource\nground ops',
    p2p: 'Point-to-point\nshort haul (no hub)', turn: '25-minute gate\nturnaround', single: 'Single class\nfares',
    monitor: 'Active price\nmonitoring', leisure: 'Focus on price-sensitive\nleisure travel',
    playoff: 'Play airports and\ncities off each other', fees: 'Negotiate low landing\nand other fees',
    first: 'Enter first on routes\n(preempt competition)', bridges: 'No air\nbridges',
  },
  nudge: { monitor: [0, 0.15], leisure: [0, 0.12], maxseat: [0, 0.12], markets: [0, 0.22], first: [0, -0.15] },
};

// Hand-set wraps where her slide breaks lines better than a greedy wrap would.
const WRAP = {
  markets: 'Focus on\nsecondary,\nunderserved\nmarkets',
  frills: 'No frills\nservice',
  lean: 'Lean\noperations',
  fares: 'Lowest\nfares',
};

export function layoutSystem(ry, opts = {}) {
  const S = { ...SYSTEM, ...opts };
  const g = buildGraph(ry);
  const wraps = { ...WRAP, ...(S.wrap || {}) }, nudge = S.nudge || {};
  const nodes = g.nodes.map(n => {
    const size = n.hub ? S.hubSize : S.actSize, aspect = n.hub ? S.hubAspect : S.aspect;
    const fixed = wraps[n.id];
    const o = fitOval(n.label, { size, bold: n.hub, aspect, text: fixed || null });
    const [dx, dy] = nudge[n.id] || [0, 0];
    return { ...n, ...o, size,
      x: (n.x - 0.5) * S.sx + S.ox + dx, y: (0.5 - n.y) * S.sy + S.oy + dy, sx: n.x, sy: n.y };
  });
  const byId = new Map(nodes.map(n => [n.id, n]));
  const xs = nodes.map(n => [n.x - n.rx, n.x + n.rx]).flat(), ys = nodes.map(n => [n.y - n.ry, n.y + n.ry]).flat();
  return { ...g, nodes, byId, box: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } };
}

// ---------------- ellipse geometry ----------------
export const ovalHit = (o, [x, y], grow = 1) => ((x - o.x) / (o.rx * grow)) ** 2 + ((y - o.y) / (o.ry * grow)) ** 2 <= 1;

// Do two axis-aligned ellipses overlap (each grown by `margin` frame units)? Sampled; plenty for layout checks.
export function ovalsOverlap(a, b, margin = 0) {
  const A = { ...a, rx: a.rx + margin / 2, ry: a.ry + margin / 2 }, B = { ...b, rx: b.rx + margin / 2, ry: b.ry + margin / 2 };
  if (Math.abs(A.x - B.x) > A.rx + B.rx || Math.abs(A.y - B.y) > A.ry + B.ry) return false;
  for (const [P, Q] of [[A, B], [B, A]]) {
    if (ovalHit(Q, [P.x, P.y])) return true;
    for (let i = 0; i < 96; i++) {
      const th = (i / 96) * 2 * Math.PI;
      if (ovalHit(Q, [P.x + P.rx * Math.cos(th), P.y + P.ry * Math.sin(th)])) return true;
    }
  }
  return false;
}

// The point on oval o's edge in the direction of p.
export function ellipseClip(o, [px, py]) {
  const dx = px - o.x, dy = py - o.y;
  if (!dx && !dy) return [o.x, o.y];
  const k = 1 / Math.sqrt((dx / o.rx) ** 2 + (dy / o.ry) ** 2);
  return [o.x + dx * k, o.y + dy * k];
}

// Where a pulled-out activity rests: the nearer side margin, at about its own height.
export function pullSpot(L, id, { margin = 0.45, yMin = -2.9, yMax = 2.3 } = {}) {
  const n = L.byId.get(id), cx = (L.box.x0 + L.box.x1) / 2;
  const left = n.x <= cx;
  const x = left ? L.box.x0 - margin - n.rx : L.box.x1 + margin + n.rx;
  return [x, Math.max(yMin + n.ry, Math.min(yMax - n.ry, n.y))];
}

// ---------------- plants: between vs within firms ----------------
// Acklam's rational approximation to the inverse standard normal CDF.
export function invNorm(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -invNorm(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function rng(seed) { // mulberry32
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const standardize = v => {
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length);
  return v.map(x => (x - m) / sd);
};

// n normal quantiles, nudged by `jitter` (seeded) so they don't look ruled, then exactly mean 0, sd 1.
export function standardQuantiles(n, { jitter = 0, seed = 1 } = {}) {
  const R = rng(seed);
  return standardize(Array.from({ length: n }, (_, i) => invNorm((i + 0.5) / n) + jitter * (R() - 0.5)));
}

// Plants of `firms` firms with `per` plants each. Each plant has a standardized firm mean and a
// standardized deviation within its firm; the score at within-share w is
//   mean * sqrt(1 - w) + dev * sqrt(w),
// whose between/within variance split is exactly (1 - w, w), with the same plants for every w.
// Firms are numbered from the lowest mean to the highest.
export function plantDraw({ firms = 8, per = 20, seed = 11 } = {}) {
  const means = standardQuantiles(firms, { jitter: 0.35, seed }).sort((a, b) => a - b);
  const R = rng(seed * 31 + 5), out = [];
  for (let f = 0; f < firms; f++) {
    const devs = standardQuantiles(per, { jitter: 0.3, seed: seed * 101 + f });
    for (let i = devs.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [devs[i], devs[j]] = [devs[j], devs[i]]; }
    devs.forEach((dev, i) => out.push({ firm: f, i, mean: means[f], dev, jx: R() * 2 - 1, jy: R() * 2 - 1 }));
  }
  return out;
}

export const plantScore = (p, w) => p.mean * Math.sqrt(1 - w) + p.dev * Math.sqrt(w);

// Population variance split of values v grouped by firm.
export function varianceShares(list) {
  const N = list.length, g = list.reduce((s, p) => s + p.v, 0) / N;
  const by = new Map();
  for (const p of list) { const e = by.get(p.firm) || { n: 0, s: 0 }; e.n++; e.s += p.v; by.set(p.firm, e); }
  let between = 0, within = 0;
  for (const p of list) { const m = by.get(p.firm).s / by.get(p.firm).n; between += (m - g) ** 2; within += (p.v - m) ** 2; }
  const tot = between + within;
  return { between: between / tot, within: within / tot };
}

export function quantile(sorted, p) {
  const i = p * (sorted.length - 1), lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
