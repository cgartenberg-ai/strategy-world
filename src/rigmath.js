// Camera described by what it frames, not where it sits. Pure.
//   target: point looked at; az/el: degrees around it; fov: degrees; vh: world height visible at target.
// Interpolating these (fov geometrically) gives smooth "dolly-zoom" moves, so the landscape can
// tilt into a near-orthographic flat chart while the frame stays steady.

export function camFromParams({ target, az = 0, el = 0, fov = 40, vh = 9 }) {
  const d = vh / 2 / Math.tan((fov * Math.PI) / 360);
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  return {
    position: [
      target[0] + d * Math.cos(e) * Math.sin(a),
      target[1] + d * Math.sin(e),
      target[2] + d * Math.cos(e) * Math.cos(a),
    ],
    target: target.slice(), fov, distance: d,
  };
}

// Where a world point lands on the 16:9 stage for camera params p, in U (1% of the stage height; x runs 0..177.8),
// as the app's camera draws it (perspective, looking at the target, up = +y). For layouts that must hold along a move.
export function projector(p, aspect = 16 / 9) {
  const c = camFromParams(p), sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const unit = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
  const f = unit(sub(c.target, c.position)), r = unit([-f[2], 0, f[0]]), u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const t = Math.tan((c.fov * Math.PI) / 360);
  return P => { const v = sub(P, c.position), z = dot(v, f); return [50 * aspect + (dot(v, r) / (z * t)) * 50, 50 - (dot(v, u) / (z * t)) * 50]; };
}

export function lerpParams(p, q, t) {
  const L = (a, b) => a + (b - a) * t;
  return {
    target: [L(p.target[0], q.target[0]), L(p.target[1], q.target[1]), L(p.target[2], q.target[2])],
    az: L(p.az, q.az), el: L(p.el, q.el), vh: L(p.vh, q.vh),
    fov: Math.exp(L(Math.log(p.fov), Math.log(q.fov))),
  };
}

// Named shots. Flat shots use a long lens (3.5 degrees), effectively orthographic.
export const SHOTS = {
  flat: { target: [0, 0, 0], az: 0, el: 0, fov: 3.5, vh: 9 },
  heights: { target: [0.6, 0.15, 0], az: 0, el: 7, fov: 26, vh: 9.4 },
  landscape: { target: [0.7, -0.15, 0], az: -20, el: 27, fov: 34, vh: 11.5 }, // tall towers clear the title
  landscapeFar: { target: [0.7, 0.1, 0], az: 16, el: 19, fov: 34, vh: 12.5 },
};
