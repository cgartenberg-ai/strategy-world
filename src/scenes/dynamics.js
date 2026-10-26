// Roadmap stage 5, "Consider sustainability of position over time": Ryanair (A) vs (C), under her Test 3 question.
// Two moves; the stage's line-up is in src/flow/views.js, where Southwest's threat (q7-threat) and the cohorts
// (q7-all) stay listed, hidden:
//   dynamics-respond   a 2x2: cost of ignoring the entrant (up the left) by cost of fighting it (along the bottom); only two
//                      quadrants named, Retaliate (top left) and Accommodate (bottom right). Click: a dot, "Ryanair
//                      1986", in Retaliate. Click: it glides to Accommodate, "Ryanair relaunched". She tells the story.
//                      The stage's tile pictures it finished.
//   dynamics-tailwind  "Political tailwind: Europe opens its skies" (PESTEL's P): Ryanair's passengers, 1992 and 1999, as two bars that grow
//                      on entry (the numbers and source are PESTEL's, src/concepts/pestel.js SHIFTS[0]).
// Each click or Space adds one thing; Left takes it away again; back into the 2x2 from a later move, it is finished.
// Stills: ?beat=dynamics-respond&export=1 (empty), &year=1 (1986), &year=2 (relaunched); ?beat=dynamics-tailwind&export=1.
// Words and layout are here; edit them here.

import { SHOTS } from '../rigmath.js';
import { go, dur } from './common.js';
import { ramp, mix } from '../anim.js';
import { ease, clamp01 } from '../tween.js';
import { text, line, circle, PAL } from '../concepts/kit.js';
import { SHIFTS, barsFor } from '../concepts/pestel.js';
import { drawShift } from '../concepts/pestelDraw.js';

export const TEST3 = 'Is position resilient when competitors respond or conditions change?'; // the header, every screen
const LEFT = -7.33; // the header's left edge

// ---------------- 1. the 2x2 ----------------
export const RESPOND = {
  up: 'Cost of ignoring', across: 'Cost of fighting', retaliate: 'Retaliate', accommodate: 'Accommodate',
  before: 'Ryanair 1986', after: 'Ryanair relaunched',
};
// the 2x2 in frame units (x -8..8, y -4.5..4.5; the header above y 3.2): off centre to the right, so the vertical
// axis's name fits at its left
export const GRID = { x0: -3.9, x1: 6.9, y0: -3.0, y1: 2.5 };
const XM = (GRID.x0 + GRID.x1) / 2, YM = (GRID.y0 + GRID.y1) / 2;
const Q = { // the two quadrants: the word, and the dot with its name under it
  retaliate: { word: [(GRID.x0 + XM) / 2, 1.7], dot: [(GRID.x0 + XM) / 2, 0.85] },
  accommodate: { word: [(XM + GRID.x1) / 2, -2.4], dot: [(XM + GRID.x1) / 2, -0.75] },
};
const SIZE = { word: 7.0, axis: 4.4, dot: 4.4, r: 2.4, under: 0.6 };
const LINE = PAL.sky; // the axes and the cross, as stage 1's boxes
const DOT = PAL.amber;

const fade = (c, at, d) => ease.inOutCubic(clamp01((c - at) / d));
// at clock c: the dot comes in over click 1 (0..1), then glides over click 2 (1..2), its name changing on the way
export const respondState = c => ({
  dot: fade(c, 0, 0.8), glide: fade(c, 1, 1), before: c < 1 ? fade(c, 0, 0.8) : 1 - fade(c, 1, 0.3), after: fade(c, 1.7, 0.3),
});

export function drawRespond(c, o = 1) {
  const S = respondState(c), G = GRID, out = [];
  // the axes, pointing to high; the cross that makes the four quadrants
  out.push(line([G.x0, G.y0], [G.x0, G.y1 + 0.35], { color: LINE, w: 0.3, arrow: 1, glow: true, o, axis: 'up' }));
  out.push(line([G.x0, G.y0], [G.x1 + 0.35, G.y0], { color: LINE, w: 0.3, arrow: 1, glow: true, o, axis: 'across' }));
  out.push(line([XM, G.y0], [XM, G.y1], { color: LINE, w: 0.2, glow: true, o, cross: true }));
  out.push(line([G.x0, YM], [G.x1, YM], { color: LINE, w: 0.2, glow: true, o, cross: true }));
  out.push(text(RESPOND.up.replace('to ', 'to\n'), [G.x0 - 0.35, (G.y0 + G.y1) / 2], { anchor: 'end', size: SIZE.axis, o }));
  out.push(text(RESPOND.across, [(G.x0 + G.x1) / 2, G.y0 - 0.5], { size: SIZE.axis, o }));
  out.push(text(RESPOND.retaliate, Q.retaliate.word, { size: SIZE.word, weight: 600, o }));
  out.push(text(RESPOND.accommodate, Q.accommodate.word, { size: SIZE.word, weight: 600, o }));
  if (S.dot > 0.003) {
    const [a, b] = [Q.retaliate.dot, Q.accommodate.dot], at = [mix(a[0], b[0], S.glide), mix(a[1], b[1], S.glide)];
    out.push(circle(at, { r: SIZE.r, fill: DOT, stroke: DOT, w: 0.2, o: o * S.dot, glow: true, dot: true }));
    const under = [at[0], at[1] - SIZE.under];
    if (S.before > 0.003) out.push(text(RESPOND.before, under, { size: SIZE.dot, weight: 500, o: o * S.before }));
    if (S.after > 0.003) out.push(text(RESPOND.after, under, { size: SIZE.dot, weight: 500, o: o * S.after }));
  }
  return out;
}

// ---------------- 2. the tailwind ----------------
export const TAILWIND = { head: 'Political tailwind: Europe opens its skies', caption: 'Ryanair passengers' };
const SKIES = SHIFTS[0]; // Europe opens its skies: Ryanair's passengers, 1992 and 1999, and the source
const BARS = barsFor(SKIES, null);
// PESTEL's bars (src/concepts/pestelDraw.js), bigger and centred, every word white
const TAIL = { headX: LEFT, headY: 2.3, headSize: 6.4, captionY: 1.35, captionSize: 4.4,
  barXs: [-2.0, 2.0], barHalf: 1.0, barH: 3.0, posBase: -2.85, lineX0: -3.6,
  valueSize: 5.0, valueGap: 0.45, labelSize: 4.4, labelGap: 0.45, white: true, lead: 0.6 };
const millions = b => `${b.v.toFixed(1)} million`;

export const drawTailwind = tau => drawShift(SKIES, BARS, tau, { head: TAILWIND.head, caption: TAILWIND.caption,
  fmt: millions, layout: TAIL });

// ---------------- the moves ----------------
export function dynamicsScene(ctx) {
  function setup(source) {
    ctx.overlay.reset({ title: TEST3, source });
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

  let clock = 0, fadeIn = false;
  const respond = {
    id: 'dynamics-respond',
    tile: { year: 2 }, // the roadmap card's picture: the dot in Accommodate (tools/tiles.js)
    timelapse: { from: 0, to: 2, secondsPerYear: 1.2, clickSteps: true, spaceSteps: true },
    enter(instant) {
      setup('');
      if (cameBack(respond)) ctx.director.setYear(2);
      clock = ctx.director?.year() ?? 0;
      fadeIn = !instant && clock === 0; // settled (a zoom from its roadmap card, a still, coming back) or faded in
    },
    frame(c) { clock = c; },
    draw: t => drawRespond(clock, fadeIn ? ramp(t, 0, 0.6) : 1),
  };
  const tailwind = {
    id: 'dynamics-tailwind',
    enter() { setup(SKIES.source); },
    draw: t => drawTailwind(t),
  };
  return { id: 'dynamics', beats: [respond, tailwind] };
}
