// Q7: tag the top and bottom fifth in a start year (the scatter on the left). Each group then
// collapses into one dot on the right, its median firm, which traces the next 15 years.
// Repeated for four start years; earlier decades stay on as faint lines.

import { cohortAt, traceAt, collapseAt, Q7_IDS, AGG_SIZE, FRAME } from '../layouts.js';
import { SHOTS } from '../rigmath.js';
import { TAG, hexToRgb } from '../colors.js';
import { TITLES, SOURCES, ROA_TICKS, pinLabels, go, dur } from './common.js';

export const Q7_RANGE = [-0.15, 0.35]; // where almost all of these firms sit; a few outliers ride the edge
const SCATTER_X1 = FRAME.xMin + 7.4;
const TRACE = { x0: FRAME.xMin + 8.7, x1: FRAME.xMax - 0.6 };
const COLLAPSE_MS = 2800, REFORM_MS = 1500;
const RGB = { top: hexToRgb(TAG.top), bottom: hexToRgb(TAG.bottom) };
const GROUPS = ['top', 'bottom'];

const dot = (g, p, alpha = 1, size = AGG_SIZE) => ({
  x: p.x, y: p.y, z: 0, size, color: RGB[g], alpha, tower: 0, towerBase: 0, towerW: 0.1, towerD: 0.1,
});

export function q7Scene(ctx) {
  const q7 = ctx.data.q7_cohorts;
  const starts = Object.keys(q7.starts).map(Number).sort((a, b) => a - b);
  const C = starts.map(s => q7.starts[String(s)]);
  const last = C.length - 1;
  const pool = ctx.index.q7Pool;
  const scatterAt = (k, o) => cohortAt(C[k], o, { xMax: SCATTER_X1, range: Q7_RANGE }).agents;
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

  // the whole picture for cohort k, o years in
  function stateAt(k, o) {
    const tr = trace(k, o), P = past(k);
    const agents = new Map([...scatterAt(k, o), ...P.dots]);
    for (const g of GROUPS) agents.set(Q7_IDS.agg(k, g), dot(g, tr[g]));
    const paths = P.paths.concat({ pts: tr.pathAll, color: '#FFFFFF', opacity: 0.9, width: 0.34 }, // all firms
      { pts: tr.pathTop, color: TAG.top, width: 0.6, glow: true }, // the dot draws its line
      { pts: tr.pathBottom, color: TAG.bottom, width: 0.6, glow: true });
    return { agents, paths };
  }

  let header = 'Median firm';
  function chartLabels() {
    const { x0, x1 } = TRACE, n = C[0].years.length - 1;
    const out = [0, 5, 10, 15].filter(v => v <= n).map(v => ({
      key: `tx${v}`, text: v === 15 ? '15 years' : String(v), frame: true,
      at: [x0 + (v / n) * (x1 - x0), FRAME.yMin - 0.1, 0], anchor: 'below', cls: 'small' }));
    out.push({ key: 'thead', text: header, frame: true, at: [(x0 + x1) / 2, FRAME.yMax + 0.05, 0], anchor: 'above', cls: 'small' });
    return out.concat(pinLabels(ctx));
  }

  function setup(k, legendText = s => [`Top fifth in ${s}`, `Bottom fifth in ${s}`], x1 = FRAME.xMax, withAll = false) {
    const [a, b] = legendText(starts[k]);
    header = 'Median firm';
    ctx.overlay.reset({ title: TITLES.q7, source: q7.source_line || SOURCES.q7 });
    ctx.overlay.legend([{ color: TAG.top, text: a }, { color: TAG.bottom, text: b },
      ...(withAll ? [{ color: '#FFFFFF', text: 'All firms' }] : [])]); // the white line shows only while tracing
    ctx.overlay.axis({ label: 'Return on assets', ticks: ROA_TICKS, x0: FRAME.xMin, x1 });
    ctx.world.setYRange(Q7_RANGE[0], Q7_RANGE[1], { duration: dur(ctx, 1600) });
    ctx.world.plates.set([], { duration: dur(ctx, 1200) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.allowOrbit = false;
    ctx.world.setGlow(0.22);
  }

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
    timelapse: { from: starts[k], to: starts[k] + end(k), secondsPerYear: 0.9 },
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
      // two builds: the first cohort in full, then a skip to the last, the cohorts between shown as faint ghost traces
      ...C.flatMap((_, k) => (k === 0 || k === last ? [collapseBeat(k), traceBeat(k)] : [])),
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
