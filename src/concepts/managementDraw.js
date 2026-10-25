// Q5's two factories, drawn in the app's neon style and reused from q6-plants onward: the factory outline
// (and its ghost), the input streams (world lights), the output piles and their counters, and the
// management-score lights inside. Pure: positions and a clock in, overlay shapes or light agents out.
// Coordinates are the fixed chart frame of the flat shot (x -8..8, y -4.5..4.5).

import { PAL, text, line, rect, circle, poly, light } from './kit.js';
import { factoryOutline, streamAt, pileSlot, launchAt, hop, boxesFor, countAt, gauge, MOPS_AREAS } from './management.js';
import { CONCEPT } from '../anim.js';
import { hexToRgb } from '../colors.js';

const clamp01 = v => Math.max(0, Math.min(1, v));

// ---- where everything sits ----
export const FACTORY = { w: 3.3, h: 1.5, teeth: 3, rise: 0.42, chimney: { dx: 0.3, w: 0.28, up: 0.52 } };
export const LANES = [                                   // the weaker plant on top, the stronger below
  { key: 'weak', x0: -3.5, base: 0.55 },
  { key: 'strong', x0: -3.5, base: -2.95 },
];
export const STREAM = { x0: -7.1, rows: [1.14, 0.75, 0.36], spacing: 0.4, speed: 1.1, size: 0.085 }; // rows top to bottom
export const INPUTS = [
  { name: 'workers', color: PAL.pink },
  { name: 'machines', color: PAL.cyan },
  { name: 'materials', color: PAL.deere },
];
export const PILE = { dx: 0.45, pitch: 0.5, box: 0.42, rows: 5, perBox: 4 }; // starts dx right of the factory
export const RACE = { start: 1.4, run: 4.8, flight: 0.55 };                  // seconds on the beat's clock
export const RACE_END = RACE.start + RACE.run + RACE.flight;                 // the last box has landed
export const COUNTER_X = 6.6;
export const BOX = { stroke: '#8FD0FF', fill: PAL.sky, fo: 0.32 };
export const STREAM_IDS = 0;                                                 // CONCEPT ids 0..79: input lights

export const factoryCentre = L => [L.x0 + FACTORY.w / 2, L.base + FACTORY.h / 2];
export const pileX0 = L => L.x0 + FACTORY.w + PILE.dx;
export const slotCentre = (L, k) => {
  const { col, row } = pileSlot(k, PILE.rows);
  return [pileX0(L) + (col + 0.5) * PILE.pitch, L.base + (row + 0.5) * PILE.pitch];
};
export const pileTop = L => L.base + PILE.rows * PILE.pitch;

// ---- the factory ----
// Its outline (a body under a sawtooth roof) and chimney, at body centre `at`, `scale` times the size.
function geometry(at, scale) {
  const w = FACTORY.w * scale, h = FACTORY.h * scale, rise = FACTORY.rise * scale;
  const x0 = at[0] - w / 2, base = at[1] - h / 2, tw = w / FACTORY.teeth, C = FACTORY.chimney;
  const c0 = x0 + C.dx * scale, c1 = c0 + C.w * scale, roofAt = x => base + h + rise * (((x - x0) % tw) / tw);
  const top = base + h + rise + C.up * scale;
  return { x0, base, w, h, outline: factoryOutline({ x0, base, w, h, teeth: FACTORY.teeth, rise }),
    chimney: [[c0, roofAt(c0)], [c0, top], [c1, top], [c1, roofAt(c1)]] };
}

// The solid factory: a black body (it hides the input lights that run into its wall) with a glowing outline.
export function drawFactory(at, scale = 1, o = 1, { color = PAL.sky, w = 0.22, fill = 1 } = {}) {
  if (o <= 0.003) return [];
  const G = geometry(at, scale), sw = w * Math.max(0.35, Math.min(1, scale));
  return [
    poly(G.outline, { closed: true, fill: '#000', fo: fill, stroke: color, w: sw, o, glow: true }),
    poly(G.chimney, { stroke: color, w: sw, o, glow: true }),
  ];
}

// A faint dashed ghost of the factory (drawShapes dashes lines only, so it is drawn edge by edge).
export function ghostFactory(at, scale = 1, o = 1, { color = '#FFFFFF', w = 0.16, dash = [0.9, 0.7] } = {}) {
  if (o <= 0.003) return [];
  const G = geometry(at, scale), out = [], P = [...G.outline, G.outline[0]];
  for (let i = 1; i < P.length; i++) {
    const [a, b] = [P[i - 1], P[i]];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-6) out.push(line(a, b, { color, w, dash, o }));
  }
  for (let i = 1; i < G.chimney.length; i++) out.push(line(G.chimney[i - 1], G.chimney[i], { color, w, dash, o }));
  return out;
}

// ---- the inputs: three streams of lights into each factory's left wall, the same in both lanes ----
// tm: the streams' own clock (they stop when it stops); alpha(d): extra opacity by distance along the stream.
export function inputLights(lanes, tm, alpha = () => 1) {
  const m = new Map(), length = lanes[0].x0 - STREAM.x0;
  lanes.forEach((L, i) => STREAM.rows.forEach((dy, r) => {
    const rgb = hexToRgb(INPUTS[r].color);
    for (const { j, d, on } of streamAt(tm, { length, spacing: STREAM.spacing, speed: STREAM.speed, phase: (r * STREAM.spacing) / 3 })) {
      const a = on ? clamp01(d / 0.45) * alpha(d) : 0;          // each light fades in at the stream's start
      m.set(CONCEPT.id(STREAM_IDS + i * 40 + r * 13 + j), light(STREAM.x0 + d + 0.12, L.base + dy,
        { size: STREAM.size, color: rgb, alpha: a }));
    }
  }));
  return m;
}
export const inputIds = () => Array.from({ length: 80 }, (_, j) => CONCEPT.id(STREAM_IDS + j));

// "Same inputs", with the three kinds in their colours, between the two lanes' streams.
export function inputsLabel(o = 1) {
  if (o <= 0.003) return [];
  const cx = (STREAM.x0 + LANES[0].x0) / 2 - 0.2, y = (LANES[0].base + LANES[1].base + FACTORY.h) / 2 + 0.05;
  return [
    text('Same industry, same inputs', [cx, y + 0.34], { size: 3.2, weight: 500, o }),
    ...INPUTS.map((k, i) => text(k.name, [cx + (i - 1) * 1.6, y - 0.44], { size: 3.0, weight: 500, color: k.color, o })), // clear of the chimney
  ];
}

// ---- the outputs: boxes hop out of the right wall and stack, column by column ----
// t: the race clock. style(k) may override a box's look: {o, stroke, fill, fo}.
export function outputPile(L, units, t, { o = 1, style = null } = {}) {
  const n = boxesFor(units, PILE.perBox), out = [], x1 = L.x0 + FACTORY.w, door = [x1 + 0.06, L.base + 0.3];
  const hb = PILE.box / 2, flying = [];
  for (let k = 0; k < n; k++) {
    const t0 = launchAt(k, n, RACE), u = (t - t0) / RACE.flight;
    if (u <= 0) break;
    const s = slotCentre(L, k), { col } = pileSlot(k, PILE.rows);
    const st = style ? style(k) : null, bo = o * (st?.o ?? 1);
    if (bo <= 0.003) continue;
    const look = { stroke: st?.stroke ?? BOX.stroke, w: 0.16, fill: st?.fill ?? BOX.fill, fo: st?.fo ?? BOX.fo, r: 0.12, o: bo };
    if (u >= 1) {
      const fresh = clamp01(1 - (u - 1) * RACE.flight / 0.3);   // a just-landed box glows for a moment
      out.push(rect([s[0] - hb, s[1] - hb], [s[0] + hb, s[1] + hb], { ...look, fo: Math.min(1, look.fo + 0.45 * fresh), glow: st?.glow ?? true }));
    } else {
      const top = col === 0 ? Math.max(door[1], s[1]) + 0.45 : pileTop(L) + 0.32;
      const p = hop(u, door, s, top), g = 0.55 + 0.45 * Math.min(1, u * 4);
      flying.push(rect([p[0] - hb * g, p[1] - hb * g], [p[0] + hb * g, p[1] + hb * g], { ...look, fo: 0.7, glow: true }));
    }
  }
  return out.concat(flying);
}

// The output counter in the column at the right: it climbs with the pile and stops at the plant's total.
export function outputCounter(L, units, t, o = 1, { color = '#FFFFFF' } = {}) {
  if (o <= 0.003) return [];
  const c = countAt(t, units, RACE), done = c >= units;
  return [text(String(c), [COUNTER_X, L.base + (PILE.rows * PILE.pitch) / 2], { size: 6.2, weight: 600, color, o, glow: done })];
}

// The plant's name inside its factory, with the precise meaning on a second line.
export function factoryLabel(L, name, sub, o = 1, oSub = o, nameY = null) {
  const [cx] = factoryCentre(L), out = [];
  if (o > 0.003) out.push(text(name, [cx, L.base + (nameY ?? (sub ? 1.05 : 0.75))], { size: 3.0, weight: 500, o }));
  if (sub && oSub > 0.003) out.push(text(sub, [cx, L.base + 0.42], { size: 2.6, o: oSub }));
  return out;
}

// ---- inside: 16 lights, one per survey question, a row per area (names on the left); each area lit to the score ----
export const SCORE_LIGHTS = { rows: [0.86, 0.55, 0.24], nameX: 1.3, x: 1.52, pitch: 0.2, r: 0.85, nameY: 1.24 };
export function scoreLightsAt(L) {                    // [{x, y, area, i}] for the 16 lights
  const S = SCORE_LIGHTS, out = [];
  MOPS_AREAS.forEach((a, ai) => { for (let i = 0; i < a.n; i++) out.push({ x: L.x0 + S.x + i * S.pitch, y: L.base + S.rows[ai], area: ai, i }); });
  return out;
}
// score: the plant's 0-1 score; fill: 0..1, how far the lights have filled toward it; names: area labels.
export function scoreLights(L, score, fill, o = 1, { color = PAL.amber, names = true } = {}) {
  if (o <= 0.003) return [];
  const pts = scoreLightsAt(L), lit = MOPS_AREAS.map(a => gauge(score * clamp01(fill), a.n)), out = [];
  for (const p of pts) {
    const v = lit[p.area][p.i];
    out.push(circle([p.x, p.y], { r: SCORE_LIGHTS.r, fill: '#000', fo: 1, stroke: '#6A6A6A', w: 0.14, o }));
    if (v > 0.01) out.push(circle([p.x, p.y], { r: SCORE_LIGHTS.r, fill: color, fo: 0.25 + 0.75 * v, stroke: color, w: 0.14, o: o * Math.max(0.35, v), glow: v > 0.5 }));
  }
  if (names) MOPS_AREAS.forEach((a, ai) => out.push(text(a.name, [L.x0 + SCORE_LIGHTS.nameX, L.base + SCORE_LIGHTS.rows[ai]], { anchor: 'end', size: 2.4, o })));
  return out;
}
