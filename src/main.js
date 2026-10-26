// Boot: load data, build the world, run the director.
// URL options: ?scene=q2 (a module)  ?beat=q3-zoom  ?year=1999  ?order=everything  ?export=1 (settle instantly, then title = "ready")
//              ?show=1  presenting beside PowerPoint: a black pause after each section, no bar, the cursor hides when idle
// The running order (sections of modules) comes from running_order.json; modules are defined in src/flow/modules.js.

import { loadBundles, buildIndex } from './data.js';
import { World } from './world.js';
import { Rig } from './camera.js';
import { SHOTS } from './rigmath.js';
import { createOverlay } from './overlay.js';
import { createCard } from './card.js';
import { createDirector } from './director.js';
import { bindControls } from './controls.js';
import { createNav } from './nav.js';
import { createSorter } from './sorter.js';
import { resolveFlow, sectionStart } from './flow/resolve.js';
import { MODULES } from './flow/modules.js';
import { titleCard, blackPause } from './scenes/cards.js';
import { VIEWS } from './flow/views.js';
import { createHubLayer, hubMove } from './hub.js';
import { createInsightLayer, insightMove } from './insight.js';
import { createAskLayer, askMoves } from './scenes/ask.js';
import { testsScene } from './scenes/tests.js';
import { pestelScene } from './scenes/pestel.js';
import { q1Scene } from './scenes/q1.js';
import { q2Scene } from './scenes/q2.js';
import { q3Scene } from './scenes/q3.js';
import { q7Scene } from './scenes/q7.js';
import { q4Scene } from './scenes/q4.js';
import { q5Scene } from './scenes/q5.js';
import { q6Scene } from './scenes/q6.js';
import { mapScene } from './scenes/map.js';
import { q2Concepts } from './scenes/q2concepts.js';
import { q3Concepts } from './scenes/q3concepts.js';
import { q7Concepts } from './scenes/q7concepts.js';
import { preludeShapes, PRELUDE_SECONDS } from './concepts/prelude.js';

const params = new URLSearchParams(location.search);

// running_order.json: {use, orders: {name: [{section, modules}]}}; null if it can't be read
async function loadRunningOrder() {
  try {
    const r = await fetch('running_order.json', { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
const stage = document.getElementById('stage');
let world = null;

function layoutStage() {
  const W = innerWidth, H = innerHeight;
  let w = W, h = (W * 9) / 16;
  if (h > H) { h = H; w = (H * 16) / 9; }
  Object.assign(stage.style, { width: `${w}px`, height: `${h}px`, left: `${(W - w) / 2}px`, top: `${(H - h) / 2}px` });
  stage.style.setProperty('--u', `${h / 100}px`);
  if (world) world.setSize(w, h, Math.min(devicePixelRatio || 1, 2));
}

async function boot() {
  const data = await loadBundles();
  const index = buildIndex(data);
  world = new World(document.getElementById('gl'), index.ids);
  layoutStage();
  addEventListener('resize', layoutStage);

  const rig = new Rig(world.camera);
  rig.set(SHOTS.flat);
  const overlay = createOverlay(stage, world);
  const card = createCard(document.getElementById('card'), index);
  const ctx = {
    data, index, world, rig, overlay, card, pins: new Set(),
    core: (data.cast.core || []).map(c => c.permco), cast: data.cast,
    instant: false, allowOrbit: false, cardExtra: null, t0: performance.now(),
  };
  // Every move the app can show, built by the scene files (the old chapter order, which `everything` keeps).
  const withMore = (scene, more) => { scene.beats.push(...more(ctx)); return scene; };
  const land = mapScene(ctx);
  const opening = { id: 'map', beats: land.beats.slice(0, 2) }, closing = { id: 'end', beats: land.beats.slice(2) };
  const built = [opening, q1Scene(ctx), withMore(q2Scene(ctx), q2Concepts), withMore(q3Scene(ctx), q3Concepts),
    q4Scene(ctx), q5Scene(ctx), q6Scene(ctx), withMore(q7Scene(ctx), q7Concepts), closing, testsScene(ctx), pestelScene(ctx)];
  // each question's opening (its words alone, then in the header: src/scenes/ask.js) goes in first, so a module's
  // `q1-*` takes it before the question's own moves
  const registry = new Map(askMoves(ctx).map(b => [b.id, b]));
  for (const sc of built) for (const b of sc.beats) if (!registry.has(b.id)) registry.set(b.id, b);
  // The running order puts modules (named runs of moves) into sections; the director plays one chapter per module.
  const RO = await loadRunningOrder();
  const order = RO && (RO.orders[params.get('order')] || RO.orders[RO.use]);
  const makeHub = (id, m, k, items) => hubMove(ctx, { id, title: m.title, items, k, thumbs: m.hub.thumbs || {} });
  const showMode = params.has('show');
  const flow = order ? resolveFlow(order, { ...MODULES, ...VIEWS }, registry, (id, m) => titleCard(ctx, id, m.card), makeHub,
    { makePause: showMode ? si => blackPause(ctx, si) : null, makeInsight: (id, words, prev) => insightMove(ctx, id, words, prev) })
    : { scenes: built.map(sc => ({ ...sc, title: sc.id, section: 'All' })), sections: [{ name: 'All', first: 0, modules: built.map(sc => sc.id) }],
      warnings: ['running_order.json could not be read: playing every move in the built-in order'] };
  for (const w of flow.warnings) console.warn(w);
  const scenes = flow.scenes;
  const director = createDirector(scenes);
  ctx.director = director;
  ctx.flow = flow;
  // master views: their tiles, which items have been opened, and where we came from (for the zoom)
  ctx.hubLayer = createHubLayer(stage);
  ctx.insightLayer = createInsightLayer(stage); // the questions' punchlines (src/insight.js)
  ctx.askLayer = createAskLayer(stage); // the questions' openings (src/scenes/ask.js)
  ctx.visited = new Set();
  ctx.prevScene = null;
  // The "Test data" tag shows only on modules whose bundles are synthetic (moves are named after their question).
  const PREFIX_BUNDLES = { q1: ['q1_heights'], q2: ['q2q3_landscape'], q3: ['q2q3_landscape', 'q3_financials'],
    q7: ['q7_cohorts'] };
  const banner = document.getElementById('banner');
  const setBanner = () => {
    const sc = scenes[director.state().scene];
    const names = new Set(sc.beats.flatMap(b => PREFIX_BUNDLES[String(b.id).split('-')[0]] || []));
    banner.hidden = ![...names].some(n => data.bundleMeta[n]?.synthetic !== false);
  };

  const enter = (instant = false) => {
    setBanner();
    card.hide();
    ctx.instant = instant;
    ctx.cardExtra = null;
    ctx.t0 = instant ? -1e9 : performance.now(); // beat clock: seconds since this move began
    const b = director.current();
    ctx.fromBeat = ctx.shownBeat ?? null; // the move on screen before this one (a punchline fades out of it)
    ctx.shownBeat = b;
    if (!b.insight) ctx.insightLayer.hide();
    if (!b.ask) ctx.askLayer.hide();
    b.enter(instant);
    ctx.instant = false;
  };
  // entering a chapter at its first move: a short "you are here" on the landscape
  let lastScene = director.state().scene;
  director.onChange(() => {
    const st = director.state(), sc = scenes[st.scene], moved = st.scene !== lastScene, prev = moved ? scenes[lastScene] : null;
    const pl = sc.prelude; // entering a module at its first move: its "you are here"
    if (moved && st.beat === 0 && pl && !sc.beats[0].blank) ctx.prelude = { key: pl.key, label: pl.label ?? null, start: performance.now() };
    else ctx.prelude = null;
    ctx.prevScene = prev;
    if (sc.inHub) ctx.visited.add(sc.id);
    // from a master view into one of its items: that tile zooms to fill the screen; anywhere else, the tiles go
    // (the move under the tile starts settled, so the tile's picture dissolves straight into it)
    const zoomIn = prev?.hub && sc.inHub?.id === prev.hub.id && st.beat === 0 && ctx.hubLayer.active();
    if (zoomIn) ctx.hubLayer.zoomIn(sc.inHub.i);
    else if (!sc.hub) ctx.hubLayer.clear();
    lastScene = st.scene;
    enter(!!zoomIn);
  });

  const exporting = params.has('export');
  if (params.get('beat')) {
    const f = director.find(params.get('beat'));
    if (f) director.goto(f[0], f[1], { silent: true });
  } else if (params.get('scene')) {
    const s = scenes.findIndex(x => x.id === params.get('scene'));
    if (s >= 0) director.goto(s, 0, { silent: true });
  } else if (params.get('section')) { // ?section=roadmap (the /roadmap, /stages, /questions links): open that section
    const s = sectionStart(flow.sections, params.get('section'));
    if (s >= 0) director.goto(s, 0, { silent: true });
  }
  lastScene = director.state().scene; // so the first click after a ?beat= link still zooms from a master view
  if (scenes[director.state().scene].inHub) ctx.visited.add(scenes[director.state().scene].id);
  enter(exporting);
  if (params.get('year')) director.setYear(Number(params.get('year')));

  // restart a question from its first beat, clearing pins and the card
  const jumpTo = i => { ctx.pins.clear(); card.hide(); director.jump(i); };
  const goTo = (i, b) => { ctx.pins.clear(); card.hide(); director.goto(i, b); };
  ctx.goToModule = id => { const i = scenes.findIndex(s => s.id === id); if (i >= 0) goTo(i, 0); };
  // Z: from inside an item, zoom back out to its master view (the showing that follows it)
  const zoomOut = () => {
    const sc = scenes[director.state().scene];
    if (!sc.inHub) return;
    const at = k => scenes.findIndex(s => s.hub && s.hub.id === sc.inHub.id && s.hub.k === k);
    const i = at(sc.inHub.i + 1) >= 0 ? at(sc.inHub.i + 1) : at(sc.inHub.i);
    if (i >= 0) goTo(i, 0);
  };
  const sorter = createSorter({ stage, director, sections: flow.sections, onGo: goTo });
  const nav = createNav({ stage, director, sections: flow.sections, onJump: jumpTo, onOverview: () => sorter.toggle() });
  if (exporting) nav.hide();
  if (showMode) nav.el.classList.add('peek'); // invisible until the pointer reaches the top-right corner (N toggles it)
  if (showMode) { // hide the pointer after two quiet seconds; any movement brings it back
    let idle = null;
    const wake = () => { stage.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => stage.classList.add('idle'), 2000); };
    addEventListener('pointermove', wake); wake();
  }
  bindControls({ stage, director, ctx, nav, sorter, onJump: jumpTo, onZoomOut: zoomOut,
    onReset: () => { ctx.pins.clear(); ctx.prevScene = null; enter(false); } });

  let last = performance.now(), frames = 0, t0 = last, settled = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const beat = director.current();
    director.tick(dt);
    if (beat.frame && director.hasClock()) beat.frame(director.year());
    if (beat.tick) beat.tick(now); // beats with their own short animations
    world.update(now);
    rig.update(now);
    const pre = ctx.prelude && (now - ctx.prelude.start) / 1000 < PRELUDE_SECONDS ? ctx.prelude : null;
    overlay.labels(beat.labels && !(pre && now - pre.start < 1300) ? beat.labels() : []);
    overlay.side(beat.side ? beat.side() : null);
    const drawn = beat.draw ? beat.draw((now - ctx.t0) / 1000) : null; // concept drawings
    overlay.shapes(pre ? (drawn || []).concat(preludeShapes(pre.key, (now - pre.start) / 1000, pre.label)) : drawn);
    overlay.update();
    world.render();
    frames++;
    if (now - t0 > 5000) { window.__fps = (frames * 1000) / (now - t0); frames = 0; t0 = now; }
    if (exporting) {
      settled = world.busy() || rig.busy() ? 0 : settled + 1;
      if (settled === 20) document.title = 'ready';
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.__app = { director, world, rig, ctx };
}

boot().catch(err => {
  document.body.innerHTML = `<pre style="color:#fff;padding:2em;font:16px Helvetica">${String(err.stack || err)}</pre>`;
  console.error(err);
});
