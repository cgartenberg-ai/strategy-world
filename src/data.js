// Load the bundles and build one index of firms across all scenes.

import { makeNamer } from './names.js';
import { Q7_IDS } from './layouts.js';
import { CONCEPT } from './anim.js';

const BUNDLES = ['q1_heights', 'q2q3_landscape', 'q3_financials', 'q7_cohorts', 'cast', 'meta'];

export async function loadBundles(base = 'data/') {
  const out = { bundleMeta: {} };  // per-bundle meta (kept apart from the bundle named "meta")
  for (const n of BUNDLES) {
    const r = await fetch(`${base}${n}.json`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`Missing data/${n}.json`);
    const j = await r.json();
    out[n] = j.data;
    out.bundleMeta[n] = j.meta;
  }
  out.synthetic = Object.values(out.bundleMeta).some(m => m.synthetic !== false);
  out.concepts = {}; // teaching data for the concept scenes (optional files)
  for (const n of ['deere', 'productivity', 'value_capture', 'fares', 'forces', 'ryanair']) {
    try {
      const r = await fetch(`${base}concepts/${n}.json`, { cache: 'no-store' });
      if (r.ok) out.concepts[n] = await r.json();
    } catch { /* optional */ }
  }
  out.displayNames = {};
  try {
    const r = await fetch(`${base}display_names.json`, { cache: 'no-store' });
    if (r.ok) out.displayNames = await r.json();
  } catch { /* optional */ }
  return out;
}

export function buildIndex(b, { q1Towers = 50 } = {}) {
  const ids = new Set(), raw = new Map(), info = new Map();
  const put = (id, o) => info.set(id, Object.assign(info.get(id) || {}, o));

  for (const f of b.q1_heights.frames) {
    for (const s of f.sky) {
      if (s[1] > q1Towers) break;
      ids.add(s[0]);
      if (s[5]) raw.set(s[0], s[5]);
    }
    for (const p of f.podium) if (p[1]) raw.set(p[0], p[1]);
  }

  const q2 = b.q2q3_landscape;
  const byInd = new Map();
  for (const [id, k, mean, n, mv, nm] of q2.firms) {
    ids.add(id);
    if (nm) raw.set(id, nm);
    const ind = q2.industries[k].industry;
    put(id, { industry: ind, mean, nYears: n, mv, traj: q2.trajectories?.[String(id)] || null });
    if (!byInd.has(ind)) byInd.set(ind, []);
    byInd.get(ind).push([id, mean]);
  }
  for (const list of byInd.values()) {
    list.sort((a, b) => b[1] - a[1]);
    list.forEach(([id], i) => put(id, { rank: i + 1, of: list.length }));
  }

  const fin = b.q3_financials;
  for (const [id, k, mean, n, nm] of fin.firms) {
    ids.add(id);
    if (nm) raw.set(id, nm);
    put(id, { finIndustry: fin.industries[k].industry, roe: mean });
  }

  for (const c of Object.values(b.q7_cohorts.starts)) {
    for (const f of c.firms) ids.add(f.permco);
    for (const [id, nm] of Object.entries(c.names || {})) if (nm && !raw.has(+id)) raw.set(+id, nm);
  }
  // drawn objects for Q7 (negative ids): two group dots per cohort, and copies that fly into them
  const cohorts = Object.values(b.q7_cohorts.starts);
  cohorts.forEach((c, k) => { ids.add(Q7_IDS.agg(k, 'top')); ids.add(Q7_IDS.agg(k, 'bottom')); });
  const pool = Math.max(0, ...cohorts.map(c => c.firms.filter(f => f.group !== 'middle').length));
  for (let j = 0; j < pool; j++) ids.add(Q7_IDS.copy(j));
  for (let j = 0; j < CONCEPT.n; j++) ids.add(CONCEPT.id(j)); // lights for the concept scenes

  const namer = makeNamer(b.displayNames || {});
  return {
    ids: [...ids],
    info,
    name: id => namer(id, raw.get(id)),
    trajYears: q2.trajectory_years || null,
    mvLabel: q2.mv_label || 'Market value',
    q7Pool: pool,
  };
}
