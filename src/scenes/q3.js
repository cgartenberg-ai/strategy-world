// Q3: it opens on the familiar industry bars (as in Q2), then every firm pours out of them as the axis widens
// (reveal B). Then zoom into one industry, and the financials view.

import { flat, roaToY, FRAME, beeswarm } from '../layouts.js';
import { SHOTS } from '../rigmath.js';
import { TITLES, SOURCES, ROA_TICKS, castLabels, go, dur, sectorLegend } from './common.js';
import { industryViews, BARS_RANGE, BARS_TICKS } from './q2.js';

export function q3Scene(ctx) {
  const q2 = ctx.data.q2q3_landscape, fin = ctx.data.q3_financials;
  const V = (ctx.views = ctx.views || industryViews(q2));
  const FF = flat(fin);
  const finViews = industryViews(fin);

  const plateTop = new Map();
  q2.firms.forEach(f => plateTop.set(f[0], V.F.plates[f[1]].top));

  const zoomName = ctx.cast.zoom_industry || (q2.industries.find(i => i.industry === 'Airlines') ? 'Airlines' : q2.industries[q2.industries.length - 1].industry);
  const zk = Math.max(0, q2.industries.findIndex(i => i.industry === zoomName));
  // the airline close-up names the big carriers and the low-cost carriers only (not regional or cargo firms)
  const AIRLINE_NAMES = ['UNITED AIRLINES', 'DELTA AIR', 'AMERICAN AIRLINES', 'SOUTHWEST', 'JETBLUE', 'SPIRIT', 'FRONTIER'];
  const byName = AIRLINE_NAMES.map(n => q2.firms.find(f => q2.industries[f[1]]?.industry === 'Airlines' && String(f[5]).toUpperCase().includes(n)))
    .filter(Boolean).map(f => f[0]);
  const zoomCast = zoomName === 'Airlines' && byName.length ? byName : (ctx.cast.scenes?.[zoomName] || []).map(c => c.permco);
  const zoomShot = { target: [V.c[zk], roaToY(q2.industries[zk].median).y, 0], az: 0, el: 0, fov: 3.5, vh: 4.0 };

  // Close-up: the chosen industry's firms spread out sideways (heights unchanged); the rest dim.
  const zFirms = q2.firms.filter(f => f[1] === zk);
  const zx = beeswarm(zFirms.map(f => roaToY(f[2]).y), V.c[zk], 2.2, 0.2, 101); // loose spacing for the close-up
  const zoomX = new Map(zFirms.map((f, i) => [f[0], zx[i]]));
  const zoomAgents = new Map([...V.F.agents].map(([id, a]) => [id,
    zoomX.has(id) ? { ...a, x: zoomX.get(id), size: Math.max(0.04, a.size) } : { ...a, alpha: 0 }])); // just this industry

  function setup(source = q2.source_line || SOURCES.q2, rangeMs = 900, inds = q2.industries) {
    ctx.overlay.reset({ title: TITLES.q3, source });
    ctx.overlay.legend(sectorLegend(inds));
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, rangeMs) }); // wide axis: room for every firm
    ctx.allowOrbit = false;
    ctx.world.setGlow(0.26);
  }
  const axis = label => ctx.overlay.axis({ label, ticks: ROA_TICKS });
  const allDots = (instant, ms = 900) => {
    ctx.world.setTargets(V.F.agents, { duration: dur(ctx, ms), stagger: 0.3 });
    ctx.world.plates.set(V.F.plates, { duration: dur(ctx, ms) });
  };

  return {
    id: 'q3',
    beats: [
      {
        // the bars alone, on Q2's tight axis: the familiar picture before the firms arrive
        id: 'q3-bars',
        enter(instant) {
          setup();
          ctx.world.setYRange(BARS_RANGE[0], BARS_RANGE[1], { duration: dur(ctx, 900) });
          ctx.overlay.axis({ label: 'Return on assets', ticks: BARS_TICKS });
          go(ctx, SHOTS.flat, 900, instant);
          ctx.world.setTargets(new Map(), { duration: dur(ctx, 700) });
          ctx.world.plates.set(V.F.plates, { duration: dur(ctx, 900), body: 0.5 });
          ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
        },
        labels: () => V.flatLabels(),
      },
      {
        id: 'q3-dots',
        enter(instant) {
          setup(undefined, 2600); axis('Return on assets'); // the axis widens as the firms pour in; bars shrink
          go(ctx, SHOTS.flat, 900, instant);
          ctx.world.setTargets(V.F.agents, {
            duration: dur(ctx, 2600), stagger: 0.6,
            appearFrom: (id, a) => [a.x, plateTop.get(id) ?? a.y, 0], // dots pour out of the average
          });
          ctx.world.plates.set(V.F.plates, { duration: dur(ctx, 600) });
        },
        labels: () => V.flatLabels().concat(castLabels(ctx)),
      },
      {
        id: 'q3-spread',
        enter(instant) {
          setup(); axis('Return on assets');
          go(ctx, SHOTS.flat, 900, instant);
          allDots(instant);
          ctx.overlay.spread(V.F.plates.map(p => ({ x: p.x, width: p.width * 0.5, median: p.median, q1: p.q1, q3: p.q3 })));
        },
        labels: () => V.flatLabels().concat(castLabels(ctx)),
      },
      {
        id: 'q3-zoom',
        enter(instant) {
          setup();
          ctx.overlay.legend([]); // one industry: no sector key
          // the close-up frames one industry: axis starts at the left of the view, neighbours dim
          ctx.overlay.axis({ label: '', ticks: ROA_TICKS, x0: V.c[zk] - 3.3, x1: V.c[zk] + 3.3, clipTop: 0.2, clipBottom: 0.9 });
          go(ctx, zoomShot, 2600, instant);
          ctx.world.setTargets(zoomAgents, { duration: dur(ctx, 1600) });
          ctx.world.plates.set(V.F.plates.map(p => ({ ...p, opacity: 0 })), { duration: dur(ctx, 800) }); // no bar: just the firms
        },
        labels: () => [{ key: 'zoomind', text: zoomName, at: [V.c[zk], roaToY(-0.115).y, 0], anchor: 'below', cls: 'band' }] // below the firms
          .concat(castLabels(ctx, { sceneCast: zoomCast, core: [], max: zoomCast.length })),
      },
      {
        id: 'q3-fin',
        enter(instant) {
          setup(fin.source_line || SOURCES.fin, 900, fin.industries); axis('Return on equity');
          go(ctx, SHOTS.flat, 2200, instant);
          ctx.world.setTargets(FF.agents, { duration: dur(ctx, 2200), stagger: 0.5 });
          ctx.world.plates.set(FF.plates, { duration: dur(ctx, 2200) });
        },
        labels: () => finViews.flatLabels().concat(castLabels(ctx, {
          sceneCast: (ctx.cast.scenes?.Banks || []).map(c => c.permco) })),
      },
      {
        id: 'q3-all',
        enter(instant) {
          setup(); axis('Return on assets');
          go(ctx, SHOTS.flat, 1600, instant);
          allDots(instant, 1800);
        },
        labels: () => V.flatLabels().concat(castLabels(ctx)),
      },
    ],
  };
}
