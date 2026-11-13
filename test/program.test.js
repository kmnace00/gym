const test = require("node:test");
const assert = require("node:assert");
const P = require("../program.js");

test("program data integrity", () => {
  assert.deepEqual(Object.keys(P.DAYS).sort(), ["fri", "sat", "sun"]);
  let total = 0;
  for (const d of ["fri", "sat", "sun"]) { assert.equal(P.DAYS[d].ex.length, 8); total += P.DAYS[d].ex.length; }
  assert.equal(total, 24);
});

test("fmt", () => {
  assert.equal(P.fmt(0), "0:00");
  assert.equal(P.fmt(65), "1:05");
  assert.equal(P.fmt(600), "10:00");
  assert.equal(P.fmt(-5), "0:00");
});

test("dayMins matches the published per-day totals", () => {
  // N6 honest clock: base sets/rests + 5:00 stretch + 15s setup per set +
  // ramp time. Fri 75 base -> 92, Sat 69 -> 86, Sun 72 -> 88.
  assert.equal(P.dayMins("fri"), 92);
  assert.equal(P.dayMins("sat"), 86);
  assert.equal(P.dayMins("sun"), 88);
});

test("dayMins: zeroing the calibration leaves base + ramps only", () => {
  assert.equal(P.dayMins("fri", { stretch: 0, setup: 0 }), 81); // 75 + 270s full + 75s feeler
  assert.ok(P.dayMins("fri", { stretch: 0 }) < P.dayMins("fri"));
  assert.ok(P.dayMins("fri", { setup: 0 }) < P.dayMins("fri"));
});

test("dayMinsLeft: the stretch block drops once any set is logged", () => {
  const st = { "fri:0": { done: 1, load: 60, reps: 6, rir: 2, sets: [{ load: 60, reps: 6, rir: 2 }] } };
  // one set done removes its own ~4 min AND the 5 min stretch block
  assert.ok(P.dayMinsLeft("fri", st) <= P.dayMins("fri") - 8);
});

test("rampFor: full ramp for the first lift, snapped to the step", () => {
  const squat = P.DAYS.fri.ex[0];
  assert.deepEqual(P.rampFor(squat, 60, true), {
    kind: "full", secs: 270,
    steps: [{ load: 30, reps: 5 }, { load: 42.5, reps: 3 }, { load: 50, reps: 1 }]
  });
});

test("rampFor: one feeler for later heavy lifts only", () => {
  assert.deepEqual(P.rampFor(P.DAYS.fri.ex[2], 25, false), { kind: "feeler", secs: 75, steps: [{ load: 15, reps: 4 }] }); // Bulgarian, rest 150
  assert.equal(P.rampFor(P.DAYS.fri.ex[4], 100, false), null); // pec deck, rest 90
  assert.equal(P.rampFor(P.DAYS.fri.ex[1], 50, false), null);  // Smith incline, rest 120
});

test("rampFor: never for bodyweight, unloaded, or guessed lifts", () => {
  assert.equal(P.rampFor(P.DAYS.fri.ex[7], 0, true), null);    // an explicit zero load earns no ramp
  assert.equal(P.rampFor(P.DAYS.sun.ex[6], null, false), null); // overhead cable extension, load null
  assert.equal(P.rampFor(null, 100, true), null);
});

test("guessLoad: only the Sunday cable fly has an anchor", () => {
  const fly = P.DAYS.sun.ex.find((e) => e.id === "sun-cable-fly");
  assert.equal(P.guessLoad(fly, 100), 70);   // pec deck 100 x 0.7, snapped to 2.5
  assert.equal(P.guessLoad(fly, 0), null);
  assert.equal(P.guessLoad(fly, null), null);
  const ohExt = P.DAYS.sun.ex.find((e) => e.id === "sun-oh-ext");
  assert.equal(P.guessLoad(ohExt, 100), null); // load:null but no anchor -> stays blank by design
});

/* N8: the guess anchor map is API, not an implementation detail — app.js reads
   `Gym.LOAD_GUESS_FROM[e.id]` on every null-load lift, and a missing export
   threw inside renderLift (blank prescription) while the whole unit suite
   stayed green. Pin the map, its single entry, and both ids being real.     */
test("LOAD_GUESS_FROM: the cable fly is anchored to Friday's pec deck", () => {
  assert.equal(typeof P.LOAD_GUESS_FROM, "object");
  assert.deepEqual(Object.keys(P.LOAD_GUESS_FROM), ["sun-cable-fly"]);
  assert.equal(P.LOAD_GUESS_FROM["sun-cable-fly"], "fri-pec-deck");
  const ids = new Set();
  Object.keys(P.DAYS).forEach((d) => P.DAYS[d].ex.forEach((e) => ids.add(e.id)));
  assert.ok(ids.has("sun-cable-fly"), "the guess target must be a program lift id");
  assert.ok(ids.has(P.LOAD_GUESS_FROM["sun-cable-fly"]), "the anchor must be a program lift id");
});

test("dayMinsLeft: nothing done equals the full day", () => {
  for (const d of ["fri", "sat", "sun"]) assert.equal(P.dayMinsLeft(d, {}), P.dayMins(d));
});

test("dayMinsLeft: everything done is zero", () => {
  const st = {};
  P.DAYS.fri.ex.forEach((e, i) => { st["fri:" + i] = { done: e.s }; });
  assert.equal(P.dayMinsLeft("fri", st), 0);
});

test("dayMinsLeft: all done except 2 remaining sets of lift 0", () => {
  const st = {};
  P.DAYS.fri.ex.forEach((e, i) => { st["fri:" + i] = { done: e.s }; });
  st["fri:0"] = { done: 1 }; // 2 sets left, rest 180
  // 2*50 + 2*180 = 460s, single lift left => no transition => round(460/60)=8
  assert.equal(P.dayMinsLeft("fri", st), 8);
});

test("getLift injects defaults", () => {
  const st = {}, e = P.DAYS.fri.ex[0];
  const s = P.getLift(st, "fri", 0, e);
  assert.equal(s.done, 0);
  assert.equal(s.load, e.load);
  assert.equal(s.reps, e.r);
  assert.equal(s.rir, e.rir);
  assert.equal(s.topHits, 0);
  assert.equal(s.lastRir, null);
});

test("getLift keeps a sets array and backfills legacy done counts", () => {
  const st = { "fri:0": { done: 2, load: 60, reps: 6, rir: 2 } }, e = P.DAYS.fri.ex[0];
  const s = P.getLift(st, "fri", 0, e);
  assert.ok(Array.isArray(s.sets));
  assert.equal(s.sets.length, 2);
  assert.equal(s.sets[0].load, 60);
});

test("getLift repairs a partial record", () => {
  const st = { "fri:0": { done: 2 } }, e = P.DAYS.fri.ex[0];
  const s = P.getLift(st, "fri", 0, e);
  assert.equal(s.done, 2);
  assert.equal(s.load, e.load);
  assert.equal(typeof s.reps, "number");
  assert.equal(typeof s.rir, "number");
});

test("suggestLoad: first time → no suggestion", () => {
  const r = P.suggestLoad({ step: 2.5, top: 6, rir: 2 }, null);
  assert.deepEqual(r, { suggest: null, last: null, hitTop: false, qualified: 0 });
});

test("suggestLoad: two qualifying sessions → add one step", () => {
  const e = { step: 2.5, top: 6, rir: 2 };
  const r = P.suggestLoad(e,
    { load: 50, reps: 8, rir: 2, hitTop: true },
    { load: 50, reps: 8, rir: 2, hitTop: true });
  assert.equal(r.suggest, 52.5);
  assert.equal(r.hitTop, true);
  assert.equal(r.qualified, 2);
});

test("suggestLoad: only the latest qualifies → keep the load", () => {
  const e = { step: 2.5, top: 6, rir: 2 };
  const r = P.suggestLoad(e, { load: 50, reps: 8, rir: 2 }, { load: 50, reps: 6, rir: 2 });
  assert.equal(r.suggest, 50);
  assert.equal(r.qualified, 1);
});

test("suggestLoad: only the older qualifies → keep the load", () => {
  const e = { step: 2.5, top: 6, rir: 2 };
  const r = P.suggestLoad(e, { load: 50, reps: 6, rir: 2 }, { load: 50, reps: 8, rir: 2 });
  assert.equal(r.suggest, 50);
  assert.equal(r.qualified, 1);
  assert.equal(P.qualifies(e, { load: 50, reps: 6, rir: 2 }), false);
});

test("suggestLoad: one session can never raise the load", () => {
  const e = { step: 2.5, top: 6, rir: 2 };
  const r = P.suggestLoad(e, { load: 50, reps: 8, rir: 2, hitTop: true });
  assert.equal(r.suggest, 50);
  assert.equal(r.qualified, 1);
});

test("suggestLoad: missed top → keep load", () => {
  const r = P.suggestLoad({ step: 5, top: 6, rir: 2 },
    { load: 90, reps: 4, rir: 1, hitTop: false },
    { load: 90, reps: 4, rir: 1, hitTop: false });
  assert.equal(r.suggest, 90);
  assert.equal(r.qualified, 0);
});

test("suggestLoad: step precision (2.5 / 1 / 5)", () => {
  const q = (load) => ({ load, reps: 8, rir: 2 });
  const e = (step) => ({ step, top: 6, rir: 2 });
  assert.equal(P.suggestLoad(e(2.5), q(52.5), q(52.5)).suggest, 55);
  assert.equal(P.suggestLoad(e(1), q(13), q(13)).suggest, 14);
  assert.equal(P.suggestLoad(e(5), q(130), q(130)).suggest, 135);
});

test("assisted lifts: progress runs downhill — less help is the PR (N15)", () => {
  const dip = P.DAYS.fri.ex.find((x) => x.id === "fri-weighted-dip");
  assert.equal(dip.assist, true);
  assert.equal(dip.load, 45); // Khang's current machine setting, Nov 13
  // the metric values effective load: 165 bodyweight − 45 help = 120
  assert.equal(P.progressMetric(45, 6, { assist: true, bodyweight: 165 }), 144);
  assert.ok(P.progressMetric(40, 6, { assist: true, bodyweight: 165 }) > 144, "less help scores higher");
  // 2-for-2 suggests one step LESS help; a stall or deload adds help instead
  const q = (load) => ({ load, reps: 10, rir: 2 });
  assert.equal(P.suggestLoad(dip, q(45), q(45)).suggest, 42.5);
  assert.equal(P.suggestLoad(dip, q(2.5), q(2.5)).suggest, 0, "never below zero help");
  const miss = (load) => ({ load, reps: 5, rir: 1, hitTop: false });
  assert.equal(P.stallLoad(dip, [miss(45), miss(45), miss(45)]).load, 50);
  assert.equal(P.deloadLoad(dip, 45), 50);
  assert.equal(P.deloadLoad(dip, 0), 2.5);
});

test("qualifies: last banked set decides; legacy fields are the fallback", () => {
  const e = { top: 6, rir: 2 };
  const hit = { reps: 8, rir: 2 };
  const miss = { reps: 6, rir: 2 };
  assert.equal(P.qualifies(e, { sets: [hit, hit, hit] }), true);
  assert.equal(P.qualifies(e, { sets: [hit, hit, miss] }), false, "an earlier hit does not count");
  assert.equal(P.qualifies(e, { sets: [], reps: 8, rir: 2 }), true, "empty sets → legacy fields");
  assert.equal(P.qualifies(e, { reps: 8, rir: 2 }), true, "no sets key → legacy fields");
  assert.equal(P.qualifies(e, { sets: [{ reps: 8, rir: 1 }] }), false, "RIR under target");
  assert.equal(P.qualifies(e, { sets: [{ reps: 7, rir: 2 }] }), false, "top + 1 is not enough");
  assert.equal(P.qualifies(e, null), false);
});

test("fri-bulgarian rests 150 s (B6-08, the approved number)", () => {
  const e = P.DAYS.fri.ex.find((x) => x.id === "fri-bulgarian");
  assert.equal(e.rest, 150);
});

test("epley1rm and progressMetric", () => {
  assert.equal(P.epley1rm(100, 10), 100 * (1 + 10 / 30));
  assert.equal(P.progressMetric(0, 12), 12);             // bodyweight → reps
  assert.equal(P.progressMetric(100, 10), Math.round(100 * (1 + 10 / 30) * 10) / 10);
});

test("esc escapes HTML metacharacters", () => {
  assert.equal(P.esc('a <b> & "c"'), 'a &lt;b&gt; &amp; "c"');
  assert.equal(P.esc(12), "12");
  assert.equal(P.esc(null), "null");
});

test("round2 rounds to two decimals", () => {
  assert.equal(P.round2(62.546), 62.55);
  assert.equal(P.round2(7), 7);
  assert.equal(P.round2(1 / 3), 0.33);
});

test("firstOpenLift finds the first lift with sets left", () => {
  const state = { "fri:0": { done: 3 }, "fri:1": { done: 1 } };
  assert.equal(P.firstOpenLift("fri", state, 0), 1);
  assert.equal(P.firstOpenLift("fri", state, 2), 2);
  assert.equal(P.firstOpenLift("fri", {}, 0), 0);
  const all = {};
  for (let i = 0; i < P.DAYS.fri.ex.length; i++) all["fri:" + i] = { done: P.DAYS.fri.ex[i].s };
  assert.equal(P.firstOpenLift("fri", all, 0), -1);
});

test("getLift bounds the legacy backfill to the scheduled sets", () => {
  const ex = P.DAYS.fri.ex[0];
  const s = P.getLift({ "fri:0": { done: 1e9, load: 50, reps: 6, rir: 2 } }, "fri", 0, ex);
  assert.equal(s.sets.length, ex.s);
  assert.equal(s.done, 1e9);   /* the count is preserved, only the rows are bounded */
  assert.equal(P.getLift({}, "fri", 0, ex).sets.length, 0);
});

test("every lift has a unique exId", () => {
  const ids = new Set();
  for (const d of ["fri", "sat", "sun"]) {
    for (const ex of P.DAYS[d].ex) {
      assert.ok(typeof ex.id === "string" && ex.id.length > 0, `${d} lift ${ex.name} has no id`);
      ids.add(ex.id);
    }
  }
  /* reconcile() resolves state keys through exId: a duplicate would silently
     merge two lifts into one record, so uniqueness is worth asserting. */
  assert.equal(ids.size, 24, "duplicate exId in program.js");
});

test("every lift carries approved alternates (B6-06; the list is N14)", () => {
  let count = 0;
  for (const d of ["fri", "sat", "sun"]) {
    for (const ex of P.DAYS[d].ex) {
      count++;
      assert.ok(Array.isArray(ex.alts) && ex.alts.length >= 2, `${ex.n} needs at least 2 alternates`);
      assert.equal(new Set(ex.alts).size, ex.alts.length, `${ex.n} has a duplicate alternate`);
      for (const a of ex.alts) {
        assert.ok(typeof a === "string" && a.trim().length > 0, `${ex.n} has a blank alternate`);
        assert.ok(a.length <= 120, `${ex.n} alternate exceeds the 120-char swapAlt bound`);
      }
    }
  }
  assert.equal(count, 24, "the program schedules 24 lifts");
});

/* B6-09 — deload-week helpers (no programme numbers change) */
test("deloadSets: 60% of the prescribed sets, at least 1", () => {
  assert.equal(P.deloadSets({ s: 3 }), 2);
  assert.equal(P.deloadSets({ s: 4 }), 2);
  assert.equal(P.deloadSets({ s: 2 }), 1);
  assert.equal(P.deloadSets({ s: 1 }), 1);
  for (const d of ["fri", "sat", "sun"]) for (const e of P.DAYS[d].ex) assert.equal(P.deloadSets(e), 2);
});

test("deloadLoad: 10% lighter snapped to the step, never at or above input", () => {
  assert.equal(P.deloadLoad({ step: 5 }, 100), 90);
  assert.equal(P.deloadLoad({ step: 5 }, 130), 115);   // 117 → 115
  assert.equal(P.deloadLoad({ step: 5 }, 90), 80);     // 81 → 80
  assert.equal(P.deloadLoad({ step: 5 }, 75), 70);     // 67.5 → 70
  assert.equal(P.deloadLoad({ step: 5 }, 70), 65);     // 63 → 65
  assert.equal(P.deloadLoad({ step: 5 }, 180), 160);   // 162 → 160
  assert.equal(P.deloadLoad({ step: 2.5 }, 60), 55);   // 54 → 55
  assert.equal(P.deloadLoad({ step: 2.5 }, 50), 45);
  assert.equal(P.deloadLoad({ step: 2.5 }, 25), 22.5);
  assert.equal(P.deloadLoad({ step: 1 }, 13), 12);     // 11.7 → 12
  assert.equal(P.deloadLoad({ step: 1 }, 10), 9);
  /* bodyweight / start-light lifts pass through untouched */
  assert.equal(P.deloadLoad({ step: 2.5 }, 0), 0);
  assert.equal(P.deloadLoad({ step: 2.5 }, null), null);
  /* a load smaller than one step falls back to the raw 90% (never negative) */
  assert.equal(P.deloadLoad({ step: 5 }, 2), 1.8);
  for (const d of ["fri", "sat", "sun"]) {
    for (const e of P.DAYS[d].ex) {
      if (typeof e.load === "number" && e.load > 0) {
        const dl = P.deloadLoad(e, e.load);
        /* N15: an assisted lift deloads the other way — more help */
        if (e.assist) assert.ok(dl > e.load, `${e.n}: assisted deload must add help`);
        else assert.ok(dl < e.load, `${e.n}: deload load must be lighter`);
      }
    }
  }
});

test("firstOpenLift is unchanged without a target callback", () => {
  const state = { "fri:0": { done: 2 } };
  /* the programme's lift 0 prescribes 3 sets: 2 done leaves it open */
  assert.equal(P.firstOpenLift("fri", state, 0), 0);
  const complete = { "fri:0": { done: 3 } };
  assert.equal(P.firstOpenLift("fri", complete, 0), 1);
  /* an explicit target callback is what a deload week passes in */
  assert.equal(P.firstOpenLift("fri", state, 0, (e) => P.deloadSets(e)), 1);
});
