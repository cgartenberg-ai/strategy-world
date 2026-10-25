// Q1: the commanding heights. Top 50 companies as towers, height = market value in today's dollars;
// the top ten named. The axis grows when a new record is set, so a crash reads as towers falling.
// The play steps a decade at a time, holding on each so sectors and sizes can be read, not just churn.
// Then three call-outs pile up in the upper right, one per move: the top ten's share of market value, the year
// each leader first listed, intangible assets (q1intangibles.js). Click one to fill the screen; click again to go
// back. Set aside: what became of 1970's top ten (rank every December; who left and how; click a name to follow it).

import { heightsMix, stopClock, HEIGHTS, FRAME, niceTicks, growingAxis } from '../layouts.js';
import { SHOTS } from '../rigmath.js';
import { pct, usdShort, SECTOR_HEX } from '../colors.js';
import { TITLES, SOURCES, pinLabels, go, dur } from './common.js';
import { PAL } from '../concepts/kit.js';
import { ramp } from '../anim.js';
import { fateShapes, fateHeads, fateLabelSpots } from '../concepts/fatesDraw.js';
import { TITLE as INTAN_QUESTION, CHART as INTAN_CHART, intangiblesShapes, flatToScreen, screenToFlat, curveTo }
  from './q1intangibles.js';

// ---------------- the call-outs (pure layout; tests/q1callouts.test.js) ----------------
// Places are fractions of the 16:9 stage from its top left; sizes are U (1% of the stage height).
const UX = 0.01 * (9 / 16), UY = 0.01; // one U across and down, as a fraction of the stage
export const CALLOUTS = ['share', 'listed', 'intan']; // top to bottom
export const CALLOUT_TITLES = { share: "Top ten's share of market value", listed: 'Year first listed',
  intan: 'Intangible assets' };
export const MOVE_CALLOUTS = { 'q1-share': ['share'], 'q1-young': ['share', 'listed'],
  'q1-intangibles': ['share', 'listed', 'intan'] };
// One column below the legend row (it reaches about 0.67 across, 0.19 down), right of Eli Lilly's label (about 0.64
// across) and above the small towers to its right (their tops about 0.70 down); each slot is 14.4 U tall: a title,
// a 6.6 U chart, its years.
export const COLUMN = { x0: 0.645, x1: 0.958, top: 0.21, pitch: 0.156, h: 0.144 };
export function slotBox(i) {
  const y0 = COLUMN.top + i * COLUMN.pitch;
  return { x0: COLUMN.x0, x1: COLUMN.x1, y0, y1: y0 + COLUMN.h };
}
// the call-out under a click (stage fractions), among those on screen
export function calloutAt(ids, fx, fy) {
  for (const id of ids) {
    const b = slotBox(CALLOUTS.indexOf(id));
    if (fx >= b.x0 - 0.01 && fx <= b.x1 + 0.01 && fy >= b.y0 - 0.007 && fy <= b.y1 + 0.007) return id;
  }
  return null;
}
const SLOT = { title: 1.6, top: 4.4, bottom: 11.0, years: 1.7 }; // U from a slot's top: title centre, chart, years
const TITLE_U = 3.0, YEAR_U = 1.9, NUMBER_U = 2.6; // small call-outs: title, years, key numbers
const slotY = (i, u) => slotBox(i).y0 + u * UY;

// small (in its slot) and full screen; drawings blend the two as a call-out zooms
const SHARE_SMALL = { tx: COLUMN.x0, ty: slotY(0, SLOT.title), ts: TITLE_U, x0: COLUMN.x0 + 5.6 * UX,
  x1: COLUMN.x1 - 6 * UX, y0: slotY(0, SLOT.top), y1: slotY(0, SLOT.bottom), lab: YEAR_U, labOff: SLOT.years,
  num: NUMBER_U, numUp: 2.0, numOff: 1.0, w: 0.32, dot: 0.55 };
const SHARE_BIG = { tx: 0.13, ty: 0.25 - 4.8 * UY, ts: 3.6, x0: 0.13, x1: 0.89, y0: 0.25, y1: 0.81, lab: 2.7,
  labOff: 3.4, num: 3.4, numUp: 3.0, numOff: 2.1, w: 0.74, dot: 1.15 };
const LIST_SMALL = { tx: COLUMN.x0, ty: slotY(1, SLOT.title), ts: TITLE_U, x0: COLUMN.x0 + 14 * UX,
  x1: COLUMN.x1 - 1.5 * UX, yA: slotY(1, 5.8), yB: slotY(1, 8.6), y0: slotY(1, SLOT.bottom), gap: 1.2, rs: YEAR_U,
  lab: YEAR_U, labOff: SLOT.years, tk: 0.5, w: 0.12, r: 0.85, dx: 1.45, dy: 1.1 };
const LIST_BIG = { tx: 0.13, ty: 0.25 - 4.8 * UY, ts: 3.6, x0: 0.31, x1: 0.9, yA: 0.38, yB: 0.56, y0: 0.72, gap: 1.6,
  rs: 2.7, lab: 2.4, labOff: 3.0, tk: 1.0, w: 0.25, r: 1.8, dx: 3.4, dy: 2.2 };
const INTAN_SMALL = { x0: COLUMN.x0 + 2.2 * UX, x1: COLUMN.x1 - 6 * UX, y0: slotY(2, SLOT.top), y1: slotY(2, SLOT.bottom) };
// the small title sits where the full chart's label starts, so one grows into the other
const INTAN_HEAD = { text: CALLOUT_TITLES.intan, dx: 2.2 * UX * 16, dy: (SLOT.top - SLOT.title) * UY * 9, size: TITLE_U,
  numbers: NUMBER_U, years: YEAR_U, yearsOff: SLOT.years * UY * 9 };
const INTAN_DRAW = { start: 0.6, span: 3.5 }; // the small line draws itself a little faster than the full chart did

const lerp = (a, b, z) => {
  const o = {};
  for (const k in a) o[k] = typeof a[k] === 'number' ? a[k] * (1 - z) + b[k] * z : a[k];
  return o;
};
const fade = (shapes, f) => shapes.map(s => ({ ...s, o: (s.o ?? 1) * f }));
const sText = (t, at, o = {}) => ({ k: 'text', screen: true, text: t, at, size: 1.6, color: PAL.white, ...o });
const sLine = (a, b, o = {}) => ({ k: 'line', screen: true, a, b, color: PAL.white, w: 0.2, ...o });
const sCircle = (at, o = {}) => ({ k: 'circle', screen: true, at, ...o });
const sPoly = (pts, o = {}) => ({ k: 'poly', screen: true, pts, ...o });

export function q1Scene(ctx) {
  const q1 = ctx.data.q1_heights;
  const first = q1.frames[0].year, last = q1.frames[q1.frames.length - 1].year;
  const base = q1.real_base_year || 2024;
  const real = (e, f) => e[2] * (f.deflator ?? 1); // nominal market value -> base-year dollars
  const axisMax = growingAxis(q1, real);
  const mix = (ya, yb, f) => {
    const top = axisMax(ya) + (axisMax(yb) - axisMax(ya)) * f;
    return { ...heightsMix(q1, ya, yb, f, { metric: real, scale: v => (v / top) * HEIGHTS.maxHeight }), top };
  };
  const at = y => mix(y, y, 0);
  let H = at(first);

  const HOLD_S = 5, MOVE_S = 2.5; // seconds resting on each decade, seconds moving to the next
  // decades, then the last December; with a month-end snapshot (e.g. June 2026) one more hop to it
  const snap = q1.snapshot && q1.snapshot.year === last ? q1.snapshot : null;
  const lastDec = snap && q1.frames.some(f => f.year === last - 1) ? last - 1 : last;
  const STOPS = [];
  for (let y = first; y < lastDec; y += 10) STOPS.push(y);
  STOPS.push(lastDec);
  if (lastDec !== last) STOPS.push(last);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
    'November', 'December'];
  const yearLabel = y => (snap && y === last ? `${MONTHS[Number(snap.month.slice(5, 7)) - 1]} ${y}` : y);

  // Click a call-out to have it fill the screen; click again (anywhere) to go back. One at a time.
  const zoom = { id: null, on: false, at: -1e9 };
  const zoomLevel = () => {
    if (!zoom.id) return 0;
    const s = (performance.now() - zoom.at) / 1000;
    return zoom.on ? ramp(s, 0, 0.7) : 1 - ramp(s, 0, 0.6);
  };
  const resetZoom = () => { zoom.id = null; zoom.on = false; zoom.at = -1e9; };
  const stageSize = () => { const el = document.getElementById('stage'); return [el.clientWidth, el.clientHeight]; };
  function zoomPointer(ids) {
    return ({ type, px, py }) => {
      const [W, Hh] = stageSize(), hit = calloutAt(ids, px / W, py / Hh);
      if (type === 'hover') return zoom.on || hit ? 'pointer' : null;
      if (type !== 'down') return false;
      if (zoom.on) { zoom.on = false; zoom.at = performance.now(); return true; } // a click anywhere goes back
      if (!hit) return false; // elsewhere: clicks still name lights
      zoom.id = hit; zoom.on = true; zoom.at = performance.now();
      return true;
    };
  }

  const legendItems = q1.sectors.filter(s => s !== 'Other').map(s => ({ color: SECTOR_HEX[s] || SECTOR_HEX.Other, text: s }));

  const axis = () => {
    const top = H.top;
    return {
      label: `Market value (${base} dollars)`, x0: FRAME.xMin, x1: FRAME.xMax, grid: false,
      yTicks: niceTicks(top / 1.04, 4).map(v => ({
        y: HEIGHTS.ground + (v / top) * HEIGHTS.maxHeight, label: usdShort(v), zero: v === 0 })),
    };
  };

  function setup(source = q1.source_line || SOURCES.q1) {
    resetZoom();
    ctx.overlay.reset({ title: TITLES.q1, source });
    ctx.overlay.legend(legendItems);
    ctx.overlay.axis(axis);
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
    ctx.world.plates.set([], { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setGlow(0.3);
    ctx.cardExtra = id => {
      const s = H.frame?.sky.find(r => r[0] === id);
      return s ? { sector: q1.sectors[s[4]], mv: real(s, H.frame), mvLabel: `Market value ${H.frame.year} (${base} dollars)` } : {};
    };
  }

  // year each company first listed (CRSP); 1925 means it was already listed when CRSP begins
  const listed = q1.listed || {};
  const listedText = id => { const y = listed[String(id)]; return y == null ? '' : y <= 1925 ? 'before 1926' : String(y); };

  function labels(topText = a => usdShort(a.value)) {
    const out = [];
    const f = H.frame;
    if (!f || zoomLevel() > 0.02) return out;
    const eraName = new Map(f.podium.map(p => [p[0], p[1]])); // the name the company had that year
    const placed = []; // keep names from colliding while towers swap places
    for (const id of H.podium) {
      const a = H.agents.get(id);
      if (!a || a.tower < 0.02) continue;
      if (placed.some(x => Math.abs(x - a.x) < HEIGHTS.bigStep * 0.8)) continue;
      placed.push(a.x);
      out.push({ key: `pn${id}`, text: eraName.get(id) || ctx.index.name(id), at: [a.x, HEIGHTS.ground - 0.06, 0],
        anchor: 'below', cls: 'podium', width: HEIGHTS.bigStep * 0.98 });
      out.push({ key: `ps${id}`, text: topText(a, id), at: [a.x, HEIGHTS.ground + a.tower + 0.04, 0],
        anchor: 'above', cls: 'small' });
    }
    return out.concat(pinLabels(ctx, new Set(H.podium)));
  }
  const listingLabels = () => labels((a, id) => listedText(id));

  // (1) The top ten's share of market value, a white line; small: its two ends, full size: the share axis, decades.
  const shareFrames = q1.frames.filter(f => f.year >= (q1.share_from || 0)); // earliest years have thin coverage
  function shareShapes(t, z) {
    const g = lerp(SHARE_SMALL, SHARE_BIG, z), dz = ramp(z, 0.4, 0.5), o = ramp(t, 0.1, 0.5), out = [];
    const xs = shareFrames.map(f => f.year), vals = shareFrames.map(f => f.top10_share), n = xs.length;
    const hi = Math.ceil(Math.max(...vals) * 10) / 10;
    const X = i => g.x0 + (i / Math.max(1, n - 1)) * (g.x1 - g.x0), Yv = v => g.y1 - (v / hi) * (g.y1 - g.y0);
    out.push(sText(CALLOUT_TITLES.share, [g.tx, g.ty], { anchor: 'start', size: g.ts, o }));
    if (dz > 0) {
      for (const v of [hi / 2, hi]) out.push(sLine([g.x0, Yv(v)], [g.x1, Yv(v)], { color: '#1f1f1f', w: 0.1, o: o * dz }));
      for (const v of [0, hi / 2, hi]) out.push(sText(pct(v), [g.x0 - 1.7 * UX, Yv(v)], { anchor: 'end', size: g.lab, o: o * dz }));
    }
    out.push(sLine([g.x0, Yv(0)], [g.x1, Yv(0)], { color: '#6a6a6a', w: 0.1, o }));
    // years: the two ends when small; every decade and the last year when full size
    const yLab = g.y1 + g.labOff * UY;
    xs.forEach((y, i) => {
      const end = i === n - 1;
      if (i > 0 && !end && y % 10 !== 0) return;
      if (dz > 0) out.push(sLine([X(i), g.y1], [X(i), g.y1 + 0.6 * UY * (g.lab / 1.3)], { color: '#5a5a5a', w: 0.1, o: o * dz }));
      if (i === 0) out.push(sText(String(y), [X(i), yLab], { size: g.lab, o }));
      else if (dz > 0) out.push(sText(String(end ? yearLabel(y) : y), [X(i), yLab], { size: g.lab, o: o * dz }));
    });
    if (dz < 1) out.push(sText(String(xs[n - 1]), [X(n - 1), yLab], { size: g.lab, o: o * (1 - dz) }));
    // the line draws itself in; the two ends written
    const pts = vals.map((v, i) => [X(i), Yv(v)]), drawn = curveTo(pts, ramp(t, 0.3, 1.3, 'inOutSine') + 0);
    out.push(sPoly(drawn, { stroke: PAL.white, w: g.w, o }));
    out.push(sCircle(drawn[drawn.length - 1], { r: g.dot, fill: PAL.white, o }));
    out.push(sCircle(pts[0], { r: g.dot * 0.8, fill: PAL.white, o }));
    // the first share: beside the line's start when small, above it when full size
    const o0 = ramp(t, 0.3, 0.4);
    if (dz < 1) out.push(sText(pct(vals[0]), [pts[0][0] - 0.9 * UX, pts[0][1]], { anchor: 'end', size: g.num, o: o0 * (1 - dz) }));
    if (dz > 0) out.push(sText(pct(vals[0]), [pts[0][0], pts[0][1] - g.numUp * UY], { anchor: 'start', size: g.num, o: o0 * dz }));
    out.push(sText(pct(vals[n - 1]), [pts[n - 1][0] + g.numOff * UX, pts[n - 1][1]],
      { anchor: 'start', size: g.num, o: ramp(t, 1.5, 0.4) }));
    return out;
  }

  // (2) Two rows of ten dots on a timeline: when the top ten of 1970 and of the last year first listed.
  function listingShapes(t, z) {
    const g = lerp(LIST_SMALL, LIST_BIG, z), Y0 = 1920, Y1 = 2025, o = ramp(t, 0.2, 0.8), out = [];
    const frac = y => (Math.max(Y0 + 5, y) - Y0) / (Y1 - Y0), X = y => g.x0 + frac(y) * (g.x1 - g.x0);
    const fA = q1.frames.find(f => f.year === 1970) || q1.frames[0], fB = q1.frames[q1.frames.length - 1];
    out.push(sText(CALLOUT_TITLES.listed, [g.tx, g.ty], { anchor: 'start', size: g.ts, o }));
    out.push(sLine([g.x0, g.y0], [g.x1, g.y0], { color: '#5a5a5a', w: g.w, o }));
    for (const yr of [1926, 1950, 1975, 2000, 2025]) {
      out.push(sLine([X(yr), g.y0], [X(yr), g.y0 + g.tk * UY], { color: '#5a5a5a', w: g.w * 0.8, o }));
      out.push(sText(String(yr), [X(yr), g.y0 + g.labOff * UY], { size: g.lab, o }));
    }
    const row = (f, y, label, start) => {
      out.push(sText(label, [g.x0 - g.gap * UX, y], { anchor: 'end', size: g.rs, o }));
      const pos = new Map();
      f.sky.slice(0, 10).forEach((sk, i) => {
        const yr = listed[String(sk[0])]; if (yr == null) return;
        // stack dots that would touch on the small chart (same grouping at every zoom)
        const key = Math.round(frac(yr) * 41.6), n = pos.get(key) || 0; pos.set(key, n + 1);
        const f2 = ramp(t, start + i * 0.08, 0.6);
        const x = X(yr) + (n % 5) * g.dx * UX, yy = y - Math.floor(n / 5) * g.dy * UY;
        const col = SECTOR_HEX[q1.sectors[sk[4]]] || SECTOR_HEX.Other;
        out.push(sCircle([g.x0 + (x - g.x0) * f2, yy], { r: g.r, fill: col, stroke: col, w: 0.1, o: o * f2, glow: true }));
      });
    };
    row(fA, g.yA, `Top ten, ${fA.year}`, 0.6);
    row(fB, g.yB, `Top ten, ${z > 0.5 ? yearLabel(fB.year) : fB.year}`, 1.6);
    return out;
  }

  // (3) Intangible assets: the glowing line of q1intangibles.js, small in its slot or the full chart.
  const intan = q1.intangibles && q1.intangibles.years && q1.intangibles.years.length ? q1.intangibles : null;
  const intanSmall = screenToFlat(INTAN_SMALL);
  const intanShapes = (t, z) => flatToScreen(intangiblesShapes(intan, t,
    { L: lerp(intanSmall, INTAN_CHART, z), z, draw: INTAN_DRAW, head: INTAN_HEAD }));

  const calloutShapes = (id, t, z) => (id === 'share' ? shareShapes(t, z) : id === 'listed' ? listingShapes(t, z)
    : intanShapes(t, z));

  // Each move's source covers what is on screen; a zoomed call-out shows its own.
  const LISTED_SOURCE = 'Source: CRSP via WRDS. Year each company first listed on an exchange CRSP covers (CRSP begins '
    + 'in 1926); market value each December.';
  const SOURCE = { share: q1.source_line || SOURCES.q1, listed: LISTED_SOURCE,
    intan: (intan && intan.source_line) || 'Source: Compustat via WRDS.' };
  const MOVE_SOURCE = { 'q1-share': SOURCE.share, 'q1-young': LISTED_SOURCE,
    'q1-intangibles': 'Source: CRSP via WRDS (market value; year first listed); Compustat via WRDS (intangible assets '
      + '÷ common shareholders’ equity, mean by fiscal year).' };

  // while zoomed: the legend and year step back (labels are dropped in labels()); intangibles asks its own question
  function calloutChrome(move) {
    const z = zoomLevel(), big = z > 0.5 ? zoom.id : null;
    ctx.overlay.legendOpacity(1 - z);
    ctx.overlay.year(z > 0.4 ? null : yearLabel(last));
    ctx.overlay.title(big === 'intan' ? INTAN_QUESTION : TITLES.q1);
    ctx.overlay.source(big ? SOURCE[big] : MOVE_SOURCE[move]);
  }

  // A move with call-outs. Those already on screen in the move before stay put; a new one comes in; one the move
  // before had and this one hasn't (stepping back) fades away. The zoomed one is drawn last, over a dark stage.
  function calloutMove(id, moveLabels) {
    const ids = MOVE_CALLOUTS[id];
    let stay = new Set(), leaving = [];
    return {
      id,
      enter(instant) {
        const before = MOVE_CALLOUTS[ctx.fromBeat && ctx.fromBeat.id] || [];
        stay = new Set(before.filter(c => ids.includes(c)));
        leaving = instant ? [] : before.filter(c => !ids.includes(c));
        setup(MOVE_SOURCE[id]);
        go(ctx, SHOTS.heights, 600, instant);
        H = at(last);
        ctx.world.setTargets(H.agents, { duration: dur(ctx, 700) });
        ctx.overlay.year(yearLabel(last));
      },
      tick() { calloutChrome(id); },
      pointer: zoomPointer(ids),
      labels: moveLabels,
      draw(t) {
        const z = zoomLevel(), zid = z > 0.001 && ids.includes(zoom.id) ? zoom.id : null, out = [];
        const own = c => (stay.has(c) ? 1e9 : t); // a call-out's own clock: settled if it was already there
        if (t < 0.6) for (const c of leaving) out.push(...fade(calloutShapes(c, 1e9, 0), 1 - ramp(t, 0, 0.5)));
        for (const c of ids) if (c !== zid) out.push(...calloutShapes(c, own(c), 0));
        if (zid) {
          out.push({ k: 'rect', screen: true, a: [0, 0], b: [1, 1], fill: '#000', fo: 0.985 * z });
          out.push(...calloutShapes(zid, own(zid), z));
        }
        return out;
      },
    };
  }

  // What became of 1970's top ten: each company's own light traces its rank every December to the last year;
  // a break is a bankruptcy and relisting, a cross is a company that left. A click (or Space) plays it.
  const F = q1.fates && q1.fates.firms && q1.fates.firms.length ? q1.fates : null;
  let fateClock = F ? F.years[0] : 0, fateFocus = null;
  // a click on a company's name follows it (others dim); a second click, or a click elsewhere, lets go
  function fateHit(px, py) {
    const spots = fateLabelSpots(F), U = stageSize()[1] / 100;
    const shown = fateClock >= F.years[F.years.length - 1] - 0.5 ? [...spots.left, ...spots.right] : spots.left;
    for (const s of shown) {
      const [sx, sy] = ctx.world.projectFrame(s.x, s.y, 0);
      if (Math.abs(py - sy) > U * 1.05) continue;
      if (s.side === 'left' ? px > sx - U * 17 && px < sx + U * 1.2 : px > sx - U * 6 && px < sx + U * 15) return s.id;
    }
    return null;
  }
  const FATE_SOURCE = 'Source: CRSP via WRDS (rank by December market value among listed US companies); exits from '
    + 'Compustat; who bought whom and bankruptcies from the public record.';
  const fateBeat = F && {
    id: 'q1-fate',
    timelapse: { from: F.years[0], to: F.years[F.years.length - 1], secondsPerYear: 0.16 },
    enter(instant) {
      resetZoom();
      ctx.overlay.reset({ title: TITLES.q1, source: FATE_SOURCE });
      ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
      ctx.world.plates.set([], { duration: dur(ctx, 600) });
      ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
      go(ctx, SHOTS.flat, 1400, instant);
      fateClock = F.years[0]; fateFocus = null;
      ctx.world.setTargets(fateHeads(F, fateClock, SECTOR_HEX), { duration: dur(ctx, 1400) });
      ctx.overlay.year(fateClock);
    },
    frame(c) {
      if (c <= F.years[0] + 1e-6 && ctx.world.busy()) return; // let the lights arrive first
      fateClock = c;
      ctx.world.setNow(fateHeads(F, c, SECTOR_HEX, fateFocus));
      ctx.overlay.year(yearLabel(Math.floor(c + 1e-6)));
    },
    draw: t => fateShapes(F, fateClock, t, SECTOR_HEX, fateFocus),
    pointer({ type, px, py }) {
      const id = fateHit(px, py);
      if (type === 'hover') return id != null ? 'pointer' : null;
      if (type !== 'down') return false;
      if (id == null && fateFocus == null) return false;
      fateFocus = id == null || id === fateFocus ? null : id;
      return true;
    },
  };

  return {
    id: 'q1',
    beats: [
      {
        id: 'q1-open',
        enter(instant) {
          setup();
          go(ctx, SHOTS.heights, 2400, instant);
          H = at(first);
          ctx.world.setTargets(H.agents, { duration: dur(ctx, 2200), stagger: 0.6, staggerBy: 'x' });
          ctx.overlay.year(first);
        },
        labels,
      },
      {
        id: 'q1-play',
        // the clock counts stops (0 = first decade); Shift+arrows step one decade
        // each click moves one decade (2.5 s); Space plays them all, resting ~5 s on each
        timelapse: { from: 0, to: STOPS.length - 1, secondsPerYear: HOLD_S + MOVE_S,
          clickSteps: true, stepFrom: HOLD_S / (HOLD_S + MOVE_S),
          fromYear: y => Math.max(0, STOPS.filter(s => s <= y).length - 1) },
        enter(instant) { setup(); go(ctx, SHOTS.heights, 600, instant); },
        frame(c) {
          if (c <= 1e-6 && ctx.world.busy()) return; // let the opening build finish
          const s = stopClock(c, STOPS, HOLD_S / (HOLD_S + MOVE_S));
          H = mix(s.ya, s.yb, s.f);
          ctx.world.setNow(H.agents);
          ctx.overlay.year(yearLabel(s.shown));
        },
        labels,
      },
      calloutMove('q1-share', () => labels()),
      // Collis's point in our data: the leaders of 1970 were already old; today's are young
      calloutMove('q1-young', listingLabels),
      ...(fateBeat ? [fateBeat] : []),
      // the shift toward intangibles: Q1's last move in its module
      ...(intan ? [calloutMove('q1-intangibles', listingLabels)] : []),
    ],
  };
}
