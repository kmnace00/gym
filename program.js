/* ── gym program data + pure helpers ────────────────────────────────────────
   No DOM, no global state. Works as a browser global (window.Gym) and as a
   Node module (module.exports) so node:test can import it without a build.   */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else {
    /* flat-namespace registration with a collision guard: two modules that
       export the same key must never silently clobber each other.            */
    root.Gym = root.Gym || {};
    var mod = factory(), k;
    for (k in mod) if (Object.prototype.hasOwnProperty.call(mod, k)) {
      if (Object.prototype.hasOwnProperty.call(root.Gym, k) && typeof console === "object") console.warn("[gym] duplicate export: " + k);
      root.Gym[k] = mod[k];
    }
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ── program data — loads / sets / reps / rests / cues unchanged ────────
     Each lift now carries a stable `id`. The store keys are still day:index
     (proven, tested), but records also stamp `exId`, so store.reconcile()
     can re-home them if a future program edit reorders the list.            */
  var DAYS = {
    fri: { label: "Friday — Push + Quads", ex: [
      { id: "fri-smith-squat", n: "Smith squat", alts: ["Barbell back squat", "Leg press", "Hack squat"], s: 3, r: 6, top: 6, load: 60, step: 2.5, rest: 180, rir: 2, cue: "Bar over mid-foot, heels flat." },
      { id: "fri-smith-incline", n: "Smith incline press", alts: ["Barbell incline press", "Machine incline press"], s: 3, r: 6, top: 6, load: 50, step: 2.5, rest: 120, rir: 2, cue: "Bench ~30°. Bar to upper chest." },
      { id: "fri-bulgarian", n: "Bulgarian split squat", alts: ["DB reverse lunge", "Walking lunge", "Weighted step-up"], per: "side", s: 3, r: 8, top: 8, load: 25, step: 2.5, rest: 150, rir: 2, cue: "Per leg. Upright = more quad." },
      { id: "fri-incline-db", n: "Incline DB press", alts: ["Barbell incline press", "Smith incline press", "Machine incline press"], s: 3, r: 7, top: 8, load: 52.5, step: 2.5, rest: 120, rir: 2, cue: "Lower to a stretch, don't drift wide." },
      { id: "fri-pec-deck", n: "Pec deck fly", alts: ["Incline DB fly", "Cable fly", "DB fly"], s: 3, r: 8, top: 10, load: 100, step: 5, rest: 90, rir: 1, partial: 1, cue: "Handles at mid-chest, elbows fixed." },
      { id: "fri-leg-ext", n: "Leg extension", alts: ["Sissy squat (assisted, hold a rack)", "Heels-elevated goblet squat", "Walking lunge"], s: 3, r: 12, top: 15, load: null, step: 2.5, rest: 90, rir: 1, partial: 1, cue: "Start light, log the stack." },
      { id: "fri-cable-lat", n: "Cable lateral raise", alts: ["DB lateral raise", "Machine lateral raise"], per: "side", s: 3, r: 10, top: 12, load: 10, step: 1, rest: 90, rir: 1, partial: 1, cue: "Per side. Arm across body, lead with elbow." },
      { id: "fri-weighted-dip", n: "Assisted dip", alts: ["Close-grip bench press", "Machine dip", "Bench dip"], s: 3, r: 6, top: 8, load: 45, step: 2.5, rest: 120, rir: 2, assist: true, cue: "Machine assist — the number is help: lower = harder." }
    ] },
    sat: { label: "Saturday — Pull + Hinge", ex: [
      { id: "sat-front-pulldown", n: "MTS front pulldown", alts: ["Pull-ups (band-assisted if <5 reps)", "Cable lat pulldown"], s: 3, r: 7, top: 9, load: 90, step: 5, rest: 120, rir: 2, cue: "Elbows to ribs. Full stretch at top." },
      { id: "sat-cable-rdl", n: "Cable RDL", alts: ["DB Romanian deadlift", "Barbell Romanian deadlift"], s: 3, r: 8, top: 8, load: 120, step: 5, rest: 150, rir: 2, cue: "Hips back, stop when stretch stops you." },
      { id: "sat-tbar-row", n: "T-bar row", alts: ["One-arm DB row (chest-supported if possible)", "Chest-supported machine row", "Barbell bent-over row"], s: 3, r: 8, top: 8, load: 75, step: 5, rest: 120, rir: 2, cue: "25+25+25. Chest-supported if you can." },
      { id: "sat-leg-curl", n: "Seated leg curl", alts: ["Nordic hamstring curl (eccentric-only, assisted)", "Lying leg curl machine", "Slider leg curl"], s: 3, r: 9, top: 11, load: 130, step: 5, rest: 90, rir: 1, cue: "Lean back for hard sets." },
      { id: "sat-bayesian-curl", n: "Bayesian curl", alts: ["Incline DB curl", "EZ-bar curl", "Cable curl"], s: 3, r: 8, top: 10, load: 13, step: 1, rest: 90, rir: 1, partial: 1, cue: "Arm behind body, elbow fixed." },
      { id: "sat-preacher-curl", n: "Preacher curl", alts: ["Spider curl (chest-supported on incline bench)", "Machine preacher curl", "Incline DB curl"], per: "side", s: 3, r: 6, top: 6, load: 25, step: 2.5, rest: 90, rir: 1, partial: 1, cue: "Per side. Don't cut the bottom." },
      { id: "sat-rear-delt", n: "Rear delt crossover", alts: ["Bent-over DB reverse fly", "Reverse pec deck", "Cable rear-delt fly"], s: 3, r: 12, top: 14, load: 10, step: 1, rest: 90, rir: 1, cue: "Sweep back, squeeze, slow return." },
      { id: "sat-calf-raise", n: "Standing calf raise", alts: ["Single-leg DB calf raise on a step", "Seated calf raise", "Leg press calf raise"], s: 3, r: 12, top: 15, load: null, step: 5, rest: 90, rir: 0, partial: 1, cue: "Pause 1s in the stretch. No bounce." }
    ] },
    sun: { label: "Sunday — Light / Machines", ex: [
      { id: "sun-leg-press", n: "Leg press / Hack squat", alts: ["Barbell back squat", "Goblet squat (heels elevated)", "Smith squat"], s: 3, r: 6, top: 8, load: 180, step: 5, rest: 150, rir: 2, cue: "45×4 plates. Full depth, back stays down." },
      { id: "sun-pullups", n: "Pull-ups", alts: ["Lat pulldown", "Assisted pull-up machine"], s: 3, r: 6, top: 6, load: 0, step: 2.5, rest: 120, rir: 2, bw: true, cue: "Bodyweight. Under 5 reps? Use pulldown." },
      { id: "sun-machine-ohp", n: "Machine overhead press", alts: ["Seated DB overhead press", "Standing barbell overhead press", "Smith overhead press"], s: 3, r: 7, top: 9, load: 80, step: 5, rest: 120, rir: 2, cue: "Only overhead press this week." },
      { id: "sun-cable-fly", n: "Cable fly", alts: ["Pec deck fly", "Incline DB fly", "Machine chest fly"], s: 3, r: 12, top: 15, load: null, step: 2.5, rest: 90, rir: 1, partial: 1, cue: "Soft elbows, full stretch on return." },
      { id: "sun-seated-row", n: "Machine seated row", alts: ["Barbell bent-over row", "One-arm DB row", "Cable seated row"], s: 3, r: 8, top: 8, load: 130, step: 5, rest: 120, rir: 2, cue: "Chest-supported. Pull to ribs." },
      { id: "sun-lat-pec", n: "Lateral raise ↔ Reverse pec deck", alts: ["DB lateral raise + bent-over DB reverse fly", "Cable lateral raise + cable rear-delt fly", "Machine lateral raise + reverse pec deck"], s: 3, r: 10, top: 12, load: 70, step: 5, rest: 120, rir: 1, partial: 1, cue: "Superset. Lateral 70, then pec deck ×12. One rest after pair." },
      { id: "sun-oh-ext", n: "Overhead cable extension", alts: ["Single-arm DB overhead extension", "EZ-bar skullcrusher", "DB overhead extension (two-hand)"], s: 3, r: 12, top: 15, load: null, step: 2.5, rest: 90, rir: 1, partial: 1, cue: "Elbows by head, lower behind head." },
      { id: "sun-calf-raise", n: "Standing calf raise", alts: ["Single-leg DB calf raise on a step", "Seated calf raise", "Smith calf raise"], s: 3, r: 15, top: 20, load: null, step: 5, rest: 90, rir: 0, partial: 1, cue: "Pause 1s in stretch. Alt weeks: hip abduction 2×12 · 205." }
    ] }
  };

  /* named model constants (were magic numbers 50 / 60 in dayMins) */
  var SET_SECS = 50, TRANSITION_SECS = 60;
  /* N6/N7 (Nov 13): the honest-clock additions. STRETCH_SECS is the pre-work
     mobility block and SETUP_SECS the per-set setup (phone down, position,
     grip, brace) — both are SEEDS: once enough timed sessions exist, the
     learned calibration (stats.js) replaces them (see app.js calOpts).     */
  var STRETCH_SECS = 300, SETUP_SECS = 15;
  /* ramp-up time: a full ramp (3 light sets) before the day's first lift,
     one feeler set before later heavy lifts (rest >= 150 s marks heavy).  */
  var RAMP_FULL_SECS = 270, RAMP_FEELER_SECS = 75, RAMP_FEELER_MIN_REST = 150;

  function calOf(cal) {
    var c = cal || {};
    return {
      stretch: typeof c.stretch === "number" ? c.stretch : STRETCH_SECS,
      setup: typeof c.setup === "number" ? c.setup : SETUP_SECS
    };
  }
  function snapStep(v, step) { return step > 0 ? round2(Math.round(v / step) * step) : round2(v); }

  /* The ramp-up sets before a lift's first working set, display-only (never
     logged): full ramp for the day's first lift, one feeler for later heavy
     lifts. null when the lift has no real external load to ramp toward —
     bodyweight, unloaded (load null), or a zero load. Loads snap to the
     lift's step. (app.js only ever passes a lift's real working load, so a
     starting guess never earns a ramp.)                                     */
  function rampFor(e, load, isFirst) {
    if (!e || e.bw || typeof load !== "number" || !(load > 0)) return null;
    if (isFirst) {
      return { kind: "full", secs: RAMP_FULL_SECS, steps: [
        { load: snapStep(load * 0.5, e.step), reps: 5 },
        { load: snapStep(load * 0.7, e.step), reps: 3 },
        { load: snapStep(load * 0.85, e.step), reps: 1 }
      ] };
    }
    if (typeof e.rest === "number" && e.rest >= RAMP_FEELER_MIN_REST) {
      return { kind: "feeler", secs: RAMP_FEELER_SECS, steps: [{ load: snapStep(load * 0.6, e.step), reps: 4 }] };
    }
    return null;
  }

  /* N8: starting-load guesses for lifts whose programme load is blank. One
     hand-checked anchor only — the Sunday cable fly from Friday's pec deck
     (same movement family; cables read lighter, factor 0.7, the plan's
     flagged lowest-confidence entry). Deliberately NOT a ratio table:
     machine loads do not transfer, so everything else stays blank.         */
  var LOAD_GUESS_FACTOR = { "sun-cable-fly": 0.7 };
  /* Which lift anchors each guess (the factor's input), by stable lift id. */
  var LOAD_GUESS_FROM = { "sun-cable-fly": "fri-pec-deck" };
  function guessLoad(e, anchorLoad) {
    if (!e || typeof anchorLoad !== "number" || !(anchorLoad > 0)) return null;
    var f = LOAD_GUESS_FACTOR[e.id];
    if (typeof f !== "number") return null;
    var g = snapStep(anchorLoad * f, e.step);
    return g > 0 ? g : null;
  }
  /* bodyweight work has no external load; value a load:0 set at this many lb
     per rep so pull-ups / dips / calf raises are not invisible in tonnage.  */
  var BODYWEIGHT_LB = 165;

  /** Format seconds as m:ss, never negative. */
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  /** Escape HTML metacharacters for innerHTML templates. */
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  /** Round to two decimals. */
  function round2(n) { return Math.round(n * 100) / 100; }

  /** Scheduled minutes for a whole day (N6 honest clock): sets × (set +
      setup + rest) + transitions + the stretch block + ramp-up time. `cal`
      optionally overrides the stretch/setup seeds with learned values.     */
  function dayMins(d, cal) {
    var c = calOf(cal), t = c.stretch, list = DAYS[d].ex;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      t += e.s * (SET_SECS + c.setup) + e.s * e.rest;
      var ramp = rampFor(e, e.load, i === 0);
      if (ramp) t += ramp.secs;
    }
    t += (list.length - 1) * TRANSITION_SECS;
    return Math.round(t / 60);
  }

  /* pure: state is passed in, not read from a global */
  function dayMinsLeft(d, state, cal) {
    var c = calOf(cal), anyDone = false, list = DAYS[d].ex, i, rec;
    for (i = 0; i < list.length; i++) {
      rec = state && state[d + ":" + i];
      if (rec && typeof rec.done === "number" && rec.done > 0) anyDone = true;
    }
    /* the stretch block is spent as soon as any set is logged */
    var t = anyDone ? 0 : c.stretch, liftsLeft = 0;
    for (i = 0; i < list.length; i++) {
      var e = list[i];
      rec = state && state[d + ":" + i];
      var done = rec && typeof rec.done === "number" ? rec.done : 0;
      var rem = e.s - Math.min(done, e.s);
      if (rem > 0) {
        t += rem * (SET_SECS + c.setup) + rem * e.rest;
        /* an untouched lift still has its ramp-up ahead of it */
        if (done === 0) { var ramp = rampFor(e, e.load, i === 0); if (ramp) t += ramp.secs; }
        liftsLeft++;
      }
    }
    t += Math.max(0, liftsLeft - 1) * TRANSITION_SECS;
    return Math.round(t / 60);
  }

  /**
   * Index of the first lift at or after `from` that still has sets left,
   * or -1 when the rest of the day is complete. Pure: reads `state` only.
   * @param {"fri"|"sat"|"sun"} d
   * @param {Record<string, {done?:number}>} state
   * @param {number} from
   * @returns {number}
   */
  function firstOpenLift(d, state, from, target) {
    var list = DAYS[d].ex, i, rec, done;
    for (i = Math.max(0, from); i < list.length; i++) {
      rec = state && state[d + ":" + i];
      done = rec && typeof rec.done === "number" ? rec.done : 0;
      /* B6-09: the target is `e.s` unless a deload week overrides it; the
         default path reads the programme value exactly as before.            */
      if (done < (target ? target(list[i]) : list[i].s)) return i;
    }
    return -1;
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
      if (!("swapAlt" in s)) s.swapAlt = null; // B6-06: the swap marker (name of the alternate)
      if (typeof s.swapLoad !== "number") s.swapLoad = 0; // B6-07: the alternate's working load
    }
    if (!Array.isArray(s.sets)) s.sets = [];
    if (e && e.id && s.exId !== e.id) s.exId = e.id;
    /* legacy records only stored a done count — backfill placeholder rows,
       bounded by the sets the program actually schedules, so an imported
       `done: 1e9` can never spin the loop.                                   */
    var cap = e && typeof e.s === "number" ? e.s : 0;
    while (s.sets.length < s.done && s.sets.length < cap) s.sets.push({ load: s.load, reps: s.reps, rir: s.rir });
    return s;
  }

  /* Epley estimated 1RM; bodyweight work uses total system weight
     (bodyweight + added load) so adding a plate never makes the metric fall.
     Assisted work (opts.assist, N15) inverts it: the logged load is help,
     so the effective load is bodyweight − assistance and LESS help scores
     higher. `opts` is optional: {bw, assist, bodyweight}.                  */
  function epley1rm(load, reps) { return load * (1 + reps / 30); }
  function progressMetric(load, reps, opts) {
    var bw = opts && typeof opts.bodyweight === "number" && opts.bodyweight > 0 ? opts.bodyweight : BODYWEIGHT_LB;
    var isBw = !!(opts && opts.bw);
    var isAssist = !!(opts && opts.assist);
    var base = isAssist ? Math.max(0, bw - (load > 0 ? load : 0)) : isBw ? bw + (load > 0 ? load : 0) : load;
    if (base > 0) return Math.round(epley1rm(base, reps) * 10) / 10;
    return reps;
  }

  /* 2-for-2 qualifier (NSCA): did this session exceed the rep goal on its
     LAST set while staying at or above the target RIR? Banked entries carry a
     per-set array; legacy entries fall back to their single reps/rir fields.
     Pure and read-time — `hitTop` keeps its banked meaning, no schema change. */
  function qualifies(e, entry) {
    if (!entry) return false;
    var last = Array.isArray(entry.sets) && entry.sets.length
      ? entry.sets[entry.sets.length - 1]
      : entry;
    if (!last) return false;
    var reps = last.reps, rir = last.rir;
    return typeof reps === "number" && typeof rir === "number" &&
      reps >= e.top + 2 && rir >= e.rir;
  }

  /* double progression, NSCA 2-for-2: add a step only after the rep goal was
     exceeded at target RIR in TWO consecutive sessions. `prev`/`prev2` are the
     newest and the one before it; `qualified` is how many of the two qualify
     (counted newest first), so the UI can say "one more top session to go up".
     No entries / one entry ⇒ no increase.                                     */
  function suggestLoad(e, prev, prev2) {
    if (!prev) return { suggest: null, last: null, hitTop: false, qualified: 0 };
    var hitTop = !!prev.hitTop;
    var q = qualifies(e, prev) ? 1 : 0;
    if (prev2 && qualifies(e, prev2)) q++;
    /* N15: on an assisted lift the logged load is help, so progress is a
       step DOWN (floored at 0 — no help left means bodyweight dips).      */
    var suggest = q === 2
      ? (e.assist ? Math.max(0, round2(prev.load - e.step)) : round2(prev.load + e.step))
      : prev.load;
    return { suggest: suggest, last: prev, hitTop: hitTop, qualified: q };
  }

  /* stall guard: three consecutive sessions that all missed top reps at the
     same load = a plateau. Double progression alone would keep you stuck, so
     recommend a ~10% stall reset (snapped to the machine's step) to shake off
     fatigue and let the next block climb again. `entries` is oldest → newest. */
  function stallLoad(e, entries) {
    if (!entries || entries.length < 3) return null;
    var last3 = entries.slice(entries.length - 3), i;
    for (i = 0; i < last3.length; i++) if (last3[i] && last3[i].hitTop) return null;
    var load = last3[2] && typeof last3[2].load === "number" ? last3[2].load : null;
    if (!load) return null;
    if (e.assist) {
      /* a stall on an assisted lift breaks with MORE help, not less load */
      var aRaw = round2(load * 1.1);
      var aSnapped = e.step > 0 ? round2(Math.round(aRaw / e.step) * e.step) : aRaw;
      if (aSnapped <= load) aSnapped = round2(load + e.step);
      return { load: aSnapped, last: last3[2], sessions: 3 };
    }
    var raw = round2(load * 0.9);
    var snapped = e.step > 0 ? round2(Math.round(raw / e.step) * e.step) : raw;
    if (snapped >= load) snapped = round2(load - e.step);
    if (snapped <= 0) return null;
    return { load: snapped, last: last3[2], sessions: 3 };
  }

  /**
   * The load to pre-fill for one lift from its history, and why.
   * action: "none" (no history) | "up" (the 2-for-2 rule fired) |
   *         "deload" (3-session stall) | "keep" (repeat last load).
   * @param {any} e exercise
   * @param {any[]} entries oldest → newest
   * @returns {{load: number|null, action: string}}
   */
  function planFor(e, entries) {
    if (!entries || !entries.length) return { load: null, action: "none" };
    var stall = stallLoad(e, entries);
    if (stall) return { load: stall.load, action: "deload" };
    var su = suggestLoad(e, entries[entries.length - 1], entries[entries.length - 2]);
    if (su.qualified === 2 && su.suggest !== su.last.load) return { load: su.suggest, action: "up" };
    return { load: su.last.load, action: "keep" };
  }

  /* ── B6-09 deload-week helpers (pure; no program data changes) ──────────── */
  /** Sets prescribed during a deload: 60% of the programme's, at least one. */
  function deloadSets(e) { return Math.max(1, Math.round(e.s * 0.6)); }

  /** 90% of the working load, snapped to the machine's step the same way
      stallLoad snaps it and never at or above the input. null / 0 pass
      through unchanged, so bodyweight and start-light lifts are unaffected. */
  function deloadLoad(e, load) {
    if (load === null || load === undefined) return load;
    if (e.assist) {
      /* deload on an assisted lift = more help: +10%, snapped, above input */
      if (load === 0) return e.step;
      var aRaw = round2(load * 1.1);
      var aSnapped = e.step > 0 ? round2(Math.round(aRaw / e.step) * e.step) : aRaw;
      if (aSnapped <= load) aSnapped = round2(load + e.step);
      return aSnapped;
    }
    if (load === 0) return load;
    var raw = round2(load * 0.9);
    var snapped = e.step > 0 ? round2(Math.round(raw / e.step) * e.step) : raw;
    if (snapped >= load) snapped = round2(load - e.step);
    if (snapped <= 0) return raw;
    return snapped;
  }

  return {
    DAYS: DAYS, SET_SECS: SET_SECS, TRANSITION_SECS: TRANSITION_SECS, BODYWEIGHT_LB: BODYWEIGHT_LB,
    STRETCH_SECS: STRETCH_SECS, SETUP_SECS: SETUP_SECS,
    fmt: fmt, esc: esc, round2: round2,
    dayMins: dayMins, dayMinsLeft: dayMinsLeft, getLift: getLift, firstOpenLift: firstOpenLift,
    rampFor: rampFor, guessLoad: guessLoad, LOAD_GUESS_FROM: LOAD_GUESS_FROM,
    epley1rm: epley1rm, progressMetric: progressMetric, suggestLoad: suggestLoad,
    qualifies: qualifies, stallLoad: stallLoad, planFor: planFor,
    deloadSets: deloadSets, deloadLoad: deloadLoad
  };
});
