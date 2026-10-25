// Easing and interpolation. Pure.

export const ease = {
  linear: t => t,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};

export const lerp = (a, b, t) => a + (b - a) * t;

export function lerpArrays(a, b, t, out) {
  for (let i = 0; i < out.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}

export const clamp01 = t => Math.max(0, Math.min(1, t));
