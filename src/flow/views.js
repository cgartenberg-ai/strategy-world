// Master views: one screen showing every item of a section as a tile (a still of its opening picture).
// Click a tile, or the clicker, to zoom into that item's moves; the clicker zooms back out to the master
// view after each item's last move (press Z to zoom out any time). Used in running_order.json like modules.
//   hub.items   module ids, in order
//   hub.thumbs  tile pictures (made with tools/snapshot.js; a missing picture leaves a dark tile)
//   hub.end     false = no final return to the master view after the last item
//   hub.layout  'row' = every tile on one line (a sequence read left to right)
//   hub.numbered  true = tile labels numbered 1, 2, ...
//   hub.cards   true = big numbered text cards (the item titles) instead of pictures
//   hub.groups  brackets under the cards: [{label, from, to, color}] (tile indexes, inclusive)
//   hub.preview true = shown once, nothing to step through; hub.build true = each click adds the next card
//   hub.takeawaysAtEnd true = on its final showing (after the last item) the tiles flip to their takeaways by themselves

const pics = ids => Object.fromEntries(ids.map(id => [id, `assets/views/${id}.png`]));
const QS = ['q1', 'q2', 'q3', 'q4', 'q6', 'q7']; // six questions (q6, q7 shown as Q5, Q6)
const TESTS = ['test-external', 'test-internal', 'test-dynamic'];
// the three tests over the roadmap's stages: the first three external, the fourth internal, the last dynamic.
// The roadmap introduces them: each test's name and full question, one per click, after the five cards.
const TEST_GROUPS = [
  { label: 'External', from: 0, to: 2, color: '#66BFFF', name: 'External test',
    question: 'Is our strategy consistent with the external market opportunity?' },
  { label: 'Internal', from: 3, to: 3, color: '#FFC46B', name: 'Internal test', question: 'Is our strategy internally feasible?' },
  { label: 'Dynamic', from: 4, to: 4, color: '#FF6FB8', name: 'Dynamic test',
    question: 'Is our strategy resilient to change, when competitors respond or when external conditions change?' },
];
const STAGES = ['stage-industry', 'stage-environment', 'stage-position', 'stage-feasibility', 'stage-dynamics'];

export const VIEWS = {
  questions: { title: 'The strategy landscape', hub: { items: QS, thumbs: pics(QS), takeawaysAtEnd: true } },
  'three-tests': { title: 'Three tests', hub: { items: TESTS, thumbs: pics(TESTS) } },

  // the tests' detail views (src/scenes/tests.js)
  'test-external': { title: 'External', moves: ['test-external'] },
  'test-internal': { title: 'Internal', moves: ['test-internal'] },
  'test-dynamic': { title: 'Dynamic', moves: ['test-dynamic'] },

  // The concepts, as five stages read left to right, in her words; brackets mark which of the three tests each
  // serves. It first builds card by card right after the three tests (roadmap-intro); after the break (Ryanair is
  // in her slides) it returns, built, and each stage is entered in turn. Stages reuse moves built elsewhere
  // (a move can sit in more than one module); PESTEL's moves are src/scenes/pestel.js.
  roadmap: { title: 'The strategy roadmap', hub: { items: STAGES, layout: 'row', cards: true, groups: TEST_GROUPS } },
  // the build (it also introduces the three tests): black, then one card per click, then the External, Internal and
  // Dynamic tests, each colouring its cards (8 clicks); a mouse click on a card flips it to the stage's picture
  'roadmap-intro': { title: 'The strategy roadmap',
    hub: { items: STAGES, thumbs: pics(STAGES), layout: 'row', cards: true, groups: TEST_GROUPS, preview: true, build: true,
      flip: true } },
  // stage 1, scarcity across industries and ecosystems (src/scenes/industry.js): the five forces (the header alone,
  // then five boxes and her four messages: 9 clicks), the ecosystem (the coalition network, then her two callouts),
  // then four questions that lead into PESTEL. Hidden, still listed: the industry bars, the regroup, and the coalition's
  // own moves (the value created, the walk-aways, "Scarcity, not size"), which she uses in other classes
  'stage-industry': { title: 'Understand the industry and ecosystem context',
    moves: ['industry-forces', 'q2-forces-pick', 'q4-industries', 'q5-coalition', 'q5-stick', 'q5-walkaway-ai',
      'q5-walkaway-software', 'q5-walkaway-dealers', 'q5-walkaway-deere', 'q5-capture', 'industry-ecosystem',
      'industry-questions'],
    hide: ['q2-forces-pick', 'q4-industries', 'q5-coalition', 'q5-stick', 'q5-walkaway-ai', 'q5-walkaway-software',
      'q5-walkaway-dealers', 'q5-walkaway-deere', 'q5-capture'] },
  'stage-environment': { title: 'Scan the environment',
    moves: ['pestel-lenses', 'q2-shifts', 'pestel-shifts', 'pestel-forces', 'pestel-bottleneck'],
    hide: ['q2-shifts', 'pestel-shifts', 'pestel-forces', 'pestel-bottleneck'] }, // PESTEL only: she speaks to the rest
  // stage 3 (src/scenes/position.js): black with the header, positioning means deciding (the heading, four lines), added
  // value (the claim, its definition), three airlines (Aer Lingus alone, BA, Ryanair), then the landscape of customer
  // tastes (it rises, three airlines land, "Best for whom?"): 15 clicks. The old value-stick moves stay listed, hidden,
  // each where it would play if brought back. Who captures value (q5-*) now plays in stage 1.
  'stage-position': { title: 'Assess position within context',
    moves: ['position-deciding', 'position-added-value', 'q3-stick', 'q3-raise-wtp', 'q3-raise-price', 'q3-lower-cost',
      'q3-wedge', 'q3-disappear', 'q3-sources', 'position-airlines', 'position-landscape', 'q3-best', 'q3-unique'],
    hide: ['q3-stick', 'q3-raise-wtp', 'q3-raise-price', 'q3-lower-cost', 'q3-wedge', 'q3-disappear', 'q3-sources',
      'q3-best', 'q3-unique'] },
  // stage 4 (src/scenes/feasibility.js), Ryanair's activity system, under her short question: black, Ryanair at launch
  // (its pillars, then their clashes), then at relaunch, the map built as her slides build it (7 clicks); then Q5's
  // old pull and copy (src/scenes/q6.js; hide either here to drop it), and Ryanair today (the ranking) last. The old
  // system moves stay listed, hidden (they still play in the 'everything' order).
  'stage-feasibility': { title: 'Assess feasibility of position',
    moves: ['q6-system', 'q6-system-full', 'feasibility-map', 'q6-pull', 'q6-copy', 'feasibility-ranking'],
    hide: ['q6-system', 'q6-system-full'] },
  // stage 5 (src/scenes/dynamics.js), Ryanair (A) vs (C): opens on the header alone, then fares and costs per seat
  // (6 clicks), the game tree (1986, then relaunched: 5 states), the tailwind: 13 clicks out to the final overview.
  // The old 2x2, Southwest's threat (it still plays in the 'everything' order) and the cohorts stay listed, hidden.
  'stage-dynamics': { title: 'Consider sustainability of position over time',
    moves: ['dynamics-respond', 'dynamics-fight', 'dynamics-tree', 'dynamics-tailwind', 'q7-threat', 'q7-all', 'strategy-close'],
    hide: ['dynamics-respond', 'q7-threat', 'q7-all'] }, // strategy-close: her "Strategy" slide closes the morning (src/scenes/closing.js)
};
