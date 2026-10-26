// Roadmap stage 4, "Assess feasibility of position": Ryanair at launch, then at relaunch, its activity system revealed
// here for the first time. Every screen's header is her short question (TITLES.feasibility). Its own two moves (the
// stage's line-up, with Q5's old pull and copy between them, is in src/flow/views.js):
//   feasibility-map      one thing per click (Left steps back one):
//                          0  black, the header alone
//                          1  Ryanair at launch (1986): its four pillars, slate, not Ryanair blue
//                          2  the links between them clash: red, jagged, flickering (low fares vs high service, busy
//                             routes, same operations as rivals)
//                          3  they go; Ryanair at relaunch: the four blue pillars, each where the launch pillar was
//                          4  the pillars link up
//                          5–7 the no-frills, lean-operations, and lowest-fares and secondary-markets activities
//                        Clicks 3–7 are her five slides (SMBC deck pp. 58–62): each click's bubbles fade and grow in,
//                        then their links draw. Bubbles, links and which slide adds them: data/concepts/ryanair.json
//                        (steps; launch for the opening). Layout: BUILD in src/concepts/activity.js. The stage's tile
//                        pictures the whole map. Back from the pull it grows back out of the pull's smaller map.
//   feasibility-ranking  Ryanair today (her p. 63 table), last: the world's largest airlines by annual passengers,
//                        ranked bars, Ryanair (#3) lit. Her table's asterisks (Ryanair, IndiGo *; easyJet **) are left
//                        off. After the copy, the copy's picture fades out as the bars come in.
// Back into the map from a later move, it is whole. Stills: ?beat=feasibility-map&export=1&year=N (0..7),
// ?beat=feasibility-ranking&export=1.

import { SHOTS } from '../rigmath.js';
import { TITLES, go, dur } from './common.js';
import { ramp } from '../anim.js';
import { text, rect, ellipse } from '../concepts/kit.js';
import { layoutSystem, layoutLaunch, mixLayout, stepPlan, stepState, BUILD, COPY_DX, MORPH_S } from '../concepts/activity.js';
import { drawSystem, drawLaunch, hexMix, BUILD_LOOK, RY_NAME, nameLabel } from '../concepts/activityDraw.js';
import { fadeShapes } from './photo.js';

export const MAP_SOURCE = 'Activity system after the failed launch; from course slides.';
export const LAUNCH_SOURCE = 'Ryanair’s 1986 launch; from course slides.';
export const STEPS = 7; // black, two clicks of the launch, then her five slides
export const RELAUNCH_AT = 3; // the click that brings the relaunch pillars (her first slide)
export const CLASH_WORDS = false; // true: a short word on each clash (ryanair.json launch.clashes[].word)

// ---------------- the map ----------------
const MAP_LOOK = { ...BUILD_LOOK, ringDur: 0.42, pillarRingDur: 0.3 }; // pillarRingDur: the relaunch pillars' (click 3)

// The opening's timing, in parts of a click (u = 0..1 while the clock runs from one click to the next).
//   click 1: the launch pillars fade and grow in, one after another, with the name
//   click 2: each clash grows from both its pillars until the halves meet (a spark; the two pillars jolt apart)
//   click 3: the launch fades out, its name gives way to the relaunch's, then the blue pillars come in
// Every transient is over before the click ends, so a whole click is a still picture.
export const OPEN = { pillarSpan: 0.45, pillarDur: 0.32, clashAt: 0.06, clashStep: 0.25, clashDur: 0.22, spark: 0.2,
  outDur: 0.32, nameOut: [0.08, 0.25], nameIn: [0.34, 0.3], inAt: 0.4, inStep: 0.08, inDur: 0.3 };
const HUBS = ['fares', 'frills', 'markets', 'lean'];
const LAUNCH = ['service', 'lowfares', 'busy', 'sameops'];
const clamp01 = v => Math.max(0, Math.min(1, v));
const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), out4 = t => 1 - Math.pow(1 - t, 4);

// The opening at click clock c: launch pillars {o, grow}, clashes (drawn fraction), sparks and jolts (0..1 while on,
// else null), the relaunch pillars {o, grow}, the two names' opacities, and the clock of her five slides (build).
export function openingState(c, { hubs = HUBS, launch = LAUNCH, clashes = 3, T = OPEN } = {}) {
  const u1 = c, u2 = c - 1, u3 = c - 2;
  const gone = clamp01(u3 / T.outDur), goneE = inOut(gone);
  const pillar = new Map(launch.map((id, i) => {
    const p = clamp01((u1 - (T.pillarSpan * i) / Math.max(1, launch.length - 1)) / T.pillarDur);
    return [id, { o: inOut(p) * (1 - goneE), grow: out4(p) - 0.4 * goneE }];
  }));
  const land = k => T.clashAt + k * T.clashStep + T.clashDur;
  const clash = Array.from({ length: clashes }, (_, k) => clamp01((u2 - T.clashAt - k * T.clashStep) / T.clashDur));
  const phase = k => { const q = (u2 - land(k)) / T.spark; return q > 0 && q < 1 ? q : null; };
  const spark = clash.map((_, k) => phase(k));
  const relaunch = new Map(hubs.map((id, i) => {
    const p = clamp01((u3 - T.inAt - i * T.inStep) / T.inDur);
    return [id, { o: inOut(p), grow: out4(p), p }];
  }));
  const name = {
    launch: inOut(clamp01(u1 / 0.3)) * (1 - inOut(clamp01((u3 - T.nameOut[0]) / T.nameOut[1]))),
    relaunch: inOut(clamp01((u3 - T.nameIn[0]) / T.nameIn[1])),
  };
  return { pillar, clash, spark, relaunch, name, build: Math.max(0, c - RELAUNCH_AT) };
}

// What the map move draws from: the relaunch map (L, her five slides' plan) and the launch pillars over it.
export function mapModel(ry) {
  const L = layoutSystem(ry, BUILD);
  return { L, plan: stepPlan(L, ry.steps), launch: layoutLaunch(ry, L) };
}

// The map at click clock c (0 = black, 7 = the whole map; between, a click's things arriving). o fades it all;
// t: seconds (the clashes' flicker; huge, as in a still, holds them still); L: a layout to draw the relaunch map in
// instead of M.L (the turn back from the pull's smaller map).
export function drawMap(M, c, { o = 1, t = 1e6, L = M.L } = {}) {
  const S = openingState(c), st = stepState(M.plan, S.build), out = [], over = [];
  const T = (id, s = M.plan.nodeStep.get(id)) => s + M.plan.nodeU.get(id); // when a bubble arrives (steps, then within)
  const ring = (n, q) => { // a ring runs out from each new bubble as it arrives, gone by the click's end
    if (q > 0.05 && q < 1) over.push(ellipse([n.x, n.y], n.rx + 0.4 * q, n.ry + 0.4 * q,
      { stroke: '#BFE4FF', w: 0.3, o: o * 0.7 * (1 - q), glow: true }));
  };
  for (const n of L.nodes) {
    const s = M.plan.nodeStep.get(n.id), r = S.relaunch.get(n.id);
    if (r) ring(n, (c - 2 - OPEN.inAt - HUBS.indexOf(n.id) * OPEN.inStep) / MAP_LOOK.pillarRingDur);
    else if (s) ring(n, (S.build - (s - 1) - M.plan.nodeU.get(n.id)) / MAP_LOOK.ringDur);
  }
  if (S.name.launch > 0.003) out.push(nameLabel(RY_NAME.launch, o * S.name.launch));
  if (S.name.relaunch > 0.003) out.push(nameLabel(RY_NAME.relaunch, o * S.name.relaunch));
  if (c < RELAUNCH_AT) {
    const LL = M.launch, jolt = new Map();
    LL.clashes.forEach((cl, k) => { // the two pillars knock apart as their clash lands, and settle
      const q = S.spark[k];
      if (q == null) return;
      const a = LL.byId.get(cl.a), b = LL.byId.get(cl.b), d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const e = 0.22 * Math.sin(Math.PI * q) * (1 - q), ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
      for (const [id, sg] of [[cl.a, -1], [cl.b, 1]]) {
        const j = jolt.get(id) || { x: 0, y: 0, f: 0 };
        jolt.set(id, { x: j.x + sg * ux * e, y: j.y + sg * uy * e, f: Math.max(j.f, 1 - q) });
      }
    });
    out.push(...drawLaunch(LL, {
      alpha: o, t,
      nodeO: id => S.pillar.get(id).o,
      scale: id => 0.75 + 0.25 * S.pillar.get(id).grow,
      shake: id => { const j = jolt.get(id); return j ? [j.x, j.y] : [0, 0]; },
      flash: id => jolt.get(id)?.f || 0,
      clashF: k => S.clash[k], spark: k => S.spark[k],
      word: k => (CLASH_WORDS ? LL.clashes[k].word || '' : ''),
    }));
  }
  const nodeO = id => (S.relaunch.has(id) ? S.relaunch.get(id).o : st.node.get(id).o);
  const grow = id => (S.relaunch.has(id) ? S.relaunch.get(id).grow : st.node.get(id).grow);
  return out.concat(drawSystem(L, {
    alpha: o, over, linkW: MAP_LOOK.linkW, edgeW: MAP_LOOK.edgeW,
    from: l => (T(l.a) <= T(l.b) ? l.a : l.b), // a link grows out of the bubble that was there first
    nodeO,
    scale: id => 0.75 + 0.25 * grow(id),
    linkF: k => st.link[k],
  }));
}

// The source line under the map: none on black, the launch's, then the system's.
export const sourceAt = c => (c < 0.02 ? '' : c < RELAUNCH_AT - 1 + OPEN.inAt ? LAUNCH_SOURCE : MAP_SOURCE);

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
    ctx.overlay.reset({ title: TITLES.feasibility, source });
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
    const M = mapModel(ry), SYS = layoutSystem(ry); // SYS: the pull's and the copy's smaller map (src/scenes/q6.js)
    let clock = 0, fadeIn = false, turn = null, src = '';
    const map = {
      id: 'feasibility-map',
      tile: { year: STEPS }, // the roadmap card's picture: the whole map (tools/tiles.js)
      timelapse: { from: 0, to: STEPS, secondsPerYear: 1.7, clickSteps: true, spaceSteps: true },
      enter(instant) {
        if (cameBack(map)) ctx.director.setYear(STEPS);
        clock = ctx.director?.year() ?? 0;
        src = sourceAt(clock);
        setup(src);
        // Left from the pull (or the copy): the pull's smaller map grows back into this one; otherwise settled (a zoom
        // from its roadmap card, a still) or faded in
        const from = instant ? null : ctx.fromBeat?.id;
        turn = from === 'q6-pull' ? { dx: 0 } : from === 'q6-copy' ? { dx: COPY_DX } : null;
        fadeIn = !instant && !turn;
      },
      frame(c) {
        clock = c;
        const s = sourceAt(c);
        if (s !== src) { src = s; ctx.overlay.source?.(s); }
      },
      draw: t => {
        const k = turn ? ramp(t, 0, MORPH_S, 'inOutSine') : 1;
        return drawMap(M, clock, { o: fadeIn ? ramp(t, 0, 0.6) : 1, t, L: k < 1 ? mixLayout(SYS, M.L, k, { dxA: turn.dx }) : M.L });
      },
    };
    beats.push(map);
  }
  // Ryanair today, last. After the copy (or whichever stage-4 move came before it) that picture fades out first.
  let settled = false, carry = null;
  const ranking = {
    id: 'feasibility-ranking',
    enter(instant) {
      setup(RANKING_SOURCE);
      settled = !!instant || cameBack(ranking); // a zoom, a still, or Left from the roadmap after the stage: drawn
      const f = instant ? null : ctx.fromBeat;
      carry = f && CARRY.from.has(f.id) && f.draw ? f.draw : null;
    },
    draw: t => {
      if (settled) return drawRanking(1e6);
      const under = carry && t < CARRY.s ? fadeShapes(carry(1e6), 1 - ramp(t, 0, CARRY.s)) : null;
      const own = drawRanking(carry ? t - CARRY.lead : t);
      return under ? under.concat(own) : own;
    },
  };
  beats.push(ranking);
  return { id: 'feasibility', beats };
}
// The ranking after one of these: their settled picture fades over s seconds; the bars start lead seconds later.
export const CARRY = { from: new Set(['q6-copy', 'q6-pull', 'feasibility-map']), s: 0.6, lead: 0.3 };
