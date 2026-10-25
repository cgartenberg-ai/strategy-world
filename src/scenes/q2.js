// Q2: the profit landscape. Industries are ridges, firms are towers, the plate is the industry average.
// It opens with the towers jumbled and coloured by company size (q2-scramble); they sort into their industries
// (q2-arrive), then take their industry colours (q2-color). Click any tower to name it until the bars.
// The flat beat tilts the camera head-on: the plates become the industry bar chart (reveal A).

import { landscape, flat, bandCenters, bandWidth, FRAME, scramble, sizeColors, SIZE_HEX } from '../layouts.js';
import { SHOTS } from '../rigmath.js';
import { TITLES, SOURCES, pinLabels, go, dur, sectorLegend } from './common.js';
import { hexToRgb, PLATE_HEX } from '../colors.js';
import { ramp } from '../anim.js';

export const BARS_RANGE = [-0.10, 0.15];
export const BARS_TICKS = [-0.10, -0.05, 0, 0.05, 0.10, 0.15];

export function industryViews(q2) {
  const L = landscape(q2), F = flat(q2);
  const n = q2.industries.length, c = bandCenters(n), w = bandWidth(n);
  const bands = c.map(x => ({ x, width: w }));
  const landLabels = () => q2.industries.map((ind, k) => ({
    key: `b${k}`, text: ind.industry, at: [c[k], L.base - 0.04, L.plates[k].zDepth + 0.45],
    anchor: 'below', cls: 'band', width: w * 0.96,
  }));
  const flatLabels = () => q2.industries.map((ind, k) => ({
    key: `b${k}`, text: ind.industry, at: [c[k], FRAME.yMin - 0.08, 0], frame: true, // pinned under the chart
    anchor: 'below', cls: 'band', width: w * 0.96,
  }));
  return { L, F, c, w, bands, landLabels, flatLabels };
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
    ],
  };
}
