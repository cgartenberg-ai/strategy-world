// Q7 concept beat, after the cohort traces:
//   q7-threat  Goolsbee and Syverson (2008): incumbents cut fares as soon as Southwest becomes a credible threat
//              on a route, before it flies the route; when it does enter, fares fall further.

import { text, line, circle, poly, PAL } from '../concepts/kit.js';
import { ramp } from '../anim.js';
import { SHOTS } from '../rigmath.js';
import { TITLES, go, dur } from './common.js';

// chart frame: x by position p (quarters), y by fare change
const CH = { x0: -5.5, x1: 6.5, yTop: 2.45, yBot: -2.3, vTop: 0.05, vBot: -0.45 };
const P_THREAT_LATE = 11.7, P_ENTRY = [13.6, 14.8, 16.3], P_MAX = 16.3;
const X = p => CH.x0 + (p / P_MAX) * (CH.x1 - CH.x0);
const Y = v => CH.yBot + ((v - CH.vBot) / (CH.vTop - CH.vBot)) * (CH.yTop - CH.yBot);
const COL = { threat: PAL.cyan, entry: PAL.pink };
const pctLabel = v => `${v < 0 ? '−' : ''}${Math.abs(Math.round(v * 100))}%`;
const TICKS_Y = [0, -0.1, -0.2, -0.3, -0.4];
const T = { axes: 0, line0: 0.6, line1: 4.0, entry0: 5.4, entry1: 6.6 }; // seconds

function periodP(series, period) {
  if (series === 'entry') return { te: P_ENTRY[0], 'te+1 to te+2': P_ENTRY[1], 'te+3 to te+12': P_ENTRY[2] }[period];
  const m = /^t0([+-]\d+)?$/.exec(period);
  if (m) return 8 + (m[1] ? Number(m[1]) : 0);
  return P_THREAT_LATE; // "t0+3 to t0+12"
}

// A series drawn up to `prog` points (fractional): glowing line, translucent band, dots.
function seriesShapes(pts, prog, color, o = 1) {
  if (prog <= 0 || !pts.length) return [];
  const n = Math.min(pts.length - 1, Math.floor(prog)), f = prog - n;
  const lerp = (a, b, k) => a + (b - a) * k;
  const at = key => {
    const out = pts.slice(0, n + 1).map(p => [X(p.p), Y(p[key])]);
    if (f > 1e-6 && n + 1 < pts.length) out.push([X(lerp(pts[n].p, pts[n + 1].p, f)), Y(lerp(pts[n][key], pts[n + 1][key], f))]);
    return out;
  };
  const mid = at('pct'), hi = at('hi'), lo = at('lo');
  const shapes = [];
  if (hi.length > 1) shapes.push(poly(hi.concat(lo.slice().reverse()), { closed: true, fill: color, fo: 0.13, o }));
  if (mid.length > 1) shapes.push(poly(mid, { stroke: color, w: 0.5, o, glow: true }));
  pts.slice(0, n + 1).forEach(p => shapes.push(circle([X(p.p), Y(p.pct)], { r: 0.75, fill: color, o, glow: true })));
  return shapes;
}

export function q7Concepts(ctx) {
  const fares = ctx.data.concepts.fares;
  if (!fares) return [];
  const rows = fares.rows.map(r => ({ ...r, p: periodP(r.series, r.period) })).sort((a, b) => a.p - b.p);
  const threat = rows.filter(r => r.series === 'threat'), entry = rows.filter(r => r.series === 'entry');
  const t0 = threat.find(r => r.period === 't0'), lastT = threat[threat.length - 1], lastE = entry[entry.length - 1];
  const reach = (i, n, a, b) => a + (b - a) * (i / Math.max(1, n - 1)); // when the line reaches point i
  let captionAt = Infinity;
  const CAPTION = 'The threat alone cuts fares';

  function draw(t) {
    const out = [];
    const ax = ramp(t, T.axes, 0.6);
    // x-axis: quarters from the threat, then quarters from entry
    const tickY = CH.yBot - 0.32, titleY = CH.yBot - 0.72;
    const xt = [[-8, '−8'], [-6, '−6'], [-4, '−4'], [-2, '−2'], [0, '0'], [2, '+2']].map(([q, s]) => [8 + q, s]);
    xt.push([P_THREAT_LATE, '+3 to +12']);
    const et = [[P_ENTRY[0], '0'], [P_ENTRY[1], '+1 to +2'], [P_ENTRY[2], '+3 to +12']];
    for (const [p, s] of xt) out.push(text(s, [X(p), tickY], { size: 1.45, color: PAL.white, o: ax }));
    out.push(text('Quarters from the threat', [X(5.85), titleY], { size: 1.5, color: PAL.white, o: ax }));
    const eo = ramp(t, T.entry0 - 0.4, 0.5);
    for (const [p, s] of et) out.push(text(s, [X(p), tickY], { size: 1.45, color: PAL.white, o: eo }));
    out.push(text('Quarters from entry', [X((P_ENTRY[0] + P_ENTRY[2]) / 2), titleY], { size: 1.5, color: PAL.white, o: eo }));

    // marker: Southwest becomes a threat (when the line reaches t0)
    const iT0 = threat.indexOf(t0), tReach = reach(iT0, threat.length, T.line0, T.line1);
    const mo = ramp(t, tReach - 0.2, 0.5);
    out.push(line([X(t0.p), CH.yBot], [X(t0.p), CH.yTop + 0.05], { color: PAL.white, w: 0.14, dash: [0.6, 0.6], o: mo * 0.6 }));
    out.push(text('Southwest becomes a threat', [X(t0.p), CH.yTop + 0.32], { size: 1.9, color: COL.threat, o: mo }));
    // marker: Southwest enters
    out.push(line([X(P_ENTRY[0]), CH.yBot], [X(P_ENTRY[0]), CH.yTop + 0.05], { color: PAL.white, w: 0.14, dash: [0.6, 0.6], o: eo * 0.6 }));
    out.push(text('Southwest enters', [X(P_ENTRY[0]), CH.yTop + 0.32], { size: 1.9, color: COL.entry, o: eo }));

    // the threat series, drawn left to right
    const prog = 1 + (threat.length - 1) * ramp(t, T.line0, T.line1 - T.line0, 'linear');
    out.push(...seriesShapes(threat, t >= T.line0 ? prog : 0, COL.threat));
    const v0 = ramp(t, tReach + 0.1, 0.4), v1 = ramp(t, T.line1 + 0.1, 0.4);
    out.push(text(pctLabel(t0.pct), [X(t0.p) - 0.22, Y(t0.pct) - 0.3], { anchor: 'end', size: 2.1, weight: 600, color: COL.threat, o: v0 }));
    out.push(text(pctLabel(lastT.pct), [X(lastT.p) + 0.25, Y(lastT.pct)], { anchor: 'start', size: 2.1, weight: 600, color: COL.threat, o: v1 }));

    // the entry series
    const eprog = 1 + (entry.length - 1) * ramp(t, T.entry0, T.entry1 - T.entry0, 'linear');
    out.push(...seriesShapes(entry, t >= T.entry0 ? eprog : 0, COL.entry));
    const v2 = ramp(t, T.entry1 + 0.1, 0.4);
    out.push(text(pctLabel(lastE.pct), [X(lastE.p) + 0.25, Y(lastE.pct)], { anchor: 'start', size: 2.1, weight: 600, color: COL.entry, o: v2 }));
    return out;
  }

  return [{
    id: 'q7-threat',
    enter(instant) {
      ctx.overlay.reset({ title: TITLES.q7why, source: fares.source_line });
      ctx.overlay.axis({
        label: 'Incumbent fares vs. before', x0: CH.x0 - 0.35, x1: CH.x1 + 0.35,
        yTicks: TICKS_Y.map(v => ({ y: Y(v), label: pctLabel(v), zero: v === 0 })),
      });
      ctx.allowOrbit = false;
      ctx.world.setGlow(0.22);
      go(ctx, SHOTS.flat, 900, instant);
      ctx.world.setTargets(new Map(), { duration: dur(ctx, 900) });
      ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 900) });
      ctx.world.plates.set([], { duration: dur(ctx, 600) });
      ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
      captionAt = instant ? -Infinity : performance.now() + (T.line1 + 0.6) * 1000;
      if (instant) ctx.overlay.caption(CAPTION);
    },
    tick(now) {
      if (now >= captionAt) { ctx.overlay.caption(CAPTION); captionAt = Infinity; }
    },
    draw,
  }];
}
