// Q6 "Does advantage last?" (module q7). The 2010 cohort, one thing per click:
//   q7-scatter-2010   every company's return in 2010, one dot each, no groups yet (click dots to name them)
//   q7-tag-2010       the top and bottom fifths light up, named beside them
//   q7-collapse-2010  each fifth streams into one dot on the right: its median company
//   q7-trace-2010     lines only: 2010-25 plays on the right beside the all-firm median; the left dims and holds still
//   q7-jumble-2010    the lines stay drawn and a dot rides each one while the left replays the same years, only the
//                     two fifths bright: two colours sinking into the crowd
// The two runs start by themselves (after a moment on 2010): a click mid-run finishes it, the next click moves on;
// Left back into a run (or into the collapse) finds it finished.
// Also built, hidden in the module (src/flow/modules.js): the 1975 run (q7-start, q7-collapse-1975, q7-trace-1975),
// whose scatter moves while its dots trace. q7-all (every start year together) plays under Stages.

import { cohortAt, COHORT_LOOK, traceAt, collapseAt, cohortMedian, roaToY, Q7_IDS, AGG_SIZE, FRAME } from '../layouts.js';
import { SHOTS } from '../rigmath.js';
import { TAG, hexToRgb } from '../colors.js';
import { ramp } from '../anim.js';
import { clamp01 } from '../tween.js';
import { TITLES, SOURCES, ROA_TICKS, pinLabels, go, dur } from './common.js';

export const Q7_RANGE = [-0.15, 0.35]; // where almost all of these firms sit; a few outliers ride the edge
const SCATTER_X1 = FRAME.xMin + 7.4;
const TRACE = { x0: FRAME.xMin + 8.7, x1: FRAME.xMax - 0.6 };
const COLLAPSE_MS = 2800, REFORM_MS = 1500, GATHER_WAIT_MS = 200;
const RGB = { top: hexToRgb(TAG.top), bottom: hexToRgb(TAG.bottom) };
const GROUPS = ['top', 'bottom'];
const WHITE = '#FFFFFF';

// The 2010 run's looks: opacities of the scatter (and of pinned names) in each state.
export const LOOK = {
  plain: 0.75,   // before the fifths are tagged: every company the same white dot
  dim: 0.08,     // the left while the lines trace: nearly black
  faint: 0.75,   // the rest of the crowd while the fifths replay (times its usual opacity): faint, still a crowd
  nameDim: 0.12, // pinned names while the left is dimmed
};
export const LEAD = 1;           // clock years each run holds on its start before the years play (the picture settles)
const SECONDS_PER_YEAR = 0.9;
const NAME_SIZE = 2.6;           // the fifths' names, in stage units (1% of its height)
const U = FRAME.viewHeight / 100; // one stage unit in world units, on the flat shot

const dot = (g, p, alpha = 1, size = AGG_SIZE) => ({
  x: p.x, y: p.y, z: 0, size, color: RGB[g], alpha, tower: 0, towerBase: 0, towerW: 0.1, towerD: 0.1,
});
const PLAIN = (g, r) => ({ color: [1, 1, 1], size: r * 0.9, weight: LOOK.plain });
const FIFTHS_ONLY = (g, r) => {
  const L = COHORT_LOOK(g, r);
  return g === 'middle' ? { ...L, weight: L.weight * LOOK.faint } : L;
};
const scaled = (agents, f) => new Map([...agents].map(([id, a]) => [id, { ...a, alpha: a.alpha * f }]));
// years into a run for clock y (the lead-in before the start holds at 0)
const runOffset = (y, start, n) => Math.max(0, Math.min(n, y - start));

export function q7Scene(ctx) {
  const q7 = ctx.data.q7_cohorts;
  const starts = Object.keys(q7.starts).map(Number).sort((a, b) => a - b);
  const C = starts.map(s => q7.starts[String(s)]);
  const last = C.length - 1;
  const pool = ctx.index.q7Pool;
  const scatterAt = (k, o, look) => cohortAt(C[k], o, { xMax: SCATTER_X1, range: Q7_RANGE, look }).agents;
  const trace = (k, o) => traceAt(C[k], o, TRACE);
  const end = k => C[k].years.length - 1;

  // finished traces of the cohorts before k: faint lines and small dots (strong in the closing view)
  function past(k, strong = false) {
    const paths = [], dots = new Map();
    for (let j = 0; j < k; j++) {
      const tr = trace(j, end(j)), op = strong ? 0.9 : 0.4;
      if (strong) paths.push({ pts: tr.pathAll, color: '#FFFFFF', opacity: 0.55, width: 0.3 });
      paths.push({ pts: tr.pathTop, color: TAG.top, opacity: op, width: strong ? 0.5 : 0.38, glow: strong },
        { pts: tr.pathBottom, color: TAG.bottom, opacity: op, width: strong ? 0.5 : 0.38, glow: strong });
      for (const g of GROUPS) dots.set(Q7_IDS.agg(j, g), dot(g, tr[g], strong ? 0.85 : 0.35, AGG_SIZE * 0.5));
    }
    return { paths, dots };
  }

  // the cohort's three lines, o years in: all firms (white), and the two fifths' median firms
  const lines = tr => [{ pts: tr.pathAll, color: '#FFFFFF', opacity: 0.9, width: 0.34 },
    { pts: tr.pathTop, color: TAG.top, width: 0.6, glow: true }, // the dot draws its line
    { pts: tr.pathBottom, color: TAG.bottom, width: 0.6, glow: true }];

  // the whole picture for cohort k, o years in
  function stateAt(k, o) {
    const tr = trace(k, o), P = past(k);
    const agents = new Map([...scatterAt(k, o), ...P.dots]);
    for (const g of GROUPS) agents.set(Q7_IDS.agg(k, g), dot(g, tr[g]));
    return { agents, paths: P.paths.concat(lines(tr)) };
  }

  let header = 'Median firm';
  function chartLabels(withPins = true) {
    const { x0, x1 } = TRACE, n = C[0].years.length - 1;
    const out = [0, 5, 10, 15].filter(v => v <= n).map(v => ({
      key: `tx${v}`, text: v === 15 ? '15 years' : String(v), frame: true,
      at: [x0 + (v / n) * (x1 - x0), FRAME.yMin - 0.1, 0], anchor: 'below', cls: 'small' }));
    out.push({ key: 'thead', text: header, frame: true, at: [(x0 + x1) / 2, FRAME.yMax + 0.05, 0], anchor: 'above', cls: 'small' });
    return withPins ? out.concat(pinLabels(ctx)) : out;
  }

  // legendText: null for no legend (the 2010 run names its groups on the chart)
  function setup(k, legendText = s => [`Top fifth in ${s}`, `Bottom fifth in ${s}`], x1 = FRAME.xMax, withAll = false) {
    header = 'Median firm';
    ctx.overlay.reset({ title: TITLES.q7, source: q7.source_line || SOURCES.q7 });
    if (legendText) {
      const [a, b] = legendText(starts[k]);
      ctx.overlay.legend([{ color: TAG.top, text: a }, { color: TAG.bottom, text: b },
        ...(withAll ? [{ color: '#FFFFFF', text: 'All firms' }] : [])]); // the white line shows only while tracing
    }
    ctx.overlay.axis({ label: 'Return on assets', ticks: ROA_TICKS, x0: FRAME.xMin, x1 });
    ctx.world.setYRange(Q7_RANGE[0], Q7_RANGE[1], { duration: dur(ctx, 1600) });
    ctx.world.plates.set([], { duration: dur(ctx, 1200) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.allowOrbit = false;
    ctx.world.setGlow(0.22);
  }

  // ---------------- the 1975 run (kept; hidden in the module) ----------------

  // Click: the tagged firms stream into their group's dot (for later decades the scatter re-forms first).
  const collapseBeat = k => {
    let t0 = 0, wait = 0, scatter0 = null;
    return {
      id: `q7-collapse-${starts[k]}`,
      enter(instant) {
        setup(k);
        go(ctx, SHOTS.flat, 900, instant);
        scatter0 = scatterAt(k, 0);
        const P = past(k);
        ctx.world.setTargets(new Map([...scatter0, ...P.dots]),
          { duration: dur(ctx, k ? REFORM_MS : 600), stagger: k ? 0.3 : 0 });
        ctx.overlay.paths(P.paths);
        ctx.overlay.year(starts[k]);
        wait = k ? REFORM_MS * 1.3 : 200;
        t0 = instant ? -Infinity : performance.now();
      },
      tick(now) {
        const p = Math.max(0, Math.min(1, (now - t0 - wait) / COLLAPSE_MS));
        if (p <= 0) return;
        const tr = trace(k, 0);
        ctx.world.setSome(collapseAt(C[k], p, scatter0, { top: tr.top, bottom: tr.bottom }, { pool, k }));
      },
      labels: chartLabels,
    };
  };

  // Space plays the 15 years: the scatter moves on the left, the two dots trace on the right.
  const traceBeat = k => ({
    id: `q7-trace-${starts[k]}`,
    timelapse: { from: starts[k], to: starts[k] + end(k), secondsPerYear: SECONDS_PER_YEAR },
    enter(instant) {
      setup(k, undefined, FRAME.xMax, true);
      go(ctx, SHOTS.flat, 900, instant);
      const S = stateAt(k, 0);
      ctx.world.setTargets(S.agents, { duration: dur(ctx, 600) });
      ctx.overlay.paths(S.paths);
      ctx.overlay.year(starts[k]);
    },
    frame(y) {
      if (y <= starts[k] + 1e-6 && ctx.world.busy()) return;
      const S = stateAt(k, y - starts[k]);
      ctx.world.setNow(S.agents);
      ctx.overlay.paths(S.paths);
      ctx.overlay.year(Math.floor(y + 1e-6));
    },
    labels: chartLabels,
  });

  // ---------------- the 2010 run: one thing per click ----------------

  // Whether we came back into this move from a later move of the same module (Left, or back from the punchline).
  function cameBack(move) {
    const d = ctx.director, sc = d?.scenes?.[d.state().scene];
    if (!sc || !ctx.fromBeat) return false;
    const here = sc.beats.indexOf(move), from = sc.beats.indexOf(ctx.fromBeat);
    return here >= 0 && from > here;
  }
  // A run starts by itself on entry (and starts over on Esc); back into it, or entered settled (export), it is finished.
  function startRun(move, instant) {
    const d = ctx.director, tl = move.timelapse;
    if (!d) return;
    if (instant || cameBack(move)) { d.setYear(tl.to); d.pause(); }
    else { d.setYear(tl.from); d.play(); }
  }
  const runClock = k => ({ from: starts[k] - LEAD, to: starts[k] + end(k), secondsPerYear: SECONDS_PER_YEAR });
  const clockYear = move => (ctx.director ? ctx.director.year() : move.timelapse.from);

  // The fifths' names, white: beside their groups on the scatter, or by their dots where the lines start.
  const allMedian = k => C[k]._medianAll || (C[k]._medianAll = cohortMedian(C[k]));
  function fifthNames(k, where, o = 1) {
    if (o <= 0.003) return [];
    const s = C[k].summary, at = where === 'scatter'
      ? { top: [SCATTER_X1 + 0.25, roaToY(s.median_top[0]).y], bottom: [SCATTER_X1 + 0.25, roaToY(s.median_bottom[0]).y] }
      : { top: [TRACE.x0 - 0.12, roaToY(s.median_top[0] + 0.035).y], bottom: [TRACE.x0 - 0.12, roaToY(s.median_bottom[0] - 0.055).y] }; // clear of the zero line
    return [{ k: 'text', text: `Top fifth in ${starts[k]}`, at: at.top, size: NAME_SIZE, color: WHITE, anchor: 'start', o },
      { k: 'text', text: `Bottom fifth in ${starts[k]}`, at: at.bottom, size: NAME_SIZE, color: WHITE, anchor: 'start', o }];
  }
  const allName = (k, o = 1) => (o <= 0.003 ? [] : [{ k: 'text', text: 'All firms', size: NAME_SIZE, color: WHITE,
    anchor: 'start', o, at: [TRACE.x0 - 0.12, roaToY(allMedian(k)[0] + 0.025).y] }]);
  // pinned names drawn faint (while the left is dimmed), where the overlay would put them
  const pinShapes = o => pinLabels(ctx).flatMap(L => [
    { k: 'circle', at: [L.at[0], L.at[1]], r: 0.95, stroke: WHITE, w: 0.15, o },
    { k: 'text', text: L.text, at: [L.at[0] + 1.1 * U, L.at[1]], size: 2.1, color: WHITE, anchor: 'start', o },
  ]);

  // Every company's 2010 return as a dot, all alike. She can click dots to name them now, to follow them later.
  const scatterBeat = k => {
    const move = {
      id: `q7-scatter-${starts[k]}`,
      enter(instant) {
        setup(k, null, SCATTER_X1 + 0.3); // the right half stays empty until the collapse
        go(ctx, SHOTS.flat, 1600, instant);
        ctx.world.setTargets(scatterAt(k, 0, PLAIN),
          cameBack(move) ? { duration: dur(ctx, 900) } : { duration: dur(ctx, 2600), stagger: 0.5 });
        ctx.overlay.year(starts[k]);
      },
      labels: () => pinLabels(ctx),
    };
    return move;
  };

  // The top and bottom fifths light up in their colours (the rest fade back), named beside them.
  const tagBeat = k => ({
    id: `q7-tag-${starts[k]}`,
    enter(instant) {
      setup(k, null, SCATTER_X1 + 0.3);
      go(ctx, SHOTS.flat, 900, instant);
      ctx.world.setTargets(scatterAt(k, 0), { duration: dur(ctx, 1200) });
      ctx.overlay.year(starts[k]);
    },
    draw: t => fifthNames(k, 'scatter', ramp(t, 0.5, 0.7)),
    labels: () => pinLabels(ctx),
  });

  // Each fifth streams into one dot on the right, its median company; the names move to the dots.
  const gatherBeat = k => {
    let t0 = 0, scatter0 = null;
    const progress = now => clamp01((now - t0 - GATHER_WAIT_MS) / COLLAPSE_MS);
    const move = {
      id: `q7-collapse-${starts[k]}`,
      enter(instant) {
        setup(k, null);
        go(ctx, SHOTS.flat, 900, instant);
        scatter0 = scatterAt(k, 0);
        ctx.world.setTargets(scatter0, { duration: dur(ctx, 600) });
        ctx.overlay.paths([]);
        ctx.overlay.year(starts[k]);
        t0 = instant || cameBack(move) ? -Infinity : performance.now(); // back from the lines: already gathered
      },
      tick(now) {
        const p = progress(now);
        if (p <= 0) return;
        const tr = trace(k, 0);
        ctx.world.setSome(collapseAt(C[k], p, scatter0, { top: tr.top, bottom: tr.bottom }, { pool, k }));
      },
      draw() {
        const now = performance.now();
        return [...fifthNames(k, 'scatter', 1 - ramp((now - t0) / 1000, 0, 0.4)),
          ...fifthNames(k, 'lines', ramp(progress(now), 0.8, 0.2))];
      },
      labels: chartLabels,
    };
    return move;
  };

  // Lines only: the years play on the right, the two dots tracing beside the all-firm median. The left dims nearly
  // to black and holds still (its pinned names dim with it). Starts by itself.
  const linesBeat = k => {
    const n = end(k);
    const move = {
      id: `q7-trace-${starts[k]}`,
      timelapse: runClock(k),
      enter(instant) {
        setup(k, null);
        go(ctx, SHOTS.flat, 900, instant);
        startRun(move, instant);
        const o = runOffset(clockYear(move), starts[k], n), tr = trace(k, o);
        const agents = scaled(scatterAt(k, 0), LOOK.dim);
        for (const g of GROUPS) agents.set(Q7_IDS.agg(k, g), dot(g, tr[g]));
        ctx.world.setTargets(agents, { duration: dur(ctx, 900) });
        ctx.overlay.paths(lines(tr));
        ctx.overlay.year(Math.floor(starts[k] + o + 1e-6));
      },
      frame(y) {
        const tr = trace(k, runOffset(y, starts[k], n));
        ctx.world.setSome(new Map(GROUPS.map(g => [Q7_IDS.agg(k, g), dot(g, tr[g])]))); // only the two dots move
        ctx.overlay.paths(lines(tr));
        ctx.overlay.year(Math.floor(starts[k] + runOffset(y, starts[k], n) + 1e-6));
      },
      draw: t => [...fifthNames(k, 'lines'), ...allName(k, ramp(t, 0.3, 0.6)),
        ...pinShapes(1 - (1 - LOOK.nameDim) * ramp(t, 0, 0.9))],
      labels: () => chartLabels(false), // the pinned names are drawn dim instead
    };
    return move;
  };

  // The jumble: the lines stay drawn, a dot rides each one at the current year, and the left comes back up to replay
  // the same years with only the two fifths bright. Pinned names follow their companies. Starts by itself.
  const jumbleBeat = k => {
    const n = end(k);
    const state = o => {
      const tr = trace(k, o), agents = scatterAt(k, o, FIFTHS_ONLY);
      for (const g of GROUPS) agents.set(Q7_IDS.agg(k, g), dot(g, tr[g]));
      return agents;
    };
    const move = {
      id: `q7-jumble-${starts[k]}`,
      timelapse: runClock(k),
      enter(instant) {
        setup(k, null);
        go(ctx, SHOTS.flat, 900, instant);
        startRun(move, instant);
        const o = runOffset(clockYear(move), starts[k], n), tr = trace(k, o);
        // the dots leave the ends of their lines and come back where the run is (no slide across the chart)
        ctx.world.setSome(new Map(GROUPS.map(g => [Q7_IDS.agg(k, g), dot(g, tr[g], 0)])));
        ctx.world.setTargets(state(o), { duration: dur(ctx, 800) });
        ctx.overlay.paths(lines(trace(k, n)));
        ctx.overlay.year(Math.floor(starts[k] + o + 1e-6));
      },
      frame(y) {
        const o = runOffset(y, starts[k], n);
        if (o <= 0 && ctx.world.busy()) return; // the crowd is still coming back up
        ctx.world.setNow(state(o));
        ctx.overlay.year(Math.floor(starts[k] + o + 1e-6));
      },
      draw: () => [...fifthNames(k, 'lines'), ...allName(k)],
      labels: chartLabels,
    };
    return move;
  };

  return {
    id: 'q7',
    beats: [
      {
        id: 'q7-start',
        enter(instant) {
          setup(0, undefined, SCATTER_X1 + 0.3); // the right half stays empty until the collapse
          go(ctx, SHOTS.flat, 1600, instant);
          ctx.world.setTargets(scatterAt(0, 0), { duration: dur(ctx, 2600), stagger: 0.5 });
          ctx.overlay.year(starts[0]);
        },
        labels: () => pinLabels(ctx),
      },
      collapseBeat(0), traceBeat(0), // the 1975 run, hidden in the module
      scatterBeat(last), tagBeat(last), gatherBeat(last), linesBeat(last), jumbleBeat(last),
      {
        id: 'q7-all',
        enter(instant) {
          setup(last, () => ['Top fifth at the start', 'Bottom fifth at the start'], FRAME.xMax, true);
          header = `Median firm, starting ${starts.join(', ')}`;
          go(ctx, SHOTS.flat, 900, instant);
          const P = past(C.length, true);
          const faint = new Map([...scatterAt(last, end(last))].map(([id, a]) => [id, { ...a, alpha: a.alpha * 0.3 }]));
          ctx.world.setTargets(new Map([...faint, ...P.dots]), { duration: dur(ctx, 1200) });
          ctx.overlay.paths(P.paths);
        },
        labels: chartLabels,
      },
    ],
  };
}
