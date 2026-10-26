// Roadmap stage 1, "Understand the industry and ecosystem context": scarcity, across industries and ecosystems.
// Its own two moves (the coalition between them is Q5's, src/scenes/q5.js; the stage's line-up is in src/flow/views.js):
//   industry-forces     the generic five forces diagram, one thing per click: rivalry alone, then customers, suppliers,
//                       new entrants, substitutes, then her two messages (balance; one bad force). Left steps back.
//                       Drawing and words: src/concepts/forcesDiagram.js. The stage's tile pictures it finished.
//   industry-questions  four questions, one per click, stacked on one screen; they end the stage and lead into stage 2.
// Both are stepped moves: each click or Space adds one thing; back into either from a later move, it is finished.
// Stills: ?beat=industry-forces&export=1&year=6 (finished; year=0 for rivalry alone), ?beat=industry-questions&export=1&year=3.

import { SHOTS } from '../rigmath.js';
import { go, dur } from './common.js';
import { ramp } from '../anim.js';
import { ease, clamp01 } from '../tween.js';
import { text } from '../concepts/kit.js';
import { VIEWS } from '../flow/views.js';
import { STEPS, drawDiagram } from '../concepts/forcesDiagram.js';

export const STAGE_TITLE = VIEWS['stage-industry'].title; // the header: the stage's name, as on its roadmap card
export const FORCES_SOURCE = 'Adapted from Michael Porter';
export const QUESTIONS = [
  'Where is the scarcity?',
  'Who controls it, or orchestrates it?',
  'How might it move over time?',
  'What could move it?',
];
const Q = { x: -7.33, y0: 1.9, dy: 1.45, size: 6.4 }; // left edge with the header's; size in U

// The questions' opacities at clock c: the first is up from the start, then one per click.
export const questionsState = c => QUESTIONS.map((_, i) => (i === 0 ? 1 : ease.inOutCubic(clamp01((c - (i - 1)) / 0.6))));

export function drawQuestions(c, o = 1) {
  return questionsState(c).map((qo, i) => text(QUESTIONS[i], [Q.x, Q.y0 - i * Q.dy - 0.12 * (1 - qo)],
    { anchor: 'start', size: Q.size, o: o * qo }));
}

export function industryScene(ctx) {
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
  const steps = (to, secondsPerYear) => ({ from: 0, to, secondsPerYear, clickSteps: true, spaceSteps: true });
  function stepped(id, to, secondsPerYear, source, draw, extra = {}) {
    let clock = 0, fadeIn = false;
    const move = {
      id,
      ...extra,
      timelapse: steps(to, secondsPerYear),
      enter(instant) {
        setup(source);
        if (cameBack(move)) ctx.director.setYear(to);
        clock = ctx.director?.year() ?? 0;
        fadeIn = !instant; // settled (a zoom from its roadmap card, a still) or faded in
      },
      frame(c) { clock = c; },
      draw: t => draw(clock, fadeIn ? ramp(t, 0, 0.6) : 1),
    };
    return move;
  }

  return {
    id: 'industry',
    beats: [
      // tile: the roadmap card's picture shows the finished diagram (tools/tiles.js), not rivalry alone
      stepped('industry-forces', STEPS, 1.0, FORCES_SOURCE, drawDiagram, { tile: { year: STEPS } }),
      stepped('industry-questions', QUESTIONS.length - 1, 0.8, '', drawQuestions),
    ],
  };
}
