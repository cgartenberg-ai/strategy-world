// How much each industry swings (Q2's q2-swings; q2-shifts' end view under Stages): its average over 2001–25 and the
// standard deviation of its yearly average round that, i.e. how cyclical the industry is, not how much its firms
// differ. Pure. The yearly averages are q2q3_landscape.json `industry_years` (each industry's firms' average
// operating return on assets, each fiscal year).

export const SWING_YEARS = [2001, 2025];

// [{m, sd}] in industry order; null for an industry with fewer than three years of data
export function swingStats(q2, [y0, y1] = SWING_YEARS) {
  const IY = q2.industry_years || { years: [], series: {} }, Y0 = IY.years[0] ?? 2000;
  return q2.industries.map(ind => {
    const ser = IY.series[ind.industry] || [], v = [];
    for (let yr = y0; yr <= y1; yr++) { const i = yr - Y0, x = i >= 0 && i < ser.length ? ser[i] : null; if (x != null) v.push(x); }
    if (v.length < 3) return null;
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    return { m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)) };
  });
}

// Q2's swings screen, like for like: each industry's 2001–25 bar built exactly like its FY2021–25 bar (each firm's
// mean, then the mean of those firms; q2q3_landscape.json `long_run`), with the same firms' yearly swing as sd.
// Without `long_run` it falls back to swingStats. q2-shifts' end view keeps swingStats: its bars are yearly averages.
export function barSwings(q2) {
  const lr = q2.long_run;
  if (!lr) return swingStats(q2);
  return q2.industries.map(ind => {
    const m = lr.industries?.[ind.industry], sd = lr.sd?.[ind.industry];
    return m == null || sd == null ? null : { m, sd };
  });
}

// The axis range that holds every whisker: the bars' own range, widened in `step`s where a whisker needs it.
export function swingRange(stats, base = [-0.10, 0.15], step = 0.05) {
  const S = stats.filter(Boolean);
  const lo = Math.min(base[0], ...S.map(s => s.m - s.sd)), hi = Math.max(base[1], ...S.map(s => s.m + s.sd));
  const snap = (v, f) => Math.round(f(v / step - 1e-9 * Math.sign(v)) * step * 1e6) / 1e6;
  return [snap(lo, Math.floor), snap(hi, Math.ceil)];
}
