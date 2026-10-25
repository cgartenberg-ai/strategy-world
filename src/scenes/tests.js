// The three tests' detail views, opened from the "Three tests" master view. Each: the test's question as the
// title (her slide 47's wording) and one picture of what the test looks for. Illustrative magnitudes.
//   test-external  your value created vs the next best alternative: added value from higher willingness to pay
//                  or from lower cost
//   test-internal  a system of activities: feasible, distinctive, reinforcing
//   test-dynamic   an advantage over time, pressed by rivals and by changing conditions
// Each also carries one quiet line, bottom right, naming the roadmap stages that take the test further
// (External: 1-3, Internal: 4, Dynamic: 5); the numbers follow the roadmap's tiles in src/flow/views.js.

import { text, line, circle, poly, PAL } from '../concepts/kit.js';
import { ibeam, wedge } from '../concepts/stick.js';
import { ramp, mix } from '../anim.js';
import { SHOTS } from '../rigmath.js';
import { go, dur } from './common.js';

const ILLUSTRATIVE = 'Illustrative.';
const REAL = '#FFC46B', RIVALS = '#4A97F5';

export function testsScene(ctx) {
  function setup(title) {
    ctx.overlay.reset({ title, source: ILLUSTRATIVE });
    ctx.allowOrbit = false;
    ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
    ctx.world.plates.set([], { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
    go(ctx, SHOTS.flat, 900, ctx.instant);
  }

  // ---- external: added value, from the top (willingness to pay) or the bottom (cost) ----
  const XA = -2.6, XY = 0.4, ALT_LO = -1.6, ALT_HI = 1.0, YOU_LO = -2.75, YOU_HI = 2.2;
  function external(t) {
    const b = ramp(t, 0.3, 0.7), d = ramp(t, 1.0, 0.6), out = [];
    out.push(...ibeam(XA, ALT_LO, ALT_HI, { color: PAL.grey, o: b }), ...ibeam(XY, YOU_LO, YOU_HI, { color: PAL.white, o: b }));
    out.push(text('Next best alternative', [XA, -3.35], { size: 2.0, color: PAL.white, o: b }));
    out.push(text('Your position', [XY, -3.35], { size: 2.2, weight: 500, o: b }));
    out.push(text('Value created', [XA - 0.6, (ALT_LO + ALT_HI) / 2], { anchor: 'end', size: 1.7, color: PAL.white, o: b }));
    for (const y of [ALT_HI, ALT_LO]) out.push(line([XA + 0.31, y], [XY + 0.31, y], { color: PAL.grey, w: 0.14, dash: [0.8, 0.6], o: d }));
    out.push(...wedge(XY, ALT_HI, YOU_HI, { o: ramp(t, 1.5, 0.8), label: 'Higher willingness to pay', sub: 'Differentiation' }));
    out.push(...wedge(XY, YOU_LO, ALT_LO, { o: ramp(t, 2.3, 0.8), label: 'Lower cost', sub: 'Cost advantage' }));
    return out;
  }

  // ---- internal: a system of reinforcing activities ----
  const CX = 0, CY = -0.35;
  const THEMES = [0, 1, 2, 3].map(i => { const a = Math.PI / 4 + (i * Math.PI) / 2; return [CX + 1.35 * Math.cos(a), CY + 1.05 * Math.sin(a)]; });
  const ACTS = Array.from({ length: 12 }, (_, i) => { const a = (i * 2 * Math.PI) / 12 + 0.12; return [CX + 3.4 * Math.cos(a), CY + 2.15 * Math.sin(a)]; });
  const LINKS = [ // [activity, theme] and [activity, activity]
    ...ACTS.map((_, i) => ['a', i, 't', Math.floor(((i + 0.5) / 12) * 4) % 4]),
    ...[2, 5, 8, 11].map(i => ['a', i, 't', (Math.floor(((i + 0.5) / 12) * 4) + 1) % 4]), // a few reach a second theme
    ...[[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [9, 10], [10, 11], [2, 3], [8, 9]].map(([i, j]) => ['a', i, 'a', j]),
    ...[[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]].map(([i, j]) => ['t', i, 't', j]),
  ];
  const P = (kind, i) => (kind === 't' ? THEMES[i] : ACTS[i]);
  function internal(t) {
    const out = [];
    LINKS.forEach(([ka, ia, kb, ib], j) => {
      const g = ramp(t, 1.2 + j * 0.05, 0.6), a = P(ka, ia), b = P(kb, ib);
      if (g > 0.003) out.push(line(a, [mix(a[0], b[0], g), mix(a[1], b[1], g)], { color: REAL, w: ka === 't' && kb === 't' ? 0.16 : 0.1, o: 0.55 * g, glow: true }));
    });
    THEMES.forEach((p, i) => { const g = ramp(t, 0.3 + i * 0.12, 0.5); out.push(circle(p, { r: 2.1, fill: REAL, fo: 0.25, stroke: REAL, w: 0.22, o: g, glow: true })); });
    ACTS.forEach((p, i) => { const g = ramp(t, 0.8 + i * 0.05, 0.4); out.push(circle(p, { r: 1.05, fill: REAL, fo: 0.5, stroke: REAL, w: 0.14, o: g, glow: true })); });
    const w = ramp(t, 2.6, 0.7);
    ['Feasible', 'Distinctive', 'Reinforcing'].forEach((s, i) => out.push(text(s, [-3.6 + i * 3.6, -3.35], { size: 2.4, weight: 500, color: i === 2 ? REAL : PAL.white, o: w })));
    return out;
  }

  // ---- dynamic: an advantage over time, pressed by rivals and changing conditions ----
  const X0 = -5.6, X1 = 3.4;
  const TOP = u => 0.45 + 1.75 * Math.exp(-2.6 * u), MID = () => -0.55, BOT = u => -1.35 - 1.2 * Math.exp(-2.6 * u);
  const pts = (f, upto) => { const out = []; for (let i = 0; i <= 40 * upto; i++) { const u = i / 40; out.push([mix(X0, X1, u), f(u)]); } return out; };
  function dynamic(t) {
    const g = ramp(t, 0.4, 2.6, 'inOutSine'), out = [];
    if (g > 0.01) {
      out.push(poly(pts(TOP, g), { stroke: PAL.cyan, w: 0.3, o: 1, glow: true }));
      out.push(poly(pts(MID, g), { stroke: PAL.white, w: 0.2, o: 0.8 }));
      out.push(poly(pts(BOT, g), { stroke: PAL.pink, w: 0.3, o: 1, glow: true }));
    }
    const lo = ramp(t, 0.3, 0.6);
    out.push(text('Your advantage', [X0, TOP(0) + 0.38], { anchor: 'start', size: 1.8, color: PAL.cyan, o: lo }));
    out.push(text('Typical firm', [X0, MID() + 0.3], { anchor: 'start', size: 1.6, color: PAL.white, o: lo }));
    out.push(line([X0, -3.0], [X1, -3.0], { color: '#3A3A3A', w: 0.1, o: lo }), text('Time', [X1, -3.3], { anchor: 'end', size: 1.5, color: PAL.white, o: lo }));
    // the two pressures arrive once the lines have bent
    const r = ramp(t, 2.0, 0.7), c = ramp(t, 2.6, 0.7), ax = mix(X0, X1, 0.32);
    out.push(line([ax, 2.75], [ax, TOP(0.32) + 0.2], { color: RIVALS, w: 0.24, arrow: 1, o: r, glow: true }));
    out.push(text('Rivals respond', [ax + 0.2, 2.6], { anchor: 'start', size: 2.2, weight: 500, color: RIVALS, o: r }));
    const bx = mix(X0, X1, 0.62);
    out.push(line([bx, 2.75], [bx, TOP(0.62) + 0.2], { color: PAL.amber, w: 0.24, arrow: 1, o: c, glow: true }));
    out.push(text('Conditions change', [bx + 0.2, 2.6], { anchor: 'start', size: 2.2, weight: 500, color: PAL.amber, o: c }));
    out.push(text('Political · Economic · Social · Technological · Environmental · Legal', [bx + 0.2, 2.2],
      { anchor: 'start', size: 1.3, color: PAL.grey, o: c }));
    return out;
  }

  return {
    id: 'tests',
    beats: [
      { id: 'test-external', enter() { setup('External: does this position create added value?'); },
        draw: external },
      { id: 'test-internal', enter() { setup('Internal: do the activities make the position feasible and reinforce one another?'); },
        draw: internal },
      { id: 'test-dynamic', enter() { setup('Dynamic: is the position resilient when competitors respond or conditions change?'); },
        draw: dynamic },
    ],
  };
}
