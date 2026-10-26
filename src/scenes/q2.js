// Q2: the profit landscape. Industries are ridges, firms are towers, the plate is the industry average.
// It opens with the towers jumbled and coloured by company size (q2-scramble); they sort into their industries
// (q2-arrive), then take their industry colours (q2-color). Click any tower to name it until the bars.
// The flat beat tilts the camera head-on: the plates become the industry bar chart (reveal A). Then the bars glide
// from their FY2021–25 averages to their 2001–25 averages and white whiskers grow out of their tops, ±1 standard
// deviation of the yearly industry average (q2-swings: how much each industry swings).

import { landscape, flat, bandCenters, bandWidth, FRAME, scramble, sizeColors, SIZE_HEX } from '../layouts.js';
import { SHOTS, projector, lerpParams } from '../rigmath.js';
import { TITLES, SOURCES, pinLabels, go, dur, sectorLegend } from './common.js';
import { hexToRgb, PLATE_HEX } from '../colors.js';
import { ramp } from '../anim.js';
import { bandRows, fitRows, textEm } from '../labelfit.js';
import { swingStats, swingRange } from '../concepts/swings.js';
import { line, text, PAL } from '../concepts/kit.js';
import { roaToY, yTransform } from '../layouts.js';

const BAND_U = 2.0; // industry names' size (.lab.band in styles.css)

export const BARS_RANGE = [-0.10, 0.15];
export const BARS_TICKS = [-0.10, -0.05, 0, 0.05, 0.10, 0.15];

export function industryViews(q2) {
  const L = landscape(q2), F = flat(q2);
  const n = q2.industries.length, c = bandCenters(n), w = bandWidth(n);
  const bands = c.map(x => ({ x, width: w }));
  // under the ridges (q2-arrive, q2-color, q2-glide): the names take turns down three rows, each in as few lines as its
  // neighbours allow at every camera from the landscape shot to the far one (the glide), so none touch on the way
  // (src/labelfit.js fitRows; worked out once, when first shown)
  const landAt = k => [c[k], L.base - 0.04, L.plates[k].zDepth + 0.45];
  let landFit = null;
  const landRows = () => (landFit = landFit || fitRows(q2.industries.map(i => i.industry),
    Array.from({ length: 25 }, (_, i) => { const pr = projector(lerpParams(SHOTS.landscape, SHOTS.landscapeFar, -0.1 + (1.2 * i) / 24));
      return c.map((_, k) => pr(landAt(k))); }), { sizeU: BAND_U, rows: 3 }));
  const landLabels = () => q2.industries.map((ind, k) => ({
    key: `b${k}`, text: landRows()[k].lines.join('\n'), at: landAt(k), anchor: 'below', cls: 'band rows', drop: landRows()[k].drop,
  }));
  // under the bars (flat shot): alternate names a row lower, each set in its own lines, so no name touches another
  // (src/labelfit.js; drop: how far below the first row, in U)
  const rows = bandRows(q2.industries.map(i => i.industry), w * (100 / FRAME.viewHeight), BAND_U);
  const labelDrop = k => rows[k]?.drop || 0;
  const flatLabels = () => q2.industries.map((ind, k) => ({
    key: `b${k}`, text: rows[k].lines.join('\n'), at: [c[k], FRAME.yMin - 0.08, 0], frame: true, // pinned under the chart
    anchor: 'below', cls: 'band rows', drop: rows[k].drop,
  }));
  return { L, F, c, w, bands, landLabels, flatLabels, labelDrop };
}

export function q2Scene(ctx) {
  const q2 = ctx.data.q2q3_landscape;
  const V = (ctx.views = ctx.views || industryViews(q2));
  const depth = V.L.plates[0]?.zDepth * 2 + 0.5 || 5;

  const SECTOR_KEY = sectorLegend(q2.industries);
  const SIZE_KEY = [{ color: SIZE_HEX[0], text: 'Smaller companies' }, { color: SIZE_HEX[SIZE_HEX.length - 1], text: 'Larger companies' }];
  function setup(orbit, key = SECTOR_KEY) {
    ctx.overlay.reset({ title: TITLES.q2, source: q2.source_line || SOURCES.q2 });
    ctx.overlay.legend(key);
    if (orbit) ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 1200) }); // full range in 3D
    ctx.allowOrbit = orbit;
    ctx.world.setGlow(0.3);
  }

  const hiddenFlat = new Map([...V.F.agents].map(([id, a]) => [id, { ...a, alpha: 0 }]));

  // ---- q2-swings: each industry's 2001–25 average (the bar) and swing (±1 SD of its yearly average) ----
  const SW = swingStats(q2), SW_RANGE = swingRange(SW), SWT = yTransform(SW_RANGE[0], SW_RANGE[1]);
  const SW_TICKS = [];
  for (let v = SW_RANGE[0]; v <= SW_RANGE[1] + 1e-9; v += 0.05) SW_TICKS.push(Math.round(v * 100) / 100);
  const SWING_PLATES = V.F.plates.map((p, k) => (SW[k] ? { ...p, top: roaToY(SW[k].m).y } : p));
  const SWING_SOURCE = 'Source: Compustat via WRDS. Bars: average operating return on assets of each industry\u2019s firms, '
    + '2001–25; whiskers: ±1 standard deviation of the yearly industry average, 2001–25.';
  const SWING = { glide: 1.6, grow: 1.8, span: 0.9, w: 0.45 }; // s: bars glide, whiskers start, grow; whisker width U
  const KEY = { words: '2001–2025: average and swings', size: 2.4, x: 7.33, y: 3.28 }; // right edge; the sector key's row
  const whisker = (x, lo, hi, cap, o) => [line([x, lo], [x, hi], { color: PAL.white, w: SWING.w, o }),
    line([x - cap, lo], [x + cap, lo], { color: PAL.white, w: SWING.w, o }),
    line([x - cap, hi], [x + cap, hi], { color: PAL.white, w: SWING.w, o })];
  function swingShapes(t) {
    const g = ramp(t, SWING.grow, SWING.span), o = ramp(t, SWING.grow, 0.3);
    if (o <= 0.003) return [];
    const fy = v => SWT.A * roaToY(v).y + SWT.B, out = [];
    V.F.plates.forEach((p, k) => {
      const s = SW[k];
      if (s) out.push(...whisker(p.x, fy(s.m - s.sd * g), fy(s.m + s.sd * g), p.width * 0.22, o));
    });
    const kx = KEY.x - textEm(KEY.words) * KEY.size * 0.09 - 0.4; // a small whisker, then the words
    out.push(...whisker(kx, KEY.y - 0.13, KEY.y + 0.13, 0.12, o));
    out.push(text(KEY.words, [KEY.x, KEY.y], { anchor: 'end', size: KEY.size, color: PAL.white, o }));
    return out;
  }

  // Two colourings: by company size (the opening) and by industry (sector, as in Q1); height shows profit throughout.
  const bySector = new Map([...V.L.agents].map(([id, a]) => [id, a.color]));
  const bySize = sizeColors(q2.firms);
  const sized = new Map([...V.L.agents].map(([id, a]) => [id, { ...a, color: bySize.get(id) || a.color }]));
  const jumbled = scramble(sized, { zDepth: V.L.plates[0]?.zDepth || 2.4 });
  const FLOOR = [{ x: (FRAME.xMin + FRAME.xMax) / 2, width: FRAME.xMax - FRAME.xMin }]; // one floor, no industry stripes yet
  const plateSector = V.L.plates.map(p => hexToRgb(p.color || PLATE_HEX)), plateBlue = hexToRgb(PLATE_HEX);
  const mixRGB = (a, b, w) => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
  let paintW = null, keySwapped = false;
  function paint(w) { // 0 = size colours, 1 = industry colours
    if (w === paintW) return;
    paintW = w;
    const m = new Map();
    for (const [id, c] of bySector) m.set(id, mixRGB(bySize.get(id) || c, c, w));
    ctx.world.setColors(m);
    ctx.world.plates.tint(plateSector.map(c => mixRGB(plateBlue, c, w)));
    if (!keySwapped && w >= 0.5) { keySwapped = true; ctx.overlay.legend(SECTOR_KEY); }
    ctx.overlay.legendOpacity(Math.abs(1 - 2 * w)); // the size key fades out, the industry key fades in
  }
  const named = () => pinLabels(ctx);

  return {
    id: 'q2',
    beats: [
      {
        id: 'q2-scramble',
        orbit: true,
        enter(instant) {
          setup(true, SIZE_KEY);
          go(ctx, SHOTS.landscape, 3400, instant);
          ctx.world.setTargets(jumbled, { duration: dur(ctx, 2600), stagger: 0.8 });
          ctx.world.plates.set([], { duration: dur(ctx, 600) });
          ctx.world.ground.set(FLOOR, { base: V.L.base, depth, opacity: 1, duration: dur(ctx, 1800) });
        },
        labels: named,
      },
      {
        id: 'q2-arrive',
        orbit: true,
        enter(instant) {
          setup(true, SIZE_KEY);
          go(ctx, SHOTS.landscape, 1200, instant);
          ctx.world.setTargets(sized, { duration: dur(ctx, 2800), stagger: 0.5, staggerBy: 'x' });
          ctx.world.plates.set(V.L.plates, { duration: dur(ctx, 3000), body: 0.07, lid: 0.22 });
          ctx.world.plates.tint(plateSector.map(() => plateBlue));
          ctx.world.ground.set(V.bands, { base: V.L.base, depth, opacity: 1, duration: dur(ctx, 1800) });
        },
        labels: () => V.landLabels().concat(named()),
      },
      {
        id: 'q2-color',
        orbit: true,
        enter(instant) {
          setup(true, instant ? SECTOR_KEY : SIZE_KEY);
          paintW = null; keySwapped = !!instant;
          ctx.world.setTargets(sized, { duration: dur(ctx, 600) });
          ctx.world.plates.set(V.L.plates, { duration: dur(ctx, 600), body: 0.07, lid: 0.22 });
          ctx.world.ground.set(V.bands, { base: V.L.base, depth, opacity: 1, duration: dur(ctx, 600) });
          go(ctx, SHOTS.landscape, 900, instant);
          paint(instant ? 1 : 0);
        },
        tick(now) { paint(ramp((now - ctx.t0) / 1000, 0.3, 1.8)); },
        labels: () => V.landLabels().concat(named()),
      },
      {
        id: 'q2-glide',
        orbit: true,
        enter(instant) {
          setup(true);
          ctx.world.setTargets(V.L.agents, { duration: dur(ctx, 800) });
          ctx.world.plates.set(V.L.plates, { duration: dur(ctx, 800), body: 0.07, lid: 0.22 });
          ctx.world.plates.tint(plateSector);
          ctx.world.ground.set(V.bands, { base: V.L.base, depth, opacity: 1, duration: dur(ctx, 800) });
          if (instant) ctx.rig.set(SHOTS.landscapeFar);
          else ctx.rig.path([[SHOTS.landscape, 900, 'inOutSine'], [SHOTS.landscapeFar, 10000, 'inOutSine']]);
        },
        labels: () => V.landLabels().concat(named()),
      },
      {
        id: 'q2-flat',
        enter(instant) {
          setup(false);
          go(ctx, SHOTS.flat, 4400, instant, 'inOutCubic');
          ctx.world.setTargets(hiddenFlat, { duration: dur(ctx, 2600), stagger: 0.4 });
          ctx.world.plates.set(V.F.plates, { duration: dur(ctx, 2600), body: 0.5 }); // fuller bars; Q3 dims them under the dots
          ctx.world.ground.set(V.bands, { base: V.L.base, depth, opacity: 0, duration: dur(ctx, 2600) });
          // bars alone: a tight axis so differences between industries are easy to see
          ctx.world.setYRange(BARS_RANGE[0], BARS_RANGE[1], { duration: dur(ctx, 4400) });
          ctx.overlay.axis({ label: 'Return on assets', ticks: BARS_TICKS });
        },
        labels: () => V.flatLabels(),
      },
      {
        // the bars glide to their 2001–25 averages on an axis wide enough for the whiskers; once they land, the
        // whiskers grow out of the tops; one short key, by the sector key
        id: 'q2-swings',
        enter(instant) {
          setup(false);
          ctx.overlay.source(SWING_SOURCE);
          go(ctx, SHOTS.flat, 900, instant);
          ctx.world.setTargets(hiddenFlat, { duration: dur(ctx, 600) });
          ctx.world.plates.set(SWING_PLATES, { duration: dur(ctx, SWING.glide * 1000), body: 0.5 });
          ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
          ctx.world.setYRange(SW_RANGE[0], SW_RANGE[1], { duration: dur(ctx, SWING.glide * 1000) });
          ctx.overlay.axis({ label: 'Return on assets', ticks: SW_TICKS });
        },
        draw: t => swingShapes(t),
        labels: () => V.flatLabels(),
      },
    ],
  };
}
