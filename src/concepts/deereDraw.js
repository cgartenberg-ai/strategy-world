// Draws the Deere ecosystem map (layouts from deere.js) as overlay shapes, in her neon style:
// glowing rounded cards with coloured header strips, tag pills, a lime Deere panel, thin curved connectors,
// the internalized-capabilities box and the dashed startup band. Pure: layout (+ options) in, shapes out.

import { text, line, rect, circle, ellipse, poly, pill, PAL } from './kit.js';
import { textWidth, mix, BAND, IND, wrapTo } from './deere.js';

const LIME = PAL.deere, GREY = '#4A4A4A', CYAN = PAL.cyan, PURPLE = '#9B5CFF', LILAC = '#B98BFF';
export const GROUP_STYLE = {
  'Positioning & guidance': { color: '#4FB8F0', title: '#FFFFFF', icon: 'pin' },
  'Sense-and-act AI': { color: '#FF4D4D', title: '#FF6A5C', icon: 'eye' },
  'Autonomy & robotics': { color: '#A35CFF', title: '#C08BFF', icon: 'robot' },
  'Remote sensing & analytics': { color: '#3F8FE8', title: '#66BFFF', icon: 'sat' },
};

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const toHex = a => `#${a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
export const mixHex = (a, b, f) => (f <= 0 ? a : f >= 1 ? b : toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * f)));
const darken = (c, f) => mixHex(c, '#000000', f);
const ease = t => { const u = clamp01(t); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const mixPt = (p, q, f) => [mix(p[0], q[0], f), mix(p[1], q[1], f)];

function bezier(p0, p1, p2, p3, n = 20, upTo = 1) {
  const pts = [];
  const m = Math.max(1, Math.ceil(n * upTo));
  for (let i = 0; i <= m; i++) {
    const t = Math.min(upTo, i / n), u = 1 - t;
    pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return pts;
}

// ---------- pieces ----------
function drawConnector(c, o) {
  const op = o * c.p * (1 - 0.65 * c.grey);
  if (op <= 0.01 || c.draw <= 0) return [];
  const dx = c.to[0] - c.from[0];
  const p1 = [c.from[0] + dx * 0.5, c.from[1]], p2 = [c.to[0] - dx * 0.5, c.to[1]];
  const pts = bezier(c.from, p1, p2, c.to, 22, c.draw);
  const col = mixHex('#FFFFFF', GREY, c.grey);
  // soft halo as a wide faint stroke (an SVG blur filter clips flat lines to nothing)
  const out = [poly(pts, { stroke: col, w: 0.5, o: op * 0.12 }), poly(pts, { stroke: col, w: 0.15, o: op * 0.85 })];
  if (c.hl > 0.02) {
    const hc = mixHex(c.color, '#FFFFFF', 0.4);
    out.push(poly(pts, { stroke: hc, w: 0.9, o: op * c.hl * 0.25 }), poly(pts, { stroke: hc, w: 0.32, o: op * c.hl * 0.8 }));
  }
  return out;
}

function drawCard(c, o = 1, { rowText = 1 } = {}) {
  const op = o * c.p;
  if (op <= 0.01) return [];
  const [x0, y0, x1, y1] = c.rect, hh = c.headH, r = 0.55;
  const col = mixHex(c.color, GREY, c.grey);
  const out = [rect([x0, y0], [x1, y1], { stroke: col, w: 0.16, r, fill: '#000', fo: 0.82, o: op, glow: true })];
  if (c.hl > 0.02) out.push(rect([x0, y0], [x1, y1], { stroke: mixHex(col, '#FFFFFF', 0.3), w: 0.55, r, o: op * c.hl * 0.55, glow: true }));
  const head = darken(col, 0.12);
  out.push(rect([x0, y1 - hh], [x1, y1], { fill: head, r, o: op }),
    rect([x0, y1 - hh], [x1, y1 - hh * 0.5], { fill: head, o: op }));
  const ht = (c.num ? `${c.num}. ` : '') + c.title;
  out.push(text(ht, [x0 + 0.12 * (c.headSize / 1.3), y1 - hh / 2], { anchor: 'start', size: c.headSize, weight: 600,
    color: mixHex('#FFFFFF', '#9A9A9A', c.grey), o: op * clamp01((c.p - 0.6) / 0.4) }));
  for (const rw of c.rows) {
    const ro = o * rw.o;
    if (rw.hl > 0.02 && rw.w > 0.05) {
      const h = Math.max(0.05, (rw.pillH / 0.15) * 0.178 * rw.w * (rw.lines.length > 1 ? 1.72 : 1));
      out.push(rect([x0 + 0.05, rw.text[1] - h / 2], [x1 - 0.05, rw.text[1] + h / 2],
        { fill: c.color, fo: 0.3, r: 0.4, o: o * c.p * rw.hl, glow: true }));
    }
    if (ro <= 0.01) continue;
    const tc = mixHex('#FFFFFF', '#7A7A7A', rw.grey);
    if (rowText > 0) out.push(text(rw.lines.join('\n'), rw.text, { anchor: 'start', size: rw.size, color: tc, o: ro * rowText, glow: rw.hl > 0.3 }));
    out.push(...pill(rw.pill[0], rw.pill[1], rw.tag, mixHex(rw.tagColor, GREY, rw.grey),
      { o: ro, w: rw.pillW, h: rw.pillH, size: rw.pillSize }));
  }
  return out;
}

function icon(kind, [cx, cy], g, color, o) {
  const s = g, st = { stroke: color, w: 0.14, o };
  if (kind === 'pin') return [circle([cx, cy + 0.035 * s], { rw: 0.055 * s, ...st }),
    poly([[cx - 0.062 * s, cy + 0.01 * s], [cx, cy - 0.09 * s], [cx + 0.062 * s, cy + 0.01 * s]], st),
    ellipse([cx, cy - 0.1 * s], 0.08 * s, 0.022 * s, st)];
  if (kind === 'eye') return [ellipse([cx, cy], 0.1 * s, 0.06 * s, st), circle([cx, cy], { rw: 0.03 * s, fill: color, o })];
  if (kind === 'robot') return [rect([cx - 0.075 * s, cy - 0.06 * s], [cx + 0.075 * s, cy + 0.05 * s], { ...st, r: 0.3 }),
    circle([cx - 0.032 * s, cy - 0.005 * s], { rw: 0.016 * s, fill: color, o }),
    circle([cx + 0.032 * s, cy - 0.005 * s], { rw: 0.016 * s, fill: color, o }),
    line([cx, cy + 0.05 * s], [cx, cy + 0.1 * s], st)];
  return [poly([[cx - 0.04 * s, cy], [cx, cy + 0.04 * s], [cx + 0.04 * s, cy], [cx, cy - 0.04 * s]], { ...st, closed: true }),
    line([cx - 0.11 * s, cy + 0.07 * s], [cx - 0.05 * s, cy + 0.01 * s], st),
    line([cx + 0.05 * s, cy - 0.01 * s], [cx + 0.11 * s, cy - 0.07 * s], st)];
}

// A capability group (icon, coloured title, rows with pills). `inPanel` (0..1) blends to the 2000 look.
function drawGroup(gp, o, { inPanel = 0, hide = new Set(), rowText = 1 } = {}) {
  if (o <= 0.01) return [];
  const S = GROUP_STYLE[gp.name] || GROUP_STYLE['Positioning & guidance'];
  const color = mixHex(S.color, CYAN, inPanel), title = mixHex(S.title, '#FFFFFF', inPanel);
  const [x0, y0, x1, y1] = gp.rect;
  const out = [rect([x0, y0], [x1, y1], { stroke: color, w: 0.13, r: 0.6, fill: '#000', fo: 0.85, o, glow: true })];
  out.push(circle(gp.icon, { rw: gp.iconR, stroke: color, w: 0.14, fill: darken(color, 0.55), fo: 0.9, o, glow: true }));
  out.push(...icon(S.icon, gp.icon, gp.g * 1.15, mixHex(color, '#FFFFFF', 0.35), o));
  out.push(text(gp.name, gp.title, { anchor: 'start', size: gp.titleSize, weight: 600, color: title, o }));
  for (const r of gp.rows) {
    if (hide.has(r.id)) continue;
    const ro = o * (r.o ?? 1);
    if (r.hl > 0.02) out.push(rect([gp.title[0] - 0.08, r.text[1] - 0.1 * gp.g], [x1 - 0.06, r.text[1] + 0.1 * gp.g],
      { fill: color, fo: 0.3, r: 0.4, o: o * r.hl, glow: true }));
    if (ro <= 0.01) continue;
    if (rowText > 0) out.push(text(r.name, r.text, { anchor: 'start', size: r.size, color: mixHex('#FFFFFF', CYAN, inPanel), o: ro * rowText, glow: r.hl > 0.3 }));
    if (inPanel < 1) out.push(...pill(r.pill[0], r.pill[1], r.tag, '#FFFFFF', { o: ro * (1 - inPanel), w: r.pillW, h: r.pillH, size: r.pillSize }));
  }
  return out;
}

// split line "A • B" centred at cx, the lime dot exactly between the two parts
function hubLine(a, b, cx, y, size, o, bx = null) {
  const wa = textWidth(a, size), wb = textWidth(b, size), gap = 0.22;
  const dot = bx ?? cx + (wa - wb) / 2;
  return [text(a, [dot - gap, y], { anchor: 'end', size, o }), circle([dot, y], { r: 0.35, fill: LIME, o }),
    text(b, [dot + gap, y], { anchor: 'start', size, o })];
}

function drawPanel(L, o, rv) {
  const P = L.panel, [x0, y0, x1, y1] = P.rect, m = P.m, cx = (x0 + x1) / 2;
  if (o <= 0.01) return [];
  const out = [
    rect([x0, y0], [x1, y1], { stroke: LIME, w: 0.5, r: 1.1, o: o * 0.22 * rv.panel, glow: true }),
    rect([x0, y0], [x1, y1], { stroke: LIME, w: 0.24, r: 1.1, fill: '#000', fo: 0.88, o: o * rv.panel, glow: true }),
  ];
  // the name, large in 2000, then the platform panel's header
  out.push(text('JOHN DEERE', [cx, mix(y1 - 0.72, y1 - 0.45, m)], { size: mix(6.2, 4.4, m), weight: 700, color: LIME,
    o: o * rv.title, glow: true }));
  // 2000: bullets (equipment, dealers; telematics joins in 2010)
  const a = o * (1 - clamp01(m / 0.45)) * rv.bullets; // the 2000 bullets leave before the hubs arrive
  if (a > 0.01) {
    const items = [['equipment manufacturing', 1], ['dealer network', 1], ['JDLink / connectivity', P.jdlink]];
    const tot = items.reduce((s, [, p]) => s + p, 0) - 1, sp = 0.58;
    let yy = mix(y0 + 1.6, y1 - 1.05, 0.5) + (tot * sp) / 2;
    for (const [t, p] of items) {
      if (p > 0.01) {
        out.push(circle([x0 + 0.62, yy], { r: 0.55, fill: LIME, o: a * p, glow: true }),
          text(t, [x0 + 0.9, yy], { anchor: 'start', size: 2.6, weight: 500, o: a * p }));
      }
      yy -= sp * p;
    }
  }
  // platform era: hubs, then the role
  const b = o * clamp01((m - 0.5) / 0.5);
  if (b > 0.01) {
    const dl = (yy, oo) => [line([x0 + 0.35, yy], [x1 - 0.35, yy], { color: LIME, w: 0.12, o: oo * 0.8 }),
      circle([cx, yy], { r: 0.4, fill: LIME, o: oo })];
    out.push(...dl(y1 - 0.85, b));
    out.push(text('Platform hubs:', [cx, y1 - 1.12], { size: 1.5, weight: 600, color: LIME, o: b }));
    out.push(...hubLine('Operations Center', 'JDLink / connectivity', cx, y1 - 1.43, 1.32, b));
    const pr = P.precision, prOut = 1 - clamp01(pr / 0.5), prIn = clamp01((pr - 0.5) / 0.5);
    const bxA = cx + (textWidth('Dealer network', 1.32) - textWidth('Equipment manufacturing', 1.32)) / 2;
    const bxB = cx + (textWidth('Dealer network', 1.32) - textWidth('Precision ag execution', 1.32)) / 2;
    const bx = mix(bxA, bxB, pr);
    out.push(...hubLine('Dealer network', 'Equipment manufacturing', cx, y1 - 1.71, 1.32, b, bx).slice(0, 2));
    if (prOut > 0.01) out.push(text('Equipment manufacturing', [bx + 0.22, y1 - 1.71], { anchor: 'start', size: 1.32, o: b * prOut }));
    if (prIn > 0.01) out.push(text('Precision ag execution', [bx + 0.22, y1 - 1.71], { anchor: 'start', size: 1.32, o: b * prIn }));
    const ro = b * P.role;
    if (ro > 0.01) {
      out.push(...dl(y1 - 2.0, ro));
      out.push(text('Role:', [cx, y1 - 2.28], { size: 1.5, weight: 600, color: LIME, o: ro }),
        text('data + machine workflow orchestrator', [cx, y1 - 2.58], { size: 1.32, o: ro }));
    }
  }
  return out;
}

function drawBox(L, o, { rowText = 1 } = {}) {
  const B = L.box;
  if (o * B.p <= 0.01) return [];
  const [x0, y0, x1, y1] = B.rect, op = o * B.p;
  const out = [rect([x0, y0], [x1, y1], { stroke: '#D8D8D8', w: 0.15, r: 0.9, fill: '#000', fo: 0.85, o: op, glow: true })];
  const to = op * clamp01((B.p - 0.5) / 0.5);
  out.push(text('INTERNALIZED CAPABILITIES', B.head, { size: B.headSize, weight: 600, o: to }),
    text('(former partners / acquired capabilities)', B.sub, { size: B.subSize, color: '#BDBDBD', o: to }));
  const hideGroup = L.navcom && L.navcom.f > 0 ? L.navcom.name : null;
  for (const g of B.groups) {
    if (g.name === hideGroup) continue;
    out.push(...drawGroup(g, o * g.p, { rowText }));
  }
  return out;
}

function dashedRoundRect([x0, y0, x1, y1], o, color) {
  const r = 0.16, st = { color, w: 0.17, o, dash: [1.0, 0.7] };
  const arc = (cx, cy, a0) => poly([0, 1, 2, 3, 4].map(i => {
    const a = a0 + (i / 4) * (Math.PI / 2);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }), { stroke: color, w: 0.17, o });
  return [line([x0 + r, y0], [x1 - r, y0], st), line([x0 + r, y1], [x1 - r, y1], st),
    line([x0, y0 + r], [x0, y1 - r], st), line([x1, y0 + r], [x1, y1 - r], st),
    arc(x1 - r, y1 - r, 0), arc(x0 + r, y1 - r, Math.PI / 2), arc(x0 + r, y0 + r, Math.PI), arc(x1 - r, y0 + r, -Math.PI / 2)];
}

function drawBand(L, o) {
  const B = L.band, op = o * B.p;
  if (op <= 0.01) return [];
  const [x0, y0, x1, y1] = B.rect;
  const out = [rect([x0, y0], [x1, y1], { fill: '#000', fo: 0.6, o: op }), ...dashedRoundRect(B.rect, op, PURPLE)];
  const title = '11. Experimental / startup collaborators', ts = 1.45;
  const tw = textWidth(title, ts, true) + 0.5;
  const [tx, ty] = B.title;
  out.push(rect([tx - tw / 2, ty - 0.16], [tx + tw / 2, ty + 0.16], { fill: '#5B2BC4', stroke: PURPLE, w: 0.12, r: 0.7, o: op, glow: true }),
    text(title, [tx, ty], { size: ts, weight: 600, o: op }));
  for (const c of B.cohorts) {
    const co = o * c.p;
    if (co <= 0.01) continue;
    if (c.sep != null) out.push(line([c.sep, y1 - 0.18], [c.sep, y0 + 0.14], { color: PURPLE, w: 0.13, o: co * 0.7, dash: [0.25, 0.55] }));
    out.push(text(`${c.year} cohort`, c.header, { size: BAND.headSize, weight: 600, color: LILAC, o: co }));
    for (const n of c.names) {
      const no = o * n.o;
      if (no <= 0.01) continue;
      out.push(text(`•  ${n.name}`, n.at, { anchor: 'start', size: BAND.nameSize, o: no,
        color: mixHex('#FFFFFF', LILAC, n.hl * 0.6), glow: n.hl > 0.25 }));
    }
  }
  return out;
}

function drawFlyers(L, o) {
  const out = [];
  for (const fl of L.flyers) {
    const f = ease(fl.f), lift = Math.sin(Math.PI * f) * 0.35;
    const at = mixPt(fl.from.text, fl.to.text, f), size = mix(fl.from.size, fl.to.size, f);
    at[1] += lift;
    const tw = textWidth(fl.name, size);
    out.push(rect([at[0] - 0.08, at[1] - 0.12], [at[0] + tw + 0.08, at[1] + 0.12],
      { fill: LIME, fo: 0.16, r: 0.8, o: o * Math.sin(Math.PI * f), glow: true }));
    out.push(text(fl.name, at, { anchor: 'start', size, o, glow: true, color: mixHex('#FFFFFF', LIME, 0.25 * Math.sin(Math.PI * f)) }));
    if (fl.to.pillW > 0) {
      const pp = mixPt(fl.from.pill, fl.to.pill, f); pp[1] += lift;
      const w = fl.from.pillW > 0 ? mix(fl.from.pillW, fl.to.pillW, f) : fl.to.pillW * f;
      out.push(...pill(pp[0], pp[1], fl.tag, '#FFFFFF', { o: o * (fl.from.pillW > 0 ? 1 : f), w, h: mix(fl.from.pillH || fl.to.pillH, fl.to.pillH, f),
        size: mix(fl.from.pillSize || fl.to.pillSize, fl.to.pillSize, f) }));
    }
  }
  return out;
}

// ---------- the whole map ----------
// rv: build-in fractions for the 2000 picture {panel, title, bullets, navcom, cards, connectors}
// fade: per-part opacities used by the industries morph {connectors, cards, box, band, panel}
export function drawDeere(L, { rv = {}, fade = {} } = {}) {
  const R = { panel: 1, title: 1, bullets: 1, navcom: 1, cards: 1, connectors: 1, ...rv };
  const Fd = { connectors: 1, cards: 1, box: 1, band: 1, panel: 1, ...fade };
  const out = [];
  for (const c of L.connectors) out.push(...drawConnector({ ...c, draw: Math.min(c.draw, R.connectors) }, Fd.connectors));
  out.push(...drawBand(L, Fd.band));
  out.push(...drawPanel(L, Fd.panel, R));
  for (const c of L.cards) out.push(...drawCard(c, Fd.cards * R.cards));
  out.push(...drawBox(L, Fd.box));
  if (L.navcom) out.push(...drawGroup({ ...L.navcom, name: L.navcom.name }, Fd.box * R.navcom * (L.navcom.f > 0 ? 1 : Fd.panel),
    { inPanel: 1 - L.navcom.f }));
  out.push(...drawFlyers(L, 1));
  return out;
}

// ---------- industries: the 2026 map regroups into industry columns ----------
// L: the 2026 layout; I: industryLayout; t: seconds since the beat began.
export function drawIndustries(L, I, t) {
  const ramp = (a, d) => ease((t - a) / d);
  const out = [];
  const gone = 1 - ramp(0, 0.9);
  out.push(...drawDeere(L, { fade: { connectors: gone, cards: 0, box: 0, band: gone, panel: 0 } }));
  // card and box frames (with their pills) and Deere's hub lines dissolve while the names fly
  const frames = 1 - ramp(0.15, 0.9);
  for (const c of L.cards) out.push(...drawCard({ ...c, hl: 0, rows: c.rows.map(r => ({ ...r, hl: 0 })) }, frames, { rowText: 0 }));
  if (L.box.p > 0) out.push(...drawBox({ ...L, navcom: null }, frames, { rowText: 0 }));
  // faint industry bands and labels (her Q2 columns)
  const bandsOn = ramp(1.9, 0.9);
  const eqIdx = I.columns.findIndex(c => c.deere);
  I.columns.forEach(c => {
    if (bandsOn <= 0.01) return;
    const yb = mix(IND.bandTop, IND.bandBot, bandsOn);
    out.push(rect([c.x0, yb], [c.x1, IND.bandTop], { fill: '#FFFFFF', fo: 0.055, o: 1 }));
    out.push(line([c.x0 + 0.1, IND.bandTop], [c.x1 - 0.1, IND.bandTop], { color: '#FFFFFF', w: 0.1, o: 0.25 * bandsOn }));
    const lh = IND.labelSize * 0.09 * 1.18;
    out.push(text(c.label, [c.xc, IND.top + ((c.lines - 1) * lh) / 2], { size: IND.labelSize, color: '#FFFFFF', o: bandsOn }));
  });
  // Deere: the panel shrinks into a glowing node at the top of Farm equipment
  const eq = I.columns[eqIdx];
  const pr = [eq.x0 + 0.1, IND.nodeY - 0.25, eq.x1 - 0.1, IND.nodeY + 0.25];
  const dm = ramp(0.3, 1.5);
  const [ax0, ay0, ax1, ay1] = L.panel.rect;
  const dr = [mix(ax0, pr[0], dm), mix(ay0, pr[1], dm), mix(ax1, pr[2], dm), mix(ay1, pr[3], dm)];
  // threads: Deere to every industry, nested arcs above the columns, then down each column
  I.columns.forEach((c, j) => {
    if (c.deere) return;
    const th = ramp(2.7 + 0.12 * Math.abs(j - eqIdx), 0.8);
    if (th <= 0.01) return;
    const p0 = [(pr[0] + pr[2]) / 2, pr[3]], p3 = c.node;
    const top = p0[1] + 1.33 * (0.14 + 0.075 * Math.abs(j - eqIdx)), dx = p3[0] - p0[0];
    const pts = bezier(p0, [p0[0] + dx * 0.3, top], [p3[0], top], p3, 30, th);
    out.push(poly(pts, { stroke: LIME, w: 0.14, o: 0.75, glow: true }));
    if (th > 0.98) out.push(circle(c.node, { r: 0.5, fill: LIME, o: 1, glow: true }));
  });
  I.columns.forEach((c, j) => {
    const last = c.items[c.items.length - 1];
    const sp = c.deere ? ramp(2.4, 0.6) : ramp(3.4 + 0.12 * Math.abs(j - eqIdx), 0.5);
    if (last && sp > 0.01) {
      const top = c.deere ? pr[1] : c.node[1];
      out.push(line([c.dotX, top], [c.dotX, mix(top, last.dot[1], sp)], { color: c.deere ? LIME : (c.items[0]?.color || '#FFFFFF'), w: 0.12, o: 0.55 }));
    }
  });
  out.push(rect([dr[0], dr[1]], [dr[2], dr[3]], { stroke: LIME, w: mix(0.24, 0.2, dm), r: mix(1.1, 0.9, dm), fill: '#000', fo: 0.9, glow: true }));
  out.push(...drawPanel(L, 1 - ramp(0, 0.6), { panel: 0, title: 0, bullets: 0 })); // hub lines fade inside it
  out.push(text('JOHN DEERE', [(dr[0] + dr[2]) / 2, mix(ay1 - 0.45, IND.nodeY, dm)], { size: mix(4.4, 1.8, dm), weight: 700, color: LIME, glow: true }));
  // partners travel from their rows to their industry
  const from = new Map();
  for (const c of L.cards) for (const r of c.rows) if (r.o > 0.5) from.set(r.id, r);
  for (const g of L.box.groups) for (const r of g.rows) from.set(r.id, r);
  I.columns.forEach((c, j) => c.items.forEach((it, i) => {
    const src = from.get(it.id);
    if (!src) return;
    const f0 = 0.45 + 0.08 * j + 0.025 * i, f = ramp(f0, 1.5);
    const at = mixPt(src.text, it.text, f), size = mix(src.size, it.size, f);
    const long = src.lines ? src.lines.join('\n') : src.name;
    if (long === it.name) out.push(text(it.name, at, { anchor: 'start', size }));
    else {                                           // long name gives way to the short one mid-flight
      const swap = clamp01((f - 0.05) / 0.3);
      if (swap < 1) out.push(text(long, at, { anchor: 'start', size, o: 1 - swap }));
      if (swap > 0) out.push(text(it.name, at, { anchor: 'start', size, o: swap }));
    }
    const d = ramp(f0 + 1.25, 0.45);
    if (d > 0.01) out.push(circle(it.dot, { r: 0.6, fill: it.color, o: d, glow: true }));
  }));
  return out;
}

export { wrapTo };
