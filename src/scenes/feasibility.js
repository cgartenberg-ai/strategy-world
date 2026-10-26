// Roadmap stage 4, "Assess feasibility of position": Ryanair's activity system, revealed here for the first time.
// Every screen's header is her Test 2 question (TITLES.test2). Its own two moves (the stage's line-up, with Q5's old
// copy and pull after them, is in src/flow/views.js):
//   feasibility-map      the map, built the way her slides build it (SMBC deck pp. 58–62), one slide per click:
//                        the four pillars alone, then their links, then the no-frills activities, the lean-operations
//                        activities, and the lowest-fares and secondary-markets activities (the whole map). Each
//                        click's bubbles fade and grow in, then their links draw; Left steps back a slide. Bubbles,
//                        links and which slide adds them: data/concepts/ryanair.json (steps). Layout: BUILD in
//                        src/concepts/activity.js. The stage's tile pictures the whole map.
//   feasibility-ranking  Ryanair today (her p. 63 table): the world's largest airlines by annual passengers, ranked
//                        bars, Ryanair (#3) lit. Her table's asterisks (Ryanair, IndiGo *; easyJet **) are left off.
// Back into the map from a later move, it is whole. Stills: ?beat=feasibility-map&export=1&year=4 (year=0: the
// pillars alone), ?beat=feasibility-ranking&export=1.

import { SHOTS } from '../rigmath.js';
import { TITLES, go, dur } from './common.js';
import { ramp } from '../anim.js';
import { text, rect, ellipse } from '../concepts/kit.js';
import { layoutSystem, stepPlan, stepState, BUILD } from '../concepts/activity.js';
import { drawSystem, hexMix } from '../concepts/activityDraw.js';

export const MAP_SOURCE = 'Activity system after the failed launch; from course slides.';
export const STEPS = 4; // her five slides: the pillars, then four clicks

// ---------------- the map ----------------
const MAP_LOOK = { linkW: { hub: 1.0, act: 0.5 }, edgeW: 0.3, ringDur: 0.42 };
const NAME = { at: [-7.33, 2.2], size: 3.2 }; // "Ryanair", top left under the header (clear of the map)

// The map at click clock c (0 = the pillars, 4 = the whole map; between, a click's things arriving); o fades it all.
export function drawMap(L, plan, c, o = 1) {
  const st = stepState(plan, c), over = [];
  const T = (id, s = plan.nodeStep.get(id)) => s + plan.nodeU.get(id); // when a bubble arrives (steps, then within)
  for (const n of L.nodes) { // a ring runs out from each new bubble as it arrives, gone by the click's end
    const s = plan.nodeStep.get(n.id);
    if (!s) continue;
    const q = (c - (s - 1) - plan.nodeU.get(n.id)) / MAP_LOOK.ringDur;
    if (q > 0.05 && q < 1) over.push(ellipse([n.x, n.y], n.rx + 0.4 * q, n.ry + 0.4 * q,
      { stroke: '#BFE4FF', w: 0.3, o: o * 0.7 * (1 - q), glow: true }));
  }
  return [
    text('Ryanair', NAME.at, { anchor: 'start', size: NAME.size, weight: 600, color: '#FFFFFF', o }),
    ...drawSystem(L, {
      alpha: o, over, linkW: MAP_LOOK.linkW, edgeW: MAP_LOOK.edgeW,
      from: l => (T(l.a) <= T(l.b) ? l.a : l.b), // a link grows out of the bubble that was there first
      nodeO: id => st.node.get(id).o,
      scale: id => 0.75 + 0.25 * st.node.get(id).grow,
      linkF: k => st.link[k],
    }),
  ];
}

// ---------------- Ryanair today ----------------
// Her numbers (SMBC deck p. 63): annual passengers, millions.
export const RANKING = [
  { name: 'American Airlines', country: 'U.S.', pax: 199.3 },
  { name: 'Delta Air Lines', country: 'U.S.', pax: 171.4 },
  { name: 'Ryanair Group', country: 'Ireland', pax: 168.6, lit: true },
  { name: 'United Airlines', country: 'U.S.', pax: 144.3 },
  { name: 'Southwest Airlines', country: 'U.S.', pax: 126.6 },
  { name: 'Lufthansa Group', country: 'Germany', pax: 101.8 },
  { name: 'International Airlines Group (IAG)', country: 'UK', pax: 94.7 },
  { name: 'IndiGo', country: 'India', pax: 85.3 },
  { name: 'Turkish Airlines Group', country: 'Türkiye', pax: 71.8 },
  { name: 'easyJet', country: 'UK', pax: 69.7 },
];
export const RANKING_SOURCE = 'Annual passengers; from course slides';
// frame units; sizes in U. Rows top to bottom under a column label; bars to scale from barX.
const RK = { y0: 1.72, dy: 0.585, rankX: -6.95, nameX: -6.45, countryX: -0.45, barX: 0, barMax: 5.6, barH: 0.36,
  size: 2.6, countrySize: 2.2, valueSize: 2.4, labelY: 2.42, labelSize: 2.2, big: 7.5 };
const BAR = { calm: '#1F4D78', lit: '#3DA2F0', litEdge: '#BFE4FF' };

// t: seconds since the move began (huge: settled). Each row fades in and its bar grows, top to bottom; then
// Ryanair's bar lights and its #3 comes up.
export function rankingState(t) {
  const rows = RANKING.map((_, i) => ({
    o: ramp(t, 0.1 + 0.06 * i, 0.5), bar: ramp(t, 0.3 + 0.08 * i, 0.9, 'outQuart'), value: ramp(t, 0.95 + 0.08 * i, 0.4),
  }));
  return { rows, label: ramp(t, 0, 0.5), hi: ramp(t, 1.9, 0.6), big: ramp(t, 2.2, 0.5) };
}

export function drawRanking(t) {
  const S = rankingState(t), out = [];
  const max = Math.max(...RANKING.map(r => r.pax));
  out.push(text('Annual passengers', [RK.barX, RK.labelY], { anchor: 'start', size: RK.labelSize, o: S.label }));
  RANKING.forEach((r, i) => {
    const y = RK.y0 - i * RK.dy, s = S.rows[i], lit = r.lit ? S.hi : 0, bold = r.lit ? 700 : 400;
    if (s.o <= 0.003) return;
    out.push(text(String(i + 1), [RK.rankX, y], { anchor: 'end', size: RK.size, weight: bold, o: s.o }));
    out.push(text(r.name, [RK.nameX, y], { anchor: 'start', size: RK.size, weight: bold, o: s.o }));
    out.push(text(r.country, [RK.countryX, y], { anchor: 'end', size: RK.countrySize, o: s.o }));
    const w = (RK.barMax * r.pax) / max * s.bar;
    if (w > 0.002) out.push(rect([RK.barX, y - RK.barH / 2], [RK.barX + w, y + RK.barH / 2], {
      fill: r.lit ? hexMix(BAR.calm, BAR.lit, lit) : BAR.calm, fo: 1, stroke: r.lit ? BAR.litEdge : 'none', w: 0.12 * lit,
      o: s.o, r: 0.15, glow: !!r.lit, bar: r.name }));
    const end = RK.barX + (RK.barMax * r.pax) / max;
    out.push(text(`${r.pax.toFixed(1)}M`, [end + 0.18, y], { anchor: 'start', size: RK.valueSize, weight: bold, o: s.value }));
    if (r.lit) out.push(text(`#${i + 1}`, [end + 1.25, y], { anchor: 'start', size: RK.big, weight: 700, o: S.big }));
  });
  return out;
}

// ---------------- the moves ----------------
export function feasibilityScene(ctx) {
  const ry = ctx.data?.concepts?.ryanair;
  function setup(source) {
    ctx.overlay.reset({ title: TITLES.test2, source });
    ctx.allowOrbit = false;
    ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
    ctx.world.plates.set([], { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
    go(ctx, SHOTS.flat, 900, ctx.instant);
  }
  // Back into a move from one after it (Left from the next move, or from the roadmap after the stage): it is whole.
  function cameBack(move) {
    const d = ctx.director;
    if (!d || !ctx.fromBeat || !d.state) return false;
    const st = d.state(), sc = d.scenes[st.scene];
    if (ctx.prevScene && ctx.prevScene !== sc) return d.scenes.indexOf(ctx.prevScene) > st.scene;
    const here = sc.beats.indexOf(move), from = sc.beats.indexOf(ctx.fromBeat);
    return here >= 0 && from > here;
  }
  const beats = [];
  if (ry?.steps) {
    const L = layoutSystem(ry, BUILD), plan = stepPlan(L, ry.steps);
    let clock = 0, fadeIn = false;
    const map = {
      id: 'feasibility-map',
      tile: { year: STEPS }, // the roadmap card's picture: the whole map (tools/tiles.js)
      timelapse: { from: 0, to: STEPS, secondsPerYear: 1.7, clickSteps: true, spaceSteps: true },
      enter(instant) {
        setup(MAP_SOURCE);
        if (cameBack(map)) ctx.director.setYear(STEPS);
        clock = ctx.director?.year() ?? 0;
        fadeIn = !instant; // settled (a zoom from its roadmap card, a still) or faded in
      },
      frame(c) { clock = c; },
      draw: t => drawMap(L, plan, clock, fadeIn ? ramp(t, 0, 0.6) : 1),
    };
    beats.push(map);
  }
  let settled = false;
  beats.push({
    id: 'feasibility-ranking',
    enter(instant) { setup(RANKING_SOURCE); settled = !!instant; },
    draw: t => drawRanking(settled ? 1e6 : t),
  });
  return { id: 'feasibility', beats };
}
