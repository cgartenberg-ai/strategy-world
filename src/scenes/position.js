// Roadmap stage 3, "Assess position within context": what a position is, where advantage comes from, and three
// airlines on Dublin–London (her CathalAir case). Three stepped moves; the stage's line-up is in src/flow/views.js,
// where the old value-stick moves (q3-stick … q3-unique) stay listed, hidden:
//   position-deciding     "Positioning means deciding…", then her four lines, one per click (customers, needs, price,
//                         and which needs not to meet; the key words in light blue)
//   position-added-value  "Competitive advantage comes from added value"; the next click, its definition
//   position-airlines     three value sticks (willingness to pay at the top, cost at the bottom, a price mark between),
//                         one airline per click: British Airways (its added value at the top), Ryanair (at the bottom),
//                         then Aer Lingus, stuck in the middle, with none; its levels are where the other two's begin.
//                         Illustrative magnitudes. The stage's tile pictures it finished.
// Each click or Space adds one thing; Left takes it away again; back into a move from a later one, it is finished.
// Stills: ?beat=position-deciding&export=1&year=4, ?beat=position-added-value&export=1&year=1,
//         ?beat=position-airlines&export=1&year=2 (year=0: British Airways alone).
// Words and levels are here; edit them here.

import { SHOTS } from '../rigmath.js';
import { go, dur } from './common.js';
import { ramp } from '../anim.js';
import { ease, clamp01 } from '../tween.js';
import { text, line, rect, brace, PAL } from '../concepts/kit.js';
import { VIEWS } from '../flow/views.js';

export const STAGE_TITLE = VIEWS['stage-position'].title; // the header: the stage's name, as on its roadmap card
export const HI = '#7FCBFF';                                 // key words: stage 1's light blue, which reads on black
export const AIRLINES_SOURCE = 'Illustrative';
export const plainText = s => String(s).replace(/\*\*/g, '').replace(/\s*\n\s*/g, ' ');

// ---------------- 1. positioning means deciding (her slide, "Strategic position") ----------------
export const DECIDING = {
  head: 'Positioning means deciding…',
  lines: [
    'What **customers** you will serve',
    'Which **needs** of these customers you will meet',
    'What **price** to charge for meeting these needs',
    '…and which needs **not** to meet',
  ],
};
const LEFT = -7.33; // the header's left edge
const D = { x: LEFT, indent: 0.75, head: 2.25, y0: 0.85, dy: 1.3, size: 6.0 }; // frame units; size in U

const fade = (c, at, d) => ease.inOutCubic(clamp01((c - at) / d));
// how far each thing has come in at clock c: the heading is up from the start, then one line per click
export const decidingState = c => ({ head: 1, lines: DECIDING.lines.map((_, i) => fade(c, i, 0.6)) });

export function drawDeciding(c, o = 1) {
  const S = decidingState(c);
  const out = [text(DECIDING.head, [D.x, D.head], { anchor: 'start', size: D.size, weight: 500, o })];
  DECIDING.lines.forEach((l, i) => {
    const lo = S.lines[i];
    if (lo > 0.003) out.push(text(l, [D.x + D.indent, D.y0 - i * D.dy - 0.12 * (1 - lo)], { anchor: 'start', size: D.size, hi: HI, o: o * lo }));
  });
  return out;
}

// ---------------- 2. added value (her slide, "Added value and 'The Wedge'") ----------------
export const ADDED = {
  claim: 'Competitive advantage comes from **added value**',
  definition: '**Added value**: the value created with you,\nminus the value created without you',
  test: 'The “disappear tomorrow” test',
};
const A = { x: LEFT, claim: 1.7, definition: -0.35, test: -2.2, sizes: { claim: 6.0, definition: 5.0, test: 4.0 } };

export const addedState = c => ({ claim: 1, definition: fade(c, 0, 0.6), test: fade(c, 0.35, 0.6) });

export function drawAddedValue(c, o = 1) {
  const S = addedState(c), out = [];
  out.push(text(ADDED.claim, [A.x, A.claim], { anchor: 'start', size: A.sizes.claim, weight: 500, hi: HI, o }));
  if (S.definition > 0.003) out.push(text(ADDED.definition, [A.x, A.definition - 0.12 * (1 - S.definition)],
    { anchor: 'start', size: A.sizes.definition, hi: HI, o: o * S.definition }));
  if (S.test > 0.003) out.push(text(ADDED.test, [A.x, A.test], { anchor: 'start', size: A.sizes.test, italic: true, o: o * S.test }));
  return out;
}

// ---------------- 3. three airlines on Dublin–London ----------------
// Levels in frame y (illustrative): willingness to pay, price, cost. Customers are left the same surplus (willingness
// to pay minus price, 0.9) by all three, so all three sell; BA keeps a margin of 2.2, Ryanair 2.4, Aer Lingus 1.15.
// BA's willingness to pay tops Aer Lingus's by 1.3 at a cost 0.25 higher (Heathrow, the network); Ryanair's cost is
// 1.95 under Aer Lingus's, at a willingness to pay 0.7 lower. So BA's added value is about 1.05, Ryanair's 1.25, Aer
// Lingus's none. Placed left to right BA, Aer Lingus, Ryanair: Aer Lingus, last in, lands in the middle.
export const AIRLINES = [
  { key: 'ba', name: 'British Airways', x: -4.0, wtp: 2.6, p: 1.7, c: -0.5 },
  { key: 'aer', name: 'Aer Lingus', x: 0.6, wtp: 1.3, p: 0.4, c: -0.75 },
  { key: 'ryanair', name: 'Ryanair', x: 5.2, wtp: 0.6, p: -0.3, c: -2.7 },
];
export const CLICK_ORDER = ['ba', 'ryanair', 'aer'];
const ST = { half: 1.0, tick: 0.2, nameY: -3.4, sizes: { name: 4.4, level: 3.0, added: 3.2 } };
const LINE = PAL.sky; // the sticks' outlines, as stage 1's boxes

// Where each airline's added value comes from: the stretch of its stick beyond every other airline's, at the top
// (willingness to pay above the next highest) or at the bottom (cost below the next lowest), and whose level that is.
export function addedValue(airlines) {
  const out = {};
  for (const a of airlines) {
    const others = airlines.filter(b => b !== a);
    const hiW = others.reduce((m, b) => (b.wtp > m.wtp ? b : m)), loC = others.reduce((m, b) => (b.c < m.c ? b : m));
    const top = a.wtp > hiW.wtp ? [hiW.wtp, a.wtp] : null, bottom = a.c < loC.c ? [a.c, loC.c] : null;
    out[a.key] = { top, bottom, topRef: top ? hiW.key : null, bottomRef: bottom ? loC.key : null };
  }
  return out;
}
const AV = addedValue(AIRLINES);

// Each airline at clock c: o (its stick) and lit (its added value). The first comes in on the move's own entry
// (intro, 0..1 as it enters; 1 settled), the others one per click.
export function airlinesState(c, intro = 1) {
  return CLICK_ORDER.map((key, k) => {
    const p = k ? c - (k - 1) : intro;
    return { key, o: fade(p, 0, 0.45), lit: fade(p, 0.5, 0.45) };
  });
}

export function drawAirlines(c, intro = 1) {
  const byKey = Object.fromEntries(AIRLINES.map(a => [a.key, a]));
  const S = Object.fromEntries(airlinesState(c, intro).map(s => [s.key, s]));
  const sticks = [], marks = [], words = [];
  for (const a of AIRLINES) {
    const { o, lit } = S[a.key];
    if (o <= 0.003) continue;
    const mid = (a.c + a.wtp) / 2, g = 0.35 + 0.65 * o, Y = y => mid + (y - mid) * g; // grows from its middle
    const x0 = a.x - ST.half, x1 = a.x + ST.half;
    sticks.push(rect([x0, Y(a.c)], [x1, Y(a.wtp)], { stroke: LINE, w: 0.18, o, glow: true, stick: a.key }));
    const av = AV[a.key], lo = av.bottom ? av.bottom[1] : a.c, hi = av.top ? av.top[0] : a.wtp;
    // the blue fill: the unlit part, and under the lit part only until it lights (so the amber stays clear)
    sticks.push(rect([x0, Y(lo)], [x1, Y(hi)], { fill: LINE, fo: 0.18, o }));
    if (lo > a.c) sticks.push(rect([x0, Y(a.c)], [x1, Y(lo)], { fill: LINE, fo: 0.18, o: o * (1 - lit) }));
    if (hi < a.wtp) sticks.push(rect([x0, Y(hi)], [x1, Y(a.wtp)], { fill: LINE, fo: 0.18, o: o * (1 - lit) }));
    for (const [side, span] of [['top', av.top], ['bottom', av.bottom]]) {
      if (!span || lit <= 0.003) continue;
      sticks.push(rect([x0, Y(span[0])], [x1, Y(span[1])], { fill: PAL.amber, fo: 0.82, stroke: PAL.amber, w: 0.18, o: o * lit,
        glow: true, av: `${a.key}:${side}` }));
      // the brace and its words on the side facing Aer Lingus, in the middle
      const s = a.x < byKey.aer.x ? 1 : -1, bx = (s > 0 ? x1 : x0) + s * 0.2;
      marks.push(brace(bx, span[0], span[1], s, { stroke: PAL.amber, w: 0.22, o: o * lit }));
      words.push(text('Added value', [bx + s * 0.42, (span[0] + span[1]) / 2], { anchor: s > 0 ? 'start' : 'end',
        size: ST.sizes.added, weight: 500, o: o * lit }));
    }
    marks.push(line([x0 - ST.tick, Y(a.p)], [x1 + ST.tick, Y(a.p)], { color: PAL.white, w: 0.26, o })); // the price mark
    words.push(text(a.name, [a.x, ST.nameY], { size: ST.sizes.name, weight: 500, o }));
    if (a.key === CLICK_ORDER[0]) { // the levels, named once, beside the first stick
      for (const [label, y] of [['Willingness to pay', a.wtp], ['Price', a.p], ['Cost', a.c]]) {
        words.push(text(label, [x0 - ST.tick - 0.25, y], { anchor: 'end', size: ST.sizes.level, o }));
      }
    }
  }
  // Aer Lingus in: dashed lines from its levels to where the other two's added value begins
  for (const a of AIRLINES) {
    const av = AV[a.key];
    for (const [ref, y] of [[av.topRef, av.top?.[0]], [av.bottomRef, av.bottom?.[1]]]) {
      if (!ref) continue;
      const r = byKey[ref], k = Math.min(S[a.key].lit, S[ref].lit);
      if (k <= 0.003) continue;
      const s = a.x < r.x ? 1 : -1, xa = r.x - s * ST.half, xb = a.x + s * ST.half;
      marks.push(line([xa, y], [xb, y], { color: PAL.white, w: 0.14, dash: [0.8, 0.6], o: 0.9 * k }));
    }
  }
  return sticks.concat(marks, words);
}

// ---------------- the moves ----------------
export function positionScene(ctx) {
  function setup(source) {
    ctx.overlay.reset({ title: STAGE_TITLE, source });
    ctx.allowOrbit = false;
    ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
    ctx.world.plates.set([], { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
    go(ctx, SHOTS.flat, 900, ctx.instant);
  }
  // Back into a move from one after it (Left from the next move, or from the roadmap after the stage): it is finished.
  function cameBack(move) {
    const d = ctx.director;
    if (!d || !ctx.fromBeat) return false;
    const st = d.state(), sc = d.scenes[st.scene];
    if (ctx.prevScene && ctx.prevScene !== sc) return d.scenes.indexOf(ctx.prevScene) > st.scene;
    const here = sc.beats.indexOf(move), from = sc.beats.indexOf(ctx.fromBeat);
    return here >= 0 && from > here;
  }
  // a stepped move: each click or Space brings the next thing; Left takes it away again
  function stepped(id, to, secondsPerYear, source, draw, extra = {}) {
    let clock = 0, fadeIn = false;
    const move = {
      id,
      ...extra,
      timelapse: { from: 0, to, secondsPerYear, clickSteps: true, spaceSteps: true },
      enter(instant) {
        setup(source);
        if (cameBack(move)) ctx.director.setYear(to);
        clock = ctx.director?.year() ?? 0;
        fadeIn = !instant && clock === 0; // settled (a zoom from its roadmap card, a still, coming back) or faded in
      },
      frame(c) { clock = c; },
      draw: t => draw(clock, fadeIn ? t : Infinity),
    };
    return move;
  }

  return {
    id: 'position',
    beats: [
      // tile: false on the two text screens, so the roadmap card's picture is the three airlines, finished
      stepped('position-deciding', DECIDING.lines.length, 0.8, '', (c, t) => drawDeciding(c, ramp(t, 0, 0.6)), { tile: false }),
      stepped('position-added-value', 1, 0.9, '', (c, t) => drawAddedValue(c, ramp(t, 0, 0.6)), { tile: false }),
      stepped('position-airlines', CLICK_ORDER.length - 1, 1.4, AIRLINES_SOURCE, (c, t) => drawAirlines(c, Math.min(1, t / 1.4)),
        { tile: { year: CLICK_ORDER.length - 1 } }),
    ],
  };
}
