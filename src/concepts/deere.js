// Deere's partner ecosystem, 2000–2026, as pure functions of the clock year y (fractional). No DOM.
//   deereState(data, y)  – who is visible where, with presence / highlight / grey / flight fractions
//   deereLayout(data, y) – frame geometry (x −8..8, y −4.5..4.5) for the panel, cards, rows, box, band
//   industryLayout(data) – the q4-industries picture: 2026 partners as lights in industry columns
// Timing: something that starts in year s is fully in place at y = s (it arrives over the half-year
// before, while the counter, which rounds, already reads s); a tie that ends in year e greys just after
// e and is gone by e + 1; an acquisition in year i has landed in the internalized box by y = i.

export const WEIGHT_RANK = { Core: 0, Major: 1, Important: 2, Legacy: 3 };
export const LEFT = [20, 1, 2, 3, 4, 5];
export const RIGHT = [21, 6, 7, 8, 9, 10];
export const GROUPS = ['Positioning & guidance', 'Sense-and-act AI', 'Autonomy & robotics', 'Remote sensing & analytics'];
export const PRE = 'pre'; // the small card of outside partners Deere later bought (Smart Apply, GUSS)
export const PRE_CARD = { title: 'Specialty-crop spraying', color: '#E5484D' };
// Deere's own panel changes with the business: telematics (2010), the Operations Center platform (2013),
// precision execution after Blue River (2017), the orchestrator role of the Leap Ambitions era (2022).
export const PANEL_YEARS = { jdlink: 2010, platform: 2013, precision: 2017, role: 2022 };

// ---------- small pure helpers ----------
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = t => { const u = clamp01(t); return u * u * (3 - 2 * u); };
export const win = (y, a, b) => sstep((y - a) / (b - a));
export const bump = (y, a, b) => (y <= a || y >= b ? 0 : Math.sin((Math.PI * (y - a)) / (b - a)));
export const mix = (a, b, f) => a + (b - a) * f;
const mixRect = (p, q, f) => p.map((v, i) => mix(v, q[i], f));

// Text width in frame units for Helvetica Neue at `sizeU` (U = 1% of stage height = 0.09 units).
// Advance widths (per 1000 em) measured in Chrome for ASCII 32–126, regular and semibold.
const W400 = '278,259,426,556,556,1000,630,278,259,259,352,600,278,389,278,333,556,556,556,556,556,556,556,556,556,556,278,278,600,600,600,556,800,648,685,722,704,611,574,759,722,259,519,667,556,871,722,760,648,760,685,648,574,722,611,926,611,648,611,259,333,259,600,500,222,537,593,537,593,537,296,574,556,222,222,519,222,853,556,574,593,593,333,500,315,556,500,758,518,500,480,333,222,333,600'.split(',').map(Number);
const W600 = '278,278,463,556,556,1000,685,278,296,296,407,600,278,407,278,371,556,556,556,556,556,556,556,556,556,556,278,278,600,600,600,556,800,685,704,741,741,648,593,759,741,295,556,722,593,907,741,778,667,778,722,649,611,741,630,944,667,667,648,333,371,333,600,500,259,574,611,574,611,574,333,611,593,258,278,574,258,906,593,611,611,611,389,537,352,593,520,814,537,519,519,333,223,333,600'.split(',').map(Number);
export function textWidth(str, sizeU, bold = false) {
  const T = bold ? W600 : W400;
  let w = 0;
  for (const ch of String(str)) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c < 127 ? T[c - 32] : ch === '•' ? 350 : 600;
  }
  return (w / 1000) * sizeU * 0.09 * 1.03; // 3% margin
}

// Greedy word wrap to a width (frame units).
export function wrapTo(str, maxW, sizeU, bold = false) {
  const out = []; let cur = '';
  for (const w of String(str).split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(next, sizeU, bold) > maxW) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

export const displayName = p => String(p.name).replace(/^John Deere /, '');

// ---------- the state ----------
const arriveAt = (y, s) => win(y, s - 0.6, s - 0.32);
const textAt = (y, s) => win(y, s - 0.36, s - 0.12);
const flashAt = (y, s) => bump(y, s - 0.6, s);
const flightAt = (y, i) => win(y, i - 0.65, i - 0.2);
const landAt = (y, i) => bump(y, i - 0.25, i);

export function boxOpenYear(data) {
  const ys = data.partners.map(p => p.internalized).filter(v => v != null && v > 2000);
  return ys.length ? Math.min(...ys) : Infinity;
}

// A card's lifetime: the union of its partners' ties, bridging gaps shorter than 1.5 years
// (Remote sensing keeps its card between Sentera's acquisition and Ceres AI's arrival).
// Each interval also says how it ends: 'end' (the tie lapsed) or 'in' (its last partner was acquired).
function cardIntervals(rows) {
  const iv = rows.map(p => (p.end != null ? [p.start, p.end + 1, 'end']
    : p.internalized != null ? [p.start, p.internalized, 'in'] : [p.start, Infinity, null]))
    .sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [a, b, how] of iv) {
    const last = out[out.length - 1];
    if (last && a - last[1] < 1.5) { if (b >= last[1]) { last[1] = b; last[2] = how; } } else out.push([a, b, how]);
  }
  return out;
}

const cardKeyOf = p => (p.card > 0 ? p.card : p.internalized != null && p.internalized > p.start ? PRE : null);

export function deereState(data, y) {
  const open = boxOpenYear(data);
  const cohortOf = new Map();
  for (const c of data.cohorts || []) for (const n of c.names) if (!cohortOf.has(n)) cohortOf.set(n, c.year);

  const partners = data.partners.map((p, idx) => {
    const s = p.start, e = p.end, i = p.internalized;
    const arrive = arriveAt(y, s), grey = e != null ? win(y, e + 0.05, e + 0.4) : 0;
    const gone = e != null ? win(y, e + 0.45, e + 0.95) : 0;
    const place = cardKeyOf(p);
    const q = { id: p.id, idx, name: displayName(p), card: p.card, place, group: p.group, weight: p.weight,
      start: s, end: e, internalized: i, out: 0, outText: 0, inBox: 0, panel: 0, flight: null,
      hl: flashAt(y, s), grey };
    if (place != null) {                        // starts outside: a row in a card
      const f = i != null ? flightAt(y, i) : 0;
      q.out = arrive * (1 - gone) * (1 - f);
      q.outText = textAt(y, s) * (1 - gone) * (f > 0 ? 0 : 1);
      q.inBox = f;
      if (f > 0 && f < 1) q.flight = { from: place === PRE ? PRE : 'card', f };
      if (i != null) q.hl = Math.max(q.hl, landAt(y, i));
    } else if (s <= 2000) {                     // NavCom: inside Deere's panel until the box opens
      const f = flightAt(y, open);
      q.panel = 1 - f; q.inBox = f; q.hl = landAt(y, open);
      if (f > 0 && f < 1) q.flight = { from: 'panel', f };
    } else {                                    // bought outright: appears inside the box
      q.inBox = arrive;
      const c = cohortOf.get(p.name);
      if (c != null && c < s) {                 // a startup collaborator first (Bear Flag): it flies up from the band
        const f = flightAt(y, s);
        q.inBox = f; q.hl = landAt(y, s);
        if (f > 0 && f < 1) q.flight = { from: 'band', f, cohort: c };
      }
    }
    return q;
  });

  // cards: rows ordered as on her slide (Core, Major, Important, then workbook order)
  const cards = {};
  const keys = [...new Set(partners.map(q => q.place).filter(k => k != null))];
  for (const key of keys) {
    const rows = partners.filter(q => q.place === key)
      .sort((a, b) => (WEIGHT_RANK[a.weight] ?? 9) - (WEIGHT_RANK[b.weight] ?? 9) || a.idx - b.idx);
    const src = rows.map(q => data.partners[q.idx]);
    let pres = 0;
    for (const [a, b, how] of cardIntervals(src)) {
      // a lapsed tie greys and goes with its row; a card emptied by an acquisition closes once the row has flown
      const out = b === Infinity ? 0 : how === 'in' ? win(y, b - 0.3, b - 0.02) : win(y, b - 0.55, b - 0.05);
      pres = Math.max(pres, win(y, a - 0.6, a - 0.3) * (1 - out));
    }
    const first = Math.min(...src.map(p => p.start));
    const live = rows.filter(q => q.out > 0.01);
    const meta = key === PRE ? PRE_CARD : data.cards[String(key)] || { title: String(key), color: '#8A8A8A' };
    cards[key] = { key, title: meta.title, color: meta.color, num: typeof key === 'number' && key <= 10 ? key : null,
      p: pres, first, hl: flashAt(y, first), grey: live.length ? Math.min(...live.map(q => q.grey)) : 0,
      rows: rows.map(q => q.id) };
  }

  // internalized groups: members in acquisition order
  const groups = GROUPS.map(name => {
    const members = partners.filter(q => q.group === name && (q.internalized != null))
      .sort((a, b) => a.internalized - b.internalized || a.idx - b.idx);
    return { name, p: members.length ? Math.max(...members.map(q => q.inBox)) : 0, members: members.map(q => q.id) };
  });

  const cohorts = (data.cohorts || []).map(c => {
    const n = c.names.length;
    return {
      year: c.year, p: win(y, c.year - 0.6, c.year - 0.35),
      names: c.names.map((name, k) => {
        const a = c.year - 0.55 + (0.4 * k) / Math.max(n - 1, 1);
        return { name, o: win(y, a, a + 0.2), hl: bump(y, a, c.year) };
      }),
    };
  });
  const firstCohort = cohorts.length ? Math.min(...cohorts.map(c => c.year)) : Infinity;

  const P = PANEL_YEARS;
  return {
    y, year: Math.round(y), open,
    partners, byId: new Map(partners.map(q => [q.id, q])), cards, groups, cohorts,
    box: win(y, open - 0.7, open - 0.4),
    band: win(y, firstCohort - 0.75, firstCohort - 0.45),
    panel: {
      m: win(y, P.platform - 0.65, P.platform - 0.05),       // the 2000 panel becomes the platform panel
      jdlink: win(y, P.jdlink - 0.6, P.jdlink - 0.2),
      precision: win(y, P.precision - 0.6, P.precision - 0.1),
      role: win(y, P.role - 0.6, P.role - 0.1),
    },
  };
}

// Who you would see at a whole year (for tests and the report).
export function visibleAt(data, year) {
  const st = deereState(data, year);
  return {
    outside: st.partners.filter(q => q.out > 0.5).map(q => q.name),
    inside: st.partners.filter(q => q.inBox > 0.5).map(q => q.name),
    panel: st.partners.filter(q => q.panel > 0.5).map(q => q.name),
    cards: Object.values(st.cards).filter(c => c.p > 0.5).map(c => c.key),
    groups: st.groups.filter(g => g.p > 0.5).map(g => g.name),
    cohortNames: st.cohorts.reduce((n, c) => n + c.names.filter(x => x.o > 0.5).length, 0),
  };
}

// ---------- the layout ----------
export const FRAMEBOX = { top: 3.28, bot: -2.0 };
export const COLS = {
  early: { L: [-7.5, -3.25], C: [-2.45, -1.6, 2.45, 3.2], R: [3.25, 7.5] },
  final: { L: [-7.85, -3.6], C: [-2.6, -0.8, 0.75, 2.25], R: [1.45, 4.65], B: [4.95, 7.85] },
};
// card metrics at scale k = 1 (frame units) and text sizes (U)
export const CM = { H: 0.29, PT: 0.04, PB: 0.06, r: 0.178, wrapF: 0.72, gapMin: 0.07, gapMax: 0.3,
  pillW: 0.8, pillH: 0.15, padX: 0.14, row: 1.16, head: 1.3, pill: 1.05 };
// internalized box metrics at k = 1
export const BM = { head: 0.72, GT: 0.1, title: 0.27, row: 0.23, GB: 0.12, gap: 0.14, pad: 0.12, side: 0.12,
  titleSize: 1.2, rowSize: 1.1, headSize: 1.35, subSize: 1.05, gap2: 0.15, textX: 0.6, iconX: 0.3, pillW: 0.62 };
export const KMAX = 1.45;
export const PANEL_COMPACT = 0.9;
export const BAND = { x0: -7.85, x1: 5.55, y0: -3.85, y1: -2.28, nameSize: 1.1, headSize: 1.25, rowH: 0.165 };
const rowTextMax = side => (side === 'R' ? COLS.final.R[1] - COLS.final.R[0] : COLS.final.L[1] - COLS.final.L[0])
  - 0.1 - 0.22 - CM.pillW;

const TAG_COLOR = { Core: '#9BE15D', Important: '#4A97F5', Major: '#FFFFFF' };
export const tagColor = (weight, cardColor) => (weight === 'Legacy' ? cardColor : TAG_COLOR[weight] || '#FFFFFF');

const sideOf = key => (LEFT.includes(key) ? 'L' : RIGHT.includes(key) ? 'R' : 'B');

// Group geometry at scale g inside a rect: content is centred vertically.
export function groupContent(rect, rows, g) {
  const [x0, y0, x1, y1] = rect;
  const inner = g * (BM.GT + BM.title + rows.reduce((s, r) => s + r.w * BM.row, 0) + BM.GB);
  let top = (y1 + y0) / 2 + inner / 2 - g * BM.GT;
  const title = [x0 + BM.textX * g, top - (g * BM.title) / 2];
  const icon = [x0 + BM.iconX * g, (y0 + y1) / 2];
  top -= g * BM.title;
  const placed = rows.map(r => {
    const h = r.w * g * BM.row, at = [x0 + BM.textX * g, top - h / 2];
    top -= h;
    return { ...r, text: at, size: BM.rowSize * g, pill: [x1 - 0.1 - (BM.pillW * g) / 2, at[1]],
      pillW: BM.pillW * g, pillH: CM.pillH * g, pillSize: CM.pill * g };
  });
  return { title, titleSize: BM.titleSize * g, icon, iconR: 0.18 * g, rows: placed };
}

export function deereLayout(data, y) {
  const st = deereState(data, y);
  const { top: TOP, bot: BOT } = FRAMEBOX, avail = TOP - BOT;
  const m = st.panel.m;
  const E = COLS.early, F = COLS.final;
  const X = { L: mixRect(E.L, F.L, m), R: mixRect(E.R, F.R, m), B: F.B };
  const panelRect = mixRect(E.C, F.C, m);
  const navIn = st.partners.reduce((a, q) => Math.max(a, q.panel), 0);
  panelRect[1] += PANEL_COMPACT * m * (1 - navIn) * (1 - st.panel.role); // nothing in the lower part: it closes up

  // rows per card with weights, wrapped once at the final widths
  const cardList = Object.values(st.cards).filter(c => c.p > 0.001);
  const rowsOf = c => c.rows.map(id => st.byId.get(id)).map(q => {
    const side = sideOf(c.key);
    const lines = wrapTo(q.name, rowTextMax(side), CM.row);
    return { q, lines, w: q.out, lf: 1 + CM.wrapF * (lines.length - 1) };
  });
  const cardUnit = c => c.p * (CM.H + CM.PT + CM.PB + rowsOf(c).reduce((s, r) => s + r.w * r.lf * CM.r, 0));

  // the internalized box and the pre-acquisition card share the far-right column
  // (NavCom's slot keeps its full row while the whole group flies in, so the slot it lands in is final)
  const boxRowsOf = gr => gr.members.map(id => st.byId.get(id))
    .map(q => ({ q, w: q.flight?.from === 'panel' ? 1 : q.inBox }));
  const groupUnit = gr => gr.p * (BM.GT + BM.title + boxRowsOf(gr).reduce((s, r) => s + r.w * BM.row, 0) + BM.GB);
  const boxGroups = st.groups.map(gr => ({ gr, u: groupUnit(gr) }));
  const nG = st.groups.reduce((s, gr) => s + gr.p, 0);
  const boxUnit = st.box * (BM.head + boxGroups.reduce((s, g) => s + g.u, 0) + Math.max(nG - 1, 0) * BM.gap + BM.pad);

  // scale k: the largest that lets every column fit its height and every visible line fit its card
  const colCards = side => cardList.filter(c => sideOf(c.key) === side);
  let k = KMAX;
  const soft = (lim, pres) => (lim >= KMAX ? KMAX : KMAX - (KMAX - lim) * Math.min(1, 1.4 * pres));
  for (const side of ['L', 'R']) {
    const cs = colCards(side), n = cs.reduce((s, c) => s + c.p, 0);
    const unit = cs.reduce((s, c) => s + cardUnit(c), 0);
    if (unit > 0) k = Math.min(k, (avail - Math.max(n - 1, 0) * CM.gapMin) / unit);
    const W = X[side][1] - X[side][0];
    for (const c of cs) {
      const head = (c.num ? `${c.num}. ` : '') + c.title;
      k = Math.min(k, soft(W / (textWidth(head, CM.head, true) + 0.3), c.p));
      for (const r of rowsOf(c)) {
        const tw = Math.max(...r.lines.map(l => textWidth(l, CM.row)));
        k = Math.min(k, soft((W - 0.1) / (0.22 + tw + CM.pillW), r.w));
      }
    }
  }
  // the far-right column (box + pre-acquisition card) has its own scale kb, never much above the cards'
  const pre = st.cards[PRE];
  const preUnit = pre && pre.p > 0.001 ? cardUnit(pre) : 0;
  let kb = Math.min(KMAX, k * 1.06);
  if (boxUnit + preUnit > 0) kb = Math.min(kb, (avail - (pre ? pre.p : 0) * BM.gap2) / (boxUnit + preUnit));
  if (st.box > 0) {
    const W = X.B[1] - X.B[0], gw = W - 2 * BM.side;
    kb = Math.min(kb, soft(W / (textWidth('INTERNALIZED CAPABILITIES', BM.headSize, true) + 0.3), st.box));
    for (const { gr } of boxGroups) {
      if (gr.p <= 0) continue;
      kb = Math.min(kb, soft(gw / (BM.textX + textWidth(gr.name, BM.titleSize, true) + 0.12), gr.p));
      for (const r of boxRowsOf(gr)) {
        kb = Math.min(kb, soft((gw - 0.16) / (BM.textX + textWidth(r.q.name, BM.rowSize) + 0.06 + BM.pillW), r.w * gr.p));
      }
    }
  }
  if (pre && pre.p > 0.001) {
    const W = X.B[1] - X.B[0];
    kb = Math.min(kb, soft(W / (textWidth(pre.title, CM.head, true) + 0.3), pre.p));
    for (const r of rowsOf(pre)) kb = Math.min(kb, soft((W - 0.1) / (0.22 + textWidth(r.q.name, CM.row) + CM.pillW), r.w));
  }

  // place the cards of a column
  const cards = [];
  const placeCard = (c, x0, x1, y1, k) => {
    const h = c.p * k * (CM.H + CM.PT + CM.PB + rowsOf(c).reduce((s, r) => s + r.w * r.lf * CM.r, 0));
    const y0 = y1 - h;
    let top = y1 - c.p * k * (CM.H + CM.PT);
    const rows = rowsOf(c).map(r => {
      const rh = r.w * r.lf * CM.r * k * c.p, cy = top - rh / 2;
      top -= rh;
      return { id: r.q.id, name: r.q.name, lines: r.lines, w: r.w, o: r.q.outText * c.p, hl: r.q.hl, grey: r.q.grey,
        tag: r.q.weight, tagColor: tagColor(r.q.weight, c.color),
        text: [x0 + CM.padX * k, cy], size: CM.row * k,
        pill: [x1 - 0.1 - (CM.pillW * k) / 2, cy], pillW: CM.pillW * k, pillH: CM.pillH * k, pillSize: CM.pill * k };
    });
    const out = { key: c.key, side: sideOf(c.key), title: c.title, num: c.num, color: c.color, p: c.p, hl: c.hl, first: c.first,
      grey: c.grey, rect: [x0, y0, x1, y1], headH: CM.H * k * c.p, headSize: CM.head * k, rows };
    cards.push(out);
    return out;
  };
  for (const side of ['L', 'R']) {
    const order = side === 'L' ? LEFT : RIGHT;
    const cs = order.map(key => st.cards[key]).filter(c => c && c.p > 0.001);
    const hs = cs.map(c => k * cardUnit(c)), n = cs.reduce((s, c) => s + c.p, 0);
    const slack = avail - hs.reduce((a, b) => a + b, 0);
    const gap = Math.max(CM.gapMin, Math.min(CM.gapMax, slack / Math.max(n - 1, 1)));
    let cursor = TOP;
    cs.forEach(c => { const pc = placeCard(c, X[side][0], X[side][1], cursor, k); cursor = pc.rect[1] - gap * c.p; });
  }

  // internalized box
  const [bx0, bx1] = X.B;
  const boxH = kb * boxUnit;
  const box = { p: st.box, rect: [bx0, TOP - boxH, bx1, TOP], head: [(bx0 + bx1) / 2, TOP - 0.27 * kb * st.box],
    sub: [(bx0 + bx1) / 2, TOP - 0.52 * kb * st.box], headSize: BM.headSize * kb, subSize: BM.subSize * kb, groups: [] };
  let gy = TOP - st.box * kb * BM.head;
  for (const { gr } of boxGroups) {
    if (gr.p <= 0.001) continue;
    const rows = boxRowsOf(gr);
    const gh = kb * groupUnit(gr);
    const rect = [bx0 + BM.side, gy - gh, bx1 - BM.side, gy];
    gy -= gh + BM.gap * gr.p * kb;
    const content = groupContent(rect, rows.map(r => ({ id: r.q.id, name: r.q.name, w: r.w * gr.p, hl: r.q.hl,
      tag: r.q.weight, o: r.q.flight ? 0 : r.q.inBox })), kb);
    box.groups.push({ name: gr.name, p: gr.p * st.box, rect, g: kb, ...content });
  }
  if (pre && pre.p > 0.001) placeCard(pre, bx0, bx1, box.rect[1] - BM.gap2 * pre.p * (st.box > 0 ? 1 : 0), kb);

  // NavCom's group: in the panel (2000 slot, then platform slot), then flies into the box
  const nav = st.partners.find(q => q.flight?.from === 'panel' || q.panel > 0);
  let navcom = null;
  if (nav) {
    const [px0, py0, px1, py1] = panelRect;
    const slotA = [px0 + 0.5, py0 + 0.3, px1 - 0.5, py0 + 1.6];        // the 2000 picture: big, under the bullets
    const slotB = [px0 + 0.22, py0 + 0.12, px1 - 0.22, py0 + 0.95];     // the platform panel: small, at the bottom
    const inPanel = mixRect(slotA, slotB, m), gIn = mix(1.75, 1.08, m);
    const f = 1 - nav.panel;
    const dest = box.groups.find(g => g.name === nav.group);
    const rect = dest ? mixRect(inPanel, dest.rect, sstep(f)) : inPanel;
    const g = dest ? mix(gIn, dest.g, sstep(f)) : gIn;
    navcom = { f, rect, g, ...groupContent(rect, [{ id: nav.id, name: nav.name, w: 1, tag: nav.weight, o: 1 }], g),
      name: nav.group };
  }

  // the startup band
  const band = bandLayout(st);

  // flyers: rows travelling into the box
  const rowById = new Map();
  for (const c of cards) for (const r of c.rows) rowById.set(r.id, r);
  for (const g of box.groups) for (const r of g.rows) rowById.set(`in:${r.id}`, r);
  const flyers = [];
  for (const q of st.partners) {
    if (!q.flight || q.flight.from === 'panel') continue;
    const to = rowById.get(`in:${q.id}`);
    let from = rowById.get(q.id);
    if (q.flight.from === 'band') {
      const nm = band.cohorts.find(c => c.year === q.flight.cohort)?.names.find(n => n.name === q.name);
      if (nm) from = { text: nm.at, size: BAND.nameSize, pill: [nm.at[0] + 0.5, nm.at[1]], pillW: 0, pillH: 0, pillSize: 0 };
    }
    if (!from || !to) continue;
    flyers.push({ id: q.id, name: q.name, tag: q.weight, f: q.flight.f, from, to, color: '#9BE15D' });
  }

  // connectors: Deere's panel to each outside card in the side columns
  const connectors = [];
  const [px0, py0, px1, py1] = panelRect;
  for (const side of ['L', 'R']) {
    const cs = cards.filter(c => c.side === side);
    const lo = py0 + 0.3, hi = py1 - 0.3;
    const want = cs.map(c => Math.max(Math.min((c.rect[1] + c.rect[3]) / 2, hi), lo));
    for (let i = 1; i < want.length; i++) want[i] = Math.min(want[i], want[i - 1] - 0.2 * cs[i].p); // keep apart
    const under = lo - want[want.length - 1];
    if (under > 0) for (let i = 0; i < want.length; i++) want[i] = Math.min(hi, want[i] + under);
    cs.forEach((c, i) => {
      const cy = Math.max(Math.min((c.rect[1] + c.rect[3]) / 2, c.rect[3] - 0.15), c.rect[1] + 0.12);
      connectors.push({ key: c.key, side, from: [side === 'L' ? px0 : px1, want[i]],
        to: [side === 'L' ? c.rect[2] : c.rect[0], cy], p: c.p, draw: win(y, c.first - 0.55, c.first - 0.2),
        hl: c.hl, grey: c.grey, color: c.color });
    });
  }

  return { y, k, kb, m, st, panel: { rect: panelRect, ...st.panel }, cards, box, navcom, band, flyers, connectors };
}

// Startup band: cohorts in columns; big cohorts take two sub-columns.
export function bandLayout(st) {
  const { x0, x1, y1 } = BAND;
  const cohorts = st.cohorts;
  const subs = cohorts.map(c => (c.names.length > 6 ? 2 : 1));
  const total = subs.reduce((a, b) => a + b, 0) || 1;
  const pad = 0.2, w = (x1 - x0 - 2 * pad) / total;
  let cx = x0 + pad;
  const out = cohorts.map((c, i) => {
    const cw = w * subs[i], perCol = Math.ceil(c.names.length / subs[i]);
    const col = { year: c.year, p: c.p, x0: cx, x1: cx + cw, header: [cx + cw / 2, y1 - 0.3],
      sep: i > 0 ? cx : null,
      names: c.names.map((n, j) => {
        const sc = Math.floor(j / perCol), rr = j % perCol;
        return { name: n.name, o: n.o, hl: n.hl, at: [cx + sc * w + 0.24, y1 - 0.55 - rr * BAND.rowH] };
      }) };
    cx += cw;
    return col;
  });
  return { p: st.band, rect: [BAND.x0, BAND.y0, BAND.x1, BAND.y1], cohorts: out,
    title: [(x0 + x1) / 2 - 0.9, y1] };
}

// ---------- industries (q4-industries) ----------
export const INDUSTRIES = [
  { label: 'Farm software', cards: [1] },
  { label: 'Satellite internet', cards: [2] },
  { label: 'AI models', cards: [3] },
  { label: 'Crop inputs', cards: [4] },
  { label: 'Farm equipment', cards: [5], deere: true },
  { label: 'Sustainability programs', cards: [6] },
  { label: 'Dairy equipment', cards: [7] },
  { label: 'Smallholder services', cards: [8] },
  { label: 'Remote sensing', cards: [9] },
  { label: 'Construction equipment', cards: [10] },
];
export const SHORT = {
  E003: 'Connected software firms', E006: 'Agrian / TELUS', E008: 'Climate FieldView', E017: 'Precision Planting',
  E004: 'Starlink', E009: 'BASF', E010: 'Yara', E011: 'Corteva', E012: 'Kinze',
  E013: 'Ag Leader', E024: 'Field to Market', E025: 'Cargill', E026: 'Soil and Water Fund',
  E028: 'Dairy Data Warehouse', E001: 'NavCom', E031: 'Blue River', E032: 'Bear Flag', E035: 'GUSS',
};
export const IND = { top: 2.78, nodeY: 1.5, itemY0: 1.1, itemH: 0.335, bandTop: 2.42, bandBot: -2.3,
  nameSize: 1.3, labelSize: 1.6, x0: -7.85, x1: 7.85, gap: 0.06 };

export function industryLayout(data, year = 2026) {
  const st = deereState(data, year);
  const shortName = q => SHORT[q.id] || q.name;
  const cols = INDUSTRIES.map(ind => {
    const items = [];
    for (const key of ind.cards) {
      const c = st.cards[key];
      if (!c) continue;
      for (const id of c.rows) {
        const q = st.byId.get(id);
        if (q.out > 0.5) items.push({ id, name: shortName(q), color: c.color });
      }
    }
    let inside = [];
    if (ind.deere) {
      inside = st.groups.flatMap(g => g.members).map(id => st.byId.get(id)).filter(q => q.inBox > 0.5)
        .map(q => ({ id: q.id, name: shortName(q), color: '#9BE15D', inside: true }));
    }
    return { ...ind, items: [...inside, ...items] };
  });
  const need = cols.map(c => Math.max(1.15, ...c.items.map(it => textWidth(it.name, IND.nameSize) + 0.5),
    c.deere ? textWidth('JOHN DEERE', 1.8, true) + 0.5 : 0));
  const span = IND.x1 - IND.x0 - IND.gap * (cols.length - 1);
  const extra = (span - need.reduce((a, b) => a + b, 0)) / cols.length;
  let x = IND.x0;
  return {
    columns: cols.map((c, i) => {
      const w = need[i] + extra, x0 = x, x1 = x + w;
      x = x1 + IND.gap;
      const dotX = x0 + 0.24;
      let yy = IND.itemY0;
      const items = c.items.map((it, j) => {
        if (j > 0 && c.items[j - 1].inside && !it.inside) yy -= 0.16; // rivals sit below Deere's own
        const at = [dotX, yy];
        yy -= IND.itemH;
        return { ...it, dot: at, text: [dotX + 0.17, at[1]], size: IND.nameSize };
      });
      const lines = wrapTo(c.label, w - 0.12, IND.labelSize);
      return { label: lines.join('\n'), lines: lines.length, x0, x1, xc: (x0 + x1) / 2, dotX, items, deere: !!c.deere,
        node: [dotX, IND.nodeY] };
    }),
  };
}
