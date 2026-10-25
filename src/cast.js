// Which firm names appear on screen. Pure.
// Pins first, then the scene's cast, then the core cast; only firms on screen; at most six.
// The Q1 podium is the exception: its ten names are the content.

export function visibleNames({ mode = 'normal', core = [], sceneCast = [], pins = [], podium = [],
  present = new Set(), max = 6 }) {
  if (mode === 'podium') return podium.slice(0, 10);
  const out = [];
  for (const id of [...pins, ...sceneCast, ...core]) {
    if (out.length >= max) break;
    if (present.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}
