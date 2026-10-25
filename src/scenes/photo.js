// Photographs in a move: one picture on black, filling the stage, fading in with a very slow push-in (Ken Burns),
// under the move's title and one short caption. Q4 uses it for the original Deere and the farm's mission control.
//
// The layer is a div (#photos) put first inside #overlay, so the drawings, labels and words sit on top of it.
// Every move calls ctx.overlay.reset() first; the layer hooks that call (once, when the first photo is shown), so
// whatever photo is up fades out as the next move begins (at once when that move is entered instantly) and never
// lingers. Opacity and push-in are pure functions of the move's clock, so export mode settles them at once.
// Pictures are plain <img> elements sized in pixels (not object-fit), so tools/snapshot.js draws them as shown.

import { ramp } from '../anim.js';

export const PHOTO = {
  delay: 0.2, fade: 1.6,     // seconds: the picture comes up out of black
  push: 0.06, pushS: 30,     // the push-in: 6% larger over 30 seconds, easing in and out
  outS: 0.5,                 // the fade when the next move begins
  captionAt: 1.4,            // the caption arrives as the picture settles
  carryS: 0.7,               // the previous move's picture fades out over this, as the photo comes up
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// The box (stage pixels) that makes a w x h picture cover a W x H stage, centred on focus ([0..1, 0..1] across
// the picture) as far as the picture's edges allow.
export function coverBox(w, h, W, H, focus = [0.5, 0.5]) {
  const s = Math.max(W / w, H / h), bw = w * s, bh = h * s;
  return { x: clamp(W / 2 - focus[0] * bw, W - bw, 0), y: clamp(H / 2 - focus[1] * bh, H - bh, 0), w: bw, h: bh };
}

// For a screenshot too small to fill the stage sharply: the box (stage pixels) that shows it whole, in its own
// shape, inside maxW x maxH of the stage, centred across and a little below the middle (clear of the title).
export function frameBox(w, h, W, H, { maxW = 0.74, maxH = 0.64, cy = 0.53 } = {}) {
  const s = Math.min((maxW * W) / w, (maxH * H) / h), bw = w * s, bh = h * s;
  return { x: (W - bw) / 2, y: cy * H - bh / 2, w: bw, h: bh };
}

// Opacity and scale t seconds into the move.
export function photoState(t, P = PHOTO) {
  return { o: ramp(t, P.delay, P.fade, 'inOutSine'), k: 1 + P.push * ramp(t, 0, P.pushS, 'inOutSine') };
}

// Shapes with their opacity scaled by f (the previous move's picture, fading out).
export const fadeShapes = (shapes, f) => (!shapes || f <= 0.003 ? null
  : f >= 1 ? shapes : shapes.map(s => (s ? { ...s, o: (s.o ?? 1) * f } : s)));

// Dark bands at the top (under the title) and bottom (under the caption and source line).
const SHADE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" preserveAspectRatio="none">'
  + '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
  + '<stop offset="0" stop-color="#000" stop-opacity="0.85"/><stop offset="0.16" stop-color="#000" stop-opacity="0.55"/>'
  + '<stop offset="0.34" stop-color="#000" stop-opacity="0"/><stop offset="0.64" stop-color="#000" stop-opacity="0"/>'
  + '<stop offset="0.86" stop-color="#000" stop-opacity="0.5"/><stop offset="1" stop-color="#000" stop-opacity="0.8"/>'
  + '</linearGradient><rect width="1600" height="900" fill="url(#g)"/></svg>')}`;

const NOOP = { show: () => ({ at() {} }), clear() {} };
const kept = []; // preloaded pictures (held so the browser keeps them)

// Start loading pictures early, so the first showing does not wait on the file.
export function preloadPhotos(srcs) {
  if (typeof Image === 'undefined') return;
  for (const s of srcs) { const im = new Image(); im.decoding = 'async'; im.src = s; kept.push(im); }
}

// The layer (one per app, kept on ctx); a no-op without a page (the unit tests).
export function photoLayer(ctx) {
  if (ctx.photoLayer) return ctx.photoLayer;
  const host = typeof document === 'undefined' ? null : document.getElementById('overlay');
  if (!host) return (ctx.photoLayer = NOOP);
  const root = document.createElement('div');
  root.id = 'photos';
  Object.assign(root.style, { position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none' });
  host.prepend(root);
  let up = []; // photos on screen: {el, gone}

  function clear({ instant = false } = {}) {
    for (const p of up) {
      p.gone = true;
      if (instant) { p.el.remove(); continue; }
      p.el.style.transition = `opacity ${PHOTO.outS}s ease`;
      p.el.style.opacity = '0';
      setTimeout(() => p.el.remove(), PHOTO.outS * 1000 + 80);
    }
    up = [];
  }

  // A picture, transparent until the move's clock brings it up; returns {at(t)} for the move's tick.
  // fit: 'cover' fills the stage (photographs); 'frame' shows a screenshot whole, framed on black (frameBox).
  function show(src, { focus = [0.5, 0.5], fit = 'cover' } = {}) {
    const framed = fit === 'frame';
    const el = document.createElement('div'), pic = new Image(), shade = new Image();
    Object.assign(el.style, { position: 'absolute', inset: '0', opacity: '0' });
    el.className = 'photo';
    pic.decoding = 'async'; pic.alt = ''; pic.draggable = false;
    pic.style.position = 'absolute';
    pic.style.transformOrigin = framed ? '50% 50%' : `${focus[0] * 100}% ${focus[1] * 100}%`;
    if (framed) Object.assign(pic.style, { boxSizing: 'border-box', border: '1px solid #3a3a3a', borderRadius: '4px',
      boxShadow: '0 0 40px rgba(120, 200, 255, 0.10)' });
    pic.onerror = () => pic.remove(); // a missing file leaves black under the words
    pic.src = src;
    shade.alt = ''; shade.src = SHADE;
    Object.assign(shade.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%' });
    el.append(pic);
    if (!framed) el.append(shade); // a framed screenshot sits on black: no bands needed
    root.append(el);
    const p = { el, gone: false };
    up.push(p);
    let last = '';
    return {
      at(t) {
        if (p.gone) return;
        const st = photoState(t), o = st.o, k = framed ? 1 + (st.k - 1) / 3 : st.k; // a framed one barely pushes in
        const ov = String(Math.round(o * 1000) / 1000);
        if (el.style.opacity !== ov) el.style.opacity = ov;
        if (!pic.isConnected || !pic.naturalWidth) return;
        const b = (framed ? frameBox : coverBox)(pic.naturalWidth, pic.naturalHeight, root.clientWidth, root.clientHeight,
          ...(framed ? [] : [focus]));
        const key = `${b.x}|${b.y}|${b.w}|${b.h}|${k}`;
        if (key === last) return;
        last = key;
        Object.assign(pic.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`,
          transform: `scale(${k})` });
      },
    };
  }

  const layer = { show, clear };
  const reset = ctx.overlay.reset;
  ctx.overlay.reset = (...args) => { clear({ instant: !!ctx.instant }); return reset.apply(ctx.overlay, args); };
  return (ctx.photoLayer = layer);
}

// A move that shows one photo.
//   setup(instant)  the scene's own set-up: title, source line (the photo's credit), world cleared; it calls
//                   ctx.overlay.reset, which also fades out any photo still up
//   caption         one short line (overlay caption), arriving as the picture settles
//   focus           the point of the picture kept centred, [0..1, 0..1]
//   carry(fromId)   optional: a function drawing the previous move's last picture (to fade out as the photo comes
//                   up), or null; called on entry with the id of the move that was on screen
export function photoMove(ctx, { id, src, caption = '', focus = [0.5, 0.5], fit = 'cover', setup, carry = null }) {
  let shown = null, captioned = false, under = null;
  return {
    id,
    photo: src,
    enter(instant) {
      setup(instant);
      under = !instant && carry ? carry(ctx.fromBeat?.id) : null;
      shown = photoLayer(ctx).show(src, { focus, fit });
      captioned = !!instant || !caption;
      if (instant && caption) ctx.overlay.caption(caption);
    },
    tick(now) {
      const t = (now - ctx.t0) / 1000;
      if (shown) shown.at(t);
      if (!captioned && t >= PHOTO.captionAt) { captioned = true; ctx.overlay.caption(caption); }
    },
    draw: t => (under && t < PHOTO.carryS ? fadeShapes(under(), 1 - ramp(t, 0, PHOTO.carryS)) : null),
  };
}
