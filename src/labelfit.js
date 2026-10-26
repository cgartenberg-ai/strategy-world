// How words sit on the stage, in U (1% of the stage height). Pure: shared by the overlay (firm names beside their
// dots), styles.css (tests/labels.test.js checks the two agree), Q3's airline close-up and the industry names under
// the bars (q2.js), which alternate between two rows so no name touches its neighbour.

// Firm names (.lab in styles.css): their size, the white ring round a named dot, how far right of the dot's centre a
// name starts (clear of the ring), and how far apart the overlay nudges names that would touch.
export const LABEL = {
  size: 2.6, lineH: 1.15,      // .lab font-size and line-height
  ring: { min: 0.95, pad: 0.45 }, gap: 0.5,
  nudge: { gap: 3.0, near: 20 }, // a name less than near U across from another moves down to gap U below it
};
// the ring's radius round a dot dotU across the radius (the overlay draws it), and where the name then starts
export const ringU = dotU => Math.max(LABEL.ring.min, dotU + LABEL.ring.pad);
export const nameStartU = dotU => ringU(dotU) + LABEL.gap;

// Helvetica Neue advance widths (per 1000 em, regular), measured in Chrome for ASCII 32-126 (as in concepts/deere.js).
const W400 = '278,259,426,556,556,1000,630,278,259,259,352,600,278,389,278,333,556,556,556,556,556,556,556,556,556,556,278,278,600,600,600,556,800,648,685,722,704,611,574,759,722,259,519,667,556,871,722,760,648,760,685,648,574,722,611,926,611,648,611,259,333,259,600,500,222,537,593,537,593,537,296,574,556,222,222,519,222,853,556,574,593,593,333,500,315,556,500,758,518,500,480,333,222,333,600'.split(',').map(Number);
// a string's width in em (3% to spare)
export function textEm(str) {
  let w = 0;
  for (const ch of String(str)) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c < 127 ? W400[c - 32] : 600;
  }
  return (w / 1000) * 1.03;
}
export const nameWidthU = (str, size = LABEL.size) => textEm(str) * size;

// Greedy word wrap to maxEm per line; one word never breaks.
export function wrapLines(str, maxEm) {
  const out = [];
  let cur = '';
  for (const w of String(str).split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textEm(next) > maxEm) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

// Industry names under n bars, bandU wide each, set at sizeU: more than four bars and alternate names (odd places)
// drop to a second row, so each name has two bands' width, less a gap, to itself; the second row sits just below the
// first row's deepest name. Returns, for each name, its lines, its row and how far down it is set (U).
export const BAND_GAP = 1.0; // U kept clear between names on a row
export function bandRows(names, bandU, sizeU) {
  const stagger = names.length > 4, room = (stagger ? 2 : 1) * bandU - BAND_GAP;
  const lines = names.map(s => wrapLines(s, room / sizeU));
  const rowOf = k => (stagger ? k % 2 : 0);
  const deepest = Math.max(1, ...lines.filter((_, k) => rowOf(k) === 0).map(l => l.length));
  const drop = deepest * sizeU * LABEL.lineH + 0.3; // just clear of the first row (both rows fit above the source line)
  return lines.map((l, k) => ({ lines: l, row: rowOf(k), drop: rowOf(k) ? drop : 0 }));
}

// ---- names under bands seen in perspective (Q2's landscape), where the gaps change as the camera moves ----

// The box a label takes on the stage (U), set 'below' its anchor: centred across, `below` U down plus its drop.
export function landBoxes(labels, place, sizeU, below = 0.6) {
  return labels.map(l => {
    const lines = String(l.text).split('\n'), [x, y] = place(l), w = Math.max(...lines.map(s => textEm(s))) * sizeU;
    const y0 = y + below + (l.drop || 0);
    return { x0: x - w / 2, x1: x + w / 2, y0, y1: y0 + lines.length * sizeU * LABEL.lineH };
  });
}

// The ways a name can wrap, fewest lines first.
function wraps(s) {
  const out = [];
  for (let em = textEm(s) + 0.01; em > 0.3; em -= 0.05) {
    const l = wrapLines(s, em);
    if (!out.length || l.length > out[out.length - 1].length) out.push(l);
  }
  return out;
}

// anchors: for each camera along a move, each name's anchor on the stage (U). Names take turns down `rows` rows
// (by place); each is set in as few lines as its same-row neighbours allow at every one of those cameras, and each
// row sits just below every name of the rows above that it could touch (at least a line lower). Of the ways to
// start the turns, the shallowest clean one wins. Returns, per name, {lines, row, drop (U)}.
export function fitRows(names, anchors, { sizeU = 2.0, rows = 3, gapU = 0.8, below = 0.6 } = {}) {
  const n = names.length, lh = sizeU * LABEL.lineH, W = l => Math.max(...l.map(s => textEm(s))) * sizeU;
  const opts = names.map(wraps);
  const apart = (i, j) => Math.min(...anchors.map(A => Math.abs(A[j][0] - A[i][0])));
  function layout(off) {
    const row = k => (k + off) % rows, pick = opts.map(o => o.length - 1); // start narrowest
    const fits = (k, p) => [k - rows, k + rows].filter(j => j >= 0 && j < n)
      .every(j => (W(opts[k][p]) + W(opts[j][pick[j]])) / 2 + gapU <= apart(k, j));
    for (let pass = 0; pass < 8; pass++) { // the names with the most lines first try fewer
      let changed = false;
      for (const k of [...Array(n).keys()].sort((a, b) => pick[b] - pick[a])) {
        for (let p = 0; p < pick[k]; p++) if (fits(k, p)) { pick[k] = p; changed = true; break; }
      }
      if (!changed) break;
    }
    const lines = opts.map((o, k) => o[pick[k]]), clash = [...Array(n).keys()].filter(k => !fits(k, pick[k])).length;
    const drop = [0];
    for (let r = 1; r < rows; r++) {
      let d = drop[r - 1] + lh + 0.3;
      for (const A of anchors) {
        for (let a = 0; a < n; a++) {
          if (row(a) !== r) continue;
          for (let b = 0; b < n; b++) {
            if (row(b) >= r || Math.abs(A[a][0] - A[b][0]) >= (W(lines[a]) + W(lines[b])) / 2 + gapU) continue;
            d = Math.max(d, A[b][1] + drop[row(b)] + lines[b].length * lh - A[a][1] + 0.3); // clear of b's last line
          }
        }
      }
      drop.push(d);
    }
    const depth = Math.max(...anchors.flatMap(A => [...Array(n).keys()].map(k => A[k][1] + below + drop[row(k)] + lines[k].length * lh)));
    return { clash, depth, fit: lines.map((l, k) => ({ lines: l, row: row(k), drop: drop[row(k)] })) };
  }
  const tries = [...Array(rows).keys()].map(layout).sort((a, b) => a.clash - b.clash || a.depth - b.depth);
  return tries[0].fit;
}
