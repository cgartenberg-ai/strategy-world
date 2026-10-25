// Shown as Q5: Does management matter? (the activity system keeps the old "why")
//   q6-plants      two factories, Plant A and Plant B, built in three clicks: the plants, the same inputs, then
//                  manufacturing: Plant B's output races to 192 while Plant A's stops at 100 (Syverson)
//   q6-plants-free the extra 92 becomes a ghost of a second factory: almost a second factory, for free
//   q6-inside      inside the factories: 16 management-question lights, lit to scores 0.38 and 0.81 (Bloom et al. 2019)
//   q6-practices   US plants on the management-score scale: a wide spread (Bloom et al. 2019, Table A4); after
//                  q6-inside the two factories shrink into dots and fly to their scores first
//   q6-drivers     the stronger plant's extra output (the gap), lit one click at a time by the share that lines up
//                  with management, R&D, college-educated staff, IT; then all four together (Bloom et al. 2019, Table 4)
//   q6-industries  the 90th vs 10th percentile plant in twelve industries (BLS–Census, 2021); set aside
//                  (module management-industries, 'everything' order only)
//   q6-experiment  randomized management consulting raised plant productivity 17% in a year (Bloom et al. 2013);
//                  set aside (module management-experiment, 'everything' order only)
//   q6-within      one firm's plants scatter on management scores almost as widely as all plants (Bloom et al.)
//   q6-within-big  the same for firms with 150+ plants (65% within)
//   q6-system      Ryanair's four themes and their links (her slide)
//   q6-system-full the full activity system builds, cluster by cluster
//   q6-copy        a rival copies three activities; they sit alone, dim; Ryanair's system pulses as one
//   q6-pull        pull one activity out: its links snap and a ripple runs through the system (click any)

import { TITLES, go, dur } from './common.js';
import { SHOTS } from '../rigmath.js';
import { PAL, text, line, rect, circle, ellipse, poly, light, wrap } from '../concepts/kit.js';
import { dotHistogram, boxesFor, gauge, PLANT_NAMES, openingClocks, feedAt, stepsBegun } from '../concepts/management.js';
import {
  LANES, FACTORY, STREAM, PILE, RACE, RACE_END, BOX, factoryCentre, pileX0, slotCentre, pileTop, drawFactory, ghostFactory,
  inputLights, inputsLabel, outputPile, outputCounter, factoryLabel, scoreLights, SCORE_LIGHTS,
} from '../concepts/managementDraw.js';
import { PRELUDE_SECONDS } from '../concepts/prelude.js';
import { ramp, mix, mixPt, CONCEPT } from '../anim.js';
import { hexToRgb } from '../colors.js';
import {
  layoutSystem, buildSchedule, distances, pullSpot, ovalHit, ellipseClip, plantDraw, plantScore, quantile,
} from '../concepts/activity.js';

const clamp01 = v => Math.max(0, Math.min(1, v));
const hexMix = (h1, h2, f) => {
  const a = hexToRgb(h1), b = hexToRgb(h2), c = a.map((v, i) => Math.round((v + (b[i] - v) * clamp01(f)) * 255));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

// Ryanair colours from her slides
const RY = { hub: '#007DD6', hubEdge: '#3DA2F0', link: '#007DD6', edge: '#4A97F5', text: '#FFFFFF',
  dimEdge: '#4A4A4A', dimText: '#7A7A7A' };
const HL = [null, PAL.pink, PAL.amber, '#C9B6FF']; // ripple colours by distance

const BEND = { 'bridges|fees': 0.62 }; // links that bow to pass under a neighbouring oval
// Glowing line as layered strokes: the SVG glow filter drops perfectly level or upright lines
// (its region comes from a zero-height bounding box), so straight lines glow this way instead.
const neon = (a, b, { color, w, o = 1, halo = 1 }) => [
  line(a, b, { color, w: w * 3.4, o: o * 0.12 * halo }),
  line(a, b, { color, w: w * 1.9, o: o * 0.28 * halo }),
  line(a, b, { color, w, o }),
];
// An empty place: a dashed oval (drawShapes dashes lines only), as short arcs.
function dashedOval([x, y], rx, ry, o, n = 22) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const pts = [];
    for (let j = 0; j <= 4; j++) { const a = ((i + j * 0.14) / n) * 2 * Math.PI; pts.push([x + rx * Math.cos(a), y + ry * Math.sin(a)]); }
    out.push(poly(pts, o));
  }
  return out;
}
// A ripple ring, drawn only where it stays clear of the title and the frame's edges.
function ringBelow(c, r, o, { yMax = 2.95, yMin = -4.0, xMax = 7.9 } = {}) {
  const out = [], n = Math.max(24, Math.round(r * 28));
  let seg = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI, p = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
    if (p[1] < yMax && p[1] > yMin && Math.abs(p[0]) < xMax) seg.push(p);
    else { if (seg.length > 1) out.push(poly(seg, o)); seg = []; }
  }
  if (seg.length > 1) out.push(poly(seg, o));
  return out;
}
const SYSTEM_BEATS = new Set(['q6-system', 'q6-system-full', 'q6-copy', 'q6-pull']);

export function q6Scene(ctx) {
  const C = ctx.data.concepts || {};
  const prod = C.productivity || {};
  const ry = C.ryanair;
  const clock = t => t; // beat clock (seconds since the beat began; huge in export mode)
  const tickT = now => clock((now - ctx.t0) / 1000);
  let prevBeat = null, lastT = 0;

  function setup(id, instant, source, lights = new Map(), ms = 900) {
    ctx.overlay.reset({ title: SYSTEM_BEATS.has(id) ? TITLES.q6why : TITLES.q6, source }); // the activity system is a concept
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
    ctx.world.plates.set([], { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setGlow(0.32, 5.0);
    ctx.world.setTargets(lights, { duration: dur(ctx, ms) });
    ctx.allowOrbit = false;
    go(ctx, SHOTS.flat, 1200, instant);
    const from = prevBeat;
    prevBeat = id;
    return instant ? null : from;
  }

  // ======================= 1. two factories, the same inputs (Syverson) =======================
  // The factories, streams, piles and score lights come from concepts/managementDraw.js; they carry through Q5.
  const SY = prod.syverson || { p10: 100, p90: 192 };
  const syvSource = SY.source_line || '';
  const UNITS = [SY.p10, SY.p90];
  const NAMES = PLANT_NAMES; // Plant A (10th percentile of productivity, same industry) and Plant B (90th)
  const towerAgent = (x, base, h, w, color) => ({ ...light(x, base, { size: 0.001, color, alpha: 0 }),
    tower: h, towerBase: base, towerW: w, towerD: w * 0.6 });
  const Q5 = ['q6-plants', 'q6-plants-free', 'q6-inside', 'q6-practices', 'q6-drivers'];
  const isBack = (id, from) => Q5.indexOf(from) > Q5.indexOf(id); // arriving from a later Q5 move
  const STREAM_LEN = LANES[0].x0 - STREAM.x0;
  // the input lights at race clock `race` (o: overall opacity; tIn: seconds since the inputs were shown, as the
  // streams sweep in from the left). They stand still until manufacturing starts, flow in with the race and stop
  // as the last box leaves.
  const plantsLights = (race, o = 1, tIn = 1e6) => inputLights(LANES, feedAt(race, RACE),
    d => o * ramp(tIn, 0.05 + (d / STREAM_LEN) * 0.7, 0.35));
  const GAP0 = boxesFor(UNITS[0], PILE.perBox);                 // the stronger plant's boxes from here on are its extra output
  // the settled (or racing) picture at race clock `race` (piles and counters). tPlants, tIn: seconds since the
  // plants and the inputs were shown (they fade in). oFac: the factories and their names; oPile: piles and
  // counters; oIn: the inputs label; extra(k): the look of the stronger plant's extra boxes
  function plantsDraw(race, { tPlants = 1e6, tIn = 1e6, oFac = 1, oName = oFac, oPile = 1, oSub = 1, oIn = 1, extra = null } = {}) {
    const out = [], oF = ramp(tPlants, 0, 0.6) * oFac, oL = ramp(tPlants, 0.25, 0.6) * oName;
    LANES.forEach((L, i) => {
      out.push(...drawFactory(factoryCentre(L), 1, oF));
      out.push(...factoryLabel(L, NAMES[i][0], NAMES[i][1], oL, oL * oSub));
      out.push(...outputPile(L, UNITS[i], race, { o: oPile, style: i && extra ? k => (k >= GAP0 ? extra(k) : null) : null }));
      out.push(...outputCounter(L, UNITS[i], race, ramp(race, 1.1, 0.5) * oPile));
    });
    out.push(...inputsLabel(ramp(tIn, 0.3, 0.6) * oIn));
    return out;
  }
  let raceT = 0; // the last race clock q6-plants drew (q6-plants-free finishes a race cut short)
  // q6-plants builds in three clicks (the plants, the inputs, manufacturing): the beat-clock second each began
  const opening = { at: [0, null, null] };

  // ======================= 1b. the extra 92: almost a second factory, for free =======================
  const GHOST = (() => {
    const L = LANES[1], s = 0.92, left = pileX0(L) + Math.ceil(GAP0 / PILE.rows) * PILE.pitch + 0.1;
    return { s, at: [left + (FACTORY.w * s) / 2, L.base + (FACTORY.h * s) / 2] };
  })();
  // g: 0 = the extra boxes, 1 = a ghost factory in their place
  const extraLook = g => () => ({ o: 1 - ramp(g, 0.18, 0.3), stroke: hexMix(BOX.stroke, '#FFFFFF', ramp(g, 0, 0.15)),
    fo: 0.4 + 0.45 * ramp(g, 0, 0.15) });
  function ghostDraw(g, o = 1) {
    if (g <= 0.003 || o <= 0.003) return [];
    const [gx, gy] = GHOST.at;
    return [
      ...ghostFactory(GHOST.at, GHOST.s, 0.8 * o * ramp(g, 0.3, 0.4)),
      text(`+${UNITS[1] - UNITS[0]}`, [gx, gy - 0.05], { size: 4.0, weight: 600, o: o * ramp(g, 0.55, 0.3) }),
      text('Almost a second factory, for free', [gx, (LANES[0].base + pileTop(LANES[1])) / 2],
        { size: 2.8, weight: 500, o: o * ramp(g, 0.72, 0.28) }),
    ];
  }

  // ======================= 2. twelve industries =======================
  const DISP = prod.dispersion || { industries: [] };
  const inds = [...DISP.industries].sort((a, b) => b.p90_p10 - a.p90_p10);
  const IND = { x1: -3.0, x4: 5.25, top: 2.35, gap: 0.62, pitch: 0.452, edge: 6.4 };
  const rX = r => IND.x1 + ((r - 1) / 3) * (IND.x4 - IND.x1);
  const rowY = i => (i === 0 ? IND.top : IND.top - IND.gap - (i - 1) * IND.pitch);
  const fmtX = r => `×${r >= 10 ? Math.round(r) : r.toFixed(1)}`;
  function industriesDraw(t) {
    const out = [], yB = rowY(inds.length - 1) - 0.32, yT = IND.top + 0.3, oA = ramp(t, 0.45, 0.6);
    for (let r = 1; r <= 4; r++) {
      out.push(line([rX(r), yT], [rX(r), yB], { color: r === 1 ? '#5A5A5A' : '#262626', w: r === 1 ? 0.2 : 0.14, o: oA }));
      out.push(text(`×${r}`, [rX(r), yB - 0.28], { size: 1.6, color: '#BDBDBD', o: oA }));
    }
    out.push(text('Most productive plant vs least', [(rX(1) + rX(4)) / 2, yB - 0.66], { size: 1.6, color: '#BDBDBD', o: oA }));
    inds.forEach((d, i) => {
      const y = rowY(i), off = d.p90_p10 > 4;
      const t0 = off ? 1.0 + 11 * 0.12 + 0.35 : 0.9 + (i - 1) * 0.12;
      const g = ramp(t, t0, off ? 1.3 : 1.0, off ? 'inOutSine' : 'inOutCubic');
      const xe = off ? IND.edge : rX(d.p90_p10), x = mix(IND.x1, xe, g);
      out.push(text(d.label, [IND.x1 - 0.42, y], { anchor: 'end', size: 1.55, color: off ? '#FFFFFF' : '#DADADA', o: oA }));
      const bx = rX(4) + 0.42, gap = 0.26; // semiconductors break the scale here
      const segs = off && x > bx ? [[IND.x1, bx], [bx + gap, Math.max(bx + gap, x)]] : [[IND.x1, x]];
      if (g > 0.003) {
        for (const [a, b] of segs) if (b > a) {
          out.push(...neon([a, y], [b, y], { color: PAL.sky, w: 0.62, o: 0.95, halo: 1.2 }));
          out.push(line([a, y], [b, y], { color: '#E6F6FF', w: 0.18, o: 0.8 }));
        }
        out.push(circle([x, y], { r: 0.62, fill: '#FFFFFF', glow: true }));
      }
      out.push(circle([IND.x1, y], { r: 0.42, fill: '#FFFFFF', o: oA }));
      const oV = ramp(t, t0 + (off ? 1.1 : 0.85), 0.5);
      if (off) {
        if (x > bx) for (const sx of [bx, bx + gap]) out.push(line([sx - 0.07, y - 0.2], [sx + 0.07, y + 0.2], { color: '#BDBDBD', w: 0.18 }));
        out.push(text(fmtX(d.p90_p10), [IND.edge + 0.25, y], { anchor: 'start', size: 2.3, weight: 600, o: oV }));
      } else {
        out.push(text(fmtX(d.p90_p10), [xe + 0.2, y], { anchor: 'start', size: 1.3, color: PAL.grey, o: oV }));
      }
    });
    return out;
  }

  // ======================= 3. within the same firm =======================
  const BL = prod.bloom || { groups: [] };
  const grp = name => BL.groups.find(g => g.group === name) || {};
  const ALL = grp('All multi-plant firms'), BIG = grp('150+ plants');
  const wAll = (ALL.within ?? 42) / 100, wBig = (BIG.within ?? 65) / 100;
  const NF = 8, PER = 20, WX = 2.15; // firms, plants per firm, frame units per standard deviation
  const PLANTS = plantDraw({ firms: NF, per: PER, seed: 11 });
  const FIRM_HEX = ['#4A97F5', '#FFC46B', '#64E2ED', '#FF2EA4', '#9BE15D', '#C9B6FF', '#FF8A5C', '#22C28E'];
  const W3 = { top: 2.3, pitch: 0.43, axisY: -1.12, barY: -2.62, barH: 0.54, barX0: -4.6, barX1: 4.6 };
  const rowOf = f => W3.top - (NF - 1 - f) * W3.pitch; // the best-managed firm on top
  function plantPos(p, w, spread) {
    const mx = p.mean * Math.sqrt(1 - w) * WX;
    const tight = [mx + p.dev * 0.15, rowOf(p.firm) + p.jy * 0.13];
    const wide = [plantScore(p, w) * WX, rowOf(p.firm) + p.jy * 0.1];
    return mixPt(tight, wide, spread);
  }
  const fieldRange = w => { const s = PLANTS.map(p => plantScore(p, w) * WX).sort((a, b) => a - b); return [quantile(s, 0.05), quantile(s, 0.95)]; };
  const spreadAt = (t, p) => ramp(t, 1.9 + ((p.i * 7 + p.firm * 3) % 20) * 0.035, 1.5);
  function withinLights(t, w) {
    const m = new Map();
    for (const p of PLANTS) {
      const [x, y] = plantPos(p, w, spreadAt(t, p));
      m.set(CONCEPT.id(300 + p.firm * PER + p.i), light(x, y, { size: 0.062, color: hexToRgb(FIRM_HEX[p.firm]),
        alpha: 0.95 * ramp(t, 0.2 + p.firm * 0.06, 0.6) }));
    }
    return m;
  }
  function withinDraw(t, w, { groupLabel, oBar, approx = false }) {
    const out = [], oA = ramp(t, 0.3, 0.6);
    for (let f = 0; f < NF; f++) out.push(text(`Firm ${String.fromCharCode(65 + NF - 1 - f)}`, [-7.3, rowOf(f)],
      { anchor: 'start', size: 1.3, color: FIRM_HEX[f], o: oA }));
    out.push(line([-6.2, W3.axisY], [6.2, W3.axisY], { color: '#5A5A5A', w: 0.16, o: oA }));
    out.push(text('Management practice score', [0, W3.axisY - 0.32], { size: 1.6, color: '#BDBDBD', o: oA }));
    out.push(text('Worse', [-6.2, W3.axisY - 0.32], { anchor: 'start', size: 1.3, color: PAL.grey, o: oA }));
    out.push(text('Better', [6.2, W3.axisY - 0.32], { anchor: 'end', size: 1.3, color: PAL.grey, o: oA }));
    const [f0, f1] = fieldRange(w), oF = ramp(t, 3.3, 0.6);
    const yb = W3.top + 0.32;
    for (const x of [f0, f1]) out.push(line([x, yb], [x, W3.axisY + 0.12], { color: '#8A8A8A', w: 0.14, dash: [0.6, 0.6], o: oF * 0.7 }));
    out.push(line([f0, yb], [f1, yb], { color: '#8A8A8A', w: 0.16, o: oF }));
    out.push(text('Nine in ten of all plants', [(f0 + f1) / 2, yb + 0.22], { size: 1.4, color: '#BDBDBD', o: oF }));
    // the two-part bar
    const { barX0: a, barX1: b, barY: y, barH: h } = W3, xm = mix(a, b, 1 - w);
    out.push(text(groupLabel, [a, y + h / 2 + 0.3], { anchor: 'start', size: 1.45, color: '#BDBDBD', o: oBar }));
    out.push(rect([a, y - h / 2], [xm - 0.03, y + h / 2], { fill: '#5A5A5A', fo: 0.55, stroke: '#8A8A8A', w: 0.14, o: oBar }));
    out.push(rect([xm + 0.03, y - h / 2], [b, y + h / 2], { fill: PAL.sky, fo: 0.5, stroke: PAL.sky, w: 0.18, o: oBar, glow: true }));
    const pc = v => `${approx ? '~' : ''}${Math.round(v * 100)}%`;
    out.push(text(`Between firms ${pc(1 - w)}`, [(a + xm) / 2, y], { size: 1.6, weight: 600, o: oBar }));
    out.push(text(`Within firms ${pc(w)}`, [(xm + b) / 2, y], { size: 1.6, weight: 600, o: oBar }));
    return out;
  }
  const bloomSource = `${BL.source_line || 'Source: Bloom et al. (2019).'} Plant positions illustrative; shares from Bloom et al.`;

  // ======================= 3a. management practices differ widely between plants (Bloom et al. 2019) =======================
  const BB = prod.bloom_between || null;
  const MS = BB ? BB.scores : { p10: 0.379, p25: 0.521, p50: 0.648, p75: 0.742, p90: 0.806 };
  const NPR = 420, BIN = 0.025, AX = { x0: -6.0, x1: 6.0, y: -1.7, pitch: 0.135 };
  const DOTS = dotHistogram(NPR, MS, { bin: BIN });
  const sx = v => AX.x0 + v * (AX.x1 - AX.x0);
  const dotAt = d => [sx((d.bin + 0.5) * BIN), AX.y + 0.17 + d.k * AX.pitch];
  const dotT = d => 0.5 + d.bin * 0.035 + d.k * 0.012; // columns rise left to right
  function practicesLights(t) {
    const m = new Map();
    DOTS.forEach((d, j) => {
      const g = ramp(t, dotT(d), 0.55), [x, y] = dotAt(d);
      m.set(CONCEPT.id(600 + j), light(x, mix(AX.y, y, g), { size: 0.052, color: hexToRgb(PAL.sky), alpha: 0.92 * g }));
    });
    return m;
  }
  const ratio = MS.p90 / MS.p10;
  function practicesDraw(t, lead = 0) { // lead: the crowd, marks and shares start later (after the two factories land)
    const out = [], oA = ramp(t, 0.2, 0.6), oM = ramp(t - lead, 2.6, 0.6), oT = ramp(t - lead, 3.4, 0.6);
    out.push(line([AX.x0, AX.y], [AX.x1, AX.y], { color: '#6A6A6A', w: 0.16, o: oA }));
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      out.push(line([sx(v), AX.y], [sx(v), AX.y - 0.1], { color: '#6A6A6A', w: 0.12, o: oA }));
      out.push(text(v === 0 || v === 1 ? String(v) : v.toFixed(2), [sx(v), AX.y - 0.36], { size: 2.0, color: PAL.white, o: oA }));
    }
    // the 10th and 90th percentile plants, and how far apart they are (bracket under the axis)
    const yl = AX.y - 0.85, ylab = AX.y - 1.2, x10 = sx(MS.p10), x90 = sx(MS.p90);
    for (const [x, lab, v] of [[x10, '10th percentile', MS.p10], [x90, '90th percentile', MS.p90]]) {
      out.push(line([x, AX.y - 0.45], [x, yl], { color: PAL.amber, w: 0.12, o: oM }));
      out.push(text(`${lab}  ${v.toFixed(2)}`, [x, ylab], { size: 2.0, color: PAL.amber, o: oM }));
    }
    out.push(...neon([x10, yl], [x90, yl], { color: PAL.amber, w: 0.14, o: oM, halo: 0.8 }));
    out.push(text(`×${ratio.toFixed(1)}`, [(x10 + x90) / 2, ylab - 0.05], { size: 3.0, weight: 600, color: PAL.amber, o: oM }));
    // the published shares below 0.5 and at 0.75 or above
    const yTop = AX.y + 0.17 + 30 * AX.pitch;
    for (const [v, lab, an, dx] of [[0.5, `${Math.round((BB ? BB.below_half : 0.27) * 100)}% below 0.5`, 'end', -0.15],
      [0.75, `${Math.round((BB ? BB.at_least_075 : 0.18) * 100)}% at 0.75 or above`, 'start', 0.15]]) {
      out.push(line([sx(v), AX.y + 0.05], [sx(v), yTop], { color: '#8A8A8A', w: 0.1, dash: [0.5, 0.6], o: oT * 0.8 }));
      out.push(text(lab, [sx(v) + dx, yTop - 0.05], { anchor: an, size: 2.0, color: PAL.white, o: oT }));
    }
    return out;
  }
  const practicesSource = `${BB ? BB.source_line : 'Source: Bloom et al. (2019), American Economic Review.'} `
    + 'Dots follow the published percentiles (online appendix Table A4); shares below 0.5 and at 0.75+ are for 2010 plants (p.1653).';

  // the callout: what the score measures (Bloom et al. 2019, pp.1652-53). Click the chip to open it; click anywhere to close.
  const MQ = { x: 5.4, y: 2.9, w: 2.4, h: 0.5 };
  const AREAS = [
    { name: 'Monitoring', what: 'Tracking performance and using it to improve',
      ask: '“How often were performance indicators tracked?”' },
    { name: 'Targets', what: 'Setting realistic, linked production targets',
      ask: '“What was the time frame of production targets?”' },
    { name: 'Incentives', what: 'Rewarding, promoting and removing people on performance',
      ask: '“How were managers promoted?”' },
  ];
  let mOpen = false, mAt = -1e9;
  const mLevel = () => { const s = (performance.now() - mAt) / 1000; return mOpen ? ramp(s, 0, 0.35) : 1 - ramp(s, 0, 0.3); };
  const onChip = (x, y) => Math.abs(x - MQ.x) <= MQ.w / 2 && Math.abs(y - MQ.y) <= MQ.h / 2;
  function measuredDraw(t) {
    const out = [], oc = ramp(t, 0.4, 0.6), z = mLevel();
    out.push(rect([MQ.x - MQ.w / 2, MQ.y - MQ.h / 2], [MQ.x + MQ.w / 2, MQ.y + MQ.h / 2],
      { stroke: PAL.amber, w: 0.14, r: 0.9, fill: '#000', fo: 0.7, o: oc, glow: true }));
    out.push(text(mOpen ? 'Close' : 'What is measured?', [MQ.x, MQ.y], { size: 1.9, weight: 500, color: PAL.amber, o: oc }));
    if (z <= 0.003) return out;
    const P = { x0: -6.35, x1: 6.35, y0: -3.35, y1: 2.66 }, col = (P.x1 - P.x0 - 1.0) / 3; // covers the whole chart
    out.push(rect([P.x0, P.y0], [P.x1, P.y1], { fill: '#000', fo: 1, stroke: '#3A3A3A', w: 0.12, r: 0.6, o: z }));
    out.push(text('Management practice score', [P.x0 + 0.5, P.y1 - 0.8], { anchor: 'start', size: 3.8, weight: 500, o: z }));
    out.push(text('16 questions to plant managers, scored 0 to 1',
      [P.x0 + 0.5, P.y1 - 1.6], { anchor: 'start', size: 2.6, color: PAL.white, o: z }));
    AREAS.forEach((a, i) => {
      const x = P.x0 + 0.5 + i * col, y = P.y1 - 2.7;
      out.push(text(a.name, [x, y], { anchor: 'start', size: 3.6, weight: 600, color: PAL.sky, o: z }));
      out.push(text(wrap(a.what, 22), [x, y - 0.9], { anchor: 'start', size: 2.7, color: PAL.white, o: z }));
      out.push(text(wrap(a.ask, 26), [x, y - 2.15], { anchor: 'start', size: 2.4, color: PAL.white, italic: true, o: z }));
    });
    return out;
  }

  // ======================= 3b. inside the factories: 16 questions, one management score (Bloom et al. 2019) =======================
  const SCORES = [MS.p10, MS.p90];                    // the 10th- and 90th-percentile scores, for plants like these
  const INSIDE = { fillAt: 1.1, fillDur: 1.6 };
  const insideSource = 'Source: Bloom et al. (2019), American Economic Review; Census MOPS. Scores: the 10th and 90th percentiles '
    + '(online appendix Table A4); questions by area from Table A2; each area lit to the overall score.';
  const scoreX = L => L.x0 + FACTORY.w + 0.55;
  // the score lights, the scores beside the factories and the one line; tt: the move's clock
  function insideInner(tt, o = 1) {
    if (o <= 0.003) return [];
    const out = [], fill = ramp(tt, INSIDE.fillAt, INSIDE.fillDur, 'inOutSine'), oS = ramp(tt, 0.6, 0.5) * o;
    LANES.forEach((L, i) => {
      out.push(...scoreLights(L, SCORES[i], fill, oS));
      out.push(text('Management score', [scoreX(L), L.base + 1.14], { anchor: 'start', size: 2.4, o: oS }));
      out.push(text((SCORES[i] * fill).toFixed(2), [scoreX(L), L.base + 0.42],
        { anchor: 'start', size: 5.4, weight: 600, color: PAL.amber, o: oS }));
    });
    out.push(text('Plants like these, scored on 16 management questions', [scoreX(LANES[0]), (LANES[0].base + pileTop(LANES[1])) / 2],
      { anchor: 'start', size: 2.4, o: ramp(tt, 2.5, 0.6) * o }));
    return out;
  }
  // oOut: what is left of q6-plants-free (piles, counters, inputs label, and its ghost when ghost = true)
  function insideDraw(tt, { oFac = 1, oName = oFac, oInner = 1, oOut = 0, ghost = false } = {}) {
    const out = [];
    LANES.forEach((L, i) => {
      out.push(...drawFactory(factoryCentre(L), 1, oFac));
      out.push(...factoryLabel(L, NAMES[i][0], NAMES[i][1], oName, oName * oOut, mix(SCORE_LIGHTS.nameY, 1.0, oOut)));
      if (oOut > 0.003) {
        out.push(...outputPile(L, UNITS[i], 1e6, { o: oOut, style: i && ghost ? k => (k >= GAP0 ? { o: 0 } : null) : null }));
        out.push(...outputCounter(L, UNITS[i], 1e6, oOut));
      }
    });
    if (oOut > 0.003) out.push(...inputsLabel(oOut), ...(ghost ? ghostDraw(1, oOut) : []));
    return out.concat(insideInner(tt, oInner));
  }
  const inside = { back: false, ghost: false, flyBack: false };

  // ======================= 3c. the factories become two dots on the score line (q6-inside to q6-practices) =======================
  const FLY = { at: 0.15, dur: 1.3 };
  const plantDot = i => [sx(SCORES[i]), AX.y];
  const DOT_IDS = [CONCEPT.id(1300), CONCEPT.id(1301)];
  const plantDots = a => new Map(DOT_IDS.map((id, i) => [id, light(...plantDot(i), { size: 0.1, color: hexToRgb(PAL.amber), alpha: a })]));
  const flyE = c => clamp01((c - FLY.at) / FLY.dur);                   // 0 = in their lanes, 1 = at their scores
  const dotAlpha = e => ramp(e, 0.72, 0.25);
  function flyShapes(e) {
    const out = [], k = ramp(e, 0, 1);
    LANES.forEach((L, i) => out.push(...drawFactory(mixPt(factoryCentre(L), plantDot(i), k), mix(1, 0.06, k), 1 - ramp(e, 0.82, 0.16))));
    return out;
  }
  const everyDot = (c, lead) => text('Every dot is a plant', [5.3, 0.9],
    { size: 2.8, weight: 500, o: ramp(c, lead + 0.2, 0.5) * (1 - ramp(c, lead + 2.9, 0.5)) });
  const prac = { fly: false, back: false, dots: false, lead: 0 };
  const pracLights = t => {
    const m = practicesLights(t - prac.lead);
    if (prac.dots) for (const [id, a] of plantDots(prac.fly ? dotAlpha(flyE(t)) : 1)) m.set(id, a);
    return m;
  };

  // ======================= 3d. the gap, lit: what lines up with the stronger plant's extra output (Bloom et al. 2019, Table 4) =======================
  const DRV = BB ? BB.drivers : [{ key: 'management', label: 'Management', share: 0.216 }, { key: 'rd', label: 'R&D', share: 0.216 },
    { key: 'skills', label: 'College-educated staff', share: 0.159 }, { key: 'ict', label: 'IT', share: 0.12 }];
  const ALL4 = BB ? BB.drivers_all : 0.441;
  const pct = v => `${Math.round(v * 100)}%`;
  const GAP_N = boxesFor(UNITS[1], PILE.perBox) - GAP0;              // the stronger plant's extra boxes
  const GAP_STATES = [                                                // one click each, never stacked: they overlap
    ...DRV.map(d => ({ share: d.share, color: d.key === 'management' ? PAL.amber : PAL.blue, label: `${d.label} ${pct(d.share)}` })),
    { share: ALL4, color: '#FFFFFF', label: `All four together: ${pct(ALL4)}`, all: true },
  ];
  const GAP_X = [pileX0(LANES[1]) + Math.floor(GAP0 / PILE.rows) * PILE.pitch,
    pileX0(LANES[1]) + Math.ceil((GAP0 + GAP_N) / PILE.rows) * PILE.pitch];
  // y: the click clock, 0 = the gap, 1-4 = one factor each, 5 = all four together (the rest stays dark)
  const gapLook = y => () => { const d = clamp01(y); return { stroke: hexMix(BOX.stroke, '#4A4A4A', d), fo: BOX.fo * (1 - d), glow: d < 0.5 }; };
  function gapDraw(y, o = 1) {
    if (o <= 0.003) return [];
    const out = [], L = LANES[1], hb = PILE.box / 2, [g0, g1] = GAP_X, by = pileTop(L) + 0.2, lx = g0 + 0.08; // labels start at the gap
    out.push(line([g0, pileTop(LANES[0]) + 0.1], [g0, L.base - 0.1], { color: '#FFFFFF', w: 0.12, dash: [0.45, 0.45], o: 0.75 * o }));
    out.push(poly([[g0 + 0.04, by - 0.14], [g0 + 0.04, by], [g1 - 0.04, by], [g1 - 0.04, by - 0.14]], { stroke: '#FFFFFF', w: 0.16, o }));
    out.push(text('The gap', [lx, by + 0.32], { anchor: 'start', size: 2.8, weight: 500, o: o * (1 - ramp(y, 0, 0.6)) }));
    // the header in two short lines, right-aligned in the open space under the 100 (clear of both piles)
    const oH = o * ramp(y, 0.2, 0.6);
    out.push(text('In plants like these,', [7.55, by + 1.22], { anchor: 'end', size: 2.6, o: oH }));
    out.push(text('what lines up with the gap', [7.55, by + 0.84], { anchor: 'end', size: 2.6, o: oH }));
    GAP_STATES.forEach((st, si) => {
      const lv = clamp01(1 - Math.abs(y - (si + 1))) * o;
      if (lv <= 0.003) return;
      gauge(st.share, GAP_N).forEach((v, b) => {
        if (v <= 0.003) return;
        const [cx, cy] = slotCentre(L, GAP0 + b);
        out.push(rect([cx - hb, cy - hb], [cx + hb, cy - hb + PILE.box * v], { fill: st.color, fo: 0.85, stroke: st.color, w: 0.12, r: 0.08, o: lv, glow: true }));
      });
      out.push(text(st.label, [lx, by + 0.34], { anchor: 'start', size: 3.0, weight: 600, color: st.color, o: lv }));
      if (st.all) {
        const d0 = pileX0(L) + (Math.floor(GAP0 / PILE.rows) + Math.floor((st.share * GAP_N) / PILE.rows)) * PILE.pitch;
        out.push(text('Still unexplained', [(d0 + g1) / 2 + 0.2, L.base - 0.4], { size: 2.4, o: lv }));
      }
    });
    return out;
  }
  const drv = { fly: false, fade: false, y: 0 };
  const drvPileO = c => ramp(c, FLY.at + FLY.dur - 0.1, 0.6);
  function driversDraw(c) {
    const landed = !drv.fly || c >= FLY.at + FLY.dur, oFac = drv.fade ? ramp(c, 0, 0.5) : 1;
    const oPile = drv.fly ? drvPileO(c) : oFac, out = [];
    if (!landed) out.push(...flyShapes(1 - flyE(c)));
    out.push(...plantsDraw(1e6, { oFac: landed ? oFac : 0, oName: drv.fly ? oPile : oFac, oPile, oIn: oPile, extra: gapLook(drv.y) }));
    return out.concat(gapDraw(drv.y, oPile));
  }
  const driversSource = BB ? BB.drivers_source_line : 'Source: Bloom et al. (2019), American Economic Review, Table 4; associations, not causal effects.';

  // ======================= 3c. the experiment: management consulting assigned at random (Bloom et al. 2013) =======================
  const EXP = BB ? BB.experiment : { effect: 0.17, plants: 28, firms: 17 };
  const EX = { base: -1.6, xs: [-2.0, 2.0], w: 1.7, hMax: 3.5 };
  const EK = EX.hMax / (100 * (1 + EXP.effect));
  const expGrowth = t => { // both rise together to 100; then the treated plants keep going
    const a = 100 * ramp(t, 0.6, 1.4), b = 100 * (1 + EXP.effect * ramp(t, 2.3, 1.1));
    return [a, Math.min(a, 100) + (a >= 100 - 1e-6 ? b - 100 : 0)];
  };
  function expLights(t) {
    const m = new Map(), hs = expGrowth(t);
    EX.xs.forEach((x, i) => m.set(CONCEPT.id(1100 + i), towerAgent(x, EX.base, hs[i] * EK > 2e-3 ? hs[i] * EK : 0, EX.w,
      i ? hexToRgb(PAL.amber) : [0.55, 0.62, 0.7])));
    return m;
  }
  function expDraw(t) {
    const out = [], hs = expGrowth(t), oA = ramp(t, 0.2, 0.6), oL = ramp(t, 3.3, 0.6);
    out.push(text('Productivity a year later (control plants = 100)', [0, EX.base + EX.hMax + 0.95], { size: 1.55, color: '#BDBDBD', o: oA }));
    EX.xs.forEach((x, i) => {
      const h = hs[i] * EK, x0 = x - EX.w / 2, x1 = x + EX.w / 2, top = EX.base + h, col = i ? PAL.amber : '#9AA5B1';
      out.push(line([x0 - 0.35, EX.base], [x1 + 0.35, EX.base], { color: PAL.grey, w: 0.18, o: oA }));
      if (h > 0.02) {
        out.push(rect([x0, EX.base], [x1, top], { stroke: col, w: 0.2, o: 0.9, glow: true }));
        out.push(...neon([x0, top], [x1, top], { color: i ? '#FFE3B0' : '#DDE3EA', w: 0.45 }));
      }
      if (h > 0.12) out.push(text(String(Math.round(hs[i])), [x, top + 0.3], { size: 2.4, weight: 600, color: i ? PAL.amber : '#FFFFFF' }));
      out.push(text(i ? 'Given management consulting' : 'Control plants', [x, EX.base - 0.35], { size: 1.75, o: oA }));
    });
    out.push(text(`+${Math.round(EXP.effect * 100)}%`, [EX.xs[1] + EX.w / 2 + 0.35, EX.base + EX.hMax * 0.92],
      { anchor: 'start', size: 3.4, weight: 600, color: PAL.amber, o: oL }));
    out.push(text('Assigned at random', [0, EX.base - 1.05], { size: 1.5, color: '#9A9A9A', o: oL }));
    return out;
  }
  const expSource = BB ? BB.experiment_source_line : 'Source: Bloom, Eifert, Mahajan, McKenzie and Roberts (2013), Quarterly Journal of Economics.';

  // ======================= 4–6. Ryanair's activity system =======================
  const L = ry ? layoutSystem(ry) : null;
  const S = L ? buildSchedule(L, ry.build, { start: 0.7 }) : null;
  const HUB_END = S ? S.stageAt.frills ?? 3 : 3; // when the hubs and their links are done
  const sys = { dx: 0 };
  const sysSource = 'Activity system after the failed launch; from course slides.';
  const COPIED = ['single', 'meals', 'fleet'];
  const RIVAL = { x: 5.4, ys: [1.3, 0.05, -1.2], label: 2.25 };
  const COPY_DX = -2.2;

  // One frame of the system. st: {dx, nodeO(id), linkF(k), pos(id) override, hl(id)->{c,k},
  // pulse(id)->0..1, dim(id) bool, stubs:[], under:[], over:[]}
  function systemShapes(st) {
    const out = [...(st.under || [])];
    const P = id => (st.pos && st.pos(id)) || [L.byId.get(id).x + st.dx, L.byId.get(id).y];
    L.links.forEach((l, k) => {
      const f = st.linkF(k);
      if (f <= 0.001) return;
      const style = st.linkStyle ? st.linkStyle(k, l) : null;
      const first = style?.from ?? ((S.nodeAt.get(l.a) ?? 0) <= (S.nodeAt.get(l.b) ?? 0) ? l.a : l.b);
      const other = first === l.a ? l.b : l.a;
      const A = P(first), B = P(other), E = mixPt(A, B, f);
      const pu = st.pulse ? Math.max(st.pulse(l.a), st.pulse(l.b)) : 0;
      const col = style?.color || hexMix(RY.link, '#7CC4FF', pu);
      const w = (l.hub ? 0.85 : 0.46) * (style?.w ?? 1) * (1 + 0.5 * pu), o = style?.o ?? 1;
      const bend = BEND[`${l.a}|${l.b}`] ?? BEND[`${l.b}|${l.a}`];
      if (bend) { // routed under a neighbour, as on her slide
        const Cp = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - bend], pts = [];
        for (let i = 0; i <= 20; i++) {
          const u = (i / 20) * f;
          pts.push([(1 - u) ** 2 * A[0] + 2 * (1 - u) * u * Cp[0] + u * u * B[0], (1 - u) ** 2 * A[1] + 2 * (1 - u) * u * Cp[1] + u * u * B[1]]);
        }
        out.push(poly(pts, { stroke: col, w, o, glow: true }));
      } else out.push(...neon(A, E, { color: col, w, o }));
    });
    out.push(...(st.stubs || []));
    const order = st.under_ ? [...L.nodes].sort((a, b) => st.under_(b.id) - st.under_(a.id)) : L.nodes;
    for (const n of order) {
      const o = st.nodeO(n.id);
      if (o <= 0.003) continue;
      const [x, y] = P(n.id), s = st.scale ? st.scale(n.id) : 1;
      const rx = n.rx * s, ry2 = n.ry * s, h = st.hl ? st.hl(n.id) : null, pu = st.pulse ? st.pulse(n.id) : 0;
      const dim = st.dim && st.dim(n.id);
      if (h && (h.halo ?? h.k) > 0.01) out.push(ellipse([x, y], rx + 0.13, ry2 + 0.13, { fill: h.c, fo: 0.28, o: o * (h.halo ?? h.k), glow: true }));
      if (n.hub) {
        out.push(ellipse([x, y], rx + 0.1 + 0.06 * pu, ry2 + 0.1 + 0.06 * pu, { fill: RY.hub, fo: 0.22 + 0.25 * pu, o, glow: true }));
        const hEdge = h && h.k > 0.01 ? hexMix(RY.hubEdge, h.c, Math.min(1, h.k * 2)) : hexMix(RY.hubEdge, '#BFE4FF', pu);
        out.push(ellipse([x, y], rx, ry2, { fill: dim ? '#0B2740' : RY.hub, stroke: dim ? RY.dimEdge : hEdge, w: 0.25 + (h ? 0.25 * h.k : 0), o, glow: !dim }));
        out.push(text(n.text, [x, y], { size: n.size, weight: 700, color: dim ? RY.dimText : RY.text, o }));
      } else {
        const edge = dim ? RY.dimEdge : h && h.k > 0.01 ? hexMix(RY.edge, h.c, Math.min(1, h.k * 2)) : hexMix(RY.edge, '#BFE4FF', pu);
        out.push(ellipse([x, y], rx, ry2, { fill: '#000', fo: 1, stroke: edge, w: 0.3 + 0.25 * pu + (h ? 0.2 * h.k : 0), o, glow: !dim }));
        out.push(text(n.text, [x, y], { size: n.size, color: dim ? RY.dimText : RY.text, o }));
      }
    }
    out.push(...(st.over || []));
    return out;
  }
  const appear = (t, at) => ramp(t, at, 0.45);
  const flashRing = (n, x, y, t, at, color = PAL.sky) => {
    const u = (t - at) / 0.9;
    if (u <= 0 || u >= 1) return null;
    return ellipse([x, y], n.rx + 0.45 * u, n.ry + 0.45 * u, { stroke: color, w: 0.35, o: 0.8 * (1 - u), glow: true });
  };
  const ryanairLabel = o => text('Ryanair', [-7.3, 2.5], { anchor: 'start', size: 2.2, weight: 600, color: PAL.sky, o });
  const EXPORT_T = 1e5; // export mode runs the beat clock from far in the past: hold the living effects at rest
  const breathe = t => (t > EXPORT_T ? 0.09 : 0.18 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 3.6)));

  // q6-system: the four themes and their six links. Coming back from the full map (back = true),
  // the themes stay put and everything else fades away.
  function hubsDraw(t, back, dx0) {
    const over = [], dx = mix(dx0, 0, ramp(t, 0, 1.0)), tt = back ? 1e6 : t;
    sys.dx = dx;
    if (!back) for (const n of L.nodes.filter(m => m.hub)) { const r = flashRing(n, n.x, n.y, t, S.nodeAt.get(n.id)); if (r) over.push(r); }
    const satO = back ? 1 - ramp(t, 0, 0.7) : 0;
    return [ryanairLabel(back ? 1 : ramp(t, 0.2, 0.6)), ...systemShapes({
      dx, over,
      nodeO: id => (L.byId.get(id).hub ? appear(tt, S.nodeAt.get(id)) : satO),
      linkF: k => (L.links[k].hub ? ramp(tt, S.linkAt[k], S.linkDur) : satO > 0.003 ? 1 : 0),
      linkStyle: k => (L.links[k].hub ? null : { o: satO }),
      scale: id => (L.byId.get(id).hub ? 0.8 + 0.2 * ramp(tt, S.nodeAt.get(id), 0.6, 'outQuart') : 1),
      pulse: id => (L.byId.get(id).hub ? breathe(t) : 0),
    })];
  }

  // q6-system-full: the clusters build in her order (or, coming back from later beats, it is already built)
  function fullDraw(t, skip, dx0) {
    const tt = skip ? 1e6 : t + HUB_END - 0.35, dx = mix(dx0, 0, ramp(t, 0, 1.0));
    sys.dx = dx;
    const over = [];
    if (!skip) for (const n of L.nodes) { if (n.hub) continue; const r = flashRing(n, n.x, n.y, tt, S.nodeAt.get(n.id)); if (r) over.push(r); }
    return [ryanairLabel(1), ...systemShapes({
      dx, over,
      nodeO: id => appear(tt, S.nodeAt.get(id)),
      linkF: k => ramp(tt, S.linkAt[k], S.linkDur, 'inOutSine'),
      scale: id => 0.8 + 0.2 * ramp(tt, S.nodeAt.get(id), 0.6, 'outQuart'),
      pulse: id => (L.byId.get(id).hub ? breathe(t) : 0),
    })];
  }

  // a heartbeat that runs out from the four themes through every link
  const HUBD = (() => {
    if (!L) return new Map();
    const d = new Map(); L.nodes.filter(n => n.hub).forEach(n => d.set(n.id, 0));
    let fr = [...d.keys()];
    while (fr.length) { const nx = []; for (const id of fr) for (const m of L.adj.get(id)) if (!d.has(m)) { d.set(m, d.get(id) + 1); nx.push(m); } fr = nx; }
    return d;
  })();
  const heartbeat = (t, t0, id, period = 2.6) => {
    const tau = t - t0 - (HUBD.get(id) || 0) * 0.28;
    if (tau < 0 || t > EXPORT_T) return 0;
    const u = tau % period;
    return Math.exp(-(u * u) / 0.05) + Math.exp(-((u - period) ** 2) / 0.05);
  };

  function copyDraw(t, dx0) {
    const dx = mix(dx0, COPY_DX, ramp(t, 0, 1.2));
    sys.dx = dx;
    const tc = 1.6; // copies are made
    const over = [];
    COPIED.forEach((id, i) => {
      const n = L.byId.get(id), home = [n.x + dx, n.y], dest = [RIVAL.x, RIVAL.ys[i]];
      const f = ramp(t, tc + i * 0.25, 1.7);
      if (t < tc + i * 0.25) return;
      const mid = [(home[0] + dest[0]) / 2, Math.max(home[1], dest[1]) + 0.9];
      const q = f, p = [ (1 - q) ** 2 * home[0] + 2 * (1 - q) * q * mid[0] + q * q * dest[0], (1 - q) ** 2 * home[1] + 2 * (1 - q) * q * mid[1] + q * q * dest[1] ];
      const fade = ramp(t, tc + i * 0.25 + 0.3, 1.3), edge = hexMix(PAL.amber, '#6A6A6A', fade);
      const fr = flashRing(n, home[0], home[1], t, tc + i * 0.25, PAL.amber); if (fr) over.push(fr);
      over.push(ellipse(p, n.rx, n.ry, { fill: '#000', fo: f < 1 ? 0.55 : 1, stroke: edge, w: 0.3 }));
      over.push(text(n.text, p, { size: n.size, color: hexMix('#FFFFFF', '#A8A8A8', fade) }));
    });
    over.push(text('Rival', [RIVAL.x, RIVAL.label], { size: 2.2, weight: 600, color: PAL.grey, o: ramp(t, tc + 0.8, 0.6) }));
    const t0 = tc + 2.6;
    return [ryanairLabel(1), ...systemShapes({
      dx, over,
      nodeO: () => 1, linkF: () => 1,
      pulse: id => (t > t0 ? heartbeat(t, t0, id) : 0) * 0.9,
    })];
  }

  // pulling an activity out
  const PULL = { move: 1.2, snap: 0.78, back: 0.9 };
  let pull = null, backs = [];
  const DEFAULT_PULL = 'turn';
  const pulledAmount = (e, t) => ramp(t, e.at, PULL.move);
  function nodeOffset(id, t) { // 0 = home, 1 = at its pulled-out spot
    if (pull && pull.id === id) return pulledAmount(pull, t);
    const b = backs.find(e => e.id === id);
    if (b) return pulledAmount(b, b.rAt) * (1 - ramp(t, b.rAt, PULL.back));
    return 0;
  }
  function pullDraw(t, dx0) {
    const dx = mix(dx0, 0, ramp(t, 0, 1.0));
    sys.dx = dx;
    backs = backs.filter(b => t - b.rAt < 3);
    const events = [...(pull ? [{ ...pull, rAt: Infinity }] : []), ...backs];
    const pos = id => {
      const n = L.byId.get(id), home = [n.x + dx, n.y], f = nodeOffset(id, t);
      if (f <= 0) return home;
      const sp = pullSpot(L, id); sp[0] += dx;
      return mixPt(home, sp, f);
    };
    // ripple highlights and link states from each pulled (or returning) activity
    const hl = new Map(), linkStyle = new Map(), stubs = [], under = [], over = [];
    for (const e of events) {
      const fade = e.rAt === Infinity ? 1 : 1 - ramp(t, e.rAt, 0.7);
      const tS = e.at + PULL.snap, d = distances(L, e.id), n = L.byId.get(e.id);
      for (const [id, k] of d) {
        if (!k) continue;
        const tf = tS + 0.15 + (k - 1) * 0.5;
        if (t < tf) continue;
        const resid = k === 1 ? 1 : k === 2 ? 0.6 : 0;
        const u = t - tf, flash = u < 0.18 ? u / 0.18 : Math.exp(-(u - 0.18) / 0.45);
        const level = (u < 0.18 ? flash : resid + (1 - resid) * flash) * fade;
        const halo = (k === 1 ? level : (u < 0.18 ? flash : (1 - resid) * flash) * fade);
        const c = HL[Math.min(k, 3)], cur = hl.get(id);
        if (!cur || cur.k < level) hl.set(id, { c, k: level, halo });
      }
      const home = [n.x + dx, n.y];
      if (fade > 0 && t > e.at + 0.3) under.push(...dashedOval(home, n.rx, n.ry, { stroke: '#7A7A7A', w: 0.22, o: fade * ramp(t, e.at + 0.3, 0.4) }));
      for (let r = 0; r < 2; r++) { // the ripple
        const u = (t - tS - r * 0.35) / 2.6;
        if (u > 0 && u < 1) over.push(...ringBelow(home, 0.3 + 4.9 * Math.sqrt(u), { stroke: PAL.pink, w: 0.35, o: 0.6 * (1 - u) ** 1.5 * fade, glow: true }));
      }
      L.links.forEach((l, k) => {
        if (l.a !== e.id && l.b !== e.id) return;
        const other = l.a === e.id ? l.b : l.a, Pm = pos(e.id), Q = pos(other);
        const back = e.rAt !== Infinity, tb = back ? t - e.rAt : -1;
        if (back && tb > PULL.back * 0.6) { // reconnect
          const g = ramp(tb, PULL.back * 0.6, 0.45);
          linkStyle.set(k, { grow: g, from: other });
          return;
        }
        if (t < tS) { // stretching
          const stretch = Math.hypot(Pm[0] - Q[0], Pm[1] - Q[1]) / Math.max(0.5, Math.hypot(n.x + dx - Q[0], n.y - Q[1]));
          const tens = clamp01((stretch - 1) / 1.2);
          linkStyle.set(k, { color: hexMix(RY.link, PAL.pink, tens), w: 1 - 0.45 * tens });
          return;
        }
        linkStyle.set(k, { hide: true }); // snapped: short stubs remain at both ends
        const len = mix(1.2, 0.22, ramp(t, tS, 0.4, 'outQuart')) * (back ? 1 - ramp(tb, 0, PULL.back * 0.6) : 1);
        if (len > 0.01) for (const [A, B, nd] of [[Q, Pm, L.byId.get(other)], [Pm, Q, n]]) {
          const ox = { ...nd, x: A[0], y: A[1] }, edgeP = ellipseClip(ox, B), dd = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
          const end = [edgeP[0] + ((B[0] - A[0]) / dd) * len, edgeP[1] + ((B[1] - A[1]) / dd) * len];
          stubs.push(...neon(A, end, { color: PAL.pink, w: 0.42, o: 0.85 }));
        }
        if (t - tS < 0.5) { const m = mixPt(Pm, Q, 0.5); over.push(circle(m, { r: 1.2 + 3 * (t - tS), stroke: PAL.pink, w: 0.3, o: 1 - (t - tS) / 0.5, glow: true })); }
      });
    }
    lastPos = new Map(L.nodes.map(n => { const p = pos(n.id); return [n.id, { ...n, x: p[0], y: p[1] }]; }));
    return [ryanairLabel(1), ...systemShapes({
      dx, under, over, stubs,
      pos,
      nodeO: () => 1,
      linkF: k => { const s = linkStyle.get(k); return s?.hide ? 0 : s?.grow != null ? s.grow : 1; },
      linkStyle: k => linkStyle.get(k) || null,
      hl: id => hl.get(id) || null,
      dim: id => nodeOffset(id, t) > 0.5,
      under_: id => (nodeOffset(id, t) > 0 ? 1 : 0), // a node on the move passes behind the others
      pulse: id => (L.byId.get(id).hub ? breathe(t) * 0.6 : 0),
    })];
  }
  let lastPos = new Map();
  function pullPointer({ type, at }) {
    if (!at || !L) return false;
    let hit = null;
    for (const n of lastPos.values()) if (ovalHit(n, at, 1.08)) { hit = n.id; break; }
    if (!hit && pull) { const n = L.byId.get(pull.id); if (ovalHit({ ...n, x: n.x + sys.dx }, at, 1.08)) hit = pull.id; } // its empty place
    if (type === 'hover') return hit ? 'grab' : false;
    if (type !== 'down' || !hit) return false;
    const t = lastT;
    if (pull) backs = backs.filter(b => b.id !== pull.id).concat({ ...pull, rAt: t });
    if (pull && pull.id === hit) pull = null;
    else { backs = backs.filter(b => b.id !== hit); pull = { id: hit, at: t }; }
    return true;
  }

  // ======================= beats =======================
  const EXPORTING = typeof location !== 'undefined' && new URLSearchParams(location.search).has('export');
  let plantsBack = null;                                        // q6-plants entered from a later Q5 move: settled
  const free = { catchUp: null, back: false, instant: false };
  // q6-plants-free: a race cut short by the click finishes quickly first; then the extra 92 turns into a ghost factory
  const freeRace = c => (free.catchUp == null ? 1e6 : free.catchUp + (RACE_END + 0.05 - free.catchUp) * ramp(c, 0, 0.8, 'inOutSine'));
  function freeDraw(c) {
    const lead = free.catchUp != null ? 0.8 : 0, oB = free.back ? ramp(c, 0, 0.6) : 1;
    const g = free.instant || free.back ? 1 : clamp01((c - lead - 0.25) / 2.2);
    return plantsDraw(freeRace(c), { oPile: oB, oSub: oB, oIn: oB, extra: extraLook(g) }).concat(ghostDraw(g, oB));
  }
  const beats = [
    {
      id: 'q6-plants',
      // three clicks (or Space): 1 the two plants, 2 the inputs line up at their doors, 3 manufacturing starts and
      // the output races; the next click goes on to the free factory (a race cut short finishes there)
      timelapse: { from: 0, to: 2, secondsPerYear: 0.25, clickSteps: true, spaceSteps: true },
      enter(instant) {
        const from = instant ? null : prevBeat, now = tickT(performance.now());
        // after a "you are here" the plants fade in once it has gone; from a master-view tile they are already there
        const pre = !instant && ctx.prelude ? Math.max(0, 1.1 - (performance.now() - ctx.prelude.start) / 1000) : 0;
        plantsBack = isBack('q6-plants', from) ? from : null;
        if (plantsBack) { opening.at = [now - 1e4, now - 1e4, now - 1e4]; ctx.director.setYear(2); } // back: settled, all three steps
        else { opening.at = [instant ? now - 1e4 : Math.min(pre, PRELUDE_SECONDS), null, null]; ctx.director.setYear(0); } // Esc starts over
        const c = openingClocks(now, opening.at, RACE);
        setup('q6-plants', instant, syvSource, plantsLights(c.race, 1, c.inputs));
      },
      frame(y) { // a step begins as the click starts it; stepping back clears it (export stills are settled)
        const now = tickT(performance.now());
        stepsBegun(y).forEach((on, k) => {
          if (!k) return;
          if (!on) opening.at[k] = null;
          else if (opening.at[k] == null) opening.at[k] = EXPORTING ? now - 1e4 : now;
        });
      },
      tick(now) { const c = openingClocks(tickT(now), opening.at, RACE); ctx.world.setSome(plantsLights(c.race, 1, c.inputs)); },
      draw: t => {
        const c = openingClocks(clock(t), opening.at, RACE), look = { tPlants: c.plants, tIn: c.inputs };
        raceT = c.race;
        if (plantsBack) { // back from the ghost factory: it fades and the extra boxes return
          const g = plantsBack === 'q6-plants-free' ? 1 - clamp01(clock(t) / 0.9) : 0;
          return plantsDraw(c.race, { ...look, extra: g > 0 ? extraLook(g) : null }).concat(ghostDraw(g));
        }
        return plantsDraw(c.race, look);
      },
    },
    {
      id: 'q6-plants-free',
      enter(instant) {
        const from = instant ? null : prevBeat;
        free.catchUp = from === 'q6-plants' && raceT < RACE_END ? raceT : null;
        free.back = isBack('q6-plants-free', from);
        free.instant = !!instant;
        setup('q6-plants-free', instant, syvSource, plantsLights(free.catchUp ?? 1e6));
      },
      tick(now) { if (free.catchUp != null) ctx.world.setSome(plantsLights(freeRace(tickT(now)))); },
      draw: t => freeDraw(clock(t)),
    },
    {
      id: 'q6-inside',
      enter(instant) {
        const from = instant ? null : prevBeat;
        inside.back = isBack('q6-inside', from);
        inside.flyBack = from === 'q6-practices' && prac.dots;
        inside.ghost = from === 'q6-plants-free';
        setup('q6-inside', instant, insideSource, new Map(), 700); // the input lights go out
      },
      draw: t => {
        const c = clock(t);
        if (inside.flyBack) { // the two dots fly back and grow into the factories
          return c < FLY.at + FLY.dur ? flyShapes(1 - flyE(c))
            : insideDraw(1e6, { oName: ramp(c, FLY.at + FLY.dur, 0.5), oInner: ramp(c, FLY.at + FLY.dur, 0.5) });
        }
        if (inside.back) return insideDraw(1e6, { oFac: ramp(c, 0, 0.5), oInner: ramp(c, 0, 0.5) });
        return insideDraw(c, { oOut: 1 - ramp(c, 0, 0.7), ghost: inside.ghost });
      },
    },
    {
      id: 'q6-industries',
      enter(instant) { setup('q6-industries', instant, DISP.source_line || '', new Map(), 600); },
      draw: t => industriesDraw(clock(t)),
    },
    {
      id: 'q6-practices',
      enter(instant) {
        mOpen = false; mAt = -1e9;
        const from = instant ? null : prevBeat;
        prac.fly = from === 'q6-inside';
        prac.back = isBack('q6-practices', from);
        prac.dots = prac.fly || (prac.back && prac.dots);
        prac.lead = prac.fly ? FLY.at + FLY.dur + 0.1 : 0;
        setup('q6-practices', instant, practicesSource, pracLights(instant || prac.back ? 1e6 : 0), 700);
      },
      tick(now) { if (!prac.back) ctx.world.setSome(pracLights(tickT(now))); },
      draw: t => {
        const c = clock(t), out = practicesDraw(prac.back ? 1e6 : c, prac.lead);
        if (prac.fly) { // the two factories shrink into dots and fly to their scores; then the crowd builds
          const e = flyE(c);
          if (e < 1) out.push(...flyShapes(e));
          const oIn = 1 - ramp(c, 0, 0.3);
          out.push(...insideInner(1e6, oIn), ...LANES.flatMap((L, i) => factoryLabel(L, NAMES[i][0], NAMES[i][1], oIn, 0, SCORE_LIGHTS.nameY)));
          out.push(everyDot(c, prac.lead));
        }
        return out.concat(measuredDraw(c));
      },
      pointer({ type, at }) { // the "What is measured?" chip opens the callout; any click closes it
        if (!at) return false;
        const x = at[0], y = ctx.world.ty(at[1]);
        if (type === 'hover') return mOpen || onChip(x, y) ? 'pointer' : null;
        if (type !== 'down') return false;
        if (!mOpen && !onChip(x, y)) return false;
        mOpen = !mOpen; mAt = performance.now();
        return true;
      },
    },
    {
      id: 'q6-drivers',
      timelapse: { from: 0, to: GAP_STATES.length, secondsPerYear: 0.7, clickSteps: true }, // one click per factor
      enter(instant) {
        const from = instant ? null : prevBeat;
        drv.fly = from === 'q6-practices' && prac.dots;            // the two dots grow back into the factories
        drv.fade = !instant && !drv.fly;
        if (instant || ctx.fromBeat?.insight) ctx.director.setYear(GAP_STATES.length); // settled: all four together
        drv.y = ctx.director.year() ?? 0;
        setup('q6-drivers', instant, driversSource, plantsLights(1e6, drv.fly ? 0 : 1), 900);
      },
      frame(y) { drv.y = y; },
      tick(now) { if (drv.fly) ctx.world.setSome(plantsLights(1e6, drvPileO(tickT(now)))); },
      draw: t => driversDraw(clock(t)),
    },
    {
      id: 'q6-experiment',
      enter(instant) { setup('q6-experiment', instant, expSource, expLights(instant ? 1e6 : 0), 600); },
      tick(now) { ctx.world.setSome(expLights(tickT(now))); },
      draw: t => expDraw(clock(t)),
    },
    {
      id: 'q6-within',
      enter(instant) { setup('q6-within', instant, bloomSource, withinLights(instant ? 1e6 : 0, wAll)); },
      tick(now) { ctx.world.setSome(withinLights(tickT(now), wAll)); },
      draw: t => withinDraw(clock(t), wAll, { groupLabel: 'All multi-plant firms', oBar: ramp(clock(t), 3.9, 0.7) }),
    },
    (() => {
      const wAt = t => mix(wAll, wBig, ramp(t, 0.6, 2.2));
      return {
        id: 'q6-within-big',
        enter(instant) { setup('q6-within-big', instant, bloomSource, withinLights(1e6, wAt(instant ? 1e6 : 0))); },
        tick(now) { ctx.world.setSome(withinLights(1e6, wAt(tickT(now)))); },
        draw: t => withinDraw(1e6, wAt(clock(t)), { groupLabel: 'Firms with 150+ plants', oBar: 1,
          approx: String(BIG.label_within || '').startsWith('~') && wAt(clock(t)) >= wBig - 1e-6 }),
      };
    })(),
  ];
  if (L) {
    let fadeSat = false, skip = false, dx0 = 0;
    beats.push(
      {
        id: 'q6-system',
        enter(instant) {
          const from = setup('q6-system', instant, sysSource, new Map(), 600);
          fadeSat = SYSTEM_BEATS.has(from) && from !== 'q6-system';
          dx0 = fadeSat ? sys.dx : 0;
        },
        draw: t => hubsDraw(clock(t), fadeSat, dx0),
      },
      {
        id: 'q6-system-full',
        enter(instant) {
          const from = setup('q6-system-full', instant, sysSource);
          skip = !!instant || from === 'q6-copy' || from === 'q6-pull';
          dx0 = SYSTEM_BEATS.has(from) ? sys.dx : 0;
        },
        draw: t => fullDraw(clock(t), skip, dx0),
      },
      {
        id: 'q6-copy',
        enter(instant) {
          const from = setup('q6-copy', instant, sysSource);
          dx0 = SYSTEM_BEATS.has(from) ? sys.dx : COPY_DX;
          ctx.overlay.caption('');
        },
        tick(now) { if (tickT(now) > 4.2) ctx.overlay.caption('Copying parts isn’t enough'); },
        draw: t => copyDraw(clock(t), dx0),
      },
      {
        id: 'q6-pull',
        enter(instant) {
          const from = setup('q6-pull', instant, sysSource);
          dx0 = SYSTEM_BEATS.has(from) ? sys.dx : 0;
          pull = { id: DEFAULT_PULL, at: dx0 ? 1.7 : 1.0 }; backs = [];
        },
        draw: t => { lastT = clock(t); return pullDraw(lastT, dx0); },
        pointer: e => pullPointer(e),
      },
    );
  }

  return { id: 'q6', beats };
}
