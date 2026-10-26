// Each question's opening: the question alone, big, white and centred on black, in the punchline's type
// (src/insight.js); the next click glides it up and shrinks it into the header, where it stays for the rest of the
// question; the click after starts the question's first move. Left steps back: the question glides back down.
// One stepped move per question (q1-ask ... q7-ask), registered before every other move (main.js) so it comes first
// in its module (src/flow/modules.js; q1-* and the like pick it up too). Tile pictures skip it (tile: false).
//
// Each word's place is measured twice, centred (the measuring block below) and in the header (inside the real #title,
// so the two agree to the pixel). The centred block shrinks and glides up as one (no words cross); its first line lands
// on the header's first line, and the words that wrap differently in the header fade as the real title fades in
// under them (glidePlaces). Once landed, only the real title shows the words.

import { SHOTS } from '../rigmath.js';
import { TITLES, go, dur } from './common.js';
import { insightSize } from '../insight.js';
import { ease, clamp01 } from '../tween.js';
import { ramp } from '../anim.js';

// the six questions (q6 and q7 are shown as Q5 and Q6) and their openings
export const ASKS = { q1: 'q1-ask', q2: 'q2-ask', q3: 'q3-ask', q4: 'q4-ask', q6: 'q6-ask', q7: 'q7-ask' };
export const GLIDE_S = 1.1;  // seconds: up into the header
export const BACK_S = 0.8;   // and back down, stepping back

// Centred, the question is the punchline's size (8 U), smaller only if it would run past three lines.
export const askSize = words => insightSize(words);

// How far up the glide is shown (0 centred, 1 in the header), from the last value and the move's stepped clock c:
// forward the clock itself runs the glide; stepping back snaps the clock to 0, so the words ease down over backS.
export function glideShown(shown, c, dt, backS = BACK_S) {
  return c >= shown ? c : Math.max(c, shown - dt / backS);
}

// Every word at glide f, from its centred place c[i] and its header place h[i] ({x, y} its top left in stage px, s its
// size over the header's). The question moves as one block, shrinking about its first word onto the header's first
// word, so no words cross. The centred first line lands on the header's first line (the header fits more words on a
// line): the words that land within STAY_PX of their header place settle there. Each of the rest fades out with the
// block as a copy of it fades in at its header place (hx, hy at the header's size; ho its opacity), once the block has
// all but arrived. Nothing is ever drawn twice in one place. title: the real header's opacity, 1 once landed (where
// every word already is). Returns {words: [{x, y, s, o, hx, hy, ho, stay}], title}.
export const STAY_PX = 3;
export const FADE = { start: 0.78, span: 0.22 }; // the cross-fade, once the block is 96% of the way there
export const headerOpacity = f => (f >= 1 - 1e-6 ? 1 : 0);
export function glidePlaces(c, h, f) {
  const title = headerOpacity(f), fadeIn = f >= 1 ? 1 : ramp(f, FADE.start, FADE.span, 'linear');
  if (!c.length) return { words: [], title };
  const e = ease.inOutCubic(clamp01(f)), sc = c[0].s, s = sc + (1 - sc) * e, k = s / sc;
  const ax = c[0].x + (h[0].x - c[0].x) * e, ay = c[0].y + (h[0].y - c[0].y) * e;
  const words = c.map((ci, i) => {
    const endX = h[0].x + (ci.x - c[0].x) / sc, endY = h[0].y + (ci.y - c[0].y) / sc; // where the block puts it
    const stay = Math.abs(endX - h[i].x) <= STAY_PX && Math.abs(endY - h[i].y) <= STAY_PX;
    const ghost = { hx: h[i].x, hy: h[i].y, ho: stay ? 0 : fadeIn, stay };
    if (stay && e >= 1) return { x: h[i].x, y: h[i].y, s: 1, o: 1, ...ghost };
    const x = ax + (ci.x - c[0].x) * k + (stay ? (h[i].x - endX) * e : 0);
    const y = ay + (ci.y - c[0].y) * k + (stay ? (h[i].y - endY) * e : 0);
    return { x, y, s, o: stay ? 1 : 1 - fadeIn, ...ghost };
  });
  return { words, title };
}

// The pieces the words glide in: the places a line can break, at spaces and either side of a dash ("economy—and"
// is three). space: whether a space comes before it. Each piece stays whole, so it measures as one box.
export function wordsOf(text) {
  const out = [];
  for (const m of String(text || '').matchAll(/(\s*)([—–]|[^\s—–]+)/g)) out.push({ text: m[2], space: !!m[1] && out.length > 0 });
  return out;
}
function fill(el, words) { // one unbreakable span per piece, spaces between, as the browser would set the text
  el.replaceChildren();
  for (const w of words) {
    if (w.space) el.append(' ');
    const s = document.createElement('span');
    s.textContent = w.text;
    s.style.whiteSpace = 'nowrap';
    el.append(s);
  }
  return [...el.children];
}

// The layer (one per app, on ctx.askLayer): the measuring block and the gliding words, above the overlay.
export function createAskLayer(stage) {
  const el = document.createElement('div'), measure = document.createElement('div');
  el.id = 'ask';
  measure.className = 'ask-measure';
  el.append(measure);
  stage.append(el);
  const title = stage.querySelector('#title');
  let text = '', words = [], spans = [], ghosts = [], layout = null;
  const wordSpan = w => {
    const o = document.createElement('span'), i = document.createElement('span');
    o.className = 'ask-word'; i.textContent = w.text;
    o.append(i); el.append(o);
    return o;
  };

  // spans: each word as it glides; ghosts: the words that wrap differently, fading in at their header places
  function show(t) {
    if (t === text && spans.length) return;
    text = t; words = wordsOf(t); layout = null;
    for (const s of [...spans, ...ghosts]) s.remove();
    spans = words.map(wordSpan);
    ghosts = words.map(wordSpan);
  }
  // both places of every word, measured again whenever the stage changes size
  function measured() {
    const W = stage.clientWidth, H = stage.clientHeight, key = `${W}x${H}`;
    if (layout && layout.key === key) return layout;
    const r0 = stage.getBoundingClientRect(), at = r => ({ x: r.left - r0.left, y: r.top - r0.top });
    const big = (askSize(text) * H) / 100, head = parseFloat(getComputedStyle(title).fontSize);
    measure.style.fontSize = `${big}px`;
    const centred = fill(measure, words).map(s => ({ ...at(s.getBoundingClientRect()), s: big / head }));
    const kept = title.textContent; // empty while the question is centred; put back as it was
    const header = fill(title, words).map(s => ({ ...at(s.getBoundingClientRect()), s: 1 }));
    title.textContent = kept;
    measure.replaceChildren();
    // where each word's letters sit inside its own box (scaled with the word); the copies stay at the header's size
    for (const q of ghosts) q.style.fontSize = `${head}px`;
    const inset = spans.map(o => {
      o.style.fontSize = `${head}px`; o.style.transform = 'none';
      const a = o.getBoundingClientRect(), b = o.firstChild.getBoundingClientRect();
      return { x: b.left - a.left, y: b.top - a.top };
    });
    return (layout = { key, centred, header, inset });
  }
  // the glide at f (0 centred, 1 in the header); the real title holds the words, shown once the glide has landed
  const op = v => String(Math.round(v * 1000) / 1000);
  function place(f) {
    if (!spans.length) return;
    const L = measured(), G = glidePlaces(L.centred, L.header, f);
    el.classList.toggle('settled', G.title >= 1); // landed: only the real title shows the words
    title.style.transition = 'none';
    title.style.opacity = op(G.title);
    spans.forEach((o, i) => {
      const g = G.words[i], d = L.inset[i], q = ghosts[i];
      o.style.transform = `translate(${g.x - d.x * g.s}px, ${g.y - d.y * g.s}px) scale(${g.s})`;
      o.style.opacity = op(g.o);
      q.style.transform = `translate(${g.hx - d.x}px, ${g.hy - d.y}px)`;
      q.style.opacity = op(g.ho);
    });
  }
  function hide() {
    for (const s of [...spans, ...ghosts]) s.remove();
    spans = []; ghosts = []; words = []; text = ''; layout = null;
    el.classList.remove('settled');
    title.style.opacity = ''; title.style.transition = '';
  }
  return { show, place, hide };
}

// Whether we came back into this move from a later move of the same question (its first move, say).
function cameBack(ctx, move) {
  const d = ctx.director, sc = d?.scenes?.[d.state().scene];
  if (!sc || !ctx.fromBeat) return false;
  const here = sc.beats.indexOf(move), from = sc.beats.indexOf(ctx.fromBeat);
  return here >= 0 && from > here;
}

// The move: clock 0 the question centred, 1 in the header (one click glides it up).
export function askMove(ctx, key, words = TITLES[key]) {
  let shown = 0, last = null;
  const move = {
    id: ASKS[key] || `${key}-ask`,
    ask: true,
    tile: false, // a question's master-view tile pictures its chart, not its words (tools/tiles.js)
    timelapse: { from: 0, to: 1, secondsPerYear: GLIDE_S, clickSteps: true, spaceSteps: true },
    enter(instant) {
      ctx.overlay.reset({ title: '', source: '' });
      ctx.allowOrbit = false;
      ctx.world.setTargets(new Map(), { duration: dur(ctx, 600) });
      ctx.world.plates.set([], { duration: dur(ctx, 600) });
      ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 600) });
      ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 600) });
      go(ctx, SHOTS.flat, 900, instant);
      // back from the question's first move: the question waits in the header, as we left it; otherwise (and on
      // Esc) it starts centred
      const back = cameBack(ctx, move);
      ctx.director?.setYear(back ? 1 : 0);
      shown = back ? 1 : 0; last = null;
      ctx.overlay.title(words); // the header holds the words; the layer keeps it dark until the glide lands
      ctx.askLayer.show(words);
      move.frame(shown);
    },
    frame(c) {
      const now = performance.now(), dt = last == null ? 0 : (now - last) / 1000;
      last = now;
      shown = glideShown(shown, c, dt);
      ctx.askLayer.place(shown);
    },
  };
  return move;
}

// All six, for the app's move registry (main.js).
export const askMoves = ctx => Object.keys(ASKS).map(key => askMove(ctx, key));
