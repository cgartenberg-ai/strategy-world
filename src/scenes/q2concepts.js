// Q2 concept beats, after the flat industry bars:
//   q2-forces-air  the Airlines bar glides to the centre of her five-forces cross; each force lands and presses it down
//   q2-forces-bev  the same cross around Beverages: thin arrows, the bar stays high
//   q2-one-force   Beverages again: one force turns strong and the bar collapses (click any force to cycle it)
//   q2-forces-pick the industry bars; click any bar: it glides into the cross, its forces land (rivalry first) and press
//                  it to its real average; then click a force to cycle it; click the heading or outside to pick again
//   q2-shifts      all industry bars, year by year 2000-2025, with a small PESTEL strip tagging four shocks

import { text, line, rect, poly, PAL } from '../concepts/kit.js';
import { ramp, mix } from '../anim.js';
import { ease, clamp01 } from '../tween.js';
import { roaToY, yTransform, FRAME } from '../layouts.js';
import { SHOTS } from '../rigmath.js';
import { SECTOR_HEX, hexToRgb } from '../colors.js';
import { TITLES, SOURCES, go, dur, sectorLegend } from './common.js';
import { industryViews, BARS_RANGE } from './q2.js';
import { fitForces, barFor, nextLevel, LEVELS, fmtPct, pressPath, clickValue, strongest, pickTop } from '../concepts/forces.js';

// ---------------- the cross (chart-frame coordinates) ----------------
const ORDER = ['rivalry', 'buyers', 'suppliers', 'entrants', 'substitutes']; // arrival order: rivalry first
const OUTER = ['entrants', 'suppliers', 'buyers', 'substitutes'];             // the four boxes around it
const ARRIVE = f => ORDER.indexOf(f);
const BOX = { w: 3.5, h: 0.95 };
const SIDE = { // box centre, arrow base (box edge) and tip (centre box edge)
  entrants: { at: [0, 2.79], from: [0, 2.28], tip: [0, 1.8] },
  substitutes: { at: [0, -3.07], from: [0, -2.56], tip: [0, -2.04] },
  suppliers: { at: [-4.5, -0.12], from: [-2.7, -0.12], tip: [-2.19, -0.12] },
  buyers: { at: [4.5, -0.12], from: [2.7, -0.12], tip: [2.19, -0.12] },
};
const CEN = { x0: -2.15, x1: 2.15, y0: -2.0, y1: 1.76 };
const BAR = { half: 0.95, base: -0.72, room: 1.92 }; // room: bar height with no forces
const RIV = { y: -1.2, phraseY: -1.64, tip: 0.62, from: 1.8 };
const HEAD = { x: -7.3, y: 2.95, size: 3.2, subY: 2.5 };
const SZ = { label: 2.2, phrase: 1.6, value: 2.8, note: 1.45 }; // text sizes in U
const U = 0.09; // one U in frame units (stage height 9 = 100 U)
const AIR_REF = 'Airlines';
const STRONG_BUYERS = 'If big retailers held the power';
const LEVEL_WORD = s => (s < 0.35 ? 'Weak' : s < 0.75 ? 'Medium' : 'Strong');

const SRC_FORCES = 'Force strengths: teaching judgment (illustrative). Bar: Compustat via WRDS, FY2021–25 average.';
const SRC_ONE = 'Illustrative. Force strengths: teaching judgment; bar: a simple model fitted to the real Airlines and Beverages averages.';
const SRC_PICK = 'Illustrative: force strengths and reasons are teaching judgment. Bar: Compustat via WRDS, FY2021–25 average.';
const PICK_TICKS = [-0.10, -0.05, 0, 0.05, 0.10, 0.15]; // the bar chart's tight axis (as q2-flat)
const HI = PAL.amber; // the strongest forces' arrows, boxes and tag
const SRC_SHIFTS = "Source: Compustat via WRDS. Average operating return on assets of each industry's firms over each five fiscal years. "
  + 'At the end: outline = 2001–25 average; whiskers = ±1 standard deviation of the yearly average.';
const CYCLE_YEARS = [2001, 2025]; // the end view's average and swing

const hexMix = (a, b, f) => {
  const pa = hexToRgb(a), pb = hexToRgb(b);
  return `#${pa.map((v, i) => Math.round((v + (pb[i] - v) * f) * 255).toString(16).padStart(2, '0')).join('')}`;
};
const liftHex = c => hexMix(c, '#FFFFFF', 0.4); // a brighter lid, so even a thin bar reads
const textW = (s, size) => String(s).length * 0.53 * size * U; // rough width of Helvetica text

// A block arrow like her slide's, from a (box edge) toward b; s = strength (shaft width), grow = 0..1 of its length.
function blockArrow(a, b, s, grow, o, scale = 1, hi = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), len = L * grow;
  if (len < 0.03 || o <= 0.003) return [];
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const hw = (0.04 + 0.26 * s) * scale, hh = hw + (0.12 + 0.06 * s) * scale;
  const hl = Math.min(len * 0.62, (0.2 + 0.12 * s) * scale);
  const T = [a[0] + ux * len, a[1] + uy * len], N = [T[0] - ux * hl, T[1] - uy * hl];
  const P = (p, k) => [p[0] + nx * k, p[1] + ny * k];
  const c = hi > 0 ? hexMix(PAL.sky, HI, hi) : PAL.sky;
  return [poly([P(a, hw), P(N, hw), P(N, hh), T, P(N, -hh), P(N, -hw), P(a, -hw)],
    { closed: true, fill: c, fo: 0.12 + 0.32 * s, stroke: c, w: 0.16, o: o * (0.75 + 0.25 * s), glow: true })];
}

function boxShape([cx, cy], w, h, o, sc = 1, hi = 0) {
  const W = (w * sc) / 2, H = (h * sc) / 2;
  return rect([cx - W, cy - H], [cx + W, cy + H], { stroke: hi > 0 ? hexMix(PAL.sky, HI, hi) : PAL.sky, w: 0.2 + 0.06 * hi, r: 0.9,
    fill: '#000', fo: 0.82, o, glow: true });
}

// Everything on screen for one moment of the cross. st describes it (see the beats below).
function crossShapes(st, M) {
  const out = [];
  const hOf = v => Math.max(0, v / M.top) * BAR.room;
  const B0 = st.base ?? BAR.base;                          // the bar's zero line (raised for a negative average)
  const strong = new Set(st.strong || []), so = st.strongO ?? 0;
  const tag = (at, o) => { if (o > 0.003) out.push(text('Strongest', at, { anchor: 'start', size: 1.45, weight: 600, color: PAL.amber, o })); };
  // heading: industry name and what the number is
  for (const h of st.heads) {
    out.push(text(h.text, h.at || [HEAD.x, HEAD.y], { anchor: 'start', size: h.size ?? HEAD.size, weight: 500,
      color: h.color || PAL.white, o: h.o }));
  }
  if (st.subO > 0) out.push(text('Return on assets', [HEAD.x, HEAD.subY], { anchor: 'start', size: 1.6, color: PAL.white, o: st.subO }));

  // centre box: Rivalry, with the bar inside
  if (st.centreO > 0) {
    out.push(rect([CEN.x0, CEN.y0], [CEN.x1, CEN.y1], { stroke: PAL.sky, w: 0.2, r: 0.9, fill: '#000', fo: 0.82, o: st.centreO, glow: true }));
    out.push(line([-1.5, B0], [1.5, B0], { color: '#5A5A5A', w: 0.14, o: st.centreO }));
  }
  // the bar
  const b = st.bar, h = b.h ?? hOf(st.value);
  const top = Math.max(st.floor ?? -Infinity, Math.min(st.ceil ?? Infinity, b.base + h)); // drawn within the box
  // ghost outline above it: the bar with no forces at all, so the empty part is the profit pressed out
  if (st.ghostO > 0) {
    const y = B0 + BAR.room, x0 = -BAR.half, x1 = BAR.half, g = { color: PAL.grey, w: 0.14, dash: [0.6, 0.5], o: st.ghostO };
    const y0 = Math.min(y, Math.max(B0, top));
    out.push(line([x0, y0], [x0, y], g), line([x0, y], [x1, y], g), line([x1, y], [x1, y0], g));
    out.push(text('No forces', [x1 + 0.16, y], { anchor: 'start', size: SZ.note, color: PAL.grey, o: st.ghostO }));
  }
  out.push(rect([b.x - b.half, b.base], [b.x + b.half, top], { fill: b.color, fo: 0.55, o: b.o }));
  // the lid: a thin rect (a glow filter on a perfectly level line has no height and vanishes)
  out.push(rect([b.x - b.half, top - 0.025], [b.x + b.half, top + 0.025], { fill: liftHex(b.color), o: b.o, glow: true }));
  if (st.valueO > 0) out.push(text(fmtPct(st.value), [b.x, (top >= b.base ? top : b.base) + 0.3], { size: SZ.value, weight: 600, o: st.valueO }));
  if (st.refO > 0) { // Airlines' level, for the one-force beat
    const y = BAR.base + hOf(st.refValue);
    out.push(line([BAR.half + 0.1, y], [BAR.half + 0.4, y], { color: PAL.grey, w: 0.16, o: st.refO }));
    out.push(text(AIR_REF, [BAR.half + 0.48, y], { anchor: 'start', size: SZ.note, color: PAL.grey, o: st.refO }));
  }

  // rivalry: label, facing arrows, phrase
  const R = st.rivalry;
  if (R.labelO > 0) out.push(text('Rivalry', [0, RIV.y], { size: SZ.label, weight: 600, o: R.labelO }));
  const rh = strong.has('rivalry') ? so : 0;
  for (const A of R.arrows) {
    out.push(...blockArrow([-RIV.from, RIV.y], [-RIV.tip, RIV.y], A.s, A.grow, A.o, 0.6, rh));
    out.push(...blockArrow([RIV.from, RIV.y], [RIV.tip, RIV.y], A.s, A.grow, A.o, 0.6, rh));
  }
  tag([CEN.x0 + 0.2, CEN.y1 - 0.28], rh * (R.labelO ?? 1));
  for (const p of R.phrases) if (p.o > 0 && p.text) out.push(text(p.text, [0, RIV.phraseY], { size: SZ.phrase, color: PAL.grey, o: p.o }));

  // the four outer forces: the label rises to make room when the box carries a phrase
  for (const f of OUTER) {
    const S = st.forces[f], G = SIDE[f], fh = strong.has(f) ? so : 0;
    for (const A of S.arrows) out.push(...blockArrow(G.from, G.tip, A.s, A.grow, A.o, 1, fh));
    if (S.boxO <= 0) continue;
    const ph = Math.max(0, ...S.phrases.filter(p => p.text).map(p => p.o));
    out.push(boxShape(G.at, BOX.w, BOX.h, S.boxO, 0.9 + 0.1 * S.boxO, fh));
    tag([G.at[0] - BOX.w / 2 + 0.2, G.at[1] + 0.3], fh * S.boxO);
    out.push(text(M.labels[f], [G.at[0], G.at[1] + 0.18 * ph], { size: SZ.label, weight: 600, o: S.boxO }));
    for (const p of S.phrases) if (p.o > 0 && p.text) {
      out.push(text(p.text, [G.at[0], G.at[1] - 0.21], { size: SZ.phrase, color: PAL.grey, o: p.o * S.boxO }));
    }
  }
  return out;
}

// ---------------- the PESTEL strip and the shocks ----------------
const SHIFT_RANGE = [-0.25, 0.25];
const SHIFT_TICKS = [-0.2, -0.1, 0, 0.1, 0.2];
const HOLD = 0.6;  // each five-year period the bars rest, then glide to the next
const STEP_S = 5.0; // seconds per period: rest 3 s, glide 2 s (each click glides one period; Space plays all)
const SPAN = 5;     // years per period: 2001–05, 2006–10, ... ending at the last year
const LETTERS = ['P', 'E', 'S', 'T', 'E', 'L'];
const STRIP = { x1: 7.35, dx: 0.46, y: 3.34 };
// Shocks that visibly move the bars (checked against industry_years). letter: index into LETTERS.
const SHOCKS = [
  { name: 'Financial crisis', letter: 1, from: 2008, to: 2009, // in five-year averages autos barely move, so only oil is tagged
    tags: [{ ind: 'Oil and gas', side: 'below', anchor: 'start' }] },
  { name: 'Oil price collapse', letter: 1, from: 2015, to: 2015, // oil falls; cheap fuel lifts airlines
    tags: [{ ind: 'Oil and gas', side: 'below', anchor: 'start' }, { ind: 'Airlines', side: 'above' }] },
  { name: 'Pandemic', letter: 2, from: 2020, to: 2020,
    tags: [{ ind: 'Airlines', side: 'below' }, { ind: 'Oil and gas', side: 'below', anchor: 'start' }] },
  { name: 'War in Ukraine, energy prices', letter: 0, from: 2022, to: 2022, tags: [{ ind: 'Oil and gas', side: 'right' }] },
];
// a shock is tagged while the bars show the period it falls in (c = clock in periods; k = that period's index)
const shockAlpha = (k, c) => (c == null || k < 0 ? 0 : clamp01((c - (k - 0.15)) / 0.2) * (1 - clamp01((c - (k + HOLD)) / 0.2)));

export function q2Concepts(ctx) {
  const q2 = ctx.data.q2q3_landscape;
  const V = (ctx.views = ctx.views || industryViews(q2));
  const F = ctx.data.concepts.forces;
  if (!F) return [];
  const real = Object.fromEntries(q2.industries.map(i => [i.industry, i.mean_of_means]));
  const M = { ...fitForces(F, real), labels: F.labels };
  const IND = {};
  for (const name of ['Airlines', 'Beverages']) {
    const k = q2.industries.findIndex(i => i.industry === name);
    const sector = q2.industries[k]?.sector;
    IND[name] = { k, s: F.industries[name].strength, why: F.industries[name].why, real: real[name],
      color: SECTOR_HEX[sector] || PAL.sky };
  }
  const AIR = IND.Airlines, BEV = IND.Beverages;

  // where the Airlines bar sits on the flat chart (tight axis), in frame coordinates
  const BT = yTransform(BARS_RANGE[0], BARS_RANGE[1]);
  const flatBar = (() => {
    const p = V.F.plates[AIR.k];
    const base = BT.A * p.base + BT.B, top = BT.A * p.top + BT.B;
    return { x: p.x, half: p.width / 2, base, h: top - base };
  })();
  const flatLabelAt = [V.c[AIR.k] - textW('Airlines', 1.45) / 2, -3.21];

  // which of these beats drew last (to continue smoothly from it), and what it drew
  const seen = { id: null, at: 0, shapes: [] };
  const remember = (id, shapes) => { seen.id = id; seen.at = performance.now(); seen.shapes = shapes; return shapes; };
  const cameFrom = () => (performance.now() - seen.at < 400 ? seen.id : null);

  const emptyForces = () => Object.fromEntries(OUTER.map(f => [f, { boxO: 0, arrows: [], phrases: [] }]));
  const baseState = () => ({
    heads: [], subO: 1, centreO: 1, ghostO: 1, valueO: 1, refO: 0, value: M.top,
    bar: { x: 0, half: BAR.half, base: BAR.base, color: AIR.color, o: 1 },
    rivalry: { labelO: 0, arrows: [], phrases: [] }, forces: emptyForces(),
  });

  function setupCross(source) {
    ctx.overlay.reset({ title: TITLES.q2why, source });
    ctx.allowOrbit = false;
    ctx.world.setGlow(0.3);
    ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
  }

  // ---- beat 1: Airlines ----
  let glide = false, rangeDone = false;
  const T1 = { first: 3.0, step: 1.25 };
  function airState(t) {
    const st = baseState(), g = glide ? ramp(t, 0.1, 1.3) : 1;
    const at = i => T1.first + T1.step * i;
    const landed = Object.fromEntries(ORDER.map((f, i) => [f, ramp(t, at(i) + 0.75, 0.55)]));
    const rise = glide ? ramp(t, 1.5, 1.0) : ramp(t, 0.3, 0.9);
    st.value = mix(AIR.real, barFor(M, AIR.s, landed), rise);
    const hEnd = Math.max(0, st.value / M.top) * BAR.room;
    st.bar = { x: mix(flatBar.x, 0, g), half: mix(flatBar.half, BAR.half, g), base: mix(flatBar.base, BAR.base, g),
      h: mix(flatBar.h, hEnd, g), color: AIR.color, o: 1 };
    st.heads = [{ text: 'Airlines', o: 1, size: mix(1.45, HEAD.size, g), color: g < 1 ? hexMix('#CFCFCF', '#FFFFFF', g) : PAL.white,
      at: [mix(flatLabelAt[0], HEAD.x, g), mix(flatLabelAt[1], HEAD.y, g)] }];
    st.subO = glide ? ramp(t, 1.3, 0.5) : ramp(t, 0, 0.5);
    st.centreO = glide ? ramp(t, 0.9, 0.6) : ramp(t, 0, 0.5);
    st.valueO = glide ? ramp(t, 1.2, 0.4) : ramp(t, 0.1, 0.4);
    st.ghostO = ramp(t, glide ? 2.3 : 1.0, 0.5);
    OUTER.forEach(f => {
      const T = at(ARRIVE(f));
      st.forces[f] = { boxO: ramp(t, T, 0.4), arrows: [{ s: AIR.s[f], grow: ramp(t, T + 0.25, 0.5), o: 1 }],
        phrases: [{ text: AIR.why[f], o: ramp(t, T + 0.35, 0.45) }] };
    });
    const T = at(ARRIVE('rivalry'));
    st.rivalry = { labelO: ramp(t, T, 0.4), arrows: [{ s: AIR.s.rivalry, grow: ramp(t, T + 0.25, 0.5), o: 1 }],
      phrases: [{ text: AIR.why.rivalry, o: ramp(t, T + 0.35, 0.45) }] };
    return st;
  }

  // ---- beat 2: Beverages ----
  let fromAir = false;
  const T2 = { step: 0.95 };
  function bevState(t) {
    const st = baseState(), first = fromAir ? 1.8 : 1.2, at = i => first + T2.step * i;
    const landed = Object.fromEntries(ORDER.map((f, i) => [f, ramp(t, at(i) + 0.6, 0.5)]));
    const rise = ramp(t, 0.4, 1.0);
    st.value = mix(fromAir ? AIR.real : M.top, barFor(M, BEV.s, landed), fromAir ? rise : 1);
    const cf = fromAir ? ramp(t, 0.2, 0.8) : 1;
    st.bar = { x: 0, half: BAR.half, base: BAR.base, color: hexMix(AIR.color, BEV.color, cf), o: 1 };
    const out = fromAir ? 1 - ramp(t, 0, 0.6) : 0; // Airlines' arrows pull back, its phrases fade
    st.heads = [{ text: 'Airlines', o: fromAir ? 1 - ramp(t, 0, 0.4) : 0 }, { text: 'Beverages', o: ramp(t, fromAir ? 0.35 : 0, 0.45) }];
    st.subO = 1; st.centreO = fromAir ? 1 : ramp(t, 0, 0.4); st.ghostO = fromAir ? 1 : ramp(t, 0.2, 0.4);
    OUTER.forEach((f, i) => {
      const T = at(ARRIVE(f));
      st.forces[f] = { boxO: fromAir ? 1 : ramp(t, 0.1 * i, 0.4),
        arrows: [{ s: AIR.s[f], grow: out, o: fromAir ? 1 : 0 }, { s: BEV.s[f], grow: ramp(t, T + 0.2, 0.45), o: 1 }],
        phrases: [{ text: AIR.why[f], o: fromAir ? 1 - ramp(t, 0, 0.4) : 0 }, { text: BEV.why[f], o: ramp(t, T + 0.3, 0.45) }] };
    });
    const T = at(ARRIVE('rivalry'));
    st.rivalry = { labelO: fromAir ? 1 : ramp(t, 0, 0.4),
      arrows: [{ s: AIR.s.rivalry, grow: out, o: fromAir ? 1 : 0 }, { s: BEV.s.rivalry, grow: ramp(t, T + 0.2, 0.45), o: 1 }],
      phrases: [{ text: AIR.why.rivalry, o: fromAir ? 1 - ramp(t, 0, 0.4) : 0 }, { text: BEV.why.rivalry, o: ramp(t, T + 0.3, 0.45) }] };
    return st;
  }

  // ---- beat 3: one bad force (interactive) ----
  const ONE = { start: 1.0, len: 1.4, settle: 0.7 };
  let user = null; // null until the presenter clicks a force: {force: {from, to, t0, d}}
  const scripted = (f, t) => (f === 'buyers' ? mix(BEV.s.buyers, LEVELS.strong, ramp(t, ONE.start, ONE.len)) : BEV.s[f]);
  const scriptedTo = f => (f === 'buyers' ? LEVELS.strong : BEV.s[f]);
  const strengthAt = (f, t) => {
    if (!user) return scripted(f, t);
    const a = user[f];
    return mix(a.from, a.to, ramp(t, a.t0, a.d));
  };
  function oneState(t) {
    const st = baseState(), s = Object.fromEntries(ORDER.map(f => [f, strengthAt(f, t)]));
    st.value = M.bar(s);
    st.bar = { x: 0, half: BAR.half, base: BAR.base, color: BEV.color, o: 1 };
    st.heads = [{ text: 'Beverages', o: 1 }];
    st.refO = ramp(t, ONE.start + ONE.len, 0.5); st.refValue = AIR.real;
    const phrasesFor = f => {
      const target = user ? user[f].to : scriptedTo(f), t0 = user ? user[f].t0 : ONE.start;
      const changed = Math.abs(target - BEV.s[f]) > 1e-6;
      const word = f === 'buyers' && target === LEVELS.strong ? STRONG_BUYERS : LEVEL_WORD(target);
      return [{ text: BEV.why[f], o: 1 - ramp(t, 0, 0.5) }, { text: changed ? word : '', o: ramp(t, t0, 0.4) }];
    };
    for (const f of OUTER) st.forces[f] = { boxO: 1, arrows: [{ s: s[f], grow: 1, o: 1 }], phrases: phrasesFor(f) };
    st.rivalry = { labelO: 1, arrows: [{ s: s.rivalry, grow: 1, o: 1 }], phrases: phrasesFor('rivalry') };
    return st;
  }
  const hitForce = (x, y) => {
    for (const f of OUTER) {
      const [cx, cy] = SIDE[f].at;
      if (Math.abs(x - cx) <= BOX.w / 2 && Math.abs(y - cy) <= BOX.h / 2) return f;
    }
    return x >= CEN.x0 && x <= CEN.x1 && y >= CEN.y0 && y <= CEN.y1 ? 'rivalry' : null;
  };
  let captionAt = Infinity;

  // ---- the picker: any industry's bar glides into the cross; its forces press it to its real average ----
  const TOP = pickTop(F, real);                             // "No forces": the same level for every industry
  const MP = { top: TOP, labels: F.labels };
  const NEG_FLOOR = -0.92;                                  // a negative bar stops above the Rivalry label
  const PT = { first: 2.4, step: 1.05 };                    // forces land at first + step * i (ORDER)
  const PICK_LANDED = PT.first + PT.step * (ORDER.length - 1) + 1.3;
  const hOfPick = v => (v / TOP) * BAR.room;
  const PM = q2.industries.map(ind => {
    const f = F.industries[ind.industry];
    if (!f) return null;
    const R = ind.mean_of_means;
    return { name: ind.industry, s: f.strength, why: f.why, real: R, color: SECTOR_HEX[ind.sector] || PAL.sky,
      path: pressPath(f.strength, R, TOP, ORDER), base: Math.max(BAR.base, NEG_FLOOR + Math.max(0, -hOfPick(R))) };
  });
  const flatBarOf = k => {
    const p = V.F.plates[k], base = BT.A * p.base + BT.B, top = BT.A * p.top + BT.B;
    return { x: p.x, half: p.width / 2, base, h: top - base };
  };
  const labelAt = k => [V.c[k] - textW(q2.industries[k].industry, 1.45) / 2, -3.21];
  let pick = { k: null, at: 0, user: null }, pickBack = null, pickShapes = [];
  const pickClock = () => (performance.now() - pick.at) / 1000;
  const pickStrengths = (P, t) => Object.fromEntries(ORDER.map(f => {
    const u = pick.user?.[f];
    return [f, u ? mix(u.from, u.to, ramp(t, u.t0, u.d)) : P.s[f]];
  }));
  function pickState(t) {
    const P = PM[pick.k], st = baseState(), g = ramp(t, 0.1, 1.3), at = i => PT.first + PT.step * i;
    const landed = Object.fromEntries(ORDER.map((f, i) => [f, ramp(t, at(i) + 0.75, 0.55)]));
    const s = pickStrengths(P, t);
    st.value = pick.user ? clickValue(M, P.s, s, P.real) : mix(P.real, P.path.valueAt(landed), ramp(t, 1.5, 1.0));
    const fb = flatBarOf(pick.k), hl = labelAt(pick.k);
    st.base = P.base; st.floor = NEG_FLOOR; st.ceil = P.base + BAR.room;
    st.bar = { x: mix(fb.x, 0, g), half: mix(fb.half, BAR.half, g), base: mix(fb.base, P.base, g),
      h: mix(fb.h, hOfPick(st.value), g), color: P.color, o: 1 };
    st.heads = [{ text: P.name, o: 1, size: mix(1.45, HEAD.size, g), color: g < 1 ? hexMix('#CFCFCF', '#FFFFFF', g) : PAL.white,
      at: [mix(hl[0], HEAD.x, g), mix(hl[1], HEAD.y, g)] }];
    st.subO = ramp(t, 1.3, 0.5); st.centreO = ramp(t, 0.9, 0.6); st.valueO = ramp(t, 1.2, 0.4); st.ghostO = ramp(t, 2.0, 0.5);
    const phrases = f => { // a force that was clicked says its new level instead of its reason
      const u = pick.user?.[f], moved = !!u && Math.abs(u.to - P.s[f]) > 1e-6, swap = moved ? ramp(t, u.t0, 0.4) : 0;
      return [{ text: P.why[f], o: ramp(t, at(ARRIVE(f)) + 0.35, 0.45) * (1 - swap) }, { text: moved ? LEVEL_WORD(u.to) : '', o: swap }];
    };
    for (const f of OUTER) {
      const T = at(ARRIVE(f));
      st.forces[f] = { boxO: ramp(t, T, 0.4), arrows: [{ s: s[f], grow: ramp(t, T + 0.25, 0.5), o: 1 }], phrases: phrases(f) };
    }
    const T = at(ARRIVE('rivalry'));
    st.rivalry = { labelO: ramp(t, T, 0.4), arrows: [{ s: s.rivalry, grow: ramp(t, T + 0.25, 0.5), o: 1 }], phrases: phrases('rivalry') };
    st.strong = strongest(s, ORDER); st.strongO = ramp(t, PICK_LANDED, 0.5);
    return st;
  }
  function setupBars() { // the bar chart to pick from (as q2-flat)
    ctx.overlay.reset({ title: TITLES.q2why, source: q2.source_line || SOURCES.q2 });
    ctx.overlay.legend(sectorLegend(q2.industries));
    ctx.overlay.axis({ label: 'Return on assets', ticks: PICK_TICKS });
    ctx.allowOrbit = false;
    ctx.world.setGlow(0.3);
    ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setYRange(BARS_RANGE[0], BARS_RANGE[1], { duration: dur(ctx, 1200) });
    ctx.world.plates.set(V.F.plates, { duration: dur(ctx, 1200), body: 0.5 });
  }
  function pickIndustry(k, instant) {
    pick = { k, at: performance.now() - (instant ? 1e9 : 0), user: null };
    pickBack = null;
    ctx.overlay.reset({ title: TITLES.q2why, source: SRC_PICK });
    // the picked plate becomes the drawn bar at once; the others dim away
    ctx.world.plates.set(V.F.plates.map((pl, j) => (j === k ? undefined : pl)), { duration: 0, body: 0.5 });
    ctx.world.plates.set([], { duration: instant ? 0 : 1800, body: 0.5 });
  }
  function backToBars() {
    pickBack = { at: performance.now(), shapes: pickShapes };
    pick = { k: null, at: 0, user: null };
    setupBars();
  }
  function pickCycle(f, t) {
    const P = PM[pick.k];
    if (!pick.user) pick.user = Object.fromEntries(ORDER.map(g => [g, { from: P.s[g], to: P.s[g], t0: -1e9, d: ONE.settle }]));
    pick.user[f] = { from: pickStrengths(P, t)[f], to: nextLevel(pick.user[f].to), t0: t, d: ONE.settle };
  }
  const barAt = (x, y) => {
    if (y < FRAME.yMin - 1.0 || y > FRAME.yMax + 0.2) return null;
    const k = V.F.plates.findIndex(pl => Math.abs(x - pl.x) <= pl.width / 2);
    return k >= 0 && PM[k] ? k : null;
  };
  const onHeading = (x, y) => pick.k != null && Math.abs(y - HEAD.y) < 0.32
    && x >= HEAD.x - 0.1 && x <= HEAD.x + textW(PM[pick.k].name, HEAD.size) + 0.1;

  // ---- beat 4: industry bars over time, five years at a time ----
  const IY = q2.industry_years || { years: [], series: {} };
  const Y0 = IY.years[0] ?? 2000, Y1 = IY.years[IY.years.length - 1] ?? 2025;
  const ST = yTransform(SHIFT_RANGE[0], SHIFT_RANGE[1]);
  const valueAt = (ind, yr) => {
    const ser = IY.series[ind], i = yr - Y0;
    return ser && i >= 0 && i < ser.length ? ser[i] : null;
  };
  // the periods, counted back from the last year: [first, last] years
  const PERIODS = [];
  for (let e = Y1; e - (SPAN - 1) >= Y0; e -= SPAN) PERIODS.unshift([e - (SPAN - 1), e]);
  const P = PERIODS.length;
  const periodLabel = k => { const [a, b] = PERIODS[Math.max(0, Math.min(P - 1, k))]; return `${a}–${String(b).slice(2)}`; };
  const periodOf = yr => PERIODS.findIndex(([a, b]) => yr >= a && yr <= b);
  const periodValue = (ind, k) => { // average of the period's years (needs at least three)
    if (k < 0 || k >= P) return null;
    const v = [];
    for (let yr = PERIODS[k][0]; yr <= PERIODS[k][1]; yr++) { const x = valueAt(ind, yr); if (x != null) v.push(x); }
    return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  function platesAt(c) {
    const ki = Math.max(0, Math.min(P - 1, Math.floor(c + 1e-9))), u = c - ki;
    const f = u <= 1e-9 || ki >= P - 1 ? 0 : ease.inOutCubic(clamp01((u - HOLD) / (1 - HOLD)));
    return V.F.plates.map((p, k) => {
      const name = q2.industries[k].industry, a = periodValue(name, ki), b = periodValue(name, ki + 1);
      let v = 0, alpha = 1;
      if (a == null && b == null) alpha = 0;
      else if (a == null) { v = b; alpha = f; }
      else if (b == null || f === 0) { v = a; alpha = b == null && f > 0 ? 1 - f : 1; }
      else v = a + (b - a) * f;
      return { ...p, top: roaToY(v).y, alpha };
    });
  }
  function setPlates(list, duration) {
    const P = ctx.world.plates;
    P.set(list, { duration, body: 0.5 });
    if (duration > 0) return;
    list.forEach((p, k) => { // a year with no data fades that bar
      const it = P.items?.[k];
      if (p.alpha < 1 && it?.cur) { it.cur.o = p.alpha; if (it.to) it.to.o = p.alpha; P._apply?.(it); }
    });
  }
  const shownPeriod = c => { // the label switches halfway through each glide
    const ki = Math.floor(c + 1e-9), u = c - ki;
    return periodLabel(u > HOLD + (1 - HOLD) / 2 ? Math.min(P - 1, ki + 1) : ki);
  };
  const SHOCK_K = SHOCKS.map(S => periodOf(S.from));
  // where a shock's tag sits: just past its bar in the period it falls in
  const tagPlace = (S, tg, kS) => {
    const k = q2.industries.findIndex(i => i.industry === tg.ind);
    if (k < 0) return null;
    const p = V.F.plates[k], v0 = periodValue(tg.ind, kS), vals = v0 == null ? [] : [v0];
    if (!vals.length) return null;
    const fy = v => ST.A * roaToY(v).y + ST.B;
    if (tg.side === 'right') return { at: [p.x + p.width / 2 + 0.14, fy(Math.max(...vals)) - 0.12], anchor: 'start' };
    if (tg.side === 'above') return { at: [p.x, fy(Math.max(0, ...vals)) + 0.3], anchor: 'middle' };
    const y = fy(Math.min(0, ...vals)) - 0.3;
    return tg.anchor === 'start' ? { at: [p.x - p.width / 2, y], anchor: 'start' } : { at: [p.x, y], anchor: 'middle' };
  };
  const TAGS = SHOCKS.map((S, j) => S.tags.map(tg => tagPlace(S, tg, SHOCK_K[j])).filter(Boolean));
  // the end view: each industry's 2001-25 average (dim outline) and its typical swing, ±1 standard deviation
  // of the yearly average (how cyclical the industry is, not how much its firms differ)
  const CYC = q2.industries.map(ind => {
    const v = [];
    for (let yr = CYCLE_YEARS[0]; yr <= CYCLE_YEARS[1]; yr++) { const x = valueAt(ind.industry, yr); if (x != null) v.push(x); }
    if (v.length < 3) return null;
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    return { m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)) };
  });
  function cycleShapes(o) {
    if (o <= 0.003) return [];
    const out = [], fy = v => ST.A * roaToY(v).y + ST.B, dim = '#D8D8D8';
    V.F.plates.forEach((p, k) => {
      const c = CYC[k];
      if (!c) return;
      const x0 = p.x - p.width / 2, x1 = p.x + p.width / 2, cap = p.width * 0.2, lo = fy(c.m - c.sd), hi = fy(c.m + c.sd);
      out.push(rect([x0, fy(0)], [x1, fy(c.m)], { stroke: dim, w: 0.1, o: 0.6 * o }));
      out.push(line([p.x, lo], [p.x, hi], { color: dim, w: 0.1, o: 0.7 * o }));
      out.push(line([p.x - cap, lo], [p.x + cap, lo], { color: dim, w: 0.1, o: 0.7 * o }));
      out.push(line([p.x - cap, hi], [p.x + cap, hi], { color: dim, w: 0.1, o: 0.7 * o }));
    });
    // key, under the PESTEL strip
    const words = `Average and typical swing, ${CYCLE_YEARS[0]}–${String(CYCLE_YEARS[1]).slice(2)}`, ky = STRIP.y - 0.5;
    const ix = STRIP.x1 - textW(words, 1.45) - 0.45;
    out.push(rect([ix - 0.13, ky - 0.13], [ix + 0.13, ky + 0.1], { stroke: dim, w: 0.1, o: 0.7 * o }));
    out.push(line([ix, ky - 0.2], [ix, ky + 0.2], { color: dim, w: 0.1, o: 0.8 * o }));
    out.push(text(words, [STRIP.x1, ky], { anchor: 'end', size: 1.45, color: PAL.white, o }));
    return out;
  }
  function pestel(c, fadeTags = 1) {
    const out = [];
    LETTERS.forEach((L, i) => {
      let lit = 0, visited = false;
      SHOCKS.forEach((S, j) => { if (S.letter === i) { lit = Math.max(lit, shockAlpha(SHOCK_K[j], c)); if (c != null && c >= SHOCK_K[j] - 0.15) visited = true; } });
      const x = STRIP.x1 - STRIP.dx * (LETTERS.length - 1 - i);
      out.push(text(L, [x, STRIP.y], { size: 2.1, weight: 600, color: visited ? '#7A7A7A' : '#474747' }));
      if (lit > 0) out.push(text(L, [x, STRIP.y], { size: 2.1, weight: 600, color: PAL.white, o: lit, glow: true }));
    });
    SHOCKS.forEach((S, j) => {
      const o = shockAlpha(SHOCK_K[j], c) * fadeTags; // tags step back when the end view arrives
      if (o > 0) for (const tg of TAGS[j]) out.push(text(S.name, tg.at, { anchor: tg.anchor, size: 1.55, color: PAL.white, o }));
    });
    return out;
  }
  let shiftsFrom = null, crossFade = [], shiftsInstant = false, endAt = null;
  const fade = (shapes, f) => shapes.map(s => ({ ...s, o: (s.o ?? 1) * f }));

  return [
    {
      id: 'q2-forces-air',
      enter(instant) {
        const platesUp = (ctx.world.plates.items || []).some(it => it.cur && it.cur.o > 0.05);
        glide = !instant && platesUp;
        setupCross(SRC_FORCES);
        go(ctx, SHOTS.flat, 900, instant);
        // the Airlines plate becomes the drawn bar at once; the other bars dim away
        const keep = V.F.plates.map((p, k) => (k === AIR.k ? undefined : p));
        if (platesUp) ctx.world.plates.set(keep, { duration: 0, body: 0.5 });
        ctx.world.plates.set([], { duration: dur(ctx, 1800), body: 0.5 });
        rangeDone = instant;
        if (instant) ctx.world.setYRange(undefined, undefined, { duration: 0 });
      },
      tick(now) { // once the bars are gone, quietly restore the normal vertical scale
        if (!rangeDone && now - ctx.t0 > 1900) { ctx.world.setYRange(undefined, undefined, { duration: 0 }); rangeDone = true; }
      },
      draw: t => remember('q2-forces-air', crossShapes(airState(t), M)),
    },
    {
      id: 'q2-forces-bev',
      enter(instant) {
        fromAir = !instant && cameFrom() === 'q2-forces-air';
        setupCross(SRC_FORCES);
        go(ctx, SHOTS.flat, 900, instant);
        ctx.world.plates.set([], { duration: dur(ctx, 600) });
        ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
      },
      draw: t => remember('q2-forces-bev', crossShapes(bevState(t), M)),
    },
    {
      id: 'q2-one-force',
      enter(instant) {
        user = null;
        setupCross(SRC_ONE);
        go(ctx, SHOTS.flat, 900, instant);
        ctx.world.plates.set([], { duration: dur(ctx, 600) });
        ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
        captionAt = instant ? -Infinity : performance.now() + (ONE.start + ONE.len + 0.3) * 1000;
        if (instant) ctx.overlay.caption('Even one bad force');
      },
      tick(now) {
        if (now >= captionAt) { ctx.overlay.caption('Even one bad force'); captionAt = Infinity; }
      },
      draw: t => remember('q2-one-force', crossShapes(oneState(t), M)),
      pointer({ type, px, py, at }) {
        if (!at) return false;
        const f = hitForce(at[0], ctx.world.ty(at[1]));
        if (type === 'hover') return f ? 'grab' : false;
        if (type !== 'down') return type === 'drag' || type === 'up';
        if (!f) return false;
        const t = (performance.now() - ctx.t0) / 1000;
        if (!user) user = Object.fromEntries(ORDER.map(g => [g, g === 'buyers' // carry on the scripted move exactly
          ? { from: BEV.s.buyers, to: LEVELS.strong, t0: ONE.start, d: ONE.len } : { from: BEV.s[g], to: BEV.s[g], t0: -1e9, d: ONE.settle }]));
        const cur = strengthAt(f, t);
        user[f] = { from: cur, to: nextLevel(user[f].to), t0: t, d: ONE.settle };
        return true;
      },
    },
    {
      id: 'q2-forces-pick',
      enter(instant) {
        pick = { k: null, at: 0, user: null }; pickBack = null; pickShapes = [];
        go(ctx, SHOTS.flat, 900, instant);
        setupBars();
        // stills: ?beat=q2-forces-pick&export=1&industry=Airlines renders that industry's landed cross
        const want = instant && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('industry') : null;
        const k = want ? q2.industries.findIndex(i => i.industry === want) : -1;
        if (k >= 0 && PM[k]) pickIndustry(k, true);
      },
      draw: () => {
        const out = [];
        if (pickBack) { // the cross fades as the bars come back
          const f = 1 - ramp((performance.now() - pickBack.at) / 1000, 0, 0.6);
          if (f > 0) out.push(...fade(pickBack.shapes, f)); else pickBack = null;
        }
        if (pick.k == null) return remember('q2-forces-pick', out);
        pickShapes = crossShapes(pickState(pickClock()), MP);
        return remember('q2-forces-pick', out.concat(pickShapes));
      },
      labels: () => (pick.k == null ? V.flatLabels() : []),
      pointer({ type, at }) {
        if (!at) return false;
        const x = at[0], y = ctx.world.ty(at[1]);
        if (pick.k == null) { // the bar chart: pick an industry
          const k = barAt(x, y);
          if (type === 'hover') return k != null ? 'pointer' : false;
          if (type !== 'down' || k == null) return false;
          pickIndustry(k, false);
          return true;
        }
        const t = pickClock(), landed = t >= PICK_LANDED, f = hitForce(x, y);
        if (type === 'hover') return (f && landed) || onHeading(x, y) || !f ? 'pointer' : false;
        if (type !== 'down') return type === 'drag' || type === 'up';
        if (f) { if (landed) pickCycle(f, t); return true; } // a force: cycle it once all have landed
        backToBars();                                         // the heading or anywhere else: pick again
        return true;
      },
    },
    {
      id: 'q2-shifts',
      // the clock counts five-year periods (0 = the first); &year=2010 opens the period holding 2010
      timelapse: { from: 0, to: P - 1, secondsPerYear: STEP_S, clickSteps: true, stepFrom: HOLD,
        fromYear: yr => Math.max(0, periodOf(Math.max(PERIODS[0][0], Math.min(Y1, yr)))) },
      enter(instant) {
        const prev = cameFrom();
        shiftsFrom = !instant && prev ? prev : null;
        crossFade = shiftsFrom ? seen.shapes : [];
        shiftsInstant = instant; endAt = null;
        ctx.overlay.reset({ title: TITLES.q2, source: SRC_SHIFTS });
        ctx.overlay.legend(sectorLegend(q2.industries));
        ctx.overlay.axis({ label: 'Return on assets', ticks: SHIFT_TICKS });
        ctx.overlay.year(periodLabel(0));
        ctx.allowOrbit = false;
        ctx.world.setGlow(0.3);
        go(ctx, SHOTS.flat, 900, instant);
        ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
        ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
        ctx.world.setYRange(SHIFT_RANGE[0], SHIFT_RANGE[1], { duration: dur(ctx, 1400) });
        setPlates(platesAt(0), dur(ctx, 1400));
      },
      frame(c) {
        if (c <= 1e-6 && ctx.world.busy()) return; // let the bars arrive first
        setPlates(platesAt(c), 0);
        ctx.overlay.year(shownPeriod(c));
        if (c >= P - 1 - 1e-6) { if (endAt == null) endAt = performance.now(); } else endAt = null;
      },
      draw: t => {
        const f = 1 - ramp(t, 0, 0.6);
        const c = ctx.director ? ctx.director.year() : 0;
        const atEnd = c != null && c >= P - 1 - 1e-6;
        const co = !atEnd ? 0 : shiftsInstant ? 1 : endAt == null ? 0 : ramp((performance.now() - endAt) / 1000, 0.4, 1.0);
        return (f > 0 ? fade(crossFade, f) : []).concat(pestel(c, 1 - co), cycleShapes(co));
      },
      labels: () => V.flatLabels(),
    },
  ];
}

// The cross and its geometry, for other scenes that draw on it (pestel.js: which forces a shift pushes).
export { crossShapes, ORDER as CROSS_ORDER, OUTER as CROSS_OUTER, SIDE as CROSS_SIDE, BOX as CROSS_BOX, CEN as CROSS_CEN,
  RIV as CROSS_RIV };
