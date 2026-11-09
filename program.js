/* ── gym program data + pure helpers ────────────────────────────────────────
   No DOM, no global state. Works as a browser global (window.Gym) and as a
   Node module (module.exports) so node:test can import it without a build.   */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.Gym = root.Gym || {}; Object.assign(root.Gym, factory()); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ── program data — unchanged from the original tool ─────────────────── */
  var DAYS = {
    fri: { label: "Friday — Push + Quads", ex: [
      { n: "Smith squat", s: 3, r: 6, top: 6, load: 60, step: 2.5, rest: 180, rir: 2, cue: "Bar over mid-foot, heels flat." },
      { n: "Smith incline press", s: 3, r: 6, top: 6, load: 50, step: 2.5, rest: 120, rir: 2, cue: "Bench ~30°. Bar to upper chest." },
      { n: "Bulgarian split squat", s: 3, r: 8, top: 8, load: 25, step: 2.5, rest: 120, rir: 2, cue: "Per leg. Upright = more quad." },
      { n: "Incline DB press", s: 3, r: 7, top: 8, load: 52.5, step: 2.5, rest: 120, rir: 2, cue: "Lower to a stretch, don't drift wide." },
      { n: "Pec deck fly", s: 3, r: 8, top: 10, load: 100, step: 5, rest: 90, rir: 1, partial: 1, cue: "Handles at mid-chest, elbows fixed." },
      { n: "Leg extension", s: 3, r: 12, top: 15, load: null, step: 2.5, rest: 90, rir: 1, partial: 1, cue: "Start light, log the stack." },
      { n: "Cable lateral raise", s: 3, r: 10, top: 12, load: 10, step: 1, rest: 90, rir: 1, partial: 1, cue: "Per side. Arm across body, lead with elbow." },
      { n: "Weighted dip", s: 3, r: 6, top: 8, load: 0, step: 2.5, rest: 120, rir: 2, cue: "Lean forward, comfortable depth." }
    ] },
    sat: { label: "Saturday — Pull + Hinge", ex: [
      { n: "MTS front pulldown", s: 3, r: 7, top: 9, load: 90, step: 5, rest: 120, rir: 2, cue: "Elbows to ribs. Full stretch at top." },
      { n: "Cable RDL", s: 3, r: 8, top: 8, load: 120, step: 5, rest: 150, rir: 2, cue: "Hips back, stop when stretch stops you." },
      { n: "T-bar row", s: 3, r: 8, top: 8, load: 75, step: 5, rest: 120, rir: 2, cue: "25+25+25. Chest-supported if you can." },
      { n: "Seated leg curl", s: 3, r: 9, top: 11, load: 130, step: 5, rest: 90, rir: 1, cue: "Lean back for hard sets." },
      { n: "Bayesian curl", s: 3, r: 8, top: 10, load: 13, step: 1, rest: 90, rir: 1, partial: 1, cue: "Arm behind body, elbow fixed." },
      { n: "Preacher curl", s: 3, r: 6, top: 6, load: 25, step: 2.5, rest: 90, rir: 1, partial: 1, cue: "Per side. Don't cut the bottom." },
      { n: "Rear delt crossover", s: 3, r: 12, top: 14, load: 10, step: 1, rest: 90, rir: 1, cue: "Sweep back, squeeze, slow return." },
      { n: "Standing calf raise", s: 3, r: 12, top: 15, load: null, step: 5, rest: 90, rir: 0, partial: 1, cue: "Pause 1s in the stretch. No bounce." }
    ] },
    sun: { label: "Sunday — Light / Machines", ex: [
      { n: "Leg press / Hack squat", s: 3, r: 6, top: 8, load: 180, step: 5, rest: 150, rir: 2, cue: "45×4 plates. Full depth, back stays down." },
      { n: "Pull-ups", s: 3, r: 6, top: 6, load: 0, step: 2.5, rest: 120, rir: 2, cue: "Bodyweight. Under 5 reps? Use pulldown." },
      { n: "Machine overhead press", s: 3, r: 7, top: 9, load: 80, step: 5, rest: 120, rir: 2, cue: "Only overhead press this week." },
      { n: "Cable fly", s: 3, r: 12, top: 15, load: null, step: 2.5, rest: 90, rir: 1, partial: 1, cue: "Soft elbows, full stretch on return." },
      { n: "Machine seated row", s: 3, r: 8, top: 8, load: 130, step: 5, rest: 120, rir: 2, cue: "Chest-supported. Pull to ribs." },
      { n: "Lateral raise ↔ Reverse pec deck", s: 3, r: 10, top: 12, load: 70, step: 5, rest: 120, rir: 1, partial: 1, cue: "Superset. Lateral 70, then pec deck ×12. One rest after pair." },
      { n: "Overhead cable extension", s: 3, r: 12, top: 15, load: null, step: 2.5, rest: 90, rir: 1, partial: 1, cue: "Elbows by head, lower behind head." },
      { n: "Standing calf raise", s: 3, r: 15, top: 20, load: null, step: 5, rest: 90, rir: 0, partial: 1, cue: "Pause 1s in stretch. Alt weeks: hip abduction 2×12 · 205." }
    ] }
  };

  /* named model constants (were magic numbers 50 / 60 in dayMins) */
  var SET_SECS = 50, TRANSITION_SECS = 60;

  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function round2(n) { return Math.round(n * 100) / 100; }

  function dayMins(d) {
    var t = 0, list = DAYS[d].ex;
    for (var i = 0; i < list.length; i++) { var e = list[i]; t += e.s * SET_SECS + e.s * e.rest; }
    t += (list.length - 1) * TRANSITION_SECS;
    return Math.round(t / 60);
  }

  /* pure: state is passed in, not read from a global */
  function dayMinsLeft(d, state) {
    var t = 0, liftsLeft = 0, list = DAYS[d].ex;
    for (var i = 0; i < list.length; i++) {
      var e = list[i], rec = state && state[d + ":" + i];
      var done = rec && typeof rec.done === "number" ? rec.done : 0;
      var rem = e.s - Math.min(done, e.s);
      if (rem > 0) { t += rem * SET_SECS + rem * e.rest; liftsLeft++; }
    }
    t += Math.max(0, liftsLeft - 1) * TRANSITION_SECS;
    return Math.round(t / 60);
  }

  /* lazy default-injection (was `st()`); mutates state like the original */
  function getLift(state, d, i, e) {
    var k = d + ":" + i, s = state[k];
    if (!s) { s = state[k] = { done: 0, load: e.load || 0, reps: e.r, rir: e.rir, topHits: 0, lastRir: null, sets: [] }; }
    else {
      if (typeof s.done !== "number") s.done = 0;
      if (typeof s.load !== "number") s.load = e.load || 0;
      if (typeof s.reps !== "number") s.reps = e.r;
      if (typeof s.rir !== "number") s.rir = e.rir;
      if (typeof s.topHits !== "number") s.topHits = 0;
      if (!("lastRir" in s)) s.lastRir = null;
    }
    if (!Array.isArray(s.sets)) s.sets = [];
    /* legacy records only stored a done count — backfill placeholder rows */
    while (s.sets.length < s.done) s.sets.push({ load: s.load, reps: s.reps, rir: s.rir });
    return s;
  }

  /* Epley estimated 1RM; bodyweight (load 0) falls back to reps as the metric */
  function epley1rm(load, reps) { return load * (1 + reps / 30); }
  function progressMetric(load, reps) { return load > 0 ? Math.round(epley1rm(load, reps) * 10) / 10 : reps; }

  /* double-progression: if the last session hit top reps at target RIR, add a step */
  function suggestLoad(e, prev) {
    if (!prev) return { suggest: null, last: null, hitTop: false };
    var hitTop = !!prev.hitTop;
    var suggest = hitTop ? round2(prev.load + e.step) : prev.load;
    return { suggest: suggest, last: prev, hitTop: hitTop };
  }

  return {
    DAYS: DAYS, SET_SECS: SET_SECS, TRANSITION_SECS: TRANSITION_SECS,
    fmt: fmt, esc: esc, round2: round2,
    dayMins: dayMins, dayMinsLeft: dayMinsLeft, getLift: getLift,
    epley1rm: epley1rm, progressMetric: progressMetric, suggestLoad: suggestLoad
  };
});
