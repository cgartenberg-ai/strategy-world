// A quiet bar in the top-right corner: one button per section of the running order (a click starts the
// section's first module) and "All", which opens the slide sorter. Hovering a section lists its modules.

export function createNav({ stage, director, sections, onJump, onOverview = null }) {
  const el = document.createElement('nav');
  el.id = 'nav';
  const make = (label, title, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1; // never keeps focus, so Space still plays the time-lapse
    b.textContent = label;
    b.title = title;
    b.addEventListener('click', () => { onClick(); b.blur(); });
    el.append(b);
    return b;
  };
  const titleOf = id => director.scenes.find(s => s.id === id)?.title || id;
  const buttons = sections.map(sec => [make(sec.name, sec.modules.map(titleOf).join(' · '), () => onJump(sec.first)), sec]);
  if (onOverview) make('All', 'Every module (O)', onOverview).classList.add('all');
  // clicks on the bar must not pin a firm underneath it
  for (const t of ['pointerdown', 'pointerup']) el.addEventListener(t, e => e.stopPropagation());
  stage.append(el);

  const mark = () => {
    const s = director.state().scene;
    for (const [b, sec] of buttons) b.classList.toggle('on', s >= sec.first && s < sec.first + sec.modules.length);
  };
  director.onChange(mark);
  mark();
  return { el, toggle() { el.hidden = !el.hidden; }, hide() { el.hidden = true; } };
}
