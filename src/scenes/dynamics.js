// Roadmap stage 5, "Consider sustainability of position over time": Ryanair (A) vs (C), under her Test 3 question.
// Three moves play; the stage's line-up is in src/flow/views.js, where the old 2x2 (dynamics-respond), Southwest's
// threat (q7-threat) and the cohorts (q7-all) stay listed, hidden:
//   dynamics-fight     fares and costs per seat, on one vertical scale, no numbers. It opens on black with only the
//                      header (the stage opens here). Click: "Ryanair 1986", the fare, and Ryanair's cost just under it
//                      (the gap, profit). Click: Aer Lingus cuts a little; the fare drops under Ryanair's cost, its loss
//                      lit. Click: "Exits"; its cost goes and the fare goes back up. Click: "Ryanair relaunched"; its cost
//                      comes in where 1986's was and sinks far below the fare. Click: Aer Lingus's cost comes in and the
//                      fare drops down to it (it can go no lower); Ryanair stays above water. Click: "Neutralized".
//   dynamics-tree      a tiny game tree: Ryanair, Enter, Aer Lingus, Fight or Accommodate; then (click) + / − for each
//                      player; (click) Aer Lingus's best reply lit, Fight; (click) the same tree for Ryanair relaunched,
//                      only fighting's outcomes change; (click) its best reply lit, Accommodate. The stage's tile
//                      pictures it finished.
//   dynamics-tailwind  "Macro tailwind: Europe opens its skies": Ryanair's passengers, 1992 and 1999, as two bars that
//                      grow on entry (the numbers and source are PESTEL's, src/concepts/pestel.js SHIFTS[0]).
// Each click or Space adds one thing; Left takes it away again; back into a move from a later one, it is finished.
// Stills: ?beat=dynamics-fight&export=1&year=0..6, ?beat=dynamics-tree&export=1&year=0..4,
//         ?beat=dynamics-tailwind&export=1 (the hidden 2x2: ?beat=dynamics-respond&export=1&year=0..2).
// Words, levels and outcomes are here; edit them here.

import { SHOTS } from '../rigmath.js';
import { go, dur } from './common.js';
import { ramp, mix } from '../anim.js';
import { ease, clamp01 } from '../tween.js';
import { text, line, rect, circle, PAL } from '../concepts/kit.js';
import { textEm } from '../labelfit.js';
import { SHIFTS, barsFor } from '../concepts/pestel.js';
import { drawShift, mixHex } from '../concepts/pestelDraw.js';

export const TEST3 = 'Is position resilient when competitors respond or conditions change?'; // the header, every screen
export const HI = '#7FCBFF'; // key words: her light blue, as in stages 1 and 3
const LEFT = -7.33; // the header's left edge
const U = 0.09; // frame units per U

const fade = (c, at, d) => ease.inOutCubic(clamp01((c - at) / d));
const lerp = (a, b, f) => (f <= 0 ? a : f >= 1 ? b : a + (b - a) * f); // exact at both ends
const widthOf = (s, size, bold = true) => textEm(s) * size * U * (bold ? 1.06 : 1);

// The name over each picture (Ryanair 1986, then relaunched) and, beside it on its line, the verdict.
const NAME = { y: 2.3, size: 6.4, gap: 0.55 };
const nameText = (s, o) => text(s, [LEFT, NAME.y], { anchor: 'start', size: NAME.size, weight: 500, o });
const verdictText = (name, s, o) => text(`**${s}**`, [LEFT + widthOf(name, NAME.size) + NAME.gap, NAME.y],
  { anchor: 'start', size: NAME.size, weight: 600, hi: HI, o });

// ---------------- 1. fares and costs per seat ----------------
export const FIGHT = {
  fare: 'Fare', ryanair: 'Ryanair’s cost', aer: 'Aer Lingus’s cost',
  before: 'Ryanair 1986', after: 'Ryanair relaunched', exits: 'Exits', neutralized: 'Neutralized',
};
// Per seat, in frame y (illustrative, no numbers on screen). Ryanair 1986's cost sits just under the fare; a small cut
// (to cut1986) puts the fare under it. Relaunched, its cost is far lower, under even Aer Lingus's: cut to Aer Lingus's
// own cost (the fare rests just on it, `rest` above), the fare is still well above Ryanair's.
export const LEVELS = { fare: 1.2, cost1986: 0.6, cut1986: 0.0, costRelaunched: -3.4, aer: -1.7, rest: 0.18 };
export const FIGHT_X = [-4.4, 2.4]; // every line's span; the fare is named at its left end, the costs at their right
const F = { size: 5.0, pad: 0.35, fareW: 1.0, costW: 0.8 };
const COLOR = { ryanair: PAL.amber, aer: '#9BE15D', loss: PAL.pink };

// At clock c: how far each thing has come in, and where the fare and Ryanair's cost are.
export function fightState(c) {
  const L = LEVELS;
  const in1 = fade(c, 0, 0.6), cost1 = fade(c, 0.25, 0.6);             // click 1: the name, the fare, Ryanair 1986's cost
  const cut1 = fade(c, 1, 0.9);                                        // click 2: Aer Lingus cuts; the fare drops
  const exit = fade(c, 2, 0.5), up = fade(c, 2.35, 0.65);              // click 3: it exits; the fare goes back up
  const swap = fade(c, 3, 0.35), name2 = fade(c, 3.25, 0.4);           // click 4: Ryanair relaunched
  const cost2 = fade(c, 3.2, 0.3), sink = fade(c, 3.35, 0.65);         //   its cost comes in where 1986's was, and sinks
  const aer = fade(c, 4, 0.35), cut2 = fade(c, 4.25, 0.75);            // click 5: Aer Lingus's cost; the fare drops to it
  const neutralized = fade(c, 5, 0.5);                                 // click 6
  const early = c < 3;
  return {
    before: early ? in1 : 1 - swap, after: name2, exits: early ? exit : 1 - swap, neutralized,
    fareIn: in1,
    fare: early ? lerp(lerp(L.fare, L.cut1986, cut1), L.fare, up) : lerp(L.fare, L.aer + L.rest, cut2),
    ryanair: early ? { o: cost1 * (1 - exit), y: L.cost1986 } : { o: cost2, y: lerp(L.cost1986, L.costRelaunched, sink) },
    aer,
  };
}

export function drawFight(c, o = 1) {
  const S = fightState(c), [x0, x1] = FIGHT_X, ry = S.ryanair, out = [];
  // the gap between the fare and Ryanair's cost: its profit is the black between the lines; its loss (the fare under
  // its cost) is lit
  if (ry.o > 0.003 && ry.y - S.fare > 1e-6) {
    out.push(rect([x0, S.fare], [x1, ry.y], { fill: COLOR.loss, fo: 0.55, stroke: COLOR.loss, w: 0.12, glow: true,
      o: o * ry.o, band: 'loss' }));
  }
  const level = (k, y, color, w, lo) => line([x0, y], [x1, y], { color, w, o: o * lo, level: k });
  const right = (s, y, lo) => text(s, [x1 + F.pad, y], { anchor: 'start', size: F.size, weight: 500, o: o * lo });
  if (S.aer > 0.003) out.push(level('aer', LEVELS.aer, COLOR.aer, F.costW, S.aer), right(FIGHT.aer, LEVELS.aer, S.aer));
  if (ry.o > 0.003) out.push(level('ryanair', ry.y, COLOR.ryanair, F.costW, ry.o), right(FIGHT.ryanair, ry.y, ry.o));
  if (S.fareIn > 0.003) {
    out.push(level('fare', S.fare, PAL.white, F.fareW, S.fareIn));
    out.push(text(FIGHT.fare, [x0 - F.pad, S.fare], { anchor: 'end', size: F.size, weight: 500, o: o * S.fareIn }));
  }
  if (S.before > 0.003) out.push(nameText(FIGHT.before, o * S.before));
  if (S.after > 0.003) out.push(nameText(FIGHT.after, o * S.after));
  if (S.exits > 0.003) out.push(verdictText(FIGHT.before, FIGHT.exits, o * S.exits));
  if (S.neutralized > 0.003) out.push(verdictText(FIGHT.after, FIGHT.neutralized, o * S.neutralized));
  return out;
}

// ---------------- 2. the game tree ----------------
export const TREE = {
  ryanair: 'Ryanair', aer: 'Aer Lingus', enter: 'Enter', fight: 'Fight', accommodate: 'Accommodate',
  before: 'Ryanair 1986', after: 'Ryanair relaunched',
};
// Outcomes, ordinal only (shown as + / −): more minuses, worse. Aer Lingus picks the branch with fewer.
// 1986: fighting costs Aer Lingus a little (−) and sinks Ryanair (−); accommodating hands Ryanair its own customers
// (Ryanair +, Aer Lingus − −). Relaunched: only fighting changes. Ryanair survives it (+), and matching its fares costs
// Aer Lingus far more (− − −); ignoring costs Aer Lingus no less than in 1986 (− −), but now it is the lesser cost.
export const PAYOFFS = {
  before: { fight: { ryanair: -1, aer: -1 }, accommodate: { ryanair: 1, aer: -2 } },
  after: { fight: { ryanair: 1, aer: -3 }, accommodate: { ryanair: 1, aer: -2 } },
};
export const mark = n => (n > 0 ? '+' : Array(-n).fill('−').join(' '));
export const bestReply = p => (p.fight.aer >= p.accommodate.aer ? 'fight' : 'accommodate');

// Frame units: the trunk (Ryanair, Enter, Aer Lingus) across at y; the two branches climb and fall `rise` to the
// moves' names; the outcomes in two columns, named above the top row.
const T = { y: -0.75, rise: 1.5, ryanairX: -6.55, enter: [-5.45, -4.15], aerX: -2.85, branch: [-1.45, -0.2], movePad: 0.25,
  cols: { ryanair: 4.3, aer: 6.4 }, headUp: 0.85, size: 5.0, headSize: 4.6, markSize: 7.0, enterUp: 0.55, w: 0.4, litW: 0.9 };
const ROWS = { fight: T.y + T.rise, accommodate: T.y - T.rise };
const BRANCHES = ['fight', 'accommodate'];

// At clock c: the outcomes (click 1), the light on 1986's best reply (click 2; off again on click 3), the relaunch
// (click 3: the name and fighting's outcomes cross-fade), the light on its best reply (click 4).
export function treeState(c) {
  const lit = { fight: 0, accommodate: 0 };
  lit[bestReply(PAYOFFS.before)] += fade(c, 1, 0.5) * (1 - fade(c, 2, 0.6));
  lit[bestReply(PAYOFFS.after)] += fade(c, 3, 0.5);
  return { outcomes: fade(c, 0, 0.6), lit, relaunched: fade(c, 2.15, 0.6), name: fade(c, 2, 0.5) };
}

export function drawTree(c, o = 1) {
  const S = treeState(c), lines = [], words = [];
  const wide = T.size; // the trunk and branch names
  // the trunk: Ryanair enters
  words.push(text(TREE.ryanair, [T.ryanairX, T.y], { size: wide, weight: 600, o }));
  lines.push(line([T.enter[0], T.y], [T.enter[1], T.y], { color: PAL.white, w: T.w, o, branch: 'enter' }));
  words.push(text(TREE.enter, [(T.enter[0] + T.enter[1]) / 2, T.y + T.enterUp], { size: wide, o }));
  words.push(text(TREE.aer, [T.aerX, T.y], { size: wide, weight: 600, o }));
  // the branches: Aer Lingus fights or accommodates; the best reply lit
  for (const k of BRANCHES) {
    const l = S.lit[k], end = [T.branch[1], ROWS[k]];
    lines.push(line([T.branch[0], T.y], end, { color: l > 0.999 ? HI : mixHex(PAL.white, HI, l), w: T.w + (T.litW - T.w) * l,
      o, branch: k, lit: l > 0.5 }));
    const at = [end[0] + T.movePad, end[1]];
    if (l < 0.997) words.push(text(TREE[k], at, { anchor: 'start', size: wide, o: o * (1 - l) }));
    if (l > 0.003) words.push(text(`**${TREE[k]}**`, at, { anchor: 'start', size: wide, weight: 600, hi: HI, o: o * l }));
  }
  // the outcomes: + / − under each player, on each branch's row; once relaunched, the ones that change cross-fade
  if (S.outcomes > 0.003) {
    const oo = o * S.outcomes;
    for (const who of ['ryanair', 'aer']) {
      words.push(text(TREE[who], [T.cols[who], ROWS.fight + T.headUp], { size: T.headSize, weight: 500, o: oo, column: who }));
      for (const k of BRANCHES) {
        const a = mark(PAYOFFS.before[k][who]), b = mark(PAYOFFS.after[k][who]), at = [T.cols[who], ROWS[k]];
        const put = (s, f) => { if (f > 0.003) words.push(text(s, at, { size: T.markSize, weight: 600, o: oo * f, payoff: `${k}:${who}` })); };
        if (a === b) put(a, 1);
        else { put(a, 1 - S.relaunched); put(b, S.relaunched); }
      }
    }
  }
  if (S.name < 0.997) words.push(nameText(TREE.before, o * (1 - S.name)));
  if (S.name > 0.003) words.push(nameText(TREE.after, o * S.name));
  return lines.concat(words);
}

// ---------------- the hidden 2x2 (dynamics-respond; she found it wrong: kept, hidden) ----------------
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

// ---------------- 3. the tailwind ----------------
export const TAILWIND = { head: 'Macro tailwind: Europe opens its skies', caption: 'Ryanair passengers' };
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
  // a stepped move: each click or Space brings the next thing; Left takes it away again
  function stepped(id, to, secondsPerYear, draw, extra = {}) {
    let clock = 0, fadeIn = false;
    const move = {
      id,
      ...extra,
      timelapse: { from: 0, to, secondsPerYear, clickSteps: true, spaceSteps: true },
      enter(instant) {
        setup('');
        if (cameBack(move)) ctx.director.setYear(to);
        clock = ctx.director?.year() ?? 0;
        fadeIn = !instant && clock === 0; // settled (a zoom from its roadmap card, a still, coming back) or faded in
      },
      frame(c) { clock = c; },
      draw: t => draw(clock, fadeIn ? ramp(t, 0, 0.6) : 1),
    };
    return move;
  }

  const respond = stepped('dynamics-respond', 2, 1.2, drawRespond, { tile: { year: 2 } }); // hidden in stage 5
  // the stage opens here, on black with only the header; its first picture is no tile (tools/tiles.js)
  const fight = stepped('dynamics-fight', 6, 1.4, drawFight, { tile: false });
  const tree = stepped('dynamics-tree', 4, 1.0, drawTree, { tile: { year: 4 } }); // the roadmap card's picture
  const tailwind = {
    id: 'dynamics-tailwind',
    enter() { setup(SKIES.source); },
    draw: t => drawTailwind(t),
  };
  return { id: 'dynamics', beats: [respond, fight, tree, tailwind] };
}
