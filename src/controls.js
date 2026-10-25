// Presenter controls. Clickers send PageDown/PageUp or arrows; many send "b" or "." for a black screen.

// Digit d opens the d-th tile of the master view you are on or inside (the roadmap's stages, say); anywhere
// else it opens question d (the six questions' d-th tile, else module qd). -1 when there is nothing to open.
export function sceneForDigit(scenes, cur, d) {
  const here = scenes[cur], view = here?.hub?.id || here?.inHub?.id;
  const tile = id => scenes.findIndex(s => s.inHub && s.inHub.id === id && s.inHub.i === d - 1);
  if (view) return tile(view);
  const q = tile('questions');
  return q >= 0 ? q : scenes.findIndex(s => s.id === `q${d}`);
}

export function bindControls({ stage, director, ctx, onReset, onJump = i => director.jump(i), nav = null, sorter = null, onZoomOut = null }) {
  const ids = director.scenes.map(s => s.id);
  const sceneFor = d => sceneForDigit(director.scenes, director.state().scene, d);
  // M opens the strategy roadmap (or, in an order without it, the old landscape map)
  const mapAt = ids.includes('roadmap') ? ids.indexOf('roadmap') : ids.indexOf('landscape');
  const black = document.createElement('div');
  Object.assign(black.style, { position: 'fixed', inset: '0', background: '#000', zIndex: 50 });
  black.hidden = true;
  document.body.append(black);

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (sorter && sorter.isOpen()) { // while the sorter is up, only O and Esc do anything
      if (k === 'Escape' || k === 'o' || k === 'O') { sorter.close(); e.preventDefault(); }
      return;
    }
    if ((k === 'o' || k === 'O') && sorter) { sorter.open(); return; }
    if (e.shiftKey && (k === 'ArrowRight' || k === 'ArrowLeft')) {
      director.pause(); director.stepYear(k === 'ArrowRight' ? 1 : -1); e.preventDefault(); return;
    }
    if (k === 'PageDown' || k === 'ArrowRight' || k === 'ArrowDown') { director.next(); e.preventDefault(); }
    else if (k === 'PageUp' || k === 'ArrowLeft' || k === 'ArrowUp') { director.back(); e.preventDefault(); }
    else if (k === ' ') {
      // Space plays a time-lapse through; on a build that should go one step at a time (spaceSteps), it steps
      if (director.hasClock() && !director.current().timelapse?.spaceSteps) director.toggle(); else director.next();
      e.preventDefault();
    }
    else if (/^[1-9]$/.test(k)) { const i = sceneFor(Number(k)); if (i >= 0) onJump(i); }
    else if ((k === 'n' || k === 'N') && nav) nav.toggle(); // hide or show the question bar
    else if ((k === 'z' || k === 'Z') && onZoomOut) onZoomOut(); // back out to the master view
    else if ((k === 't' || k === 'T') && ctx.hubLayer) ctx.hubLayer.toggleBacks(); // a master view's takeaways
    else if ((k === 'm' || k === 'M') && mapAt >= 0) onJump(mapAt);
    else if (k === 'Escape') onReset();
    else if (k === 'b' || k === 'B' || k === '.') black.hidden = !black.hidden;
  });

  // Interactive moves can take the pointer: beat.pointer({type, px, py, at}) returning true keeps it.
  const local = e => { const r = stage.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top;
    return { px, py, at: ctx.world.unproject(px, py) }; };
  const hand = (type, e) => { const b = director.current(); return b.pointer ? b.pointer({ type, ...local(e) }) : false; };
  let down = null;
  stage.addEventListener('pointerdown', e => {
    down = { x: e.clientX, y: e.clientY, moved: false, taken: !!hand('down', e) };
    if (down.taken) stage.setPointerCapture?.(e.pointerId);
  });
  addEventListener('pointermove', e => {
    if (down?.taken) { hand('drag', e); return; }
    if (!down) { const c = hand('hover', e); stage.style.cursor = c === 'grab' || c === 'pointer' ? c : ''; return; }
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) down.moved = true;
    if (down.moved && ctx.allowOrbit) {
      ctx.rig.nudge(dx * 0.15, dy * 0.12);
      down.x = e.clientX; down.y = e.clientY;
    }
  });
  addEventListener('pointerup', e => {
    if (down?.taken) { hand('up', e); down = null; return; }
    if (down && !down.moved) {
      const r = stage.getBoundingClientRect();
      const id = ctx.world.pick(e.clientX - r.left, e.clientY - r.top);
      if (id != null) {
        if (ctx.pins.has(id)) { ctx.pins.delete(id); ctx.card.hide(); }
        else { ctx.pins.add(id); ctx.card.show(id, ctx.cardExtra ? ctx.cardExtra(id) : {}); }
      } else ctx.card.hide();
    }
    down = null;
  });
  stage.addEventListener('wheel', e => {
    if (!ctx.allowOrbit) return;
    ctx.rig.nudge(0, 0, e.deltaY > 0 ? 1.05 : 0.95);
    e.preventDefault();
  }, { passive: false });
}
