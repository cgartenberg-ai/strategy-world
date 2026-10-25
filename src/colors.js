// Colors and number formatting. Pure: no DOM, no three.js.

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Return on assets -> color: deep plum (losses) -> magenta -> amber (high returns).
export const PROFIT_STOPS = [[-0.10, '#781858'], [0.10, '#FF2EA4'], [0.30, '#FFC46B']];
const STOPS = PROFIT_STOPS.map(([v, h]) => [v, hexToRgb(h)]);

export function profitColor(v) {
  const x = Math.max(STOPS[0][0], Math.min(STOPS[STOPS.length - 1][0], v));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [v0, c0] = STOPS[i], [v1, c1] = STOPS[i + 1];
    if (x <= v1) {
      const t = (x - v0) / (v1 - v0);
      return c0.map((c, k) => c + (c1[k] - c) * t);
    }
  }
  return STOPS[STOPS.length - 1][1].slice();
}

export const SECTOR_HEX = {
  'Energy': '#FFC46B',
  'Industrials and materials': '#9AA5B1',
  'Consumer': '#FF2EA4',
  'Technology': '#64E2ED',
  'Telecom': '#8F86F0',
  'Health': '#5DCAA5',
  'Financials': '#3F8FE8',
  'Utilities': '#C9B6FF',
  'Other': '#5A5A5A',
};

export function sectorColor(name) {
  return hexToRgb(SECTOR_HEX[name] || SECTOR_HEX.Other);
}

export const TAG = { top: '#FF2EA4', bottom: '#64E2ED', middle: '#5A5A5A' };
export const PLATE_HEX = '#66BFFF';

export function pct(x, digits = 0) {
  return `${(x * 100).toFixed(digits)}%`;
}

export function usd(x) {
  const units = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
  for (const [u, word] of units) {
    if (Math.abs(x) >= u) {
      const v = x / u;
      return `$${Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)} ${word}`;
    }
  }
  return `$${x.toFixed(0)}`;
}

// Compact axis labels: $294B, $3.8T, $1T.
export function usdShort(x) {
  if (!x) return '0';
  const [u, s] = Math.abs(x) >= 1e12 ? [1e12, 'T'] : Math.abs(x) >= 1e9 ? [1e9, 'B'] : [1e6, 'M'];
  const v = x / u;
  const txt = Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '');
  return `$${txt}${s}`;
}
