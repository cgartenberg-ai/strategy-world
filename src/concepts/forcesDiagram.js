// The generic five forces diagram (roadmap stage 1, move industry-forces), after her slide (SMBC day 1, p. 21: "Scanning
// the industry"), redrawn in the app's style: glowing outlined boxes, white sentence-case words, block arrows pointing
// in at rivalry. One thing per click on the move's stepped clock c (0..STEPS):
//   0 rivalry alone; 1-4 customers, suppliers, new entrants, substitutes (each box, then its arrow grows in);
//   5-6 her two messages, upper left then lower left, the key words in light blue.
// Pure: returns plain shapes for overlay.shapes (src/concepts/kit.js). Words are hers; edit them here.

import { text, rect, poly, PAL } from './kit.js';
import { ease, clamp01 } from '../tween.js';

export const FORCES = ['rivalry', 'buyers', 'suppliers', 'entrants', 'substitutes']; // the app's landing order
export const LABELS = {
  rivalry: 'Rivalry among\nexisting competitors',
  entrants: 'Threat of\nnew entrants',
  substitutes: 'Threat of\nsubstitutes',
  suppliers: 'Bargaining power\nof suppliers',
  buyers: 'Bargaining power\nof customers',
};
export const HI = '#7FCBFF'; // the key words: a light blue that reads on black
const LINE = PAL.sky;        // box outlines and arrows

// Geometry, in chart-frame units (x -8..8, y -4.5..4.5; the header sits above y 3.2, the source line below -3.9).
export const BOX = { w: 4.0, h: 1.4 };
const CEN = [0, -0.25], GAP = { x: 1.25, y: 1.0 };
export const LAYOUT = {
  rivalry: CEN,
  entrants: [CEN[0], CEN[1] + BOX.h + GAP.y],
  substitutes: [CEN[0], CEN[1] - BOX.h - GAP.y],
  suppliers: [CEN[0] - BOX.w - GAP.x, CEN[1]],
  buyers: [CEN[0] + BOX.w + GAP.x, CEN[1]],
};
const SZ = { label: 3.0, message: 3.4 }; // type sizes in U (1% of stage height)

// Her two messages (her slide's other two, PESTEL shifts and a broad view of competition, are left out: the ecosystem
// and the questions carry them). **Marked** words show in HI. Placed as on her slide: above and below the suppliers.
const LEFT = LAYOUT.suppliers[0] - BOX.w / 2;
export const MESSAGES = [
  { text: 'Profitability of an industry\nis determined by **balance**\namong five competitive forces',
    at: [LEFT, LAYOUT.suppliers[1] + BOX.h / 2 + 1.35] },
  { text: 'Even **one “bad” force**\nis enough to drive profit\nout of an industry',
    at: [LEFT, LAYOUT.suppliers[1] - BOX.h / 2 - 1.35] },
];
export const STEPS = FORCES.length - 1 + MESSAGES.length; // 6: rivalry is up from the start

export const plainText = s => String(s).replace(/\*\*/g, '').replace(/\s*\n\s*/g, ' ');

// How far each thing has come in at clock c: boxes {o, grow (its arrow)}, messages [o].
export function diagramState(c) {
  const step = (k, a, d) => ease.inOutCubic(clamp01((c - (k - 1) - a) / d)); // k: the click that brings it (1-based)
  const boxes = { rivalry: { o: 1, grow: 1 } };
  FORCES.slice(1).forEach((f, i) => { boxes[f] = { o: step(i + 1, 0, 0.45), grow: step(i + 1, 0.3, 0.6) }; });
  return { boxes, messages: MESSAGES.map((m, j) => step(FORCES.length + j, 0, 0.7)) };
}

// A block arrow like her slide's, from a (its box's edge) to b (rivalry's edge), grown to `grow` of its length.
function blockArrow(f, a, b, grow, o) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), len = L * grow;
  if (len < 0.03 || o <= 0.003) return [];
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, hw = 0.24, hh = 0.5, hl = Math.min(len * 0.6, 0.46);
  const T = [a[0] + ux * len, a[1] + uy * len], N = [T[0] - ux * hl, T[1] - uy * hl];
  const P = (p, k) => [p[0] + nx * k, p[1] + ny * k];
  return [poly([P(a, hw), P(N, hw), P(N, hh), T, P(N, -hh), P(N, -hw), P(a, -hw)],
    { closed: true, fill: LINE, fo: 0.3, stroke: LINE, w: 0.16, o, glow: true, force: f, tip: T })];
}

// The arrow of each outer force: from its box's inner edge to rivalry's facing edge.
function arrowEnds(f) {
  const [x, y] = LAYOUT[f], [cx, cy] = CEN, hx = BOX.w / 2, hy = BOX.h / 2, s = 0.04;
  if (f === 'entrants') return [[x, y - hy], [cx, cy + hy + s]];
  if (f === 'substitutes') return [[x, y + hy], [cx, cy - hy - s]];
  if (f === 'suppliers') return [[x + hx, y], [cx - hx - s, cy]];
  return [[x - hx, y], [cx + hx + s, cy]];
}

// Everything on screen at clock c; o fades the whole picture (its entry).
export function drawDiagram(c, o = 1) {
  const S = diagramState(c), arrows = [], boxes = [], words = [];
  for (const f of FORCES) {
    const { o: bo, grow } = S.boxes[f], [x, y] = LAYOUT[f], k = 0.92 + 0.08 * bo;
    if (bo <= 0.003) continue;
    if (f !== 'rivalry') arrows.push(...blockArrow(f, ...arrowEnds(f), grow, o * Math.min(1, grow * 3)));
    const W = (BOX.w * k) / 2, H = (BOX.h * k) / 2;
    boxes.push(rect([x - W, y - H], [x + W, y + H], { stroke: LINE, w: 0.2, r: 0.9, fill: '#000', fo: 0.82, o: o * bo, glow: true }));
    words.push(text(LABELS[f], [x, y], { size: SZ.label, weight: 500, o: o * bo }));
  }
  MESSAGES.forEach((m, j) => {
    const mo = S.messages[j];
    if (mo > 0.003) words.push(text(m.text, m.at, { anchor: 'start', size: SZ.message, hi: HI, o: o * mo }));
  });
  return arrows.concat(boxes, words); // arrows under the boxes, so each starts at its box's edge
}
