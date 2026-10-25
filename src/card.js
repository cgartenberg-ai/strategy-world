// Firm card: name, industry, return over time, market value, rank in industry.

import { pct, usd } from './colors.js';

export function createCard(el, index) {
  return {
    show(id, extra = {}) {
      const i = index.info.get(id) || {};
      const rows = [];
      if (i.industry) rows.push(['Industry', i.industry]);
      else if (i.finIndustry) rows.push(['Industry', i.finIndustry]);
      if (extra.sector) rows.push(['Sector', extra.sector]);
      if (i.mean != null) rows.push(['Return on assets, FY2021–25', pct(i.mean, 1)]);
      if (i.roe != null && i.mean == null) rows.push(['Return on equity, FY2021–25', pct(i.roe, 1)]);
      if (i.rank) rows.push(['Rank in industry', `${i.rank} of ${i.of}`]);
      const mv = extra.mv ?? i.mv;
      if (mv) rows.push([extra.mvLabel || index.mvLabel || 'Market value', usd(mv)]);
      el.innerHTML = `<h3></h3>${rows.map(() => '<div class="row"><span></span><span></span></div>').join('')}`;
      el.querySelector('h3').textContent = index.name(id) || 'Unnamed firm';
      el.querySelectorAll('.row').forEach((r, k) => {
        r.children[0].textContent = rows[k][0];
        r.children[1].textContent = rows[k][1];
      });
      if (i.traj && index.trajYears) el.append(sparkline(i.traj, index.trajYears));
      el.hidden = false;
    },
    hide() { el.hidden = true; },
    shown: () => !el.hidden,
  };
}

function sparkline(values, [y0, y1]) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 40');
  svg.setAttribute('preserveAspectRatio', 'none');
  const vals = values.filter(v => v != null);
  if (vals.length < 2) return svg;
  const lo = Math.min(0, ...vals), hi = Math.max(0.05, ...vals);
  const X = i => (i / (values.length - 1)) * 100, Y = v => 36 - ((v - lo) / (hi - lo)) * 32;
  const zero = document.createElementNS(NS, 'line');
  zero.setAttribute('x1', 0); zero.setAttribute('x2', 100); zero.setAttribute('y1', Y(0)); zero.setAttribute('y2', Y(0));
  zero.setAttribute('stroke', '#555'); zero.setAttribute('stroke-width', '0.5');
  const line = document.createElementNS(NS, 'polyline');
  line.setAttribute('points', values.map((v, i) => (v == null ? null : `${X(i)},${Y(v)}`)).filter(Boolean).join(' '));
  line.setAttribute('fill', 'none'); line.setAttribute('stroke', '#FF2EA4'); line.setAttribute('stroke-width', '1.6');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  const lab = document.createElementNS(NS, 'text');
  lab.setAttribute('x', 0); lab.setAttribute('y', 40); lab.setAttribute('fill', '#8a8a8a'); lab.setAttribute('font-size', 6);
  lab.textContent = `${y0}–${y1}`;
  svg.append(zero, line, lab);
  return svg;
}
