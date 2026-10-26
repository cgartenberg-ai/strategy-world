// Roadmap stage 1, "Understand the industry and ecosystem context": scarcity, across industries and ecosystems.
// Its three moves (the stage's line-up is in src/flow/views.js; Q5's coalition moves stay listed there, hidden):
//   industry-forces     header "Understand the industry context" alone on black (no source line yet), then one thing
//                       per click: rivalry, customers, suppliers, new entrants, substitutes, then her four messages in
//                       her slide's order (balance; one bad force; PESTEL-driven shifts; a broad view): 9 clicks.
//                       Drawing and words: src/concepts/forcesDiagram.js. The stage's tile pictures it finished.
//   industry-ecosystem  header "Understand the ecosystem context": Q5's coalition network builds itself in, centred,
//                       drawn as q5-coalition draws it (src/scenes/q5.js) but bigger (NETWORK below); click 1, it steps
//                       left and her first callout comes in beside it; click 2, the second. Words: CALLOUTS below.
//   industry-questions  four questions, one per click, stacked on one screen, under the stage's own name; they end
//                       the stage and lead into stage 2.
// All are stepped moves: each click or Space adds one thing, Left takes it away; back into one from a later move, it is
// finished. Stills: ?beat=industry-forces&export=1&year=9 (finished; year=0 the header alone, year=1 rivalry),
// ?beat=industry-ecosystem&export=1&year=2 (year=0 the network alone), ?beat=industry-questions&export=1&year=3.

import { SHOTS } from '../rigmath.js';
import { go, dur } from './common.js';
import { ramp, mix } from '../anim.js';
import { ease, clamp01 } from '../tween.js';
import { text } from '../concepts/kit.js';
import { VIEWS } from '../flow/views.js';
import { STEPS, HI, drawDiagram } from '../concepts/forcesDiagram.js';
import { coalitionShapes } from './q5.js';

export const STAGE_TITLE = VIEWS['stage-industry'].title; // the questions' header: the stage's name, as on its card
export const FORCES_TITLE = 'Understand the industry context';
export const FORCES_SOURCE = 'Adapted from Michael Porter';
export const ECOSYSTEM_TITLE = 'Understand the ecosystem context';
export const ECOSYSTEM_SOURCE = 'Deere relationships from public sources';
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

// ---- the ecosystem: the coalition network, then her two callouts beside it, one per click ----
// The network is Q5's drawing on a layout of its own, bigger than Q5's (BIG: names 2.2 U) so the names read in the
// room: names 3.2 U, circles 0.7 (Deere 1.05), filling the stage's height between the header and the source line.
// Centred alone; once it steps aside its left edge meets the header's. tests/industry.test.js checks nothing touches.
export const NETWORK = { cx: 0, cy: -0.62, R: 2.35, rc: 1.05, r: 0.7, size: 3.2, deere: 3.6 };
const ASIDE = -3.09; // the network's centre once it has stepped aside
// Her words; **marked** words show in light blue (a mark opens and closes within a line). Right of the network once it
// has stepped aside, one left edge, the first above the second.
const CALL = { x: 1.75, size: 5.0 }; // size in U
export const CALLOUTS = [
  { text: 'How do you orchestrate\nan ecosystem so the\n**whole is greater than**\n**the sum of its parts**?', at: [CALL.x, 1.0] },
  { text: 'Value flows\nto the **scarcity**,\nand to the **orchestrators**', at: [CALL.x, -1.75] },
];

// At clock c: how far the network has stepped aside (0..1) and each callout's opacity (the first waits for the glide).
export const ecosystemState = c => ({
  aside: ease.inOutCubic(clamp01(c / 0.6)),
  callouts: CALLOUTS.map((_, j) => ease.inOutCubic(clamp01((c - j - 0.45) / 0.5))),
});

// The network t seconds into the move (it builds itself in over 3 s, as in Q5), the callouts by the clock c; o fades all.
export function drawEcosystem(c, o = 1, t = 1e9) {
  const S = ecosystemState(c);
  const net = coalitionShapes(t, S.aside > 0 ? { ...NETWORK, cx: mix(NETWORK.cx, ASIDE, S.aside) } : NETWORK);
  const out = o >= 1 ? net : net.map(s => ({ ...s, o: (s.o ?? 1) * o }));
  CALLOUTS.forEach((m, j) => {
    const co = S.callouts[j];
    if (co > 0.003) out.push(text(m.text, [m.at[0], m.at[1] - 0.12 * (1 - co)], { anchor: 'start', size: CALL.size, hi: HI, o: o * co }));
  });
  return out;
}

export function industryScene(ctx) {
  function setup(title, source) {
    ctx.overlay.reset({ title, source });
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
  // a stepped move: each click or Space brings the next thing; Left takes it away again.
  // source: the source line, or a function of the clock (the five forces show theirs only once the diagram starts).
  // draw(c, o, t): c the clock, o the entry fade, t seconds into the move (settled, when it is entered finished).
  const steps = (to, secondsPerYear) => ({ from: 0, to, secondsPerYear, clickSteps: true, spaceSteps: true });
  function stepped(id, to, secondsPerYear, title, source, draw, extra = {}) {
    let clock = 0, fadeIn = false, settled = false;
    const sourceAt = c => (typeof source === 'function' ? source(c) : source);
    const move = {
      id,
      ...extra,
      timelapse: steps(to, secondsPerYear),
      enter(instant) {
        const back = cameBack(move);
        if (back) ctx.director.setYear(to);
        clock = ctx.director?.year() ?? 0;
        setup(title, sourceAt(clock));
        fadeIn = !instant; // settled (a zoom from its roadmap card, a still) or faded in
        settled = instant || back;
      },
      frame(c) {
        clock = c;
        if (typeof source === 'function') ctx.overlay.source(sourceAt(c));
      },
      draw: t => draw(clock, fadeIn ? ramp(t, 0, 0.6) : 1, settled ? 1e9 : t),
    };
    return move;
  }

  return {
    id: 'industry',
    beats: [
      // tile: the roadmap card's picture shows the finished diagram (tools/tiles.js), not the header alone
      stepped('industry-forces', STEPS, 1.0, FORCES_TITLE, c => (c > 0 ? FORCES_SOURCE : ''), drawDiagram,
        { tile: { year: STEPS } }),
      stepped('industry-ecosystem', CALLOUTS.length, 1.0, ECOSYSTEM_TITLE, ECOSYSTEM_SOURCE, drawEcosystem),
      stepped('industry-questions', QUESTIONS.length - 1, 0.8, STAGE_TITLE, '', drawQuestions),
    ],
  };
}
