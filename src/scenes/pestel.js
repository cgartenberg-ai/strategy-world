// PESTEL: scan the environment (stage 2 of the roadmap). Changes in conditions move the bottlenecks.
//   pestel-lenses      the six lenses: letter, word, one-line definition, an example
//   pestel-shifts      one real shift per lens: what changed, then who gained or which bottleneck moved.
//                      Each click steps to the next letter; clicking a letter jumps to it.
//   pestel-forces      the same six shifts on the five-forces cross (q2's): the forces a shift pushes turn amber and
//                      their arrows grow or shrink. Illustrative. Same stepping.
//   pestel-bottleneck  Deere's chain, farmer to data: the glow (where value is scarce) slides from the machine in 2000
//                      to connectivity and data by 2026. A click (or Space) plays it. Illustrative.
// Stills: ?beat=pestel-shifts&export=1&year=3 opens on the fourth letter (T); ?beat=pestel-bottleneck&export=1&year=2026.
// Words and numbers live in src/concepts/pestel.js; drawing in src/concepts/pestelDraw.js.

import { rect, poly, text, PAL } from '../concepts/kit.js';
import { ramp, mix } from '../anim.js';
import { SHOTS } from '../rigmath.js';
import { go, dur } from './common.js';
import { crossShapes, CROSS_ORDER, CROSS_OUTER, CROSS_SIDE, CROSS_BOX, CROSS_CEN, CROSS_RIV } from './q2concepts.js';
import { LENSES, SHIFTS, PUSHES, FARM, STEP, SCARCE, stepIndex, stripXs, hitStrip, pushAt, pushDir, barsFor } from '../concepts/pestel.js';
import { drawLenses, drawShift, drawStrip, drawForceHead, drawChain, mixHex, STRIP_SHIFTS, STRIP_FORCES } from '../concepts/pestelDraw.js';

const TITLE = {
  lenses: 'What is changing in the world around the industry?',
  shifts: 'When conditions change, who gains and who loses?',
  forces: 'Which forces does a change push?',
  bottleneck: 'Where is value scarce?',
};
const SRC_FORCES = 'Illustrative. Which forces each change pushes, and how far, is teaching judgment.';
const SRC_CHAIN = 'Illustrative.';
const CAPTION = 'Conditions change where value is scarce';
const LAST = LENSES.length - 1;
const HI = PAL.amber;

export function pestelScene(ctx) {
  function setup(title, source) {
    ctx.overlay.reset({ title, source });
    ctx.allowOrbit = false;
    ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
    ctx.world.plates.set([], { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
    go(ctx, SHOTS.flat, 900, ctx.instant);
  }
  const now = () => (performance.now() - ctx.t0) / 1000; // the beat clock, as draw(t) sees it

  // Which letter is showing, and since when (for its build). After an instant entry (export stills, a zoom-in from
  // a tile) the first letter shown starts settled; later letters build as they arrive.
  function stepper(onChange) {
    const s = { idx: null, at: 0, prev: null, settle: false };
    return {
      s,
      enter(instant) { s.idx = null; s.prev = null; s.settle = !!instant; },
      update(c) {
        const i = stepIndex(c);
        if (i === s.idx) return;
        const quiet = s.settle && s.idx === null;
        s.prev = s.idx; s.idx = i; s.at = quiet ? -1e9 : now();
        onChange(i);
      },
      tau: t => t - s.at,
    };
  }
  const STEPS = { from: 0, to: LAST, secondsPerYear: STEP.seconds, clickSteps: true, stepFrom: STEP.hold };
  // clicking a letter jumps there (the clock rests on it, so the clicker carries on from it)
  function pickLetter(L, { type, at }) {
    if (!at) return false;
    const k = hitStrip(at[0], ctx.world.ty(at[1]), stripXs(LENSES.length, L.x0, L.dx), L.y, L.hit);
    if (type === 'hover') return k >= 0 ? 'pointer' : false;
    if (type !== 'down' || k < 0) return false;
    ctx.director.pause();
    ctx.director.setYear(k);
    return true;
  }

  // ---- move 2: shifts ----
  const IY = ctx.data.q2q3_landscape?.industry_years || null; // US industries' return on assets, year by year
  const BARS = SHIFTS.map(s => barsFor(s, IY));
  const sh = stepper(i => ctx.overlay.source(SHIFTS[i].source));
  function shiftsDraw(t) {
    const i = sh.s.idx ?? 0, tau = sh.tau(t);
    return drawStrip(LENSES, STRIP_SHIFTS, i, tau, { prev: sh.s.prev })
      .concat(drawShift(SHIFTS[i], BARS[i], tau));
  }

  // ---- move 3: forces ----
  const F = ctx.data.concepts?.forces;
  const LABELS = F?.labels || { entrants: 'New entrants', suppliers: 'Suppliers', rivalry: 'Rivalry', buyers: 'Buyers', substitutes: 'Substitutes' };
  const BASE = { Airlines: F?.industries?.Airlines?.strength || { entrants: 0.6, suppliers: 0.8, rivalry: 0.9, buyers: 0.8, substitutes: 0.5 },
    [FARM.name]: FARM.strength };
  const M = { top: 1, labels: LABELS };
  let lastS = null, fromS = null;
  const fo = stepper(() => { fromS = lastS; });
  const mixS = (a, b, f) => Object.fromEntries(CROSS_ORDER.map(k => [k, mix(a[k] ?? 0, b[k] ?? 0, f)]));
  const tri = ([x, y], dir, o) => poly(dir > 0 ? [[x - 0.15, y - 0.11], [x + 0.15, y - 0.11], [x, y + 0.15]]
    : [[x - 0.15, y + 0.11], [x + 0.15, y + 0.11], [x, y - 0.15]], { closed: true, fill: HI, stroke: HI, w: 0.1, o, glow: true });
  function forcesDraw(t) {
    const i = fo.s.idx ?? 0, tau = fo.tau(t), P = PUSHES[i], base = BASE[P.industry] || FARM.strength;
    const before = pushAt(base, P.push, 0), after = pushAt(base, P.push, 1);
    // from what was showing to this shift's "before" (quickly), then the shift lands
    const s = tau < 0.5 ? mixS(fromS || before, before, ramp(tau, 0, 0.45)) : mixS(before, after, ramp(tau, 0.55, 0.9));
    lastS = s;
    const prevP = fo.s.prev != null ? PUSHES[fo.s.prev] : null, early = tau < 0.35;
    const moved = Object.keys(P.push), prevMoved = prevP ? Object.keys(prevP.push) : [];
    const hi = early ? 1 - ramp(tau, 0, 0.3) : ramp(tau, 0.55, 0.5), say = ramp(tau, 0.9, 0.45), unsay = 1 - ramp(tau, 0, 0.3);
    const phrases = f => [
      { text: prevP?.push[f]?.[2] || '', o: prevP?.push[f] ? unsay : 0 },
      { text: P.push[f]?.[2] || '', o: P.push[f] ? say : 0 },
    ];
    const st = {
      heads: [], subO: 0, centreO: 0, ghostO: 0, valueO: 0, refO: 0, value: 0,
      bar: { x: 0, half: 0.95, base: -0.72, h: 0, color: '#000000', o: 0 },
      rivalry: { labelO: 1, arrows: [{ s: s.rivalry, grow: 1, o: 1 }], phrases: phrases('rivalry') },
      forces: Object.fromEntries(CROSS_OUTER.map(f => [f, { boxO: 1, arrows: [{ s: s[f], grow: 1, o: 1 }], phrases: phrases(f) }])),
      strong: early ? prevMoved : moved, strongO: hi,
    };
    const out = [];
    // the centre box (the industry), drawn here so it can carry the industry's name; amber when rivalry moves
    const rh = (early ? prevMoved : moved).includes('rivalry') ? hi : 0, C = CROSS_CEN;
    out.push(rect([C.x0, C.y0], [C.x1, C.y1], { stroke: mixHex(PAL.sky, HI, rh), w: 0.2 + 0.06 * rh, r: 0.9, fill: '#000', fo: 0.82, glow: true }));
    const swap = prevP && prevP.industry !== P.industry;
    if (swap) out.push(text(prevP.industry, [0, 0.72], { size: 2.8, weight: 600, o: 1 - ramp(tau, 0, 0.3) }));
    out.push(text(P.industry, [0, 0.72], { size: 2.8, weight: 600, o: swap ? ramp(tau, 0.2, 0.4) : 1 }));
    out.push(...crossShapes(st, M).filter(x => !(x.k === 'text' && x.text === 'Strongest'))); // amber here means "pushed"
    // which way each pushed force moved: up = stronger, down = weaker
    const dir = pushDir(P.push), ph = say;
    for (const f of moved) {
      const at = f === 'rivalry' ? [0, CROSS_RIV.y + 0.48]
        : [CROSS_SIDE[f].at[0] + CROSS_BOX.w / 2 - 0.34, CROSS_SIDE[f].at[1] + 0.18 * ph];
      if (!early) out.push(tri(at, dir[f], hi));
    }
    out.push(...drawStrip(LENSES, STRIP_FORCES, i, tau, { words: false, prev: fo.s.prev }));
    out.push(...drawForceHead(SHIFTS[i], tau, fo.s.prev != null ? SHIFTS[fo.s.prev] : null));
    return out;
  }

  // ---- move 4: the bottleneck moves ----
  let clock = SCARCE.from, captioned = false;

  return {
    id: 'pestel',
    beats: [
      {
        id: 'pestel-lenses',
        enter() { setup(TITLE.lenses, ''); },
        draw: drawLenses,
      },
      {
        id: 'pestel-shifts',
        timelapse: STEPS,
        enter(instant) { setup(TITLE.shifts, SHIFTS[0].source); sh.enter(instant); },
        frame(c) { sh.update(c); },
        draw: shiftsDraw,
        pointer: e => pickLetter(STRIP_SHIFTS, e),
      },
      {
        id: 'pestel-forces',
        timelapse: STEPS,
        enter(instant) { setup(TITLE.forces, SRC_FORCES); lastS = null; fromS = null; fo.enter(instant); },
        frame(c) { fo.update(c); },
        draw: forcesDraw,
        pointer: e => pickLetter(STRIP_FORCES, e),
      },
      {
        id: 'pestel-bottleneck',
        timelapse: { from: SCARCE.from, to: SCARCE.to, secondsPerYear: 0.2 },
        enter() { setup(TITLE.bottleneck, SRC_CHAIN); clock = SCARCE.from; captioned = false; ctx.overlay.year(SCARCE.from); },
        frame(c) {
          clock = c;
          const end = c >= SCARCE.to - 1e-6;
          ctx.overlay.year(end ? null : Math.round(c)); // the counter gives way to the caption (they share a spot)
          if (end !== captioned) { captioned = end; ctx.overlay.caption(end ? CAPTION : ''); }
        },
        draw: t => drawChain(clock, t),
      },
    ],
  };
}
