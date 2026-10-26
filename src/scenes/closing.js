// The morning's closing screen, her "Strategy" slide: what a strategy is (three points: a position that provides added
// value, activities that fit and reinforce, clear tradeoffs) and what it is not (eleven buzzwords). It ends roadmap
// stage 5 (src/flow/views.js), just before the roadmap's final overview.
//   strategy-close  black with the header "Strategy" alone; then "What is a strategy?" and one point per click; then
//                   "What is not a strategy?" with the whole list at once
// Stills: ?beat=strategy-close&export=1&year=4 (finished), &year=0 (the header alone). Words: STRATEGY, below.

import { SHOTS } from '../rigmath.js';
import { go, dur } from './common.js';
import { ease, clamp01 } from '../tween.js';
import { text } from '../concepts/kit.js';

export const STRATEGY_TITLE = 'Strategy';
const SOURCE = 'Loosely adapted from Porter';
const HI = '#7FCBFF'; // key words: the stages' light blue

export const STRATEGY = {
  isHead: 'What is a strategy?',
  is: [
    'A **clearly articulated position**\n(customers / needs / price) that\nprovides **added value**',
    'Activities that **fit and mutually reinforce**\ntogether to implement the position',
    'Clear **tradeoffs**: choices of what to do,\nand not to do, that are different\nfrom competition',
  ],
  notHead: 'What is not a strategy?',
  not: ['Best in class […]', 'Data / Platform / AI', 'Lean', 'Scale', 'Human capital', 'Learning', 'Agility', 'Innovation',
    'Rollup, M&A', 'Outsourcing', 'Customer focus'],
};

// frame units (x -8..8, y -4.5..4.5); sizes in U
const L = { x: -7.33, indent: 0.5, head: 2.35, y: [1.25, -0.5, -2.25], line: 0.43 };
const R = { x: [1.3, 4.95], head: 2.35, y0: 1.3, dy: 0.62, split: 6 };
const SIZE = { head: 4.4, point: 3.8, item: 3.8 };
const LAST = 4;

const fade = (c, at, d = 0.6) => ease.inOutCubic(clamp01((c - at) / d));
// how far each thing has come in at stepped clock c: nothing but the header at 0; the first point (with its heading)
// on the first click, one point per click after; the whole "not" list together on the fourth
export const strategyState = c => ({ is: STRATEGY.is.map((_, i) => fade(c, i)), not: STRATEGY.not.map(() => fade(c, 3)) });

export function drawStrategy(c, o = 1) {
  const S = strategyState(c), out = [];
  if (S.is[0] > 0.003) out.push(text(STRATEGY.isHead, [L.x, L.head], { anchor: 'start', size: SIZE.head, weight: 600, o: o * S.is[0] }));
  STRATEGY.is.forEach((p, i) => {
    const a = S.is[i];
    if (a <= 0.003) return;
    const n = p.split('\n').length, y = L.y[i] - 0.1 * (1 - a), top = y + ((n - 1) * L.line) / 2;
    out.push(text('•', [L.x, top], { anchor: 'start', size: SIZE.point, o: o * a }));
    out.push(text(p, [L.x + L.indent, y], { anchor: 'start', size: SIZE.point, hi: HI, o: o * a }));
  });
  const b = S.not[0];
  if (b > 0.003) {
    out.push(text(STRATEGY.notHead, [R.x[0], R.head], { anchor: 'start', size: SIZE.head, weight: 600, o: o * b }));
    STRATEGY.not.forEach((w, i) => {
      const col = i < R.split ? 0 : 1, row = col ? i - R.split : i;
      out.push(text(w, [R.x[col], R.y0 - row * R.dy - 0.1 * (1 - b)], { anchor: 'start', size: SIZE.item, o: o * b }));
    });
  }
  return out;
}

export function closingScene(ctx) {
  let clock = 0;
  // back into it from the roadmap's final overview (Left): it is finished
  const cameBack = () => {
    const d = ctx.director;
    if (!d || !ctx.prevScene) return false;
    return d.scenes.indexOf(ctx.prevScene) > d.state().scene;
  };
  const move = {
    id: 'strategy-close',
    timelapse: { from: 0, to: LAST, secondsPerYear: 0.7, clickSteps: true, spaceSteps: true },
    tile: { year: LAST },
    enter(instant) {
      ctx.overlay.reset({ title: STRATEGY_TITLE, source: SOURCE });
      ctx.allowOrbit = false;
      ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
      ctx.world.plates.set([], { duration: dur(ctx, 600) });
      ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
      go(ctx, SHOTS.flat, 900, instant);
      if (cameBack()) ctx.director.setYear(LAST);
      clock = ctx.director?.year() ?? 0;
    },
    frame(c) { clock = c; },
    draw: () => drawStrategy(clock),
  };
  return { id: 'closing', beats: [move] };
}
