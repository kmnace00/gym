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
  assert.equal(P.dayMins("fri"), 74);
  assert.equal(P.dayMins("sat"), 69);
  assert.equal(P.dayMins("sun"), 72);
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
  const r = P.suggestLoad({ step: 2.5 }, null);
  assert.deepEqual(r, { suggest: null, last: null, hitTop: false });
});

test("suggestLoad: hit top → add one step", () => {
  const r = P.suggestLoad({ step: 2.5 }, { load: 50, reps: 6, rir: 2, hitTop: true });
  assert.equal(r.suggest, 52.5);
  assert.equal(r.hitTop, true);
});

test("suggestLoad: missed top → keep load", () => {
  const r = P.suggestLoad({ step: 5 }, { load: 90, reps: 4, rir: 1, hitTop: false });
  assert.equal(r.suggest, 90);
});

test("suggestLoad: step precision (2.5 / 1 / 5)", () => {
  assert.equal(P.suggestLoad({ step: 2.5 }, { load: 52.5, hitTop: true }).suggest, 55);
  assert.equal(P.suggestLoad({ step: 1 }, { load: 13, hitTop: true }).suggest, 14);
  assert.equal(P.suggestLoad({ step: 5 }, { load: 130, hitTop: true }).suggest, 135);
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
