// The app's modules: named runs of moves you can put anywhere in running_order.json (app folder).
//   moves   move ids in order; `prefix-*` takes every move starting with prefix- (as the app builds them)
//   except  move ids to leave out of a pattern
//   hide    move ids not to play, like hidden slides in PowerPoint: they stay built (and play in any other module
//           that names them); take an id off the list to bring it back
//   prelude the "you are here" opening: key = a question (q1-q7) or a landscape stage
//           (conditions, creating, industry, position, rivals, real, results); label = text under the lit stage
//   card    a title card instead of moves: {text, sub}
// A move can sit in more than one module (Q5's coalition opens both the question and the value-capture concept).

// Each question's punchline: its last frame fades to black, then this line (src/insight.js). Edit the words here.
const INSIGHTS = {
  q1: 'Economic transformation and competition mean that the commanding heights keep changing hands',
  q2: 'Strategic thinking requires understanding industry context',
  q3: 'Strategic thinking also requires choosing a strong position within the industry',
  q4: 'Competition no longer stops at industry lines',
  q6: 'Management matters',
  q7: 'Competitive advantage fades, for the most part, after five years',
};

export const MODULES = {
  // ---- the frame ----
  landscape: { title: 'Landscape map', moves: ['map-stages', 'map-questions'] },
  close: { title: 'Loop and four questions', moves: ['map-loop', 'map-end'] },

  // ---- the six questions: data only (q6 and q7 are shown as Q5 and Q6) ----
  // Each opens on its question alone, big and centred, then the question in the header (its opening move, qN-ask:
  // src/scenes/ask.js), instead of a "you are here"; `qN-*` picks the opening up first (main.js registers it first).
  q1: { title: 'Q1 Commanding heights', moves: ['q1-*'], except: ['q1-fate'], insight: INSIGHTS.q1 },
  // set aside (24 Oct): what became of 1970's top ten; kept as an optional extra, in the 'everything' order only
  'q1-fate': { title: "Q1 extra: what became of 1970's top ten", moves: ['q1-fate'], prelude: { key: 'q1' } },
  q2: { title: 'Q2 Does industry matter?',
    moves: ['q2-ask', 'q2-scramble', 'q2-arrive', 'q2-color', 'q2-glide', 'q2-flat', 'q2-swings', 'q2-shifts'],
    hide: ['q2-shifts'], // the time trend plays under Stages (stage-environment) instead
    insight: INSIGHTS.q2 },
  q3: { title: 'Q3 Does position matter?',
    moves: ['q3-ask', 'q3-bars', 'q3-dots', 'q3-names', 'q3-spread', 'q3-zoom', 'q3-fin', 'q3-all', 'q3-share', 'q3-share-mp'],
    hide: ['q3-spread', 'q3-fin'], // the box plot; banks
    insight: INSIGHTS.q3 },
  q4: { title: 'Q4 Are industry lines blurring?', moves: ['q4-*'], insight: INSIGHTS.q4 },
  q5: { title: 'Who captures value? (the coalition)', moves: ['q5-coalition'], prelude: { key: 'q5' } },
  // Q5 follows the same two factories throughout: same feed, a free factory, inside (their management scores),
  // the crowd of plants, then the gap lit by what lines up with it
  q6: { title: 'Q5 Does management matter?', moves: ['q6-ask', 'q6-plants', 'q6-plants-free', 'q6-inside', 'q6-practices', 'q6-drivers'],
    hide: ['q6-drivers'], // the gap screen: Q5 goes from the crowd of plants to its punchline
    insight: INSIGHTS.q6 }, // between firms first; the within-firm split is the optional module below
  // set aside (25 Oct): the 90th vs 10th percentile plant in twelve industries; in the 'everything' order only
  'management-industries': { title: 'Q5 extra: twelve industries', moves: ['q6-industries'],
    prelude: { key: 'real', label: 'Twelve industries' } },
  'management-within': { title: 'Q5 extra: management within the same firm', moves: ['q6-within', 'q6-within-big'],
    prelude: { key: 'real', label: 'Within the same firm' } },
  // set aside (24 Oct): the India management experiment (Bloom et al. 2013); in the 'everything' order only
  'management-experiment': { title: 'Q5 extra: the management experiment', moves: ['q6-experiment'],
    prelude: { key: 'real', label: 'An experiment' } },
  q7: { title: 'Q6 Does advantage last?', moves: ['q7-*'], except: ['q7-threat', 'q7-all'],
    hide: ['q7-start', 'q7-collapse-1975', 'q7-trace-1975'], // the 1975 run: Q6 plays 2010 only
    insight: INSIGHTS.q7 }, // cohorts shown: see q7.js

  // ---- placeholders for parts that live outside the app (for now) ----
  tests: { title: 'Three tests', card: { text: 'Three tests', sub: 'External · Internal · Dynamic' } },
  'ryanair-exercise': { title: 'Ryanair exercise', card: { text: 'Ryanair', sub: 'Exercise' } },

  // ---- debrief ----
  southwest: { title: "Southwest's threat", moves: ['q7-threat'], prelude: { key: 'rivals', label: 'Rivals respond' } },
  'activity-system': { title: "Ryanair's activity system", moves: ['q6-system', 'q6-system-full', 'q6-copy', 'q6-pull'],
    prelude: { key: 'real', label: 'Activity systems' } },

  // ---- concepts ----
  'five-forces': { title: 'Five forces', moves: ['q2-forces-pick'], // opens on the bars: click an industry
    prelude: { key: 'industry', label: 'Five forces' } },
  'value-stick': { title: 'Value stick and added value',
    moves: ['q3-stick', 'q3-raise-wtp', 'q3-raise-price', 'q3-lower-cost', 'q3-wedge', 'q3-disappear'],
    prelude: { key: 'position', label: 'Added value' } },
  'cost-vs-differentiation': { title: 'Cost vs differentiation', moves: ['q3-sources'],
    prelude: { key: 'position', label: 'Cost or differentiation' } },
  positioning: { title: 'Best vs unique', moves: ['q3-best', 'q3-unique'], prelude: { key: 'position', label: 'Best or unique' } },
  'value-capture': { title: 'Who captures value', moves: ['q5-*'], prelude: { key: 'position', label: 'Who captures value' } },

  // ---- the old chapters' concept tails, for the "everything" order ----
  'q2-forces-all': { title: 'Q2 five forces', moves: ['q2-forces-air', 'q2-forces-bev', 'q2-one-force'] },
  'q3-concepts': { title: 'Q3 value stick to positioning', moves: ['q3-stick', 'q3-raise-wtp', 'q3-raise-price', 'q3-lower-cost',
    'q3-wedge', 'q3-disappear', 'q3-sources', 'q3-best', 'q3-unique'] },
  'q5-concepts': { title: 'Q5 stick and walk-aways', moves: ['q5-stick', 'q5-walkaway-*', 'q5-capture'] },
};
