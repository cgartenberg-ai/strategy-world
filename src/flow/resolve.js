// The running order: sections of modules, each module a run of moves. Pure, no DOM.
// The director sees one chapter per module; the nav and the slide sorter see the sections.

// Exact ids, or `prefix-*` for every move whose id starts with prefix- (in the order the app builds them).
export function expandMoves(patterns, ids, except = []) {
  const skip = new Set(except), out = [];
  for (const p of patterns) {
    const hits = p.endsWith('*') ? ids.filter(id => id.startsWith(p.slice(0, -1))) : ids.includes(p) ? [p] : [];
    for (const id of hits) if (!skip.has(id)) out.push(id);
  }
  return out;
}

// order: [{section, modules: [id, ...]}]; modules: {id: {title, moves, except, hide, prelude, card, hub}};
// registry: Map move id -> move (beat); makeCard(id, module) builds a title-card move;
// makeHub(id, module, k, items) builds the master view's move for its k-th showing.
//
// A master view (`hub: {items, end}`) expands to: overview, item 1, overview, item 2, ..., item n, overview
// (no final overview with end: false). Each overview after the first is hidden from the sorter; items record
// where they sit in their master view (inHub) and lose their "you are here", since the zoom replaces it.
// Show mode (opts.makePause): a black pause after every section (unless the section says pause: false), so the app
// waits there while the slides carry on, and the next click starts the next section.
// Punchlines (opts.makeInsight(id, words, lastMove)): a module with `insight` ends on that line.
export function resolveFlow(order, modules, registry, makeCard, makeHub = null, { makePause = null, makeInsight = null } = {}) {
  const ids = [...registry.keys()], scenes = [], sections = [], warnings = [];
  const beatsOf = (mid, m) => {
    if (m.card) return [makeCard(mid, m)].filter(Boolean);
    // hide: moves skipped, like hidden slides, once the patterns have expanded (a move hidden here still plays in any
    // other module that names it)
    const moves = expandMoves(m.moves || [], ids, m.except), hidden = new Set(m.hide || []);
    for (const id of hidden) if (!moves.includes(id)) warnings.push(`module "${mid}": hides "${id}", which is not one of its moves`);
    const beats = moves.filter(id => !hidden.has(id)).map(id => registry.get(id));
    if (m.insight && makeInsight && beats.length) beats.push(makeInsight(mid, m.insight, beats[beats.length - 1]));
    return beats;
  };
  for (const [si, s] of order.entries()) {
    const first = scenes.length, names = [];
    const add = sc => { scenes.push({ section: s.section, ...sc }); names.push(sc.id); };
    for (const mid of s.modules) {
      const m = modules[mid];
      if (!m) { warnings.push(`running order: no module "${mid}" (section "${s.section}")`); continue; }
      if (m.hub) {
        const items = [];
        for (const iid of m.hub.items) {
          const im = modules[iid];
          if (!im) { warnings.push(`master view "${mid}": no module "${iid}"`); continue; }
          const beats = beatsOf(iid, im);
          if (beats.length) items.push({ id: iid, title: im.title || iid, beats });
          else warnings.push(`module "${iid}" has no moves in this app`);
        }
        if (!items.length || !makeHub) { warnings.push(`master view "${mid}" has nothing to show`); continue; }
        const list = items.map(it => it.id), last = m.hub.end === false ? items.length - 1 : items.length;
        if (m.hub.preview) { // a look ahead: the tiles once, nothing lit as next, no items here to step through
          add({ id: mid, title: m.title || mid, prelude: null, hub: { id: mid, k: items.length, items: list },
            beats: [makeHub(mid, m, items.length, items)] });
          continue;
        }
        for (let k = 0; k <= last; k++) {
          add({ id: k ? `${mid}@${k}` : mid, title: m.title || mid, prelude: null, hidden: k > 0,
            hub: { id: mid, k, items: list }, beats: [makeHub(mid, m, k, items)] });
          if (k < items.length) add({ id: items[k].id, title: items[k].title, prelude: null, inHub: { id: mid, i: k }, beats: items[k].beats });
        }
        continue;
      }
      const beats = beatsOf(mid, m);
      if (!beats.length) { warnings.push(`module "${mid}" has no moves in this app`); continue; }
      add({ id: mid, title: m.title || mid, prelude: m.prelude || null, beats });
    }
    if (names.length && makePause && s.pause !== false) add({ id: `pause-${si}`, title: 'Pause', hidden: true, pause: true, beats: [makePause(si, s.section)] });
    if (names.length) sections.push({ name: s.section, first, modules: names });
  }
  return { scenes, sections, warnings };
}

// The first scene of the section with this name (links like /roadmap or ?section=six-questions): case, spaces and
// dashes don't matter. -1 when there is no such section.
export function sectionStart(sections, name) {
  const key = s => String(s || '').toLowerCase().replace(/[\s_-]+/g, '');
  const want = key(name);
  const s = want ? sections.find(x => key(x.name) === want) : null;
  return s ? s.first : -1;
}
