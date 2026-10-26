// Q3: it opens on the familiar industry bars (as in Q2), then every firm pours out of them as the axis widens
// (reveal B), and on the next click a few well-known firms are named. Then zoom into one industry, and the
// financials view.

import { flat, roaToY } from '../layouts.js';
import { SHOTS } from '../rigmath.js';
import { text } from '../concepts/kit.js';
import { TITLES, SOURCES, ROA_TICKS, castLabels, go, dur, sectorLegend } from './common.js';
import { industryViews, BARS_RANGE, BARS_TICKS } from './q2.js';
import { LABEL, nameStartU, nameWidthU } from '../labelfit.js';

// The close-up's sideways layout (world units). Named firms are placed first, then the rest; each takes the free
// spot nearest the centre where its dot, and its name to the right of it, clear every dot and name already placed.
// items: [{y, r, w}]: height, dot radius, width of the name (0: no name). Returns each firm's x.
export function closeUpLayout(items, center, { step = 0.2, halfWidth = 2.6, right = Infinity, lineH = 0.1, pad = 0.03,
  nudgeX = 0.64, nudgeY = 0.08 } = {}) {
  const dotBox = (d, n) => n.w > 0 && d.x + d.r + pad > n.x && d.x - d.r - pad < n.x + n.w
    && Math.abs(d.y - n.y) < lineH / 2 + d.r + pad;
  const clash = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + pad || dotBox(a, b) || dotBox(b, a)
    || (a.w > 0 && b.w > 0 && ((a.x < b.x + b.w && b.x < a.x + a.w && Math.abs(a.y - b.y) < lineH + pad)
      || (Math.abs(a.x - b.x) < nudgeX && Math.abs(a.y - b.y) < nudgeY))); // close enough that the overlay would nudge one
  const order = items.map((_, i) => i).sort((i, j) => (items[j].w > 0) - (items[i].w > 0) || items[i].y - items[j].y);
  const placed = [], xs = new Array(items.length);
  for (const i of order) {
    let best = null, fewest = Infinity;
    for (let k = 0; k * step <= halfWidth + 1e-9 && fewest > 0; k++) {
      for (const sgn of k ? [1, -1] : [1]) {
        const c = { ...items[i], x: center + sgn * k * step };
        const n = (c.x + c.w > right ? 1e6 : 0) + placed.filter(p => clash(c, p)).length;
        if (n < fewest) { fewest = n; best = c; }
        if (!n) break;
      }
    }
    xs[i] = best.x;
    placed.push(best);
  }
  // centre the picture, dots and names together, where the camera looks
  const lo = Math.min(...placed.map(p => p.x - p.r)), hi = Math.max(...placed.map(p => p.x + Math.max(p.r, p.w)));
  return xs.map(x => x + center - (lo + hi) / 2);
}

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

  // Close-up: the chosen industry's firms spread out sideways (heights unchanged) so no carrier's name runs into
  // another firm or name; the rest dim. A name is set at the firm-name size, starting clear of its dot's ring, and the
  // overlay nudges names that would touch (src/labelfit.js).
  const zFirms = q2.firms.filter(f => f[1] === zk);
  const zU = zoomShot.vh / 100, zNamed = new Set(zoomCast), zSize = f => Math.max(0.04, V.F.agents.get(f[0])?.size ?? 0);
  const zName = f => String(ctx.index?.name(f[0]) ?? f[5]);
  const zx = closeUpLayout(zFirms.map(f => ({ y: roaToY(f[2]).y, r: zSize(f),
    w: zNamed.has(f[0]) ? (nameStartU(zSize(f) / zU) + nameWidthU(zName(f))) * zU : 0 })), V.c[zk],
  { right: V.c[zk] + 3.3, lineH: LABEL.size * LABEL.lineH * zU, nudgeX: LABEL.nudge.near * zU, nudgeY: LABEL.nudge.gap * zU });
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
        // the pour alone: no names yet, so the room watches the spread
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
        labels: () => V.flatLabels(),
      },
      {
        // the next click: the dots stay where they landed and a few well-known firms are named
        id: 'q3-names',
        enter(instant) {
          setup(); axis('Return on assets');
          go(ctx, SHOTS.flat, 900, instant);
          allDots(instant);
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
        labels: () => castLabels(ctx, { sceneCast: zoomCast, core: [], max: zoomCast.length }),
        // the industry's name, big and white, below the firms (it follows the camera like a label)
        draw: () => [text(zoomName, [V.c[zk], roaToY(-0.115).y], { frame: false, size: 3.0, base: 'hanging' })],
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
