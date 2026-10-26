// Q3 concept beats, appended after the data beats (q3-dots … q3-all):
//   q3-share        every firm folds into one bar: year / industry / firm / unexplained (real data)
//   q3-share-mp     the bar slides over and McGahan and Porter's 1981–94 bar grows beside it
//   q3-stick        one airline lifts out of the chart and unfolds into its value stick
//   q3-raise-wtp, q3-raise-price, q3-lower-cost   the levers, one per click
//   q3-wedge        her I-beams: value created with you vs without you; the gap is added value
//   q3-disappear    the disappear-tomorrow test: customers fall back to the next best alternative
//   q3-sources      lower cost (wedge at the bottom) vs higher willingness to pay (wedge at the top)
//   q3-best, q3-unique   positioning: everyone chases the best car, or each owns a niche (drag a firm)

import { PAL, text, line, rect, light, brace } from '../concepts/kit.js';
import { LV, mixLv, stick, leader, ibeam, wedge, glowLine, dashedBox, SIZES } from '../concepts/stick.js';
import { market, tastes } from '../concepts/positioning.js';
import { ramp, mix, mixPt, CONCEPT } from '../anim.js';
import { hexToRgb } from '../colors.js';
import { rand } from '../layouts.js';
import { SHOTS } from '../rigmath.js';
import { TITLES, go, dur } from './common.js';
import { industryViews } from './q2.js';

const SOURCE_SHARE = 'Source: Compustat via WRDS, FY2000–25: US non-financial companies with $1bn+ assets, 4-digit SIC '
  + 'industries. Our calculation, based on the analysis in McGahan and Porter (1997), "How Much Does Industry Matter, Really?"';
const SOURCE_SHARE_MP = 'Source: Compustat via WRDS, FY2000–25: US non-financial companies with $1bn+ assets, 4-digit SIC '
  + 'industries; our calculation, based on McGahan and Porter (1997). Right: their results, US business segments 1981–94 (covariance ignored).';

// The four parts, bottom to top, in the colours of her McGahan–Porter slide (industry green, firm cyan, year blue).
// `ink` is the part's number on black: its colour, or a lighter one where the bar's colour is too dark to read.
const PARTS = [
  { key: 'year', label: 'Year', color: '#2D7FE0', ink: PAL.sky },
  { key: 'industry', label: 'Industry', color: '#99CC00', ink: '#99CC00' },
  { key: 'firm', label: 'Firm', color: '#33E0F0', ink: '#33E0F0' },
  { key: 'residual', label: 'Unexplained', color: '#5A5A5A', ink: PAL.white },
];
// type on the breakdown screens, for a room of 200 (U = 1% of the stage height)
const TYPE = { head: 3.0, column: 2.6, pct: 4.0, word: 2.6, key: 2.6 };
const LABEL_GAP = TYPE.pct * 0.09 * 1.2; // frame units between two numbers' centres (1 U = 0.09 frame units)
const ILLUSTRATIVE = 'Illustrative';

// McGahan and Porter's bar, bottom to top. Their business-unit and corporate shares show as one firm block
// (our "firm" is the whole company); the data keep both.
export function mpBlocks(mp) {
  return [
    { key: 'year', v: mp.year },
    { key: 'industry', v: mp.industry },
    { key: 'firm', v: mp.corporate + mp.business_unit },
    { key: 'residual', v: mp.residual },
  ];
}

// Label heights, bottom to top: each sits at its own height, or just clear of the one below it.
export function stackLabels(ys, gap) {
  const out = [];
  ys.forEach((y, i) => out.push(i ? Math.max(y, out[i - 1] + gap) : y));
  return out;
}

// ---------------- value stick layout (frame coordinates) ----------------
const XR = 0.4, XL = -4.4, SW = 2.2;          // the stick (right) and the dimmed reference copy (left)
const R0 = LV(-2.9, -1.6, -0.4, 1.4);          // reference levels: willingness to sell, cost, price, willingness to pay
const R1 = { ...R0, wtp: 2.2 };                 // raise willingness to pay
const R2 = { ...R1, p: 0.4 };                   // raise price too
const R3 = { ...R2, wts: -3.5, c: -2.5 };       // lower willingness to sell and cost: the firm's band is now the largest
const STICK_MID = [XR, (R0.wts + R0.wtp) / 2];
const LEVER_X = XR + SW / 2 + 1.95;             // lever labels sit right of "Value created"

// ---------------- wedge layout ----------------
const XA = -1.0, XY = 0.8;                      // next best alternative, you
const BASE = -2.9, ALT_TOP = 1.0, YOU_TOP = 2.3;

// ---------------- positioning space (her cars 2x2, normalised slide coords -> frame) ----------------
const fromSlide = ([u, v]) => [-8 + 16 * u, 2.85 - ((v - 0.13) / 0.76) * 6.3];
const SPACE = { x0: fromSlide([0.196, 0.5])[0], x1: fromSlide([0.786, 0.5])[0], y0: fromSlide([0.48, 0.89])[1],
  y1: fromSlide([0.48, 0.13])[1], ax: fromSlide([0.48, 0.5])[0], ay: fromSlide([0.48, 0.5])[1] };
const HOMES = [[0.28, 0.20], [0.40, 0.21], [0.24, 0.82], [0.71, 0.81], [0.72, 0.17], [0.65, 0.36], [0.58, 0.54], [0.40, 0.59]]
  .map(fromSlide);
const BEST = fromSlide([0.225, 0.175]);         // "the best car": high power, clean styling
const CROWD = HOMES.map((_, i) => (i === 0 ? BEST : [BEST[0] + 0.13 * Math.cos((2 * Math.PI * i) / 7), BEST[1] + 0.13 * Math.sin((2 * Math.PI * i) / 7)]));
const SEGMENTS = [
  { at: fromSlide([0.34, 0.215]), sd: [0.7, 0.42], w: 0.22 },  // power + clean (two firms start here)
  { at: fromSlide([0.69, 0.26]), sd: [0.55, 0.55], w: 0.2 },   // mileage + clean (two firms)
  { at: fromSlide([0.25, 0.80]), sd: [0.55, 0.42], w: 0.14 },  // power + funky
  { at: fromSlide([0.70, 0.79]), sd: [0.6, 0.42], w: 0.14 },   // mileage + funky
  { at: fromSlide([0.58, 0.53]), sd: [0.5, 0.45], w: 0.15 },
  { at: fromSlide([0.41, 0.61]), sd: [0.5, 0.45], w: 0.15 },
];
const clampSpace = ([x, y]) => [Math.max(SPACE.x0 + 0.15, Math.min(SPACE.x1 - 0.1, x)), Math.max(SPACE.y0 + 0.12, Math.min(SPACE.y1 - 0.12, y))];
const CUSTOMERS = tastes(SEGMENTS, 250, 5).map(clampSpace);
const MARGIN_SCALE = 1.6;                        // frame units: a rival this close takes ~60% of your margin
const FIRM_HEX = [PAL.pink, PAL.cyan, PAL.deere, PAL.amber, PAL.surplus, PAL.white, PAL.sky, '#C9B6FF'];
const FIRM_RGB = FIRM_HEX.map(hexToRgb);
const ID = { cust: j => CONCEPT.id(j), firm: i => CONCEPT.id(300 + i), flow: j => CONCEPT.id(400 + j) };

export function q3Concepts(ctx) {
  const q2 = ctx.data.q2q3_landscape;
  const V = (ctx.views = ctx.views || industryViews(q2));
  // Lights follow the same clock as draw(t): the frame time the loop hands to tick(now).
  let frameNow = null;
  const clock = () => ((frameNow ?? performance.now()) - ctx.t0) / 1000;

  function setup(source = ILLUSTRATIVE, title = TITLES.q3why) { // the concepts keep the "why" question
    frameNow = null;
    ctx.overlay.reset({ title, source });
    ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 900) });
    ctx.world.plates.set([], { duration: dur(ctx, 900) });
    ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
    ctx.allowOrbit = false;
    ctx.world.setGlow(0.3);
    go(ctx, SHOTS.flat, 900, ctx.instant);
  }
  const hideLights = (ms = 700) => ctx.world.setTargets(new Map(), { duration: dur(ctx, ms) });

  // Steps of light moves at given beat times; entered instantly, every step runs at once (final state).
  function stager(steps) {
    let i = 0;
    return {
      start(instant) {
        i = 0;
        if (instant) { for (const [, fn] of steps) fn(true); i = steps.length; } else this.tick();
      },
      tick() { const t = clock(); while (i < steps.length && t >= steps[i][0]) steps[i++][1](false); },
    };
  }
  // A caption that arrives after the motion has made its point.
  function captionAt(at, words) {
    let shown = false;
    return {
      start(instant) { shown = instant; ctx.overlay.caption(instant ? words : ''); },
      tick() { if (!shown && clock() >= at) { shown = true; ctx.overlay.caption(words); } },
    };
  }

  // ======================= 1. q3-share: year / industry / firm / unexplained =======================
  const DEC = q2.decomposition || { year: 0, industry: q2.share_of_variance ?? 0.15, firm: 0, residual: 1 - (q2.share_of_variance ?? 0.15) };
  const MP = DEC.mcgahan_porter || { year: 0.024, industry: 0.184, corporate: 0.042, business_unit: 0.317, residual: 0.433 };
  const SB = shareBar(q2, V, DEC, { cx: -1.4, W: 2.6 });
  // q3-share-mp: our bar slides left by DX and McGahan–Porter's grows at MX0..MX1
  const DX = -1.9, MX0 = 0.3, MX1 = MX0 + (SB.x1 - SB.x0);
  const SB_LEFT = new Map([...SB.agents].map(([id, a]) => [id, { ...a, x: a.x + DX }]));
  const pct = v => `${Math.round(v * 100)}%`;
  const shareMoves = stager([
    [0, inst => ctx.world.setTargets(SB.agents, { duration: inst ? 0 : 2100, stagger: 0.55 })],
  ]);
  // each band's number sits mid-band, nudged up where a thin band would crowd the one above
  const mids = (ys0, hs) => hs.map((h, i) => ys0[i] + h / 2);
  const OUR_Y = stackLabels(mids(SB.ys, PARTS.map((_, i) => SB.ys[i + 1] - SB.ys[i])), LABEL_GAP);
  const MPB = mpBlocks(MP).map((m, i) => ({ ...m, part: PARTS[i] }));
  const MP_H = MPB.map(m => m.v * (SB.y1 - SB.y0));
  const MP_Y0 = MP_H.map((_, i) => SB.y0 + MP_H.slice(0, i).reduce((s, h) => s + h, 0)); // each block's bottom
  const MP_Y = stackLabels(mids(MP_Y0, MP_H), LABEL_GAP);
  // our bar's frame, dividers and label, shifted by dx
  function barFrame(out, dx, o) {
    const { x0, x1, y0, y1, ys } = SB, pad = 0.09;
    out.push(rect([x0 + dx - pad, y0 - pad], [x1 + dx + pad, y1 + pad], { stroke: PAL.white, w: 0.14, o: 0.6 * o }));
    out.push(text(`US firms, ${DEC.window ? DEC.window.join('–') : '2000–2025'}`, [(x0 + x1) / 2 + dx, y1 + 0.45],
      { size: TYPE.column, color: PAL.white, o }));
    for (let i = 1; i < PARTS.length; i++) {
      out.push(...glowLine([x0 + dx - pad, ys[i]], [x1 + dx + pad, ys[i]], { color: PAL.white, w: 0.14, o: 0.7 * o }));
    }
  }
  // each band's share and name to the right of our bar; opacity(i) per band
  function sideLabels(out, dx, opacity) {
    PARTS.forEach((part, i) => {
      const y = OUR_Y[i], o = opacity(i), x = SB.x1 + dx;
      if (o <= 0) return;
      out.push(text(pct(DEC[part.key]), [x + 1.55, y], { anchor: 'end', size: TYPE.pct, weight: 500, color: part.ink, o }));
      out.push(text(part.label, [x + 1.8, y], { anchor: 'start', size: TYPE.word, color: PAL.white, o }));
    });
  }
  const heading = (x, o) => text('Differences in firm returns', [x, SB.y1 + 0.95], { size: TYPE.head, color: PAL.white, o });
  function drawShare(t) {
    const f = ramp(t, 2.4, 0.9), out = [];
    out.push(heading((SB.x0 + SB.x1) / 2, f));
    barFrame(out, 0, f);
    sideLabels(out, 0, i => ramp(t, 3.0 + i * 0.3, 0.7));
    return out;
  }
  // our bar slides left, its labels move to its left side, and McGahan–Porter's bar grows beside it
  function drawCompare(t) {
    const k = ramp(t, 0, 1.3), dx = DX * k, out = [];
    const { y1 } = SB;
    out.push(heading(mix((SB.x0 + SB.x1) / 2, (SB.x0 + DX + MX1) / 2, k), 1));
    barFrame(out, dx, 1);
    const fade = 1 - ramp(t, 0, 0.45);
    sideLabels(out, dx, () => fade);
    const g = ramp(t, 1.1, 0.6);
    PARTS.forEach((part, i) => {
      out.push(text(pct(DEC[part.key]), [SB.x0 + dx - 0.35, OUR_Y[i]], { anchor: 'end', size: TYPE.pct, weight: 500,
        color: part.ink, o: g }));
    });
    // McGahan–Porter: a solid bar that grows block by block (firm is one block: business unit + corporate)
    out.push(text('McGahan & Porter, 1981–94', [(MX0 + MX1) / 2, y1 + 0.45], { size: TYPE.column, color: PAL.white,
      o: ramp(t, 1.5, 0.6) }));
    MPB.forEach((m, i) => {
      const grow = ramp(t, 1.7 + i * 0.3, 0.5), y = MP_Y0[i], h = MP_H[i] * grow;
      if (h <= 0.001) return;
      const res = m.key === 'residual';
      out.push(res // the unexplained block: outlined in white like our bar's frame, so it reads on black
        ? rect([MX0, y], [MX1, y + h], { fill: m.part.color, fo: 0.3, stroke: PAL.white, w: 0.14, o: 0.6 * grow })
        : rect([MX0, y], [MX1, y + h], { fill: m.part.color, fo: 0.55, stroke: m.part.color, w: 0.1, o: grow, glow: true }));
      out.push(text(pct(m.v), [MX1 + 0.35, MP_Y[i]], { anchor: 'start', size: TYPE.pct, weight: 500, color: m.part.ink, o: grow }));
    });
    // one key for both bars, at the right
    const kx = 5.0, gk = ramp(t, 3.0, 0.8), S = 0.2;
    PARTS.slice().reverse().forEach((part, j) => {
      const ky = y1 - 0.9 - j * 0.8, res = part.key === 'residual';
      out.push(rect([kx, ky - S], [kx + 2 * S, ky + S], { fill: part.color, fo: res ? 0.35 : 0.85,
        stroke: res ? PAL.white : part.color, w: 0.08, o: gk })); // a white edge: the dark swatch shows on black
      out.push(text(part.label, [kx + 2 * S + 0.25, ky], { anchor: 'start', size: TYPE.key, color: PAL.white, o: gk }));
    });
    return out;
  }

  // ======================= 2. q3-stick: one airline becomes a value stick =======================
  const AIR = Math.max(0, q2.industries.findIndex(i => i.industry === 'Airlines'));
  const airMedian = q2.industries[AIR].median;
  const airId = q2.firms.filter(f => f[1] === AIR).sort((a, b) => Math.abs(a[2] - airMedian) - Math.abs(b[2] - airMedian))[0][0];
  const airStart = V.F.agents.get(airId);
  const dimChart = new Map([...V.F.agents].map(([id, a]) => [id, q2.firms.find(f => f[0] === id)?.[1] === AIR ? a : { ...a, alpha: 0.13 }]));
  const RISE = { at: 1.7, dur: 1.3, fade: 3.05 };
  const stickMoves = stager([
    [0, inst => { // back on the chart, faint bars behind; only the airlines stay bright
      ctx.world.setTargets(dimChart, { duration: inst ? 0 : 1200, stagger: 0.25 });
      ctx.world.plates.set(V.F.plates, { duration: inst ? 0 : 900, body: 0.12, lid: 0.35 });
    }],
    [RISE.at, inst => {
      ctx.world.setTargets(new Map(), { duration: inst ? 0 : 1100 });
      ctx.world.plates.set([], { duration: inst ? 0 : 900 });
    }],
  ]);
  function airlineLight(t) { // rises out of the chart, sweeps to the stick's centre, then becomes the stick
    const p = ramp(t, RISE.at, RISE.dur, 'inOutSine');
    const a = [airStart.x, airStart.y], b = STICK_MID, c = [airStart.x - 0.6, airStart.y + 2.6];
    const u = 1 - p, x = u * u * a[0] + 2 * u * p * c[0] + p * p * b[0], y = u * u * a[1] + 2 * u * p * c[1] + p * p * b[1];
    return light(x, y, { size: mix(airStart.size, 0.13, p), color: airStart.color.map(v => mix(v, 1, p * 0.6)), alpha: 1 - ramp(t, RISE.fade, 0.8) });
  }
  function drawStickIntro(t) {
    const grow = ramp(t, 2.95, 1.1, 'outQuart');
    if (grow <= 0) return [];
    const lab = ramp(t, 4.0, 0.7), val = ramp(t, 4.5, 0.7);
    return stick({ x: XR, w: SW, lv: R0, grow, origin: STICK_MID, axes: lab, edges: lab, words: lab, value: val });
  }

  // ======================= 3–5. the levers =======================
  // the reference copy settles in on the left, dimmed (it fades in beside its spot, clear of the labels)
  const refStick = (t, slide = 1) => stick({ x: mix(XL + 0.5, XL, slide), w: SW, lv: R0, o: 0.42 * slide,
    edges: 0, words: 0, value: 0, axes: 1, axisWords: 0 });
  const x1R = XR + SW / 2;
  function drawLever(t, { from, to, start = 0.3, label, target, ghosts, slide = null, labelY }) {
    const f = ramp(t, start, 1.3);
    const lv = mixLv(from, to, f);
    const out = [];
    out.push(...refStick(t, slide == null ? 1 : slide));
    out.push(...stick({ x: XR, w: SW, lv, value: 1, axisTop: Math.max(R1.wtp, lv.wtp) + 0.42,
      ghosts: ghosts.map(y => ({ y, o: ramp(t, start, 0.3) * (1 - ramp(t, start + 2.4, 0.9)) })) })); // where the edge was
    const lo = ramp(t, start + 0.2, 0.6);
    out.push(...leader(label, [LEVER_X, labelY], [x1R - 0.28, target(lv)], { o: lo }));
    return out;
  }

  // ======================= 6–8. the wedge =======================
  const greyBeam = (x, lo, hi, o = 1) => ibeam(x, lo, hi, { color: PAL.grey, o });
  const youBeam = (x, lo, hi, o = 1, dash = null) => ibeam(x, lo, hi, { color: PAL.white, o, dash });
  function wedgeLabels(o, youO = 1) {
    if (o <= 0.003) return [];
    return [
      text('Next best alternative', [XA, BASE - 0.5], { size: 2.0, color: PAL.white, o }),
      text('You', [XY, BASE - 0.5], { size: 2.2, weight: 500, o: o * youO }),
      text('Willingness to pay', [XA - 0.55, ALT_TOP], { anchor: 'end', size: 1.7, color: PAL.white, o }),
      text('Willingness to sell', [XA - 0.55, BASE], { anchor: 'end', size: 1.7, color: PAL.white, o }),
    ];
  }
  function drawWedge(t) {
    const f = ramp(t, 0, 1.4);
    const out = [];
    // the two sticks contract into her plain I-beams (only value created matters now)
    if (f < 1) {
      const alt = mixLv(R0, LV(BASE, BASE, BASE, ALT_TOP), f), you = mixLv(R3, LV(BASE, BASE, BASE, YOU_TOP), f);
      out.push(...stick({ x: mix(XL, XA, f), w: mix(SW, 0.05, f), lv: alt, o: 0.3 * (1 - f), edges: 0, words: 0, axes: 1 - f }));
      out.push(...stick({ x: mix(XR, XY, f), w: mix(SW, 0.05, f), lv: you, o: 1 - f, edges: 0, words: 1 - ramp(t, 0, 0.3), axes: 1 - f, value: 1 - ramp(t, 0, 0.3) }));
    }
    const b = ramp(t, 0.9, 0.7);
    out.push(...greyBeam(XA, BASE, ALT_TOP, b), ...youBeam(XY, BASE, YOU_TOP, b));
    out.push(...wedgeLabels(ramp(t, 1.3, 0.6)));
    const d = ramp(t, 1.9, 0.6);
    out.push(line([XA + 0.31, ALT_TOP], [XY + 0.31, ALT_TOP], { color: PAL.grey, w: 0.14, dash: [0.8, 0.6], o: d }));
    out.push(...wedge(XY, ALT_TOP, YOU_TOP, { o: ramp(t, 2.3, 0.8), sub: 'With you, minus without you' }));
    return out;
  }

  // the disappear-tomorrow test
  const NFLOW = 44;
  const flowR = rand(913);
  const FLOW = Array.from({ length: NFLOW }, (_, j) => ({
    a: [XY + (flowR() - 0.5) * 0.3, mix(BASE + 0.2, YOU_TOP - 0.2, flowR())],
    b: [XA + (flowR() - 0.5) * 0.3, mix(BASE + 0.2, ALT_TOP - 0.15, flowR())],
    delay: 1.1 + (j / NFLOW) * 1.8 + flowR() * 0.25,
  }));
  function flowLights(t) {
    const m = new Map(), show = ramp(t, 0, 0.5);
    FLOW.forEach((c, j) => {
      const p = ramp(t, c.delay, 1.25, 'inOutSine');
      const ctl = [(c.a[0] + c.b[0]) / 2, Math.max(c.a[1], c.b[1]) + 1.1];
      const u = 1 - p;
      const x = u * u * c.a[0] + 2 * u * p * ctl[0] + p * p * c.b[0], y = u * u * c.a[1] + 2 * u * p * ctl[1] + p * p * c.b[1];
      m.set(ID.flow(j), light(x, y, { size: 0.036, color: hexToRgb(PAL.sky), alpha: show * 0.95 }));
    });
    return m;
  }
  const disappearCap = captionAt(4.3, 'Capture up to added value');
  function drawDisappear(t) {
    const gone = ramp(t, 0.5, 1.2);
    const out = [];
    out.push(...greyBeam(XA, BASE, ALT_TOP, 1));
    out.push(...youBeam(XY, BASE, YOU_TOP, 1 - gone), ...youBeam(XY, BASE, YOU_TOP, 0.3 * gone, [0.9, 0.7]));
    out.push(...wedgeLabels(1, mix(1, 0.4, gone)));
    out.push(line([XA + 0.31, ALT_TOP], [XY + 0.31, ALT_TOP], { color: PAL.grey, w: 0.14, dash: [0.8, 0.6], o: 1 }));
    out.push(...wedge(XY, ALT_TOP, YOU_TOP, { o: 1, ghost: gone, sub: 'With you, minus without you' }));
    return out;
  }

  // two sources of added value, side by side
  const PL = -3.5, PR = 2.9, PO = 0.75;
  const S_ALT = { lo: -2.4, hi: 1.2 }, S_LO = -3.25, S_HI = 2.2, S_LABEL = -3.72;
  function drawSources(t) {
    const show = ramp(t, 0, 0.8), open = ramp(t, 1.0, 1.2), glow = ramp(t, 2.0, 0.8);
    const out = [];
    const pair = (cx, title, you, wlo, whi, side) => {
      out.push(text(title, [cx, 2.75], { size: 2.6, weight: 500, o: show }));
      out.push(...greyBeam(cx - PO, S_ALT.lo, S_ALT.hi, show));
      out.push(...youBeam(cx + PO, you.lo, you.hi, show));
      out.push(text('Next best alternative', [cx - PO, S_LABEL], { size: 1.8, color: PAL.white, o: show }));
      out.push(text('You', [cx + PO, S_LABEL], { size: 2.0, weight: 500, o: show }));
      const ly = side > 0 ? S_ALT.hi : S_ALT.lo;
      out.push(line([cx - PO + 0.31, ly], [cx + PO + 0.31, ly], { color: PAL.grey, w: 0.14, dash: [0.8, 0.6], o: show * open }));
      out.push(...wedge(cx + PO, wlo, whi, { o: glow, size: 2.2 }));
    };
    const youCost = { lo: mix(S_ALT.lo, S_LO, open), hi: S_ALT.hi };
    const youWtp = { lo: S_ALT.lo, hi: mix(S_ALT.hi, S_HI, open) };
    // both alternatives sit at the same levels, so one pair of edge words serves the row
    out.push(text('Willingness to pay', [PL - PO - 0.55, S_ALT.hi], { anchor: 'end', size: 1.7, color: PAL.white, o: show }),
      text('Willingness to sell', [PL - PO - 0.55, S_ALT.lo], { anchor: 'end', size: 1.7, color: PAL.white, o: show }));
    pair(PL, 'Lower cost', youCost, youCost.lo, S_ALT.lo, -1);
    pair(PR, 'Higher willingness to pay', youWtp, S_ALT.hi, youWtp.hi, 1);
    return out;
  }

  // ======================= 9–10. positioning =======================
  let over = new Map(), dragging = null;      // q3-unique: firms the presenter has moved
  const bestPos = (i, t) => mixPt(HOMES[i], CROWD[i], ramp(t, 1.6 + 0.09 * i, 1.9));
  const uniquePos = (i, t) => over.get(i) || mixPt(CROWD[i], HOMES[i], ramp(t, 0.3 + 0.1 * i, 1.9));
  function posLights(firms, mk, tint, fadeIn) {
    const m = new Map();
    CUSTOMERS.forEach((c, j) => {
      const fc = FIRM_RGB[mk.assign[j]];
      const col = [0.85, 0.85, 0.85].map((v, k) => mix(v, fc[k], tint));
      m.set(ID.cust(j), light(c[0], c[1], { size: 0.03, color: col, alpha: mix(0.55, 0.8, tint) * fadeIn }));
    });
    firms.forEach((f, i) => m.set(ID.firm(i), light(f[0], f[1], {
      size: 0.085, color: [1, 1, 1].map((v, k) => mix(v, FIRM_RGB[i][k], tint)), alpha: fadeIn })));
    return m;
  }
  function drawSpace(firms, mk, tint, { lineO = 1, barO = 1 } = {}) {
    const out = [];
    const { x0, x1, y0, y1, ax, ay } = SPACE;
    const ar = { color: PAL.blue, w: 0.6, arrow: 2 };
    out.push(line([x0, ay], [x1, ay], ar), line([ax, y0], [ax, y1], ar));
    out.push(text('High power', [x0 + 0.1, ay + 0.36], { anchor: 'start', size: 2.0 }),
      text('High MPG', [x1 - 0.1, ay + 0.36], { anchor: 'end', size: 2.0 }));
    out.push(text('Clean styling', [ax + 0.25, y1 - 0.1], { anchor: 'start', size: 2.0 }),
      text('Funky styling', [ax + 0.25, y0 + 0.1], { anchor: 'start', size: 2.0 }));
    if (lineO > 0.01) {
      CUSTOMERS.forEach((c, j) => {
        const i = mk.assign[j];
        const col = tint > 0.5 ? FIRM_HEX[i] : PAL.white;
        out.push(line(c, firms[i], { color: col, w: 0.07, o: lineO * mix(0.2, 0.34, tint) }));
      });
    }
    firms.forEach((f, i) => { // margin bar under each firm; a sliver of margin reads as none
      const m = mk.margins[i], bw = 1.1 * m, bo = barO * Math.min(1, Math.max(0, (m - 0.08) / 0.1));
      if (bo > 0.01) out.push(rect([f[0] - bw / 2, f[1] - 0.37], [f[0] + bw / 2, f[1] - 0.25], { fill: PAL.amber, fo: 0.95, o: bo, glow: true }));
    });
    const k = 2, mk2 = mk.margins[k]; // one bar carries the word, while there is a bar to carry it
    if (mk2 > 0.15) out.push(text('Margin', [firms[k][0] + 0.55 * mk2 + 0.14, firms[k][1] - 0.31], { anchor: 'start', size: 1.7, color: PAL.amber, o: barO * Math.min(1, (mk2 - 0.15) / 0.2) }));
    return out;
  }
  const bestCap = captionAt(3.9, 'Compete to be the best');
  const uniqueCap = captionAt(2.6, 'Compete to be unique');
  const firmNear = (at, t) => {
    let best = null, bd = 0.42 ** 2;
    HOMES.forEach((_, i) => {
      const p = uniquePos(i, t), d = (p[0] - at[0]) ** 2 + (p[1] - at[1]) ** 2;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  };

  // ======================= the beats =======================
  return [
    {
      id: 'q3-share',
      enter(instant) { setup(SOURCE_SHARE, TITLES.q3); shareMoves.start(instant); },
      tick(now) { frameNow = now; shareMoves.tick(); },
      draw: t => drawShare(t),
    },
    {
      id: 'q3-share-mp',
      enter(instant) { setup(SOURCE_SHARE_MP, TITLES.q3); ctx.world.setTargets(SB_LEFT, { duration: instant ? 0 : 1300 }); },
      tick(now) { frameNow = now; },
      draw: t => drawCompare(t),
    },
    {
      id: 'q3-stick',
      enter(instant) { setup(); stickMoves.start(instant); },
      tick(now) {
        frameNow = now;
        stickMoves.tick();
        if (clock() >= RISE.at) ctx.world.setSome(new Map([[airId, airlineLight(clock())]]));
      },
      labels: () => (clock() < RISE.at + 0.8 ? [V.flatLabels()[AIR]] : []),
      draw: t => drawStickIntro(t),
    },
    {
      id: 'q3-raise-wtp',
      enter(instant) { setup(); hideLights(); },
      draw: t => drawLever(t, { from: R0, to: R1, start: 1.2, slide: ramp(t, 0, 1.0), label: 'Raise willingness to pay',
        labelY: R1.wtp + 0.3, target: lv => lv.wtp, ghosts: [R0.wtp] }),
    },
    {
      id: 'q3-raise-price',
      enter(instant) { setup(); hideLights(); },
      draw: t => drawLever(t, { from: R1, to: R2, label: 'Raise price too', labelY: R2.p + 0.35,
        target: lv => lv.p, ghosts: [R1.p] }),
    },
    {
      id: 'q3-lower-cost',
      enter(instant) { setup(); hideLights(); },
      draw: t => drawLever(t, { from: R2, to: R3, label: 'Or lower cost and\nwillingness to sell', labelY: R3.c - 0.25,
        target: lv => (lv.c + lv.wts) / 2, ghosts: [R2.c, R2.wts] }),
    },
    {
      id: 'q3-wedge',
      enter(instant) { setup(); hideLights(); },
      draw: t => drawWedge(t),
    },
    {
      id: 'q3-disappear',
      enter(instant) { setup(); hideLights(); disappearCap.start(instant); },
      tick(now) { frameNow = now; disappearCap.tick(); ctx.world.setSome(flowLights(clock())); },
      draw: t => drawDisappear(t),
    },
    {
      id: 'q3-sources',
      enter(instant) { setup(); hideLights(); },
      draw: t => drawSources(t),
    },
    {
      id: 'q3-best',
      enter(instant) { setup(); hideLights(500); bestCap.start(instant); },
      tick(now) {
        frameNow = now;
        bestCap.tick();
        const t = clock(), firms = HOMES.map((_, i) => bestPos(i, t));
        ctx.world.setSome(posLights(firms, market(CUSTOMERS, firms, { scale: MARGIN_SCALE }), 0, ramp(t, 0, 0.9)));
      },
      draw: t => {
        const tt = t, firms = HOMES.map((_, i) => bestPos(i, tt));
        return drawSpace(firms, market(CUSTOMERS, firms, { scale: MARGIN_SCALE }), 0, { lineO: ramp(tt, 0.5, 0.8), barO: ramp(tt, 0.7, 0.6) });
      },
    },
    {
      id: 'q3-unique',
      enter(instant) { setup(); over = new Map(); dragging = null; hideLights(500); uniqueCap.start(instant); },
      tick(now) {
        frameNow = now;
        uniqueCap.tick();
        const t = clock(), firms = HOMES.map((_, i) => uniquePos(i, t));
        ctx.world.setSome(posLights(firms, market(CUSTOMERS, firms, { scale: MARGIN_SCALE }), ramp(t, 0.6, 1.4), 1));
      },
      draw: t => {
        const tt = t, firms = HOMES.map((_, i) => uniquePos(i, tt));
        return drawSpace(firms, market(CUSTOMERS, firms, { scale: MARGIN_SCALE }), ramp(tt, 0.6, 1.4));
      },
      pointer({ type, at }) {
        if (type === 'up') { const had = dragging != null; dragging = null; return had; }
        if (!at) return false;
        if (type === 'hover') return firmNear(at, clock()) != null ? 'grab' : false;
        if (type === 'down') {
          const i = firmNear(at, clock());
          if (i == null) return false;
          dragging = i; over.set(i, clampSpace(at)); return true;
        }
        if (type === 'drag' && dragging != null) { over.set(dragging, clampSpace(at)); return true; }
        return false;
      },
    },
  ];
}

// Every firm becomes one cell of a single bar, filled row by row from the bottom in four bands:
// year (blue), industry (green), firm (cyan), unexplained (faint, slightly scattered).
// Which firm lands in which band is only a picture of the shares; the shares come from the decomposition.
function shareBar(q2, V, dec, { cx = -3.3, y0 = -3.3, H = 5.4, W = 2.3 } = {}) {
  const firms = q2.firms.filter(f => V.F.agents.has(f[0])).sort((a, b) => a[2] - b[2] || a[0] - b[0]);
  const N = firms.length;
  const c0 = Math.round(W / Math.sqrt((W * H) / N));
  let cols = c0, best = -1; // the column count near c0 whose top row is fullest
  for (let c = Math.max(4, c0 - 2); c <= c0 + 2; c++) {
    const r = Math.ceil(N / c), fillTop = (N - (r - 1) * c) / c;
    if (fillTop > best + 1e-9) { best = fillTop; cols = c; }
  }
  const rows = Math.ceil(N / cols), cell = H / rows;
  const shares = PARTS.map(p => Math.max(0, dec[p.key] || 0));
  const counts = shares.map(v => Math.round(v * N));
  counts[3] = N - counts[0] - counts[1] - counts[2];
  // spread each band's firms evenly through the range of returns, so no band is "the good firms"
  const order = [];
  const pool = firms.slice();
  counts.slice(0, 3).forEach(n => {
    const pick = [];
    for (let j = 0; j < n; j++) pick.push(pool.splice(Math.floor(((j + 0.5) * pool.length) / Math.max(1, n - j)) % Math.max(1, pool.length), 1)[0]);
    order.push(pick.filter(Boolean));
  });
  order.push(pool);
  const sector = f => q2.industries[f[1]].sector || 'Other';
  order[1].sort((a, b) => sector(a).localeCompare(sector(b)) || a[1] - b[1] || a[2] - b[2]);
  const RGB = PARTS.map(p => hexToRgb(p.color));
  const R = rand(4242);
  const agents = new Map();
  let i = 0;
  order.forEach((band, b) => band.forEach(f => {
    const row = Math.floor(i / cols), inRow = row === rows - 1 ? N - row * cols : cols;
    const a = V.F.agents.get(f[0]);
    const jit = b === 3 ? cell * 0.28 : 0; // unexplained: a little scatter
    agents.set(f[0], { ...a, x: cx - ((inRow - 1) * cell) / 2 + (i % cols) * cell + (R() - 0.5) * 2 * jit,
      y: y0 + cell * (row + 0.5) + (R() - 0.5) * 2 * jit, size: cell * 0.33,
      color: RGB[b], alpha: b === 3 ? 0.42 : 1 }); // every band in one colour
    i++;
  }));
  const width = cols * cell;
  const ys = [y0];
  let acc = 0;
  counts.forEach(n => { acc += n; ys.push(y0 + (Math.ceil(acc / cols - 1e-9)) * cell); });
  ys[4] = y0 + rows * cell;
  return { agents, x0: cx - width / 2, x1: cx + width / 2, y0, y1: y0 + rows * cell, ys };
}
