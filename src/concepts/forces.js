// The five-forces bar model for Q2. Pure, no DOM.
//   bar = top · (1 − m)^a,   m = 0.7 · strongest force + 0.3 · average force   (strengths 0..1)
// `top` and `a` are fitted so the anchor industries (forces.json `model_anchors`: Airlines, Beverages) land on
// their real averages exactly, so editing their strengths refits the model.
// The picker (any industry) uses pressPath and clickValue below: exact on every industry's real average.

export const LEVELS = { weak: 0.15, medium: 0.55, strong: 0.95 };

// How hard the five forces squeeze, 0..1. Missing forces count as zero.
export function pressure(strengths, names = null) {
  const keys = names || Object.keys(strengths);
  const n = names ? names.length : Math.max(1, keys.length);
  let max = 0, sum = 0;
  for (const k of keys) { const s = Math.max(0, Math.min(1, strengths[k] ?? 0)); max = Math.max(max, s); sum += s; }
  return keys.length ? 0.7 * max + 0.3 * (sum / n) : 0;
}

// Fit top and a (least squares in logs; exact for two industries). anchors: {industry: real average}.
export function fitForces(forces, anchors) {
  const names = forces.forces;
  const fitOn = forces.model_anchors
    ? forces.model_anchors.filter(n => forces.industries[n]).map(n => [n, forces.industries[n]])
    : Object.entries(forces.industries);
  const pts = fitOn
    .filter(([ind]) => anchors[ind] > 0)
    .map(([ind, f]) => [Math.log(1 - Math.min(0.999, pressure(f.strength, names))), Math.log(anchors[ind])]);
  let a = 2, lnTop;
  if (pts.length >= 2) {
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0), sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
    if (sxx > 1e-12 && sxy / sxx > 0) a = sxy / sxx;
    lnTop = my - a * mx;
  } else lnTop = pts.length ? pts[0][1] - a * pts[0][0] : Math.log(0.3);
  const top = Math.exp(lnTop);
  const bar = strengths => top * Math.pow(1 - Math.min(0.999, pressure(strengths, names)), a);
  return { top, a, names, bar };
}

// The bar while forces arrive: landed = {force: 0..1} (or [[force, fraction], ...]); others count as zero.
export function barFor(model, strengths, landed) {
  const L = Array.isArray(landed) ? Object.fromEntries(landed) : landed;
  const s = {};
  for (const f of model.names) s[f] = (strengths[f] ?? 0) * Math.max(0, Math.min(1, L[f] ?? 0));
  return model.bar(s);
}

// A click steps a force to the next strength class: weak -> medium -> strong -> weak.
export function nextLevel(s) {
  if (s < 0.35) return LEVELS.medium;
  if (s < 0.75) return LEVELS.strong;
  return LEVELS.weak;
}

// "12.2%" with one decimal (ties to even, so 0.1225 reads 12.2%) and a true minus sign.
export function fmtPct(v) {
  const x = v * 1000;
  let r = Math.round(x);
  if (Math.abs(Math.abs(x - Math.trunc(x)) - 0.5) < 1e-6) { const f = Math.floor(x); r = f % 2 === 0 ? f : f + 1; }
  const s = (Math.abs(r) / 10).toFixed(1);
  return `${r < 0 ? '−' : ''}${s}%`;
}

// ---------------- the picker: any industry ----------------
const clamp01 = v => Math.max(0, Math.min(1, v));

// The "No forces" level the picker presses down from: the file's no_forces_top, kept above every industry.
export function pickTop(forces, anchors) {
  return Math.max(forces.no_forces_top ?? 0.25, Math.max(...Object.values(anchors)) + 0.03);
}

// From `top` down to the industry's real average, exactly: each force presses in proportion to its share of the
// pressure (strength squared, so strong forces dominate). landed = {force: 0..1} as the forces arrive.
export function pressPath(strengths, real, top, names) {
  const w = Object.fromEntries(names.map(f => [f, clamp01(strengths[f] ?? 0) ** 2]));
  const W = names.reduce((a, f) => a + w[f], 0), D = top - real;
  const press = Object.fromEntries(names.map(f => [f, W > 0 ? (D * w[f]) / W : D / names.length]));
  const valueAt = landed => top - names.reduce((a, f) => a + press[f] * clamp01(landed[f] ?? 0), 0);
  return { top, real, press, valueAt };
}

// After the forces land, clicking one changes its strength; the bar moves from the real average by what the
// fitted two-industry model says the change is worth (so nothing changed = the real average).
export function clickValue(model, base, now, real) {
  return real + model.bar(now) - model.bar(base);
}

// The strongest force, and a second one when it is within `within` of the first (ties: first in `names`).
export function strongest(strengths, names, { within = 0.05, max = 2 } = {}) {
  const top = Math.max(...names.map(f => strengths[f] ?? 0));
  return names.filter(f => (strengths[f] ?? 0) >= top - within - 1e-12)
    .sort((a, b) => (strengths[b] ?? 0) - (strengths[a] ?? 0) || names.indexOf(a) - names.indexOf(b))
    .slice(0, max);
}

