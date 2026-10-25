// "You are here": when a chapter begins, the strategy landscape flashes up as a slim strip with that
// chapter's stage lit, then the lit stage swells to fill the screen and dissolves into the chapter.
// Drawn in screen fractions (screen: true) so it looks the same under any camera. ~1.7 s.

import { STAGES, layoutStages } from './landscape.js';
import { ramp, mix } from '../anim.js';

export const STAGE_OF = { q1: 'results', q2: 'industry', q3: 'position', q4: 'creating', q5: 'position', q6: 'real', q7: 'rivals' };
export const PRELUDE_SECONDS = 1.75;

const STAGE_KEYS = new Set(STAGES.flatMap(s => [s.key, ...(s.subs || []).map(u => u.key)]));
const Q_LABEL = { q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'Q4', q5: '', q6: 'Q5', q7: 'Q6' }; // six questions; the old Q5 is a concept

// key: a question (q1-q7, lights its stage) or a landscape stage key; label: the words under the lit stage
export function preludeShapes(key, t, label = null) {
  const focus = STAGE_OF[key] || (STAGE_KEYS.has(key) ? key : null);
  if (!focus || t >= PRELUDE_SECONDS) return [];
  const laid = layoutStages(STAGES);
  const span = laid[laid.length - 1].x1 - laid[0].x0;
  const sx = 0.7 / span, sy = sx * 16 / 9;                      // keep the stage proportions
  const X = x => 0.15 + (x - laid[0].x0) * sx;
  const yc = 0.55, h = 2.1 * sy, y0 = yc - h / 2, y1 = yc + h / 2;
  const fin = ramp(t, 0, 0.35), zoom = ramp(t, 1.0, 0.7, 'inOutCubic'), o = fin * (1 - zoom);
  const S = o2 => ({ screen: true, o: o2 });
  // a solid backdrop hides the chapter's own opening until the lit stage swells and reveals it
  const out = [{ k: 'rect', a: [0, 0], b: [1, 1], fill: '#000', fo: 1, ...S(fin * (1 - ramp(t, 1.1, 0.6))) }];
  let lit = null;
  for (const s of laid) {
    const isLit = s.key === focus || (s.subs || []).some(u => u.key === focus);
    const a = [X(s.x0), y0], b = [X(s.x1), y1];
    out.push({ k: 'rect', a, b, stroke: s.color, w: 0.14, r: 0.5, fill: s.color, fo: isLit && !s.subs ? 0.22 : 0.06,
      glow: isLit, ...S(o * (isLit ? 1 : 0.38)) });
    const lab = s.label.replace('\n', ' ');
    if (s.subs) {
      out.push({ k: 'text', text: lab, at: [mix(a[0], b[0], 0.5), y0 + h * 0.18], size: 1.2, color: '#ffffff', ...S(o * (isLit ? 1 : 0.45)) });
      for (const u of s.subs) {
        const on = u.key === focus, ua = [X(u.x0) + 0.004, y0 + h * 0.34], ub = [X(u.x1) - 0.004, y1 - h * 0.1];
        out.push({ k: 'rect', a: ua, b: ub, stroke: s.color, w: 0.1, r: 0.3, fill: s.color, fo: on ? 0.3 : 0.04, glow: on, ...S(o * (on ? 1 : 0.4)) });
        out.push({ k: 'text', text: u.label, at: [mix(ua[0], ub[0], 0.5), mix(ua[1], ub[1], 0.5)], size: 1.1, color: '#ffffff', ...S(o * (on ? 1 : 0.4)) });
        if (on) lit = { a: ua, b: ub, color: s.color };
      }
    } else {
      out.push({ k: 'text', text: s.label, at: [mix(a[0], b[0], 0.5), yc], size: 1.2, color: '#ffffff', ...S(o * (isLit ? 1 : 0.45)) });
      if (isLit) lit = { a, b, color: s.color };
    }
  }
  for (let i = 0; i < laid.length - 1; i++) {   // chevrons between stages
    const xm = (X(laid[i].x1) + X(laid[i + 1].x0)) / 2, d = 0.006;
    out.push({ k: 'poly', pts: [[xm - d, yc - 0.03], [xm + d, yc], [xm - d, yc + 0.03]], stroke: '#8a8a8a', w: 0.14, ...S(o * 0.7) });
  }
  if (lit) {  // the lit stage swells to the full frame as everything else fades
    const a = [mix(lit.a[0], -0.02, zoom), mix(lit.a[1], -0.02, zoom)], b = [mix(lit.b[0], 1.02, zoom), mix(lit.b[1], 1.02, zoom)];
    out.push({ k: 'rect', a, b, stroke: lit.color, w: 0.2, r: 0.6, glow: true, ...S(fin * (1 - ramp(t, 1.35, 0.4))) });
    const n = label ?? Q_LABEL[key] ?? '';
    if (n) out.push({ k: 'text', text: n, at: [mix(lit.a[0], lit.b[0], 0.5), y1 + 0.05], size: 1.8, weight: 600, color: lit.color, ...S(o) });
  }
  return out;
}
