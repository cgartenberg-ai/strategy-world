// A question's punchline: the last frame fades to black, then one line of white type, centred, in the style
// of her slides (Helvetica Neue). The text is each module's `insight` in src/flow/modules.js; resolve.js adds the move.

import { SHOTS } from './rigmath.js';
import { go } from './scenes/common.js';

const FADE_MS = 900;          // the fade to black (the words follow; see #insight in styles.css)
const BASE = 8;               // type size in stage units (--u = 1% of stage height); her slides use 10
const WIDTH = 0.8 * 177.8;    // the text block's width in the same units (80% of a 16:9 stage)
const CHAR = 0.55, SLACK = 0.9, MAX_LINES = 3; // Helvetica Neue's average character width (em); room lost to wrapping

// One size for every punchline, smaller only when a line would run past three lines.
export function insightSize(words) {
  const n = String(words).length, perLine = s => (SLACK * WIDTH) / (CHAR * s);
  return n / perLine(BASE) <= MAX_LINES ? BASE : (MAX_LINES * SLACK * WIDTH) / (n * CHAR);
}

// The black layer and its words (above the world and the overlay; below the master views and the sorter).
export function createInsightLayer(stage) {
  const el = document.createElement('div'), words = document.createElement('div');
  el.id = 'insight';
  words.className = 'insight-words';
  el.append(words);
  stage.append(el);
  let timer = null;
  // onCovered runs once the stage is fully black (at once when instant)
  function show(text, { instant = false, onCovered = null } = {}) {
    clearTimeout(timer);
    words.textContent = text;
    words.style.fontSize = `calc(var(--u) * ${insightSize(text)})`;
    el.classList.add('instant');
    el.classList.remove('on');
    void el.offsetWidth; // start from clear
    el.classList.toggle('instant', instant);
    el.classList.add('on');
    if (instant) onCovered?.();
    else timer = setTimeout(() => onCovered?.(), FADE_MS);
  }
  function hide() { clearTimeout(timer); el.classList.add('instant'); el.classList.remove('on'); }
  return { show, hide };
}

// The move. While the black fades in, the previous move's picture stays drawn under it (when we arrive from
// that move); once covered, the stage underneath is cleared so whatever comes next starts from black.
export function insightMove(ctx, id, words, prev = null) {
  let carry = false;
  const clearUnder = () => {
    carry = false;
    ctx.overlay.reset({ title: '', source: '' });
    ctx.allowOrbit = false;
    ctx.world.setTargets(new Map(), { duration: 0 });
    ctx.world.plates.set([], { duration: 0 });
    ctx.world.ground.set([], { opacity: 0, duration: 0 });
    ctx.world.setYRange(undefined, undefined, { duration: 0 });
    go(ctx, SHOTS.flat, 0, true);
  };
  return {
    id: `insight-${id}`,
    insight: true,
    enter(instant) {
      carry = !instant && !!prev && ctx.fromBeat === prev;
      ctx.insightLayer.show(words, { instant: instant || !carry, onCovered: clearUnder });
    },
    labels: () => (carry && prev.labels ? prev.labels() : []),
    draw: t => (carry && prev.draw ? prev.draw(1000 + t) : null),
  };
}
