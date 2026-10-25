// Turn CRSP/Compustat names ("GENERAL MOTORS CORP") into display names ("General Motors").
// Curated overrides (data/display_names.json, keyed by firm id) always win. Pure.

const SUFFIX = /\s+(inc|incorporated|corp|corporation|co|cos|company|companies|ltd|plc|llc|lp|hldgs|holdings|holding|del|new|the|cor|cl a|cl b|class a|class b)\.?$/i;
const KEEP_UPPER = new Set(['IBM', 'AT&T', 'GE', 'GM', 'RCA', 'ITT', 'CBS', 'NCR', 'US', 'USA', 'AMR', 'UAL', 'CVS', 'HP', 'AMD', 'ADR', 'NV', 'SA', 'AG', 'BP', 'PG&E', '3M', 'JPMORGAN', 'UPS']);

function titleWord(w) {
  if (KEEP_UPPER.has(w.toUpperCase())) return w.toUpperCase() === 'JPMORGAN' ? 'JPMorgan' : w.toUpperCase();
  if (/^co$/i.test(w)) return 'Co';
  if (/^[a-z]{1,2}$/i.test(w) && !/^(of|and|in|on|to|at|by|as)$/i.test(w)) return w.toUpperCase();
  if (/^(of|and|in|on|to|at|by|as|for|the)$/i.test(w)) return w.toLowerCase();
  if (w.includes('-')) return w.split('-').map(titleWord).join('-'); // Coca-Cola, T-Mobile
  const t = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  return /^Mc[a-z]/.test(t) && t.length > 3 ? `Mc${t.charAt(2).toUpperCase()}${t.slice(3)}` : t; // McDonald's
}

export function cleanName(raw) {
  if (!raw) return '';
  let s = String(raw).trim().replace(/\s+/g, ' ').replace(/[,.]+$/, '');
  let prev;
  do { prev = s; s = s.replace(SUFFIX, '').replace(/[,.&\s]+$/, '').trim(); } while (s !== prev && s.length > 3);
  if (s === s.toUpperCase()) {
    s = s.split(' ').map((w, i) => {
      const t = titleWord(w);
      return i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    }).join(' ');
  }
  return s;
}

export function makeNamer(overrides = {}) {
  return (id, raw) => overrides[id] || overrides[String(id)] || cleanName(raw);
}
