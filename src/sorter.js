// The slide sorter (press O, or "All" in the bar): the running order at a glance. Sections are columns,
// modules are tiles, and each tile has one dot per move. Click a tile to start that module, a dot to open
// that move. O or Esc closes. The order itself lives in running_order.json.

export function createSorter({ stage, director, sections, onGo }) {
  const el = document.createElement('div');
  el.id = 'sorter';
  el.hidden = true;
  for (const t of ['pointerdown', 'pointerup', 'wheel']) el.addEventListener(t, e => e.stopPropagation());
  stage.append(el);

  const div = (cls, txt) => { const d = document.createElement('div'); d.className = cls; if (txt != null) d.textContent = txt; return d; };
  const go = (i, b) => { close(); onGo(i, b); };

  function render() {
    const { scene, beat } = director.state();
    el.replaceChildren();
    const grid = div('sorter-grid');
    for (const sec of sections) {
      const col = div('sorter-col');
      col.append(div('sorter-sec', sec.name));
      sec.modules.forEach((_, j) => {
        const i = sec.first + j, sc = director.scenes[i];
        if (sc.hidden) return; // a master view's return visits
        const tile = div(`sorter-tile${i === scene ? ' on' : ''}`);
        tile.append(div('sorter-title', sc.title));
        const dots = div('sorter-dots');
        sc.beats.forEach((b, k) => {
          const d = document.createElement('button');
          d.type = 'button';
          d.tabIndex = -1;
          d.className = `sorter-dot${i === scene && k === beat ? ' on' : ''}`;
          d.title = b.id;
          d.addEventListener('click', e => { e.stopPropagation(); go(i, k); });
          dots.append(d);
        });
        tile.append(dots);
        tile.addEventListener('click', () => go(i, 0));
        col.append(tile);
      });
      grid.append(col);
    }
    el.append(grid, div('sorter-hint', 'Click a module to start it, a dot to open that move · O to close'));
  }
  function open() { render(); el.hidden = false; }
  function close() { el.hidden = true; }
  return { open, close, toggle() { if (el.hidden) open(); else close(); }, isOpen: () => !el.hidden };
}
