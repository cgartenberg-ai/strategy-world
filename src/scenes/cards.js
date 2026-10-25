// A title card: black screen, one line and a grey sub-line. Stands in for parts of the morning that run
// outside the app (the three tests, the Ryanair exercise) so the running order and the clicker stay in step.

import { text } from '../concepts/kit.js';
import { ramp } from '../anim.js';
import { SHOTS } from '../rigmath.js';
import { go, dur } from './common.js';

// A black pause (show mode): where the app waits between sections while the slides carry on.
export function blackPause(ctx, id) {
  return {
    id: `pause-${id}`,
    enter(instant) {
      ctx.overlay.reset({ title: '', source: '' });
      ctx.allowOrbit = false;
      ctx.world.setTargets(new Map(), { duration: dur(ctx, 500) });
      ctx.world.plates.set([], { duration: dur(ctx, 500) });
      ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 500) });
      ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 500) });
      go(ctx, SHOTS.flat, 600, instant);
    },
  };
}

export function titleCard(ctx, id, { text: words, sub = '' }) {
  return {
    id: `card-${id}`,
    enter(instant) {
      ctx.overlay.reset({ title: '', source: '' });
      ctx.allowOrbit = false;
      ctx.world.setTargets(new Map(), { duration: dur(ctx, 700) });
      ctx.world.plates.set([], { duration: dur(ctx, 700) });
      ctx.world.ground.set([], { opacity: 0, duration: dur(ctx, 700) });
      ctx.world.setYRange(undefined, undefined, { duration: dur(ctx, 700) });
      go(ctx, SHOTS.flat, 900, instant);
    },
    draw: t => [
      text(words, [0, 0.35], { size: 6, weight: 500, o: ramp(t, 0.2, 0.8) }),
      sub ? text(sub, [0, -0.5], { size: 2.4, color: '#8A8A8A', o: ramp(t, 0.5, 0.8) }) : null,
    ].filter(Boolean),
  };
}
