// Small timing helpers for build animations driven by "seconds since the beat began". Pure.

import { ease, clamp01 } from './tween.js';

// 0 before `start`, eases to 1 over `dur` seconds.
export const ramp = (t, start = 0, dur = 0.8, e = 'inOutCubic') => (dur <= 0 ? (t >= start ? 1 : 0)
  : (ease[e] || ease.inOutCubic)(clamp01((t - start) / dur)));

export const mix = (a, b, f) => a + (b - a) * f;
export const mixPt = (p, q, f) => [mix(p[0], q[0], f), mix(p[1], q[1], f)];

// Start time for item i of n when a build sweeps over `span` seconds beginning at `start`.
export const staggerAt = (i, n, start, span) => start + (n <= 1 ? 0 : (i / (n - 1)) * span);

// Ids for concept objects drawn as lights (customers, activities, partners, plants...).
// Negative, so they never collide with firm ids, and the firm picker ignores them.
export const CONCEPT = { n: 1600, id: j => -100000 - j };

// Slow alternation between two color codings: hold `hold` s on the first, fade `fade` s, hold on the second, fade back.
// 0 = first coding, 1 = second. Export stills (huge t) show the first.
export function colorCycle(t, { hold = 5, fade = 2 } = {}) {
  if (!(t >= 0) || t > 1e5) return 0;
  const p = 2 * (hold + fade), u = t % p;
  if (u < hold) return 0;
  if (u < hold + fade) return ease.inOutSine((u - hold) / fade);
  if (u < 2 * hold + fade) return 1;
  return 1 - ease.inOutSine((u - 2 * hold - fade) / fade);
}
