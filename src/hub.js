// Master views (see src/flow/views.js): the tile layout (pure), the DOM layer that shows the tiles and runs
// the zoom in and out, and the move that puts a master view on screen.

import { SHOTS } from './rigmath.js';
import { go, dur } from './scenes/common.js';
import { VIEWS } from './flow/views.js';
import { MODULES } from './flow/modules.js';

// What each tile turns into when the master view flips to its takeaways: the item's punchline ('' = none).
export const hubBacks = (items, modules = MODULES) => items.map(it => modules[it.id]?.insight || '');
const flippedViews = new Set(); // master views showing their takeaways (kept while you come and go)

// Tiles in stage fractions {x, y, w, h}; each is a 16:9 picture of the stage (so w equals h as fractions).
// Up to four in a row; seven sit four over three. Room is left under each tile for its label.
// row: true keeps every tile on one line, a sequence read left to right (the roadmap's stages).
// tall: tile height over a 16:9 tile's (text cards are taller, for room for their words).
export function hubLayout(n, { row = false, tall = 1, top = null } = {}) {
  const rows = row || n <= 4 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
  const most = Math.max(...rows), gap = 0.025, label = 0.06, rowGap = 0.04;
  const w = Math.min(0.27, ((row ? 0.92 : 0.88) - (most - 1) * gap) / most), h = w * tall;
  const total = rows.length * (h + label) + (rows.length - 1) * rowGap;
  let y = top ?? 0.18 + (0.74 - total) / 2; // top: pin the first row there (room below for the roadmap's tests)
  const out = [];
  for (const r of rows) {
    const x0 = (1 - (r * w + (r - 1) * gap)) / 2;
    for (let j = 0; j < r; j++) out.push({ x: x0 + j * (w + gap), y, w, h });
    y += h + label + rowGap;
  }
  return out;
}

// A card master view built click by click, at clock c: it starts with only its title; clicks 1..n bring the cards in
// (each with the arrow leading into it), then one click per bracket. How far each has faded in, 0-1.
export const hubBuildSteps = (n, groups = []) => n + groups.length;
// tints: each card takes its group's colour as that group (the roadmap's test) comes in.
export function hubReveal(c, n, groups = []) {
  const on = i => Math.max(0, Math.min(1, c - i));
  const groupOf = i => groups.findIndex(g => i >= g.from && i <= g.to);
  return { cards: Array.from({ length: n }, (_, i) => on(i)), arrows: Array.from({ length: Math.max(0, n - 1) }, (_, i) => on(i + 1)),
    groups: groups.map((g, j) => on(n + j)),
    tints: Array.from({ length: n }, (_, i) => (groupOf(i) < 0 ? 0 : on(n + groupOf(i)))) };
}
const CARD_TALL = 1.55;

// Tile labels: the item titles, numbered 1, 2, ... when the master view is a sequence.
export const hubLabels = (items, numbered = false) => items.map((it, i) => (numbered ? `${i + 1}  ${it.title}` : it.title));

const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

export function createHubLayer(stage) {
  const el = document.createElement('div');
  el.id = 'hub';
  for (const t of ['pointerdown', 'pointerup']) el.addEventListener(t, e => e.stopPropagation());
  stage.append(el);
  let tiles = [], timer = null;
  const full = r => { // the transform that makes a tile cover the stage
    const W = stage.clientWidth, H = stage.clientHeight;
    return `translate(${-r.x * W}px, ${-r.y * H}px) scale(${1 / r.w})`;
  };
  function clear() { clearTimeout(timer); el.replaceChildren(); el.style.opacity = ''; el.style.transition = ''; tiles = []; }

  // items [{label, thumb, back}]; next = index to highlight (-1 none); visited = Set of indexes; from = index of the
  // item we are zooming out of (its tile starts full-screen and shrinks into place), or null; row = one line;
  // key = the master view's id. Items with a `back` (a takeaway) get a Takeaways button that flips every tile.
  let shownKey = null;
  function setFlipped(on, animate = true) {
    if (!shownKey) return;
    if (on) flippedViews.add(shownKey); else flippedViews.delete(shownKey);
    tiles.forEach(({ t }, i) => {
      t.style.setProperty('--flip-delay', animate ? `${i * 0.09}s` : '0s');
      t.classList.toggle('flip-now', !animate);
      t.classList.toggle('flipped', on);
    });
    const b = el.querySelector('.hub-flip');
    if (b) b.textContent = on ? 'Questions' : 'Takeaways';
  }
  function toggleBacks() { if (el.querySelector('.hub-flip')) setFlipped(!flippedViews.has(shownKey)); }
  // cards: items carry {card: {n, text}} and show as numbered text cards with arrows between; groups: brackets
  // under them [{label, from, to, color}]; reveal(c) shows a build in progress (see hubReveal).
  let extras = { arrows: [], groups: [] }, groupSpec = [];
  function reveal(c) {
    const r = hubReveal(c, tiles.length, groupSpec);
    tiles.forEach(({ t }, i) => {
      t.style.opacity = String(r.cards[i]); t.style.pointerEvents = r.cards[i] > 0.5 ? '' : 'none';
      t.classList.toggle('tinted', r.tints[i] > 0.5); // the card takes its test's colour (CSS fades it)
    });
    extras.arrows.forEach((a, i) => { a.style.opacity = String(r.arrows[i]); });
    extras.groups.forEach((g, i) => { g.style.opacity = String(r.groups[i]); });
    extras.tests.forEach((g, i) => { g.style.opacity = String(r.groups[i]); });
  }
  function show({ items, next = -1, visited = new Set(), from = null, onPick, row = false, key = null, cards = false,
    groups = [], build = null }) {
    clear();
    shownKey = key;
    const withTests = cards && groups.some(g => g.question);
    const R = hubLayout(items.length, { row, tall: cards ? CARD_TALL : 1, top: withTests ? 0.19 : null });
    tiles = items.map((it, i) => {
      const t = document.createElement('div');
      t.className = `hub-tile${i === next ? ' next' : ''}${visited.has(i) ? ' seen' : ''}`;
      Object.assign(t.style, { left: `${R[i].x * 100}%`, top: `${R[i].y * 100}%`, width: `${R[i].w * 100}%`, height: `${R[i].h * 100}%` });
      const pic = document.createElement('div');
      pic.className = 'hub-pic';
      if (it.card) { // a numbered text card: the stage's words, big
        pic.className = 'hub-pic hub-card-face';
        const num = document.createElement('div'), words = document.createElement('div');
        num.className = 'hub-card-n'; num.textContent = String(it.card.n);
        words.className = 'hub-card-text'; words.textContent = it.card.text;
        pic.append(num, words);
        if (it.card.flipTo) { // its back: the stage's picture (a click flips between the two)
          const back = document.createElement('div'), img = document.createElement('img');
          back.className = 'hub-back hub-card-back';
          img.src = it.card.flipTo; img.alt = ''; img.draggable = false; img.onerror = () => img.remove();
          back.append(img);
          t.append(back);
        }
      } else if (it.thumb) {
        const img = document.createElement('img');
        img.src = it.thumb; img.alt = ''; img.draggable = false;
        img.onerror = () => img.remove();
        pic.append(img);
      }
      const lab = document.createElement('div');
      lab.className = 'hub-label';
      lab.textContent = it.label;
      t.append(pic);
      if (it.back) { // the takeaway, on the back of the card
        const back = document.createElement('div');
        back.className = 'hub-back';
        const words = document.createElement('div');
        words.textContent = it.back;
        back.append(words);
        t.append(back);
      }
      if (!it.card) t.append(lab); // a card carries its own words
      t.addEventListener('click', () => onPick && onPick(i));
      el.append(t);
      return { t, r: R[i] };
    });
    groupSpec = groups;
    extras = { arrows: [], groups: [], tests: [] };
    if (cards) groups.forEach(g => { for (let i = g.from; i <= g.to; i++) if (tiles[i]) tiles[i].t.style.setProperty('--card-c', g.color || '#fff'); });
    if (cards && build == null) tiles.forEach(({ t }) => t.classList.add('tinted')); // shown built: in their colours
    if (cards && row) { // arrows between the cards, brackets under them, and the tests (name and question) below
      for (let i = 0; i + 1 < R.length; i++) {
        const a = document.createElement('div');
        a.className = 'hub-arrow'; a.textContent = '›';
        Object.assign(a.style, { left: `${((R[i].x + R[i].w + R[i + 1].x) / 2) * 100}%`, top: `${(R[i].y + R[i].h / 2) * 100}%` });
        el.append(a); extras.arrows.push(a);
      }
      for (const g of groups) {
        const a = R[g.from], b = R[g.to];
        if (!a || !b) continue;
        const br = document.createElement('div'), lab = document.createElement('div');
        br.className = 'hub-group';
        Object.assign(br.style, { left: `${a.x * 100}%`, width: `${(b.x + b.w - a.x) * 100}%`, top: `${(a.y + a.h + 0.025) * 100}%`,
          borderColor: g.color || '#fff' });
        if (!g.question) { lab.className = 'hub-group-label'; lab.textContent = g.label; lab.style.color = g.color || '#fff'; br.append(lab); }
        el.append(br); extras.groups.push(br);
      }
      const below = R[0].y + R[0].h + 0.075, left = R[0].x, span = R[R.length - 1].x + R[R.length - 1].w - left;
      groups.filter(g => g.question).forEach((g, j) => {
        const row = document.createElement('div'), name = document.createElement('div'), q = document.createElement('div');
        row.className = 'hub-test';
        Object.assign(row.style, { left: `${left * 100}%`, width: `${span * 100}%`, top: `${(below + j * 0.135) * 100}%` });
        name.className = 'hub-test-name'; name.textContent = g.name || g.label; name.style.color = g.color || '#fff';
        q.className = 'hub-test-q'; q.textContent = g.question;
        row.append(name, q); el.append(row); extras.tests.push(row);
      });
    }
    if (build != null) reveal(build);
    if (items.some(it => it.back)) {
      const b = document.createElement('button');
      b.className = 'hub-flip';
      b.textContent = 'Takeaways';
      b.addEventListener('click', toggleBacks);
      el.append(b);
      if (flippedViews.has(key)) setFlipped(true, false);
    }
    if (from != null && tiles[from]) { // zoom out: the item we were in shrinks back into its tile
      const { t, r } = tiles[from];
      t.classList.add('zooming');
      t.style.transform = full(r);
      t.style.opacity = '0';
      for (const o of tiles) if (o.t !== t) { o.t.style.opacity = '0'; }
      void el.offsetWidth; // apply the start state before transitioning
      t.style.transition = `transform 0.8s ${EASE} 0.1s, opacity 0.3s ease`; // dissolve in over the last frame, then shrink
      t.style.transform = '';
      t.style.opacity = '';
      for (const o of tiles) if (o.t !== t) { o.t.style.transition = 'opacity 0.5s ease 0.35s'; o.t.style.opacity = ''; }
      timer = setTimeout(() => t.classList.remove('zooming'), 950);
    }
  }

  // zoom in: tile i grows to fill the stage while the others fade, then the whole layer dissolves
  function zoomIn(i, ms = 700) {
    clearTimeout(timer);
    const k = tiles[i];
    if (!k) { clear(); return; }
    k.t.classList.add('zooming');
    k.t.style.transition = `transform ${ms / 1000}s ${EASE}`;
    k.t.style.transform = full(k.r);
    for (const o of tiles) if (o !== k) { o.t.style.transition = 'opacity 0.3s ease'; o.t.style.opacity = '0'; }
    timer = setTimeout(() => {
      el.style.transition = 'opacity 0.45s ease';
      el.style.opacity = '0';
      timer = setTimeout(clear, 480);
    }, ms);
  }
  // flip one card between its words and its picture (the roadmap's build: a click on a card)
  function flipCard(i) {
    const k = tiles[i];
    if (!k) return;
    k.t.style.setProperty('--flip-delay', '0s');
    k.t.classList.remove('flip-now');
    k.t.classList.toggle('flipped');
  }
  return { show, zoomIn, clear, toggleBacks, reveal, flipCard, active: () => tiles.length > 0 };
}

// The move that shows a master view (its k-th showing: tile k is next; earlier visits are marked).
// Its layout (hub.layout 'row'), numbering (hub.numbered), text cards and brackets (hub.cards, hub.groups) and a
// click-by-click build (hub.build: the clock counts cards, one per click) come from its entry in src/flow/views.js.
export function hubMove(ctx, { id, title, items, k, thumbs = {} }) {
  const spec = VIEWS[id]?.hub || {}, labels = hubLabels(items, !!spec.numbered), backs = hubBacks(items);
  // the build: the title is up from the start; the cards and tests come in one click at a time
  const build = spec.build ? { timelapse: { from: 0, to: hubBuildSteps(items.length, spec.groups), secondsPerYear: 0.45,
    clickSteps: true, spaceSteps: true },
  frame(c) { ctx.hubLayer.reveal(c); } } : {};
  return {
    id: `hub-${id}-${k}`,
    ...build,
    enter(instant) {
      ctx.overlay.reset({ title, source: '' });
      ctx.allowOrbit = false;
      ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
      ctx.world.plates.set([], { duration: dur(ctx, 600) });
      ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
      ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
      go(ctx, SHOTS.flat, 900, instant);
      const prev = ctx.prevScene, from = !instant && prev?.inHub?.id === id ? prev.inHub.i : null;
      const visited = new Set(items.map((it, i) => (ctx.visited.has(it.id) ? i : -1)).filter(i => i >= 0));
      ctx.hubLayer.show({ items: items.map((it, i) => ({ label: labels[i], thumb: thumbs[it.id], back: backs[i],
        card: spec.cards ? { n: i + 1, text: it.title, flipTo: spec.flip ? thumbs[it.id] || spec.thumbs?.[it.id] : null } : null })),
        next: k < items.length ? k : -1, visited, from, row: spec.layout === 'row', key: id,
        cards: !!spec.cards, groups: spec.groups || [], build: spec.build ? 0 : null,
        onPick: spec.flip ? i => ctx.hubLayer.flipCard(i) : i => ctx.goToModule(items[i].id) });
    },
  };
}
