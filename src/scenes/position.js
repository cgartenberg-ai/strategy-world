// Roadmap stage 3, "Assess position within context": what a position is, where advantage comes from, three airlines on
// Dublin–London (her CathalAir case), and the landscape of customer tastes. Four stepped moves; the stage's line-up is
// in src/flow/views.js, where the old value-stick moves (q3-stick … q3-unique) stay listed, hidden:
//   position-deciding     black with the header alone; then "Positioning means deciding…"; then her four lines, one
//                         per click (customers, needs, price, and which needs not to meet; the key words in light blue)
//   position-added-value  "Competitive advantage comes from added value"; the next click, its definition
//   position-airlines     value sticks (willingness to pay at the top, cost at the bottom), one airline per click:
//                         Aer Lingus alone (the value created between; alone, its price can climb to willingness to
//                         pay); British Airways pops over, its willingness to pay climbing above Aer Lingus's (lit);
//                         Ryanair pops over, its cost dropping below (lit). Aer Lingus ends between them, nothing lit.
//                         Illustrative magnitudes.
//   position-landscape    "best for whom?": a rugged 3D landscape of customer tastes rises; Ryanair, BA and Aer Lingus
//                         land on their peaks, one per click; then the closing line (src/concepts/tasteland.js, drawn in
//                         the world by src/scenes/tasteland3d.js). The stage's tile pictures it finished.
// Each click or Space adds one thing; Left takes it away again; back into a move from a later one, it is finished.
// Stills: ?beat=position-deciding&export=1&year=5, ?beat=position-added-value&export=1&year=1,
//         ?beat=position-airlines&export=1&year=2 (year=0: Aer Lingus alone), ?beat=position-landscape&export=1&year=4.
// Words and levels are here (the landscape's in src/concepts/tasteland.js); edit them there.

import { SHOTS, projector } from '../rigmath.js';
import { go, dur } from './common.js';
import { ramp } from '../anim.js';
import { ease, clamp01 } from '../tween.js';
import { text, line, rect, brace, PAL } from '../concepts/kit.js';
import { VIEWS } from '../flow/views.js';
import { LAND_SOURCE, landscapeState, drawLandscape, landShot } from '../concepts/tasteland.js';
import { createTasteland } from './tasteland3d.js';

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
const mix = (a, b, f) => (f >= 1 ? b : a + (b - a) * f);
// how far each thing has come in at clock c: nothing but the header at first; the heading on the first click, then
// one line per click
export const decidingState = c => ({ head: fade(c, 0, 0.6), lines: DECIDING.lines.map((_, i) => fade(c, i + 1, 0.6)) });

export function drawDeciding(c, o = 1) {
  const S = decidingState(c), out = [];
  if (S.head > 0.003) out.push(text(DECIDING.head, [D.x, D.head - 0.12 * (1 - S.head)], { anchor: 'start', size: D.size, weight: 500, o: o * S.head }));
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
// Levels in frame y (illustrative): willingness to pay at the top of each stick, cost at the bottom; the stick between
// is the value created (the wedge). Each rival is Aer Lingus's stick with one end moved: BA's top higher (customers
// will pay more for its service and network), Ryanair's bottom much lower. Aer Lingus, first and alone in the middle,
// ends between them with nothing of its own lit.
export const AIRLINES = [
  { key: 'aer', name: 'Aer Lingus', x: 0, wtp: 1.2, c: -1.0 },
  { key: 'ba', name: 'British Airways', x: -4.8, wtp: 2.35, c: -1.0, end: 'top', litWords: 'Higher willingness to pay' },
  { key: 'ryanair', name: 'Ryanair', x: 4.8, wtp: 1.2, c: -2.15, end: 'bottom', litWords: 'Lower cost' },
];
export const CLICK_ORDER = ['aer', 'ba', 'ryanair'];
export const AIR_WORDS = { wtp: 'Willingness to pay', cost: 'Cost', created: 'Value created', alone: 'Price (if alone)' };
const ST = { half: 0.95, tick: 0.3, gap: 0.42, nameY: -3.35, sizes: { name: 4.6, words: 3.4 } };
const LINE = PAL.sky; // the sticks' outlines, as stage 1's boxes

// Each thing at clock c (0 Aer Lingus alone, 1 + BA, 2 + Ryanair) and t seconds after the move came in (Infinity:
// settled). Aer Lingus comes in on the move's own entry: its stick, then its two levels, then the value created, then a
// price mark that climbs to the top ("Price (if alone)"); BA's arrival ends all that's "alone". Each rival slides out
// from behind Aer Lingus's stick to its place (slide), then its end moves (grow) and lights, then its words come.
export function airlinesState(c, t = Infinity) {
  const alone = 1 - fade(c, 0, 0.15);
  const aer = { key: 'aer', o: fade(t, 0, 0.5), levels: fade(t, 0.3, 0.5), created: fade(t, 0.8, 0.5) * alone,
    price: fade(t, 1.2, 0.25) * alone, climb: fade(t, 1.2, 0.9), alone: fade(t, 1.9, 0.5) * alone };
  const rivals = CLICK_ORDER.slice(1).map((key, k) => {
    const p = c - k;
    return { key, o: fade(p, 0.1, 0.12), slide: fade(p, 0.1, 0.38), name: fade(p, 0.3, 0.3), grow: fade(p, 0.45, 0.35),
      words: fade(p, 0.75, 0.25) };
  });
  return { aer, rivals };
}

export function drawAirlines(c, t = Infinity) {
  const by = Object.fromEntries(AIRLINES.map(a => [a.key, a])), aer = by.aer, S = airlinesState(c, t);
  const sticks = [], marks = [], words = [];
  const W = (s, at, o, extra = {}) => words.push(text(s, at, { size: ST.sizes.words, o, ...extra }));
  // a stick from lo to hi at x: its outline, and its fill
  const stick = (key, x, lo, hi, o) => {
    sticks.push(rect([x - ST.half, lo], [x + ST.half, hi], { stroke: LINE, w: 0.18, o, glow: true, stick: key }));
    sticks.push(rect([x - ST.half, lo], [x + ST.half, hi], { fill: LINE, fo: 0.18, o }));
  };
  // Aer Lingus, alone in the middle
  const a = S.aer, mid = (aer.c + aer.wtp) / 2, g = 0.35 + 0.65 * a.o, Y = y => mid + (y - mid) * g; // grows from its middle
  if (a.o > 0.003) {
    stick('aer', aer.x, Y(aer.c), Y(aer.wtp), a.o);
    words.push(text(aer.name, [aer.x, ST.nameY], { size: ST.sizes.name, weight: 500, o: a.o }));
    if (a.levels > 0.003) {
      W(AIR_WORDS.wtp, [aer.x, aer.wtp + ST.gap], a.levels);
      W(AIR_WORDS.cost, [aer.x, aer.c - ST.gap], a.levels);
    }
    if (a.created > 0.003) { // the brace on its left: the value created
      const bx = aer.x - ST.half - 0.2;
      marks.push(brace(bx, aer.c, aer.wtp, -1, { stroke: PAL.white, w: 0.2, o: a.created, mark: 'created' }));
      W(AIR_WORDS.created, [bx - 0.48, mid], a.created, { anchor: 'end' });
    }
    if (a.price > 0.003) { // the price mark climbs from near its cost to its willingness to pay
      const y = mix(aer.c + 0.25, aer.wtp, a.climb);
      marks.push(line([aer.x - ST.half - ST.tick, y], [aer.x + ST.half + ST.tick, y], { color: PAL.white, w: 0.32, o: a.price, mark: 'price' }));
      if (a.alone > 0.003) W(AIR_WORDS.alone, [aer.x + ST.half + ST.tick + 0.25, aer.wtp], a.alone, { anchor: 'start' });
    }
  }
  // the rivals: Aer Lingus's stick, slid over, with one end moved and lit
  for (const r of S.rivals) {
    if (r.o <= 0.003) continue;
    const b = by[r.key], x = mix(aer.x, b.x, r.slide), top = b.end === 'top';
    const lo = top ? aer.c : mix(aer.c, b.c, r.grow), hi = top ? mix(aer.wtp, b.wtp, r.grow) : aer.wtp;
    sticks.push(rect([x - ST.half, lo], [x + ST.half, hi], { stroke: LINE, w: 0.18, o: r.o, glow: true, stick: r.key }));
    sticks.push(rect([x - ST.half, aer.c], [x + ST.half, aer.wtp], { fill: LINE, fo: 0.18, o: r.o }));
    if (r.grow > 0.003) {
      const [l0, l1] = top ? [aer.wtp, hi] : [lo, aer.c];
      sticks.push(rect([x - ST.half, l0], [x + ST.half, l1], { fill: PAL.amber, fo: 0.82, stroke: PAL.amber, w: 0.18, o: r.o,
        glow: true, lit: `${r.key}:${b.end}` }));
    }
    if (r.name > 0.003) words.push(text(b.name, [x, ST.nameY], { size: ST.sizes.name, weight: 500, o: r.o * r.name }));
    if (r.words > 0.003) W(b.litWords, [x, top ? b.wtp + ST.gap : b.c - ST.gap], r.words);
  }
  return sticks.concat(marks, words);
}

// ---------------- the moves ----------------
export function positionScene(ctx) {
  function setup(source, shot = SHOTS.flat) {
    ctx.overlay.reset({ title: STAGE_TITLE, source });
    ctx.allowOrbit = false;
    ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
    ctx.world.plates.set([], { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
    go(ctx, shot, 900, ctx.instant);
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
  // a stepped move: each click or Space brings the next thing; Left takes it away again.
  // draw(clock, t): t is seconds since the move came in, or Infinity when it came in settled (a zoom from its roadmap
  // card, a still, coming back); t0 is the real seconds, for a fade that always plays (onEnter(instant) for more set-up)
  function stepped(id, to, secondsPerYear, source, draw, extra = {}, onEnter = null) {
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
        if (onEnter) onEnter(move, instant);
      },
      frame(c) { clock = c; },
      draw: t => draw(clock, fadeIn ? t : Infinity, t),
    };
    return move;
  }

  // the landscape: a terrain in the world (made the first time it comes in; none in tests, which have no scene), a
  // camera that swings round from the flat shot to look down on it, then drifts slowly back and forth
  let land = null, landMove = null, landEntry = 0;
  function enterLandscape(move, instant) {
    landMove = move;
    landEntry = instant ? 1 : 0;
    if (ctx.world.scene && !land) land = createTasteland(ctx.world.scene, { isActive: () => ctx.director?.current() === landMove });
    land?.show();
    if (instant || !ctx.rig.path) { ctx.rig.set(landShot(0)); return; }
    const sway = [];
    for (let k = 0; k < 8; k++) sway.push([landShot(k % 2 ? 0 : 1), 42000, 'inOutSine']);
    ctx.rig.path([[landShot(0), 2600, 'inOutCubic'], ...sway]);
  }
  function drawLand(c, t, t0) {
    const S = landscapeState(c, t);
    if (!landEntry) S.o = Math.min(S.o, fade(t0, 0, 0.6)); // coming back, settled: it still fades in
    land?.set(S);
    return drawLandscape(S, projector(ctx.rig.p ?? landShot(0)));
  }

  return {
    id: 'position',
    beats: [
      // tile: false on all but the landscape, so the roadmap card's picture is the landscape, finished
      stepped('position-deciding', DECIDING.lines.length + 1, 0.8, '', (c, t) => drawDeciding(c, ramp(t, 0, 0.6)), { tile: false }),
      stepped('position-added-value', 1, 0.9, '', (c, t) => drawAddedValue(c, ramp(t, 0, 0.6)), { tile: false }),
      stepped('position-airlines', CLICK_ORDER.length - 1, 2.0, AIRLINES_SOURCE, (c, t) => drawAirlines(c, t), { tile: false }),
      stepped('position-landscape', 4, 2.0, LAND_SOURCE, drawLand, { tile: { year: 4 } }, enterLandscape),
    ],
  };
}
