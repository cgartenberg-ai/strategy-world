// Q4: Are the lines between industries blurring? A black screen; a photo of the original Deere; Deere's partner
// map, alive: the 2000 picture, a time-lapse to 2026 (her two slides); a photo of the farm's mission control (the
// precision-farming cockpit); then the partners regroup into the industries they come from.
// State and geometry are pure functions of the clock year (src/concepts/deere.js); drawing in deereDraw.js.
// The photos are drawn by src/scenes/photo.js.

import { TITLES, go, dur } from './common.js';
import { SHOTS } from '../rigmath.js';
import { ramp } from '../anim.js';
import { stopClock } from '../layouts.js';
import { text } from '../concepts/kit.js';
import { deereLayout, industryLayout } from '../concepts/deere.js';
import { drawDeere, drawIndustries } from '../concepts/deereDraw.js';
import { photoMove, preloadPhotos } from './photo.js';

// The two photographs. A file missing from assets/images/ leaves black under the title and caption.
// credit goes on the source line; focus is the point of the picture kept centred ([0..1, 0..1], x then y).
const PHOTOS = {
  // a John Deere 4755 working a field (Wikimedia Commons, "John_Deere_4755.jpg", 26 Apr 2008), used unmodified
  deere: { src: 'assets/images/deere-tractor.jpg', caption: 'John Deere',
    credit: 'Photo: Lars W. (Ezekiel), Wikimedia Commons, 2008. CC BY-SA 3.0.', focus: [0.45, 0.42] },
  // Deere's Operations Center comparing field trials side by side (from her field-trials reading); framed, not stretched
  cockpit: { src: 'assets/images/deere-cockpit.png', caption: "The farm's mission control", fit: 'frame',
    credit: 'Image: John Deere Operations Center, field trial analysis.', focus: [0.5, 0.5] },
};

const FROM = 2000, TO = 2026;
// five-year steps (2000, 2005, ... 2020, then the last year): each click glides to the next, the partners of those
// years arriving as the counter runs; Space plays them all, resting on each
const STOPS = [];
for (let y = FROM; y < TO - 2; y += 5) STOPS.push(y);
STOPS.push(TO);
const HOLD_S = 2.5, MOVE_S = 3.0;
const CAPTION = 'Ecosystems span industries';

export function q4Scene(ctx) {
  const D = ctx.data.concepts?.deere;
  const source = D?.source_line || '';

  function setup(instant, { title = TITLES.q4, source: line = source } = {}) {
    ctx.overlay.reset({ title, source: line });
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
    ctx.world.plates.set([], { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setTargets(new Map(), { duration: dur(ctx, 900) }); // no firm lights in this chapter
    ctx.allowOrbit = false;
    go(ctx, SHOTS.flat, 1200, instant);
  }

  // one layout per clock value (draw runs every frame)
  let cacheY = null, cacheL = null;
  const layoutAt = y => {
    if (y !== cacheY) { cacheY = y; cacheL = deereLayout(D, y); }
    return cacheL;
  };
  let L2026 = null, IND = null;
  const final = () => (L2026 = L2026 || deereLayout(D, TO));
  const industries = () => (IND = IND || industryLayout(D, TO));
  const missing = () => [text('Deere data not loaded', [0, 0], { color: '#3A3A3A' })];

  let clock = FROM;
  const shown = y => Math.min(TO, Math.max(FROM, Math.round(y))); // the counter turns as each year's arrivals begin
  let captioned = false;
  // q4-industries breaks up the 2026 map. Straight after q4-grow that map is already on screen; entered from
  // anything else (the roadmap's first stage follows the five forces) the map first fades in and holds a moment.
  const LEAD_S = 1.4, FADE_IN_S = 0.6;
  let grownAt = -Infinity, lead = 0;
  const faded = (shapes, f) => (f < 1 ? shapes.map(s => ({ ...s, o: (s.o ?? 1) * f })) : shapes);

  preloadPhotos([PHOTOS.deere.src, PHOTOS.cockpit.src]);
  const photo = (id, p, carry) => photoMove(ctx, { id, src: p.src, caption: p.caption, focus: p.focus, fit: p.fit, carry,
    setup: instant => setup(instant, { source: p.credit }) });

  return {
    id: 'q4',
    beats: [
      {
        // A black screen to begin on (from the master view, the tile's picture grows, then dissolves into it).
        // blank: tile pictures should skip this move and use the next (see tools/tiles.js).
        id: 'q4-open',
        blank: true,
        enter(instant) { setup(instant, { title: '', source: '' }); },
      },
      // The original Deere: the photo comes up out of black, under the question. Back from 2000, the 2000
      // picture fades out under it.
      photo('q4-deere', PHOTOS.deere, from => (from === 'q4-2000' && D ? () => drawDeere(layoutAt(FROM)) : null)),
      {
        // Deere in 2000: the machine maker with NavCom inside and one outside tie, Hitachi.
        id: 'q4-2000',
        enter(instant) { setup(instant); ctx.overlay.year(FROM); },
        draw: t => (D ? drawDeere(layoutAt(FROM), { rv: {
          panel: ramp(t, 0.1, 0.9), title: ramp(t, 0.4, 0.8), bullets: ramp(t, 0.9, 0.7),
          navcom: ramp(t, 1.4, 0.7), cards: ramp(t, 2.0, 0.7), connectors: ramp(t, 2.3, 0.8),
        } }) : missing()),
      },
      {
        // Space plays 2000 → 2026: cards appear with their first partner, rows fill, acquisitions fly
        // into the internalized box, ended ties grey and go, startup cohorts fill the band.
        id: 'q4-grow',
        timelapse: { from: 0, to: STOPS.length - 1, secondsPerYear: HOLD_S + MOVE_S, clickSteps: true,
          stepFrom: HOLD_S / (HOLD_S + MOVE_S), fromYear: y => Math.max(0, STOPS.filter(s => s <= y).length - 1) },
        enter(instant) { setup(instant); clock = FROM; ctx.overlay.year(FROM); },
        frame(c) {
          const s = stopClock(c, STOPS, HOLD_S / (HOLD_S + MOVE_S));
          clock = s.ya + (s.yb - s.ya) * s.f; // the years between two stops play out during the glide
          ctx.overlay.year(shown(clock));
        },
        draw: () => { grownAt = performance.now(); return D ? drawDeere(layoutAt(clock)) : missing(); },
      },
      // The farm's mission control, after 2026 and before the partners regroup: the photo comes up as the 2026
      // map fades out (and, back from the industries, as their picture fades). q4-industries then takes its
      // fresh path: the 2026 map fades back in, holds, and breaks up.
      photo('q4-cockpit', PHOTOS.cockpit, from => (!D ? null
        : from === 'q4-grow' ? () => drawDeere(layoutAt(clock))
          : from === 'q4-industries' ? () => drawIndustries(final(), industries(), 1e4) : null)),
      {
        // The 2026 partners regroup into the industries they come from; Deere's threads span them all.
        id: 'q4-industries',
        enter(instant) {
          setup(instant);
          lead = !instant && performance.now() - grownAt > 400 ? LEAD_S : 0;
          ctx.overlay.year(instant ? null : TO); // the 2026 counter leaves as the map breaks up
          captioned = !!instant;
          if (instant) ctx.overlay.caption(CAPTION);
        },
        tick(now) {
          const s = (now - ctx.t0) / 1000 - lead;
          if (s > 0.6) ctx.overlay.year(null);
          if (!captioned && s > 4.2) { captioned = true; ctx.overlay.caption(CAPTION); }
        },
        draw: t => (D ? faded(drawIndustries(final(), industries(), t - lead), lead ? ramp(t, 0, FADE_IN_S) : 1) : missing()),
      },
    ],
  };
}
