// Everything with words: title, axes, firm and industry labels, captions, side charts.
// Text stays in Helvetica in the DOM; positions are projected from the 3D world every frame.

import { FRAME, roaToY } from './layouts.js';
import { LABEL, ringU } from './labelfit.js';

const NS = 'http://www.w3.org/2000/svg';

export function createOverlay(stage, world) {
  const $ = id => stage.querySelector(`#${id}`);
  const title = $('title'), source = $('source'), caption = $('caption'), year = $('year');
  const legend = $('legend'), labelsEl = $('labels'), svg = $('axes');
  const pool = new Map();
  let axis = null, labels = [], side = null, spread = null, guides = [], paths = [], shapes = [];

  const u = () => stage.clientHeight / 100;

  function setText(el, t) { if (el.textContent !== (t || '')) el.textContent = t || ''; }

  const api = {
    reset({ title: t = '', source: s = '' } = {}) {
      setText(title, t); setText(source, s);
      api.caption(''); api.year(null); api.legend([]); legend.style.opacity = '';
      axis = null; labels = []; side = null; spread = null; guides = []; paths = [];
    },
    title: t => setText(title, t),
    source: s => setText(source, s),
    caption(t) { setText(caption, t); caption.classList.toggle('on', !!t); },
    // mode: 'live'; 'faint' (big and dim); 'inset' (raised into the chart's lower right, clear of two rows of names)
    year(t, mode = 'live') {
      setText(year, t == null ? '' : String(t));
      year.classList.toggle('faint', mode === 'faint');
      year.classList.toggle('inset', mode === 'inset');
    },
    legendOpacity(o) { const v = String(Math.round(o * 100) / 100); if (legend.style.opacity !== v) legend.style.opacity = v; },
    legend(items) {
      legend.innerHTML = '';
      for (const it of items) {
        const s = document.createElement('span');
        const i = document.createElement('i');
        i.style.background = it.color;
        s.append(i, document.createTextNode(it.text));
        legend.append(s);
      }
    },
    axis: a => { axis = a; },          // {label, x0, x1, ticks:[roa] | yTicks:[{y,label}]}, or a function returning one
    labels: l => { labels = l || []; }, // [{key, text, at:[x,y,z], anchor, cls, width, ring}]
    side: s => { side = s; },           // screen-space small charts
    spread: s => { spread = s; },       // [{x, width, median, q1, q3}] world units
    guides: g => { guides = g || []; }, // [{x0, x1, y, dash}] world lines
    paths: q => { paths = q || []; },   // [{pts:[[x,y],...], color, width, opacity}] data coords
    shapes: q => { shapes = q || []; }, // concept drawings for this frame (see drawShapes)

    update() {
      const W = stage.clientWidth, H = stage.clientHeight, U = u();
      const lt = `${title.offsetTop + title.offsetHeight + U * 1.8}px`; // legend sits just under the title
      if (legend.style.top !== lt) legend.style.top = lt;
      const parts = [];
      const P = (x, y, z = 0) => world.project(x, y, z);

      const A = typeof axis === 'function' ? axis() : axis; // a function lets the axis change every frame
      if (A) {
        const axis = A;
        const x0 = axis.x0 ?? FRAME.xMin, x1 = axis.x1 ?? FRAME.xMax;
        let labelX = Infinity, yTop = Infinity, yBot = -Infinity;
        // ticks: return values (data coords, follow the animated range, clipped to the chart),
        // or explicit {y, label} in chart-frame coords (e.g. the market-value axis)
        const ticks = axis.yTicks
          ? axis.yTicks.map(t => ({ ...t, frame: true, zero: t.zero ?? false }))
          : axis.ticks.map(v => ({ y: roaToY(v).y, label: `${(v * 100).toFixed(0)}%`, zero: Math.abs(v) < 1e-9 }));
        for (const t of ticks) {
          const PP = t.frame ? (x, y) => world.projectFrame(x, y, 0) : P;
          const shown = t.frame ? t.y : world.ty(t.y);
          if (shown < FRAME.yMin - 0.05 || shown > FRAME.yMax + 0.05) continue;
          const [ax, ay] = PP(x0, t.y), [bx, by] = PP(x1, t.y);
          if (ay < -10 || ay > H + 10 || ay < H * (axis.clipTop ?? 0) || ay > H * (axis.clipBottom ?? 1.1)) continue; // keep ticks clear of title/source
          const zero = t.zero;
          const v = t.label;
          // grid: false keeps only a short tick (lines would cut across the Q1 towers)
          const ex = axis.grid === false && !zero ? ax + U * 1.2 : bx, ey = axis.grid === false && !zero ? ay : by;
          parts.push(`<line x1="${ax}" y1="${ay}" x2="${ex}" y2="${ey}" stroke="${zero ? '#9a9a9a' : axis.grid === false ? '#5a5a5a' : '#1f1f1f'}" stroke-width="${zero ? 1.5 : 1}"/>`);
          const lx = Math.max(ax - U * 0.9, U * 5.6);
          labelX = Math.min(labelX, lx);
          yTop = Math.min(yTop, ay); yBot = Math.max(yBot, ay);
          parts.push(`<text x="${lx}" y="${ay}" fill="#ffffff" font-size="${U * 2.0}" text-anchor="end" dominant-baseline="middle">${v}</text>`);
        }
        if (axis.label && isFinite(labelX)) {
          const cx = labelX - U * 6.0, cy = (yTop + yBot) / 2;
          parts.push(`<text x="${cx}" y="${cy}" fill="#ffffff" font-size="${U * 2.0}" text-anchor="middle" transform="rotate(-90 ${cx} ${cy})">${axis.label}</text>`);
        }
      }

      for (const g of guides) {
        const [ax, ay] = P(g.x0, g.y), [bx, by] = P(g.x1, g.y);
        parts.push(`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${g.color || '#9a9a9a'}" stroke-width="1.2" ${g.dash ? 'stroke-dasharray="4 4"' : ''}/>`);
      }

      if (spread) {
        for (const s of spread) {
          const [lx, q1y] = P(s.x - s.width / 2, s.q1), [rx, q3y] = P(s.x + s.width / 2, s.q3);
          const [, my] = P(s.x, s.median);
          parts.push(`<rect x="${lx}" y="${Math.min(q1y, q3y)}" width="${rx - lx}" height="${Math.abs(q3y - q1y)}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.2"/>`);
          parts.push(`<line x1="${lx}" y1="${my}" x2="${rx}" y2="${my}" stroke="#ffffff" stroke-width="2.2"/>`);
        }
      }

      for (const q of paths) {
        if (q.pts.length < 2) continue;
        const pts = q.pts.map(([x, y]) => P(x, y).slice(0, 2).join(',')).join(' ');
        if (q.glow) parts.push(`<polyline points="${pts}" fill="none" stroke="${q.color}" stroke-opacity="${(q.opacity ?? 1) * 0.22}" stroke-width="${U * (q.width ?? 0.35) * 3.2}" stroke-linejoin="round" stroke-linecap="round"/>`);
        parts.push(`<polyline points="${pts}" fill="none" stroke="${q.color}" stroke-opacity="${q.opacity ?? 1}" stroke-width="${U * (q.width ?? 0.35)}" stroke-linejoin="round" stroke-linecap="round"/>`);
      }

      if (shapes.length) parts.push(drawShapes(shapes, world, U, W, H));
      if (side) parts.push(drawSide(side, W, H, U));

      // labels: project, then nudge firm names apart so none overlap
      const seen = new Set();
      const placed = labels.map(L => {
        const [sx, sy, sz] = L.frame ? world.projectFrame(...L.at) : P(...L.at);
        return { L, sx, sy, sz, ty: sy };
      });
      const gap = U * LABEL.nudge.gap;
      const firms = placed.filter(p => (p.L.anchor || 'right') === 'right').sort((a, b) => a.sy - b.sy);
      for (let i = 1; i < firms.length; i++) {
        for (let j = 0; j < i; j++) {
          const a = firms[j], b = firms[i];
          if (Math.abs(a.sx - b.sx) < U * LABEL.nudge.near && b.ty - a.ty < gap) b.ty = a.ty + gap;
        }
      }
      for (const { L, sx, sy, sz, ty } of placed) {
        const off = sz > 1 || sx < -200 || sx > W + 200 || sy < -100 || sy > H + 100;
        let el = pool.get(L.key);
        if (!el) { el = document.createElement('div'); pool.set(L.key, el); labelsEl.append(el); }
        seen.add(L.key);
        el.className = `lab ${L.cls || ''}`;
        setText(el, L.text);
        el.style.display = off ? 'none' : '';
        if (L.width) {
          const PW = L.frame ? (x, y, z) => world.projectFrame(x, y, z) : P;
          const [ax] = PW(L.at[0] - L.width / 2, L.at[1], L.at[2]), [bx] = PW(L.at[0] + L.width / 2, L.at[1], L.at[2]);
          el.style.width = `${Math.max(10, bx - ax)}px`;
        } else el.style.width = '';
        // a ringed dot (a named firm): the ring grows with the dot, and the name starts clear of it (src/labelfit.js)
        const rr = L.ring ? U * ringU(L.ringR ? Math.abs(P(L.at[0] + L.ringR, L.at[1], L.at[2])[0] - sx) / U : 0) : 0;
        const side = L.ring ? rr + U * LABEL.gap : U * 1.1;
        let anchor = L.anchor || 'right';
        // a name that would run off the stage's right edge goes to the left of its dot instead
        if (anchor === 'right' && L.ring && !off && sx + side + el.offsetWidth > W - U) anchor = 'left';
        const shift = {
          right: `translate(${side}px, -50%)`, left: `translate(calc(-100% - ${side}px), -50%)`,
          below: `translate(-50%, ${U * (0.6 + (L.drop || 0))}px)`, above: `translate(-50%, calc(-100% - ${U * 0.5}px))`,
        }[anchor];
        el.style.transform = `translate(${sx}px, ${ty}px) ${shift}`;
        if (L.ring && !off) {
          parts.push(`<circle cx="${sx}" cy="${sy}" r="${rr}" fill="none" stroke="#fff" stroke-width="1.5"/>`);
          const dir = anchor === 'left' ? -1 : 1;
          if (Math.abs(ty - sy) > 1) parts.push(`<line x1="${sx + dir * rr * 0.8}" y1="${sy}" x2="${sx + dir * side}" y2="${ty}" stroke="#fff" stroke-width="1"/>`);
        }
      }
      for (const [k, el] of pool) if (!seen.has(k)) { el.remove(); pool.delete(k); }

      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.innerHTML = DEFS + parts.join('');
    },
  };
  return api;
}

// Small charts in screen space: {panels:[{x,y,w,h,title,yMin,yMax,yTicks,fmt,xs,xLabel0,xLabel1,progress,series:[{values,color}]}]}
// Zooming: k scales text and strokes; backdrop (0-1) darkens the whole stage behind; xTicks [{i,label}] with xTickO
// fade in extra year labels; a series' label / startLabel mark its last / first value.
function drawSide(spec, W, H, U0) {
  const out = [];
  if (spec.backdrop > 0.001) out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#000" fill-opacity="${0.985 * spec.backdrop}"/>`);
  for (const p of spec.panels) {
    const U = U0 * (p.k ?? 1);
    const x = p.x * W, y = p.y * H, w = p.w * W, h = p.h * H;
    const sx = i => x + (i / (p.xs.length - 1)) * w;
    const sy = v => y + h - ((v - p.yMin) / (p.yMax - p.yMin)) * h;
    if (p.bg) out.push(`<rect x="${x - U * 7}" y="${y - U * 4.2}" width="${w + U * 9}" height="${h + U * 7.6}" fill="#000" fill-opacity="0.92"/>`);
    out.push(`<text x="${x}" y="${y - U * 1.6}" fill="#ffffff" font-size="${U * 2.1}">${p.title}</text>`);
    for (const t of p.yTicks) {
      out.push(`<line x1="${x}" y1="${sy(t)}" x2="${x + w}" y2="${sy(t)}" stroke="${Math.abs(t) < 1e-9 ? '#6a6a6a' : '#1f1f1f'}"/>`);
      out.push(`<text x="${x - U * 0.8}" y="${sy(t)}" fill="#ffffff" font-size="${U * 1.8}" text-anchor="end" dominant-baseline="middle">${p.fmt(t)}</text>`);
    }
    const tO = p.xTicks ? (p.xTickO ?? 1) : 0;
    if (tO < 1) {
      out.push(`<text x="${x}" y="${y + h + U * 2.2}" fill="#ffffff" fill-opacity="${1 - tO}" font-size="${U * 1.8}">${p.xLabel0}</text>`);
      out.push(`<text x="${x + w}" y="${y + h + U * 2.2}" fill="#ffffff" fill-opacity="${1 - tO}" font-size="${U * 1.8}" text-anchor="end">${p.xLabel1}</text>`);
    }
    if (tO > 0) for (const t of p.xTicks) {
      out.push(`<line x1="${sx(t.i)}" y1="${y + h}" x2="${sx(t.i)}" y2="${y + h + U * 0.6}" stroke="#5a5a5a" stroke-opacity="${tO}"/>`);
      out.push(`<text x="${sx(t.i)}" y="${y + h + U * 2.2}" fill="#ffffff" fill-opacity="${tO}" font-size="${U * 1.8}" text-anchor="middle">${t.label}</text>`);
    }
    const prog = Math.max(0, Math.min(p.xs.length - 1, p.progress ?? p.xs.length - 1));
    for (const s of p.series) {
      const pts = [];
      for (let i = 0; i <= Math.floor(prog); i++) if (s.values[i] != null) pts.push([sx(i), sy(s.values[i])]);
      const f = prog - Math.floor(prog), i0 = Math.floor(prog);
      if (f > 0 && s.values[i0] != null && s.values[i0 + 1] != null) {
        const v = s.values[i0] + (s.values[i0 + 1] - s.values[i0]) * f;
        pts.push([x + ((i0 + f) / (p.xs.length - 1)) * w, sy(v)]);
      }
      if (pts.length > 1) out.push(`<polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${U * 0.35}" stroke-linejoin="round" stroke-linecap="round"/>`);
      if (pts.length) {
        const [ex, ey] = pts[pts.length - 1];
        out.push(`<circle cx="${ex}" cy="${ey}" r="${U * 0.55}" fill="${s.color}"/>`);
        if (s.label) out.push(`<text x="${ex + U}" y="${ey}" fill="${s.color}" font-size="${U * 1.35}" dominant-baseline="middle">${s.label}</text>`);
        if (s.startLabel) {
          const [fx, fy] = pts[0];
          out.push(`<circle cx="${fx}" cy="${fy}" r="${U * 0.45}" fill="${s.color}"/>`);
          out.push(`<text x="${fx}" y="${fy - U * 1.3}" fill="${s.color}" font-size="${U * 1.35}">${s.startLabel}</text>`);
        }
      }
    }
  }
  return out.join('');
}

// ---------------- concept drawings ----------------
// Shapes are plain objects in world coordinates (frame: true = fixed chart frame, ignoring the y-axis
// range). Sizes are in U (1% of stage height). o = opacity. Omitted shapes cost nothing.
//   {k:'line', a:[x,y], b:[x,y], color, w, o, dash, arrow: 0|1|2, glow}
//   {k:'rect', a:[x,y], b:[x,y], fill, fo, stroke, w, o, r}
//   {k:'circle', at:[x,y], r (U) | rw (world), fill, fo, stroke, w, o, glow}
//   {k:'text', at:[x,y], text, size, color, anchor, base, weight, o, italic}
//   {k:'poly', pts:[[x,y],...], closed, fill, fo, stroke, w, o, glow}
//   {k:'ellipse', at:[x,y], rx, ry (world), fill, fo, stroke, w, o, glow}
const DEFS = '<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%">'
  + '<feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
  + '</filter><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">'
  + '<path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';

const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function drawShapes(list, world, U, W = 0, H = 0) {
  const out = [];
  for (const s of list) {
    if (!s || (s.o ?? 1) <= 0.003) continue;
    // screen: true = fractions of the stage (0..1), unaffected by the camera
    const P = s.screen ? (x, y) => [x * W, y * H, 0] : s.frame ? (x, y) => world.projectFrame(x, y, 0) : (x, y) => world.project(x, y, 0);
    const o = s.o ?? 1, glow = s.glow ? ' filter="url(#glow)"' : '';
    if (s.k === 'line') {
      const [ax, ay] = P(...s.a), [bx, by] = P(...s.b);
      const m = s.arrow === 2 ? ' marker-start="url(#ah)" marker-end="url(#ah)"' : s.arrow ? ' marker-end="url(#ah)"' : '';
      const sw = U * (s.w ?? 0.25), dash = s.dash ? ` stroke-dasharray="${s.dash.map(d => d * U).join(' ')}"` : '';
      // a blur filter clips straight lines to nothing (zero-height box), so lines glow with a soft underlay instead
      if (s.glow) out.push(`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${s.color || '#fff'}" stroke-width="${sw * 3.4}"`
        + ` stroke-opacity="${o * 0.22}" stroke-linecap="round"${dash}/>`);
      out.push(`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${s.color || '#fff'}" stroke-width="${sw}"`
        + ` stroke-opacity="${o}" stroke-linecap="round"${dash}${m}/>`);
    } else if (s.k === 'rect') {
      const [ax, ay] = P(...s.a), [bx, by] = P(...s.b);
      const x = Math.min(ax, bx), y = Math.min(ay, by), w = Math.abs(bx - ax), h = Math.abs(by - ay);
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${U * (s.r ?? 0)}" fill="${s.fill || 'none'}"`
        + ` fill-opacity="${(s.fo ?? 1) * o}" stroke="${s.stroke || 'none'}" stroke-width="${U * (s.w ?? 0.2)}" stroke-opacity="${o}"${glow}/>`);
    } else if (s.k === 'circle') {
      const [cx, cy] = P(...s.at);
      const r = s.rw != null ? Math.abs(P(s.at[0] + s.rw, s.at[1])[0] - cx) : U * (s.r ?? 1);
      out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.fill || 'none'}" fill-opacity="${(s.fo ?? 1) * o}"`
        + ` stroke="${s.stroke || 'none'}" stroke-width="${U * (s.w ?? 0.2)}" stroke-opacity="${o}"${glow}/>`);
    } else if (s.k === 'text') {
      const [x, y] = P(...s.at);
      const lines = String(s.text).split('\n');
      const size = U * (s.size ?? 1.6), lh = size * 1.18;
      const y0 = y - ((lines.length - 1) * lh) / 2 * ((s.base ?? 'middle') === 'middle' ? 1 : 0);
      const tspans = lines.map((l, i) => `<tspan x="${x}" y="${y0 + i * lh}">${esc(l)}</tspan>`).join('');
      out.push(`<text font-size="${size}" fill="${s.color || '#fff'}" fill-opacity="${o}" text-anchor="${s.anchor || 'middle'}"`
        + ` dominant-baseline="${s.base || 'middle'}" font-weight="${s.weight || 400}"${s.italic ? ' font-style="italic"' : ''}${glow}>${tspans}</text>`);
    } else if (s.k === 'ellipse') {
      const [cx, cy] = P(...s.at);
      const rx = Math.abs(P(s.at[0] + s.rx, s.at[1])[0] - cx), ry = Math.abs(P(s.at[0], s.at[1] + s.ry)[1] - cy);
      out.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${s.fill || 'none'}" fill-opacity="${(s.fo ?? 1) * o}"`
        + ` stroke="${s.stroke || 'none'}" stroke-width="${U * (s.w ?? 0.2)}" stroke-opacity="${o}"${glow}/>`);
    } else if (s.k === 'poly') {
      const pts = s.pts.map(([x, y]) => P(x, y).slice(0, 2).join(',')).join(' ');
      const tag = s.closed ? 'polygon' : 'polyline';
      out.push(`<${tag} points="${pts}" fill="${s.fill || 'none'}" fill-opacity="${(s.fo ?? 1) * o}" stroke="${s.stroke || 'none'}"`
        + ` stroke-width="${U * (s.w ?? 0.2)}" stroke-opacity="${o}" stroke-linejoin="round" stroke-linecap="round"${glow}/>`);
    }
  }
  return out.join('');
}
