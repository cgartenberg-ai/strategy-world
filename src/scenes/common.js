// Shared words and helpers for the scenes. Titles are the session's questions, verbatim.

import { visibleNames } from '../cast.js';
import { SECTOR_HEX } from '../colors.js';

export const TITLES = {
  q1: 'Who controls the commanding heights of the economy—and how has that changed?',
  // the six questions (data, stated as facts to establish)
  q2: 'Does industry matter for performance?',
  q3: 'Does position within an industry matter?',
  q4: 'Are the lines between industries blurring?',
  q6: 'Does management matter?', // shown as Q5 (the within-firm extra is optional)
  q7: 'Does advantage last?',                                     // shown as Q6
  // the concepts that explain them keep the "why" questions
  q2why: 'Why are some industries so much more profitable than others?',
  q3why: 'Why do firms in the same industry perform so differently?',
  q6why: 'Why is superior performance so hard to reproduce—even within the same company?', // (no longer shown)
  // her Test 2 question (SMBC deck p. 54): the header of every roadmap stage-4 screen, Ryanair's activity system
  test2: 'Is my competitive position realized via a feasible, unique, and internally complementary system of activities '
    + 'that turn it from aspiration to reality?',
  q7why: 'How long can an advantage last—and what makes it unravel?',
  q5: 'Who captures the value when everyone contributes to creating it?',
  end: 'What must we understand before we can advise a client on a strategic choice?',
};

export const SOURCES = {
  q1: 'Source: CRSP. US-listed common stocks; company market value each December.',
  q2: 'Source: Compustat, CRSP. US-listed companies; operating return on assets, average FY2021–25.',
  fin: 'Source: Compustat, CRSP. US-listed banks and insurers; return on equity, average FY2021–25.',
  q7: 'Source: Compustat, CRSP. US-listed non-financial companies; operating return on assets.',
};

export const ROA_TICKS = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4];

// Firm names to show: pins, then the scene's cast, then the core cast (max six).
export function castLabels(ctx, { sceneCast = [], exclude = new Set(), core = ctx.core, max = 6 } = {}) {
  const present = ctx.world.presentIds();
  for (const id of exclude) present.delete(id);
  const ids = visibleNames({ core, sceneCast, pins: [...ctx.pins], present, max });
  return ids.map(id => {
    const p = ctx.world.position(id);
    return { key: `n${id}`, text: ctx.index.name(id), at: [p.x, p.y, p.z], anchor: 'right', ring: true, ringR: p.size };
  });
}

// The names you clicked: every one on screen, however many (they follow their dots as they move).
export function pinLabels(ctx, exclude = new Set()) {
  return castLabels(ctx, { exclude, core: [], sceneCast: [], max: Infinity }).filter(l => ctx.pins.has(+l.key.slice(1)));
}

export function go(ctx, shot, ms, instant, easing) {
  if (instant) ctx.rig.set(shot);
  else ctx.rig.to(shot, ms, easing);
}

export const dur = (ctx, ms) => (ctx.instant ? 0 : ms);

// The Q1 sector key, limited to the sectors these industries belong to (same order as Q1).
export function sectorLegend(industries) {
  const have = new Set(industries.map(i => i.sector).filter(Boolean));
  return [...have].sort().map(s => ({ color: SECTOR_HEX[s] || SECTOR_HEX.Other, text: s }));
}
