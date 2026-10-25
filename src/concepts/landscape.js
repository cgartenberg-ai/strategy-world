// The strategy landscape (adapted from David J. Collis, 2024), as a pure layout: five stages left
// to right, the session's questions under them, the four closing questions, and the loop back.
// Our words, not his figure. Coordinates are the flat shot's fixed frame (x -8..8, y -4.5..4.5).

export const STAGES = [
  { key: 'conditions', label: 'Changing\nconditions', color: '#64E2ED', w: 1.95 },
  { key: 'creating', label: 'Creating\nvalue', color: '#22C28E', w: 1.95, when: 'Future' },
  { key: 'capturing', label: 'Capturing value', color: '#4A97F5', w: 4.95, when: 'Today',
    subs: [{ key: 'industry', label: 'Industry' }, { key: 'position', label: 'Position' }, { key: 'rivals', label: 'Rivals' }] },
  { key: 'real', label: 'Making\nit real', color: '#FFC46B', w: 1.95, when: 'Over time' },
  { key: 'results', label: 'Results', color: '#FF2EA4', w: 1.95 },
];

export const PANEL = { y0: 0.05, y1: 2.15, gap: 0.5, x0: -7.375 };

// Stages (and the three capture sub-columns) with their x extents.
export function layoutStages(stages = STAGES, { x0 = PANEL.x0, gap = PANEL.gap } = {}) {
  let x = x0;
  return stages.map(s => {
    const out = { ...s, x0: x, x1: x + s.w, cx: x + s.w / 2 };
    if (s.subs) {
      const w = s.w / s.subs.length;
      out.subs = s.subs.map((u, i) => ({ ...u, x0: x + i * w, x1: x + (i + 1) * w, cx: x + (i + 0.5) * w }));
    }
    x += s.w + gap;
    return out;
  });
}

// Every place a label can sit under: stages and sub-columns, by key.
export function columns(laid = layoutStages()) {
  const m = {};
  for (const s of laid) { m[s.key] = s; for (const u of s.subs || []) m[u.key] = { ...u, color: s.color }; }
  return m;
}

// The six questions, each under the stage it belongs to (row 0 just under the panels, row 1 below).
// scene = the module id (q6 and q7 are shown as Q5 and Q6; the old Q5, who captures value, is now a concept).
export const QUESTIONS = [
  { scene: 'q1', n: 'Q1', label: 'Commanding heights', at: 'results', row: 0 },
  { scene: 'q2', n: 'Q2', label: 'Does industry matter?', at: 'industry', row: 0 },
  { scene: 'q3', n: 'Q3', label: 'Does position matter?', at: 'position', row: 0 },
  { scene: 'q4', n: 'Q4', label: 'Are industry lines blurring?', at: 'creating', row: 0 },
  { scene: 'q6', n: 'Q5', label: 'Does management matter?', at: 'real', row: 0 },
  { scene: 'q7', n: 'Q6', label: 'Does advantage last?', at: 'rivals', row: 0 },
  { scene: 'q1', n: 'Q1', label: '', at: 'conditions', row: 1, faint: true, colorOf: 'results' }, // who is on top shifts with conditions
];
export const ROW_Y = [-0.5, -1.36];

export const PESTEL = 'Political · Economic\nSocial · Technological\nEnvironmental · Legal';

// The four questions of the close, each spanning the stages it draws on.
export const CLOSE = [
  { text: 'Where is value scarce?', from: 'conditions', to: 'industry', row: 0 },
  { text: 'What do we add\nthat others can’t?', from: 'position', to: 'position', row: 0 },
  { text: 'What would rivals\nhave to copy?', from: 'real', to: 'real', row: 0 },
  { text: 'Who captures the value?', from: 'capturing', to: 'results', row: 1 },
];
export const CLOSE_Y = [-0.2, -1.72]; // bracket heights

// A label's click box: the width of its column, the height of its two lines.
export function labelBox(q, cols = columns()) {
  const c = cols[q.at], y = ROW_Y[q.row];
  return { x0: c.x0 + 0.04, x1: c.x1 - 0.04, y0: y - 0.34, y1: y + 0.34 };
}
export const inBox = (b, [x, y]) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

// The loop: out of Results on the right, along the bottom, back into Changing conditions.
export function loopPath(laid = layoutStages(), { side = 7.62, bottom = -2.95, y = (PANEL.y0 + PANEL.y1) / 2, r = 0.24, rb = 0.45 } = {}) {
  const a = laid[laid.length - 1].x1, b = laid[0].x0;
  const pts = [[a, y]];
  const arc = (cx, cy, rad, a0, a1, n = 8) => {
    for (let i = 1; i <= n; i++) { const t = a0 + ((a1 - a0) * i) / n; pts.push([cx + rad * Math.cos(t), cy + rad * Math.sin(t)]); }
  };
  pts.push([side - r, y]); arc(side - r, y - r, r, Math.PI / 2, 0);
  pts.push([side, bottom + rb]); arc(side - rb, bottom + rb, rb, 0, -Math.PI / 2);
  pts.push([-side + rb, bottom]); arc(-side + rb, bottom + rb, rb, -Math.PI / 2, -Math.PI);
  pts.push([-side, y - r]); arc(-side + r, y - r, r, Math.PI, Math.PI / 2);
  pts.push([b, y]);
  return pts;
}

const segLen = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
export const pathLength = pts => pts.slice(1).reduce((s, p, i) => s + segLen(pts[i], p), 0);

// The first fraction f (0..1, by length) of a polyline, and the point where it ends.
export function partialPath(pts, f) {
  const L = pathLength(pts) * Math.max(0, Math.min(1, f)), out = [pts[0]];
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = segLen(pts[i - 1], pts[i]);
    if (run + d >= L) {
      const k = d > 0 ? (L - run) / d : 0;
      const p = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
      out.push(p);
      return { pts: out, head: p };
    }
    run += d; out.push(pts[i]);
  }
  return { pts: out, head: pts[pts.length - 1] };
}
