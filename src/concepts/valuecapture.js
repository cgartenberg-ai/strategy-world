// Q5's illustrative value-capture model (Brandenburger and Stuart 1996). Pure: no DOM.
//
// Each participant in Deere's 2026 coalition "brings" a slice of the value created for the farmer.
// Part of that slice others could supply if it walked away ("replaceable"). What is left is its
// added value: the value lost if it disappeared tomorrow, and the most it can hope to capture.
// Magnitudes are invented for teaching (the source line says "illustrative"); edit them here.

const clamp01 = v => Math.max(0, Math.min(1, v));

// brings: share of the value created (sums to 100). replaceable: share others could step in for.
export const MODEL = {
  'Farmer': { key: 'farmer', brings: 26, replaceable: 0 },              // land, timing, data permissions
  'Deere': { key: 'deere', brings: 34, replaceable: 0.55 },             // rival equipment exists
  'Independent dealers': { key: 'dealers', brings: 14, replaceable: 0.45 }, // independent repair
  'Agronomy software': { key: 'software', brings: 12, replaceable: 0.6 },
  'Connectivity and AI': { key: 'ai', brings: 14, replaceable: 0.9 },   // they sell to anyone
};

// Not contributors: the farmer's outside option. Kept in the picture, not in the stick.
const OUTSIDE = { 'Rivals': 'rivals' };

export const addedValue = (brings, replaceable) => brings * (1 - clamp01(replaceable));

// Data rows (participant, brings, walk_away, kind) -> participants with magnitudes.
export function coalition(rows) {
  return rows.map(r => {
    const m = MODEL[r.participant];
    const key = m ? m.key : OUTSIDE[r.participant] || String(r.participant).toLowerCase().replace(/\W+/g, '-');
    const brings = m ? m.brings : 0, replaceable = m ? m.replaceable : 1;
    return {
      key, name: r.participant, what: r.brings || '', walkAway: r.walk_away || '', kind: r.kind || '',
      brings, replaceable, added: addedValue(brings, replaceable), contributor: !!m && brings > 0,
    };
  });
}

// Largest added value first: the row of "can capture up to" bars.
export const captureOrder = list => list.filter(p => p.contributor).sort((a, b) => b.added - a.added);

// The stick, bottom to top in the order given. `out` maps key -> how far that participant has
// walked away (0 = in, 1 = gone). Each band keeps its replaceable part (others step in) and loses
// its irreplaceable part, so the stick drops by out x added value. Values in "value units".
export function stack(list, out = {}) {
  let y = 0, full = 0;
  const bands = list.map(p => {
    const d = clamp01((out && out[p.key]) || 0);
    const litH = p.added * (1 - d), repH = p.brings - p.added;
    const b = { key: p.key, lo: y, lit: [y, y + litH], rep: [y + litH, y + litH + repH], hi: y + litH + repH, out: d };
    y = b.hi; full += p.brings;
    return b;
  });
  return { bands, top: y, full };
}
