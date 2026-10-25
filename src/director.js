// Beat-by-beat state machine and the time-lapse clock. Pure.

export function createDirector(scenes) {
  let scene = 0, beat = 0, year = null, playing = false, stopAt = null;
  const listeners = [];

  const current = () => scenes[scene].beats[beat];
  const resetClock = () => {
    const tl = current().timelapse;
    year = tl ? tl.from : null;
    playing = false; stopAt = null;
  };
  const emit = () => listeners.forEach(fn => fn({ scene, beat }, current()));
  resetClock();

  return {
    state: () => ({ scene, beat }),
    current,
    scenes,
    // The clicker drives time-lapses too (most clickers have no Space key):
    // step time-lapses (clickSteps) move one stop per click; others play on the first click,
    // finish on a click mid-play, and only then hand over to the next move.
    next() {
      const tl = current().timelapse;
      if (tl && year !== null && year < tl.to - 1e-6) {
        if (tl.clickSteps) {
          if (playing && stopAt !== null) {                            // a click mid-move finishes it and rests there
            year = stopAt; playing = false; stopAt = null;
            return;
          }
          if (year < tl.to - 1e-6) {
            const i = Math.floor(year + 1e-6);
            year = Math.max(year, i + (tl.stepFrom ?? 0)); stopAt = Math.min(tl.to, i + 1); playing = true;
            return;
          }
        } else if (!playing) { playing = true; return; }
        else { year = tl.to; playing = false; return; }
      }
      if (beat < scenes[scene].beats.length - 1) beat++;
      else if (scene < scenes.length - 1) { scene++; beat = 0; }
      else return;
      resetClock(); emit();
    },
    back() {
      const tl = current().timelapse;
      if (tl && tl.clickSteps && year !== null && year > tl.from + 1e-6) {
        year = Math.max(tl.from, Math.ceil(year - 1e-6) - 1); playing = false; stopAt = null; return;
      }
      if (beat > 0) beat--;
      else if (scene > 0) { scene--; beat = scenes[scene].beats.length - 1; }
      else return;
      resetClock(); emit();
    },
    jump(i) {
      if (i < 0 || i >= scenes.length) return;
      scene = i; beat = 0; resetClock(); emit();
    },
    goto(sceneIndex, beatIndex = 0, { silent = false } = {}) {
      if (!scenes[sceneIndex] || !scenes[sceneIndex].beats[beatIndex]) return false;
      scene = sceneIndex; beat = beatIndex; resetClock();
      if (!silent) emit();
      return true;
    },
    find(beatId) {
      for (let s = 0; s < scenes.length; s++) {
        const b = scenes[s].beats.findIndex(x => x.id === beatId);
        if (b >= 0) return [s, b];
      }
      return null;
    },
    onChange(fn) { listeners.push(fn); },
    year: () => year,
    hasClock: () => year !== null,
    playing: () => playing,
    play() { if (year !== null) playing = true; },
    pause() { playing = false; },
    toggle() { if (year !== null) playing = !playing; },
    stepYear(d) {
      const tl = current().timelapse;
      if (!tl) return;
      year = Math.max(tl.from, Math.min(tl.to, Math.round(year) + d));
    },
    setYear(y) {
      const tl = current().timelapse;
      if (tl) year = Math.max(tl.from, Math.min(tl.to, tl.fromYear ? tl.fromYear(y) : y)); // clocks not in years map here
    },
    tick(dt, play = playing) {
      const tl = current().timelapse;
      if (!tl || !play) return;
      year = Math.min(tl.to, year + dt / tl.secondsPerYear);
      if (stopAt !== null && year >= stopAt) { year = stopAt; playing = false; stopAt = null; }
      if (year >= tl.to) playing = false;
    },
  };
}
