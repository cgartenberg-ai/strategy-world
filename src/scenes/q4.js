// Q4: Are the lines between industries blurring? After the question (centred, then in the header on black:
// src/scenes/ask.js), a photo of the original Deere; Deere's partner
// map, alive: the 2000 picture, one run to 2026 (her two slides), the partner count climbing beside the year; a photo
// of the farm's mission control (the precision-farming cockpit); then the 2026 map again, which her click breaks
// into the industries the partners come from.
// State and geometry are pure functions of the clock year (src/concepts/deere.js); drawing in deereDraw.js.
// The photos are drawn by src/scenes/photo.js.

import { TITLES, go, dur } from './common.js';
import { SHOTS } from '../rigmath.js';
import { ramp } from '../anim.js';
import { text } from '../concepts/kit.js';
import { deereLayout, industryLayout, partnerCount } from '../concepts/deere.js';
import { drawDeere, drawIndustries, drawCount } from '../concepts/deereDraw.js';
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
// q4-grow: the click that brings it plays 2000 → 2026 straight through, the same time for every year (2 partners
// in 2000, 9 in 2020, 36 by 2026: the late rush is the story)
export const RUN_S = 20;
// first a moment on 2000, so the count's "2" registers before the first arrival (the clock starts LEAD_Y early)
export const LEAD_S = 1.0;
const PER_YEAR_S = RUN_S / (TO - FROM), LEAD_Y = LEAD_S / PER_YEAR_S;
// q4-industries: the 2026 map holds until her click, which breaks it into industries over REGROUP_S
export const REGROUP_S = 4.6;
export const CAPTION = 'Ecosystems span industries';
const CAPTION_AT = 4.2 / REGROUP_S;   // the caption comes in once the threads and dots are in
const COUNTER_OFF_S = 0.6;            // the 2026 counter and the count leave as the map breaks up
const FADE_IN_S = 0.6;                // the 2026 map comes back up out of black

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
  // q4-industries: its clock (0 = the 2026 map, 1 = the industries), and the words it has put up
  let reg = 0, fadeIn = false, words = { year: undefined, caption: undefined };
  const faded = (shapes, f) => (f < 1 ? shapes.map(s => ({ ...s, o: (s.o ?? 1) * f })) : shapes);
  const wordsAt = c => {
    const year = c * REGROUP_S < COUNTER_OFF_S ? TO : null, caption = c >= CAPTION_AT - 1e-9 ? CAPTION : '';
    if (year !== words.year) ctx.overlay.year(year);
    if (caption !== words.caption) ctx.overlay.caption(caption);
    words = { year, caption };
  };

  preloadPhotos([PHOTOS.deere.src, PHOTOS.cockpit.src]);
  const photo = (id, p, carry) => photoMove(ctx, { id, src: p.src, caption: p.caption, focus: p.focus, fit: p.fit, carry,
    setup: instant => setup(instant, { source: p.credit }) });

  return {
    id: 'q4',
    beats: [
      // (Q4 opens on its question, then the question in the header on black: q4-ask, src/scenes/ask.js.)
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
        // One run, 2000 → 2026, at an even pace: the click that brings it starts it. Cards appear with their first
        // partner, rows fill, acquisitions fly into the internalized box, ended ties grey and go, startup cohorts
        // fill the band; the year counter runs and the partner count climbs beside it. A click mid-run jumps to
        // 2026; the next goes on. Back from the mission control: the finished 2026 map, not replayed.
        id: 'q4-grow',
        timelapse: { from: FROM - LEAD_Y, to: TO, secondsPerYear: PER_YEAR_S },
        enter(instant) {
          setup(instant);
          const back = ctx.fromBeat?.id === 'q4-cockpit';
          clock = back ? TO : FROM;
          if (back) ctx.director?.setYear(TO);
          else if (!instant) ctx.director?.play();
          ctx.overlay.year(shown(clock));
        },
        frame(c) {
          clock = Math.max(FROM, c);
          ctx.overlay.year(shown(clock));
        },
        draw: t => (D ? [...drawDeere(layoutAt(clock)), ...drawCount(partnerCount(D, shown(clock)), ramp(t, 0, 0.5))]
          : missing()),
      },
      // The farm's mission control, after 2026 and before the partners regroup: the photo comes up as the 2026
      // map fades out (and, back from the industries, as their picture fades, wherever the regroup stood).
      photo('q4-cockpit', PHOTOS.cockpit, from => (!D ? null
        : from === 'q4-grow' ? () => drawDeere(layoutAt(clock))
          : from === 'q4-industries' ? () => drawIndustries(final(), industries(), reg * REGROUP_S) : null)),
      {
        // The 2026 map comes back up out of black (after the mission control, or after the five forces in the
        // roadmap's first stage) and holds, with the year and the count. Her click breaks it up: the partners
        // regroup into the industries they come from, Deere's threads span them all, and the caption follows.
        // The clock (0 = the map, 1 = the industries) makes the two click-states: a click mid-regroup finishes it;
        // Left goes back to the map, then to the photo. Back from the punchline, or entered settled: the industries.
        id: 'q4-industries',
        timelapse: { from: 0, to: 1, secondsPerYear: REGROUP_S, clickSteps: true },
        enter(instant) {
          setup(instant);
          const settled = !!instant || !!ctx.fromBeat?.insight;
          reg = settled ? 1 : 0;
          fadeIn = !settled;
          if (settled) ctx.director?.setYear(1);
          words = { year: undefined, caption: undefined };
          wordsAt(reg);
        },
        frame(c) {
          reg = c;
          wordsAt(c);
        },
        draw: t => {
          if (!D) return missing();
          const tr = reg * REGROUP_S;
          const shapes = [...drawIndustries(final(), industries(), tr),
            ...drawCount(partnerCount(D, TO), 1 - ramp(tr, COUNTER_OFF_S - 0.4, 0.4))];
          return fadeIn ? faded(shapes, ramp(t, 0, FADE_IN_S)) : shapes;
        },
      },
    ],
  };
}
