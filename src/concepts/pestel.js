// PESTEL: six lenses for scanning the environment, one real shift per lens, the forces each shift pushes, and
// Deere's moving bottleneck. Pure data and layout, no DOM (drawing: pestelDraw.js; beats: scenes/pestel.js).
//
// To change a lens, edit its one line in LENSES (word, definition, example). Its shift is the same row of SHIFTS
// (pestel-shifts) and of PUSHES (pestel-forces); if a lens changes meaning, change those two rows too.

// ---------------- the six lenses ----------------
export const LENSES = [
  { letter: 'P', word: 'Political', def: 'Policy, regulation, trade', example: 'Airline deregulation' },
  { letter: 'E', word: 'Economic', def: 'Growth, interest rates, prices, currencies', example: 'Oil price collapse' },
  { letter: 'S', word: 'Social', def: 'Demographics, preferences, behavior', example: 'The pandemic' },
  { letter: 'T', word: 'Technological', def: 'New technologies, platforms, AI', example: 'Precision farming and AI' },
  { letter: 'E', word: 'Environmental', def: 'Climate, natural resources, sustainability', example: 'Carbon programs' }, // the natural environment, not the competitive one (five forces)
  { letter: 'L', word: 'Legal', def: 'Laws, liability, rights', example: 'Right to repair' },
];

// ---------------- one real shift per lens (pestel-shifts) ----------------
// change, when, detail: what changed. effect, effectDetail: who gained or which bottleneck moved.
// bars: evidence drawn as two bars, either fixed values or `series` read from the app's industry returns by year.
// tone: gain (cyan), loss (pink), deere (lime). source: the source line while this shift is on screen.
// Long lines wrap; a \n in detail or effectDetail forces a break.
const DEERE_SRC = 'Source: public announcements compiled by C. Gartenberg (Deere alliances workbook, 2026).';
export const SHIFTS = [
  { change: 'Europe opens its skies', when: '1987–97', detail: 'By 1997 any EU airline may fly any route in the EU, at any fare',
    effect: 'Ryanair takes off', effectDetail: 'Passengers, millions', tone: 'gain', fmt: 'num',
    bars: [{ label: '1992', v: 0.9 }, { label: '1999', v: 4.9 }],
    source: 'Source: J. Rivkin, “Dogfight over Europe: Ryanair (B), (C),” HBS 700-116, 700-117; passengers from Ryanair filings.' },
  { change: 'Oil prices collapse', when: '2014–16', detail: 'Crude falls from over $100 a barrel\nto under $30',
    effect: 'Airline returns rise', effectDetail: 'US airlines, return on assets', tone: 'gain', fmt: 'pct',
    series: { industry: 'Airlines', years: [2013, 2015] },
    source: 'Source: Compustat via WRDS. US public airlines; average operating return on assets. Oil: Brent crude spot price.' },
  { change: 'A pandemic grounds travel', when: '2020', detail: 'People stay home; meetings move to video',
    effect: 'Airlines hit hard', effectDetail: 'US airlines, return on assets', tone: 'loss', fmt: 'pct',
    series: { industry: 'Airlines', years: [2019, 2020] },
    source: 'Source: Compustat via WRDS. US public airlines; average operating return on assets.' },
  { change: 'Precision farming and AI', when: '2010s–now', detail: 'Machines sense, steer and record every pass',
    effect: 'Farm data becomes the scarce thing', effectDetail: 'Deere buys Blue River (2017)\nand Bear Flag Robotics (2021)',
    tone: 'deere', source: DEERE_SRC },
  { change: 'Carbon and sustainability programs', when: '2021–now', detail: 'Programs pay farmers for greener practices',
    effect: 'Farm practices become sellable',
    effectDetail: 'Deere’s machine records document them\nfor Cargill (2023) and the Soil and Water Outcomes Fund (2024)',
    tone: 'deere', source: `${DEERE_SRC} Cargill and John Deere, July 2023.` },
  { change: 'Right to repair', when: '2023–26', detail: 'Colorado’s farm-equipment law (2023);\nthe FTC sues Deere over repair tools (2025)',
    effect: 'Deere’s hold on repair is contested',
    effectDetail: '2026: Deere agrees to give farmers and\nindependent shops its dealers’ repair tools',
    tone: 'loss',
    source: 'Source: Colorado HB23-1011 (2023); FTC v. Deere & Co., N.D. Ill., filed Jan. 2025; FTC settlement announced July 2026, pending court approval.' },
];

// The evidence bars for a shift: [{label, v}] or null. industryYears: the q2q3_landscape bundle's industry_years.
export function barsFor(shift, industryYears) {
  if (shift.bars) return shift.bars.map(b => ({ ...b }));
  if (!shift.series || !industryYears) return null;
  const ser = industryYears.series?.[shift.series.industry], y0 = industryYears.years?.[0];
  if (!ser || y0 == null) return null;
  const out = shift.series.years.map(y => ({ label: String(y), v: ser[y - y0] }));
  return out.every(b => Number.isFinite(b.v)) ? out : null;
}

// "16%" (whole percent, true minus) for returns; "4.9" for counts.
export function fmtBar(b, fmt) {
  if (fmt === 'pct') { const r = Math.round(b.v * 100); return `${r < 0 ? '−' : ''}${Math.abs(r)}%`; }
  return b.v.toFixed(1);
}

// ---------------- what each shift pushes (pestel-forces) ----------------
// push: {force: [before, after, what changed for that force]}; the other forces keep the industry's strengths.
// Airlines' strengths are the five-forces file's (forces.json); farm equipment's are below. Teaching judgment: illustrative.
export const FARM = { name: 'Farm equipment',
  strength: { rivalry: 0.4, buyers: 0.35, suppliers: 0.35, entrants: 0.15, substitutes: 0.15 } };
export const PUSHES = [
  { industry: 'Airlines', push: { entrants: [0.1, 0.6, 'Anyone may start an airline'], rivalry: [0.4, 0.9, 'Fare wars on open routes'] } },
  { industry: 'Airlines', push: { suppliers: [0.8, 0.45, 'Fuel costs fall'] } },
  { industry: 'Airlines', push: { substitutes: [0.5, 0.85, 'Video calls replace trips'], rivalry: [0.75, 1.0, 'Empty seats, fare cuts'] } },
  { industry: 'Farm equipment', push: { entrants: [0.15, 0.5, 'Tech firms chase farm data'], buyers: [0.35, 0.2, 'Farmers tied to one system'] } },
  { industry: 'Farm equipment', push: { buyers: [0.35, 0.2, 'Farmers value machine records'] } },
  { industry: 'Farm equipment', push: { buyers: [0.35, 0.7, 'Farmers may fix their own'], substitutes: [0.15, 0.45, 'Independent repair shops'] } },
];

// Strengths while a shift lands: f = 0 (before) .. 1 (after).
export function pushAt(base, push, f) {
  const out = { ...base };
  for (const [k, [a, b]] of Object.entries(push)) out[k] = a + (b - a) * f;
  return out;
}

// +1 for a force the shift strengthens, -1 for one it weakens.
export const pushDir = push => Object.fromEntries(Object.entries(push).map(([k, [a, b]]) => [k, b > a ? 1 : -1]));

// ---------------- stepping through the six (a click glides to the next; clicking a letter jumps) ----------------
// The beats use a clickSteps clock from 0 to 5: it rests at each whole number, and a click starts it at i + hold,
// gliding to i + 1. The lens shown switches as the glide starts.
export const STEP = { hold: 0.9, seconds: 6 };
export function stepIndex(c, n = LENSES.length, hold = STEP.hold) {
  if (c == null || !(c >= 0)) return 0;
  const i = Math.floor(c + 1e-9), u = c - i;
  return Math.min(n - 1, u >= hold - 1e-9 ? i + 1 : i);
}

export const stripXs = (n, x0, dx) => Array.from({ length: n }, (_, i) => x0 + dx * i);

// The letter under (x, y), or -1. half = [half width, half height] of each letter's click box.
export function hitStrip(x, y, xs, y0, [hx, hy]) {
  if (Math.abs(y - y0) > hy) return -1;
  return xs.findIndex(xi => Math.abs(x - xi) <= hx);
}

// ---------------- Deere's chain and where value is scarce (pestel-bottleneck) ----------------
export const CHAIN = ['Farmer', 'Equipment', 'Connectivity', 'Data and advice'];
export const CHAIN_X = [-5.4, -1.8, 1.8, 5.4];
export const NODE = { half: 1.45, h: 0.6, y: -0.4 };
export const SCARCE = { from: 2000, to: 2026, start: 2005, end: 2024, pad: 0.3 };
const smooth = u => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };

// The glow: centre x and half width. On the machine until 2005, then it slides and widens until 2024 to cover
// connectivity and data. Illustrative timing.
export function scarceAt(year) {
  const f = smooth((year - SCARCE.start) / (SCARCE.end - SCARCE.start));
  const x0 = CHAIN_X[1], x1 = (CHAIN_X[2] + CHAIN_X[3]) / 2;
  const h0 = NODE.half + SCARCE.pad, h1 = (CHAIN_X[3] - CHAIN_X[2]) / 2 + NODE.half + SCARCE.pad;
  return { x: x0 + (x1 - x0) * f, half: h0 + (h1 - h0) * f, f };
}

// How much of node i the glow covers, 0..1.
export function coverage(i, g) {
  const a = CHAIN_X[i] - NODE.half, b = CHAIN_X[i] + NODE.half;
  const lo = Math.max(a, g.x - g.half), hi = Math.min(b, g.x + g.half);
  return Math.max(0, hi - lo) / (b - a);
}
