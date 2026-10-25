// The strategy landscape (adapted from David J. Collis, 2024): the map that holds the morning together.
// Five stages light up left to right; the six questions drop in under the stages they belong to
// (click one to open that chapter); the loop runs from results back to changing conditions; and the
// session closes on four questions under the stages. Layout lives in src/concepts/landscape.js.

import { TITLES, go, dur } from './common.js';
import { SHOTS } from '../rigmath.js';
import { ramp } from '../anim.js';
import { text, line, rect, poly, circle } from '../concepts/kit.js';
import {
  layoutStages, columns, QUESTIONS, ROW_Y, PESTEL, CLOSE, CLOSE_Y, PANEL, labelBox, inBox, loopPath, partialPath,
} from '../concepts/landscape.js';

const SOURCE = 'Adapted from David J. Collis, Mastering the Complete Strategy Landscape (HBS 2024).';
const UW = 0.09; // world units per U
const LAID = layoutStages(), COLS = columns(LAID), LOOP = loopPath(LAID);
const MID = (PANEL.y0 + PANEL.y1) / 2, SUB = { y0: PANEL.y0 + 0.16, y1: PANEL.y1 - 0.66 };
const LOOP_TAG = { x0: -0.42, x1: 0.42, y0: -3.17, y1: -2.73, scene: 'q7' };
const nLines = s => String(s).split('\n').length;

// The five stages. build: light them in sequence (t from the start of the beat).
function stageShapes(t, { build = false } = {}) {
  const S = [];
  LAID.forEach((s, i) => {
    const t0 = build ? 0.3 + 0.75 * i : -100;
    const o = ramp(t, t0, 0.6), flash = build ? 1 - ramp(t, t0 + 0.45, 1.1) : 0;
    if (o <= 0) return;
    S.push(rect([s.x0, PANEL.y0], [s.x1, PANEL.y1], { stroke: s.color, w: 0.24, r: 0.9, fill: s.color, fo: 0.08 + 0.22 * flash, o, glow: true }));
    if (s.subs) {
      S.push(text(s.label, [s.cx, PANEL.y1 - 0.33], { size: 2.2, weight: 500, o }));
      s.subs.forEach((u, j) => {
        const ou = o * ramp(t, t0 + 0.3 + 0.18 * j, 0.5);
        S.push(rect([u.x0 + 0.1, SUB.y0], [u.x1 - 0.1, SUB.y1], { stroke: s.color, w: 0.14, r: 0.6, fill: s.color, fo: 0.12, o: 0.85 * ou }),
          text(u.label, [u.cx, (SUB.y0 + SUB.y1) / 2], { size: 1.9, o: ou }));
      });
    } else S.push(text(s.label, [s.cx, MID], { size: 2.2, weight: 500, o }));
    if (i < LAID.length - 1) { // chevron to the next stage
      const cx = (s.x1 + LAID[i + 1].x0) / 2, oc = ramp(t, t0 + 0.5, 0.35), glowUp = build ? 1 - ramp(t, t0 + 0.85, 0.8) : 0;
      S.push(poly([[cx - 0.09, MID + 0.27], [cx + 0.11, MID], [cx - 0.09, MID - 0.27]],
        { stroke: '#FFFFFF', w: 0.38, o: oc * (0.7 + 0.3 * glowUp), glow: true }));
    }
    if (s.when) S.push(text(s.when, [s.cx, PANEL.y1 + 0.3], { size: 1.5, color: '#9A9A9A', o: build ? ramp(t, 4.3, 0.8) : 1 }));
  });
  return S;
}

// The six questions under their stages. drop: they fall in one by one.
function questionShapes(t, { drop = false, o: O = 1 } = {}) {
  const S = [];
  QUESTIONS.forEach((q, j) => {
    const c = COLS[q.at], y = ROW_Y[q.row];
    const f = ramp(t, drop ? 0.35 + 0.3 * j : -100, 0.6, 'outQuart'), o = f * O * (q.faint ? 0.45 : 1), dy = (1 - f) * 0.5;
    if (o <= 0) return;
    S.push(text(q.n, [c.cx, y + 0.16 + dy], { size: 2.2, weight: 600, color: q.colorOf ? COLS[q.colorOf].color : c.color, o }));
    if (q.label) S.push(text(q.label, [c.cx, y - 0.17 + dy], { size: 1.6, o }));
  });
  const c = COLS.conditions;
  S.push(text(PESTEL, [c.cx, ROW_Y[0]], { size: 1.35, color: '#9A9A9A', o: O * ramp(t, drop ? 0.2 : -100, 0.6) }));
  return S;
}

// The loop from results back to changing conditions; a pulse rides it once drawn.
function loopShapes(t, { draw = false, o: O = 1, pulse = true, tag = true } = {}) {
  const S = [], p = draw ? ramp(t, 0.4, 2.6, 'inOutSine') : 1;
  const { pts, head } = partialPath(LOOP, p);
  S.push(poly(pts, { stroke: '#FFFFFF', w: 0.32, o: 0.75 * O, glow: true }));
  if (p >= 1) { // arrowhead into changing conditions (a triangle, so it dims with the line)
    const [x, y] = LOOP[LOOP.length - 1];
    S.push(poly([[x + 0.02, y], [x - 0.2, y + 0.12], [x - 0.2, y - 0.12]], { closed: true, fill: '#FFFFFF', fo: 1, o: 0.85 * O }));
  }
  if (pulse && O > 0.5) {
    const at = p < 1 ? head : partialPath(LOOP, (((t - 3.0) / 3.4) % 1 + 1) % 1).head;
    if (p > 0) S.push(circle(at, { r: 0.75, fill: '#FFFFFF', o: 0.95, glow: true }));
  }
  if (tag && p >= 1) { // Q7 rides the loop: rivals respond
    const o = O * 0.8 * (draw ? ramp(t, 3.0, 0.6) : 1);
    S.push(rect([LOOP_TAG.x0, LOOP_TAG.y0], [LOOP_TAG.x1, LOOP_TAG.y1], { fill: '#000', fo: 1, o }),
      text('Q6', [0, (LOOP_TAG.y0 + LOOP_TAG.y1) / 2], { size: 2.0, weight: 600, color: COLS.rivals.color, o }));
  }
  return S;
}

// The close: four questions, each bracketing the stages it draws on.
function closeShapes(t) {
  const S = [];
  CLOSE.forEach((c, j) => {
    const a = COLS[c.from], b = COLS[c.to], y = CLOSE_Y[c.row], x0 = a.x0 + 0.08, x1 = b.x1 - 0.08, m = (x0 + x1) / 2;
    const g = ramp(t, 0.5 + 0.8 * j, 0.6), o = ramp(t, 0.5 + 0.8 * j, 0.3), hx = ((x1 - x0) / 2) * g;
    S.push(line([m - hx, y], [m + hx, y], { color: '#CFCFCF', w: 0.2, o }),
      line([x0, y], [x0, y + 0.15], { color: '#CFCFCF', w: 0.2, o: o * g }), line([x1, y], [x1, y + 0.15], { color: '#CFCFCF', w: 0.2, o: o * g }));
    const lh = 2.3 * 1.18 * UW;
    S.push(text(c.text, [m, y - 0.22 - (nLines(c.text) * lh) / 2], { size: 2.3, o: ramp(t, 0.8 + 0.8 * j, 0.6) }));
  });
  return S;
}

export function mapScene(ctx) {
  let still = false; // export render: no travelling pulse

  function setup(instant) {
    still = instant;
    ctx.overlay.reset({ title: TITLES.end, source: SOURCE });
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
    ctx.world.plates.set([], { duration: dur(ctx, 600) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.world.setTargets(new Map(), { duration: dur(ctx, 900) });
    ctx.allowOrbit = false;
    go(ctx, SHOTS.flat, 1200, instant);
  }

  // Clicking a question opens its chapter.
  const jumpTo = id => {
    const i = ctx.director.scenes.findIndex(s => s.id === id);
    if (i >= 0) { ctx.pins.clear(); ctx.card.hide(); ctx.director.jump(i); }
  };
  const pointer = withTag => ({ type, at }) => {
    if (!at) return false;
    const p = [at[0], ctx.world.ty(at[1])];
    let hit = QUESTIONS.find(q => inBox(labelBox(q, COLS), p));
    if (!hit && withTag && inBox(LOOP_TAG, p)) hit = LOOP_TAG;
    if (type === 'hover') return hit ? 'grab' : false;
    if (type !== 'down' || !hit) return false;
    jumpTo(hit.scene);
    return true;
  };

  return {
    id: 'map',
    beats: [
      {
        id: 'map-stages',
        enter: setup,
        draw: t => stageShapes(t, { build: true }),
      },
      {
        id: 'map-questions',
        enter: setup,
        draw: t => stageShapes(t).concat(questionShapes(t, { drop: true })),
        pointer: pointer(false),
      },
      {
        id: 'map-loop',
        enter: setup,
        draw: t => {
          if (t > 2.9) ctx.overlay.caption('Rivals respond; conditions change');
          return stageShapes(t).concat(questionShapes(t, { o: 1 - 0.4 * ramp(t, 0, 0.6) }), loopShapes(t, { draw: true, pulse: !still }));
        },
        pointer: pointer(true),
      },
      {
        id: 'map-end',
        enter: setup,
        draw: t => {
          const fade = 1 - ramp(t, 0, 0.6);
          const S = stageShapes(t);
          if (fade > 0) S.push(...questionShapes(t, { o: 0.6 * fade }));
          return S.concat(loopShapes(t, { o: 0.3, pulse: false, tag: false }), closeShapes(t));
        },
      },
    ],
  };
}
