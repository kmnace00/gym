const test = require("node:test");
const assert = require("node:assert");
const P = require("../program.js");
const S = require("../store.js");
const Stats = require("../stats.js");

/* Nov 26, 2026: the 4-day split (Khang's ask). DAYS4 is an Upper/Lower ×2
   re-partition of the SAME lift objects, so toggling modes can never drift
   loads/reps/rests, and reconcile() re-homes records by exId both ways.   */

test("DAYS4: four days, 25 slots, every 3-day lift exactly once plus hip abduction", () => {
  assert.deepEqual(Object.keys(P.DAYS4), ["fri", "sat", "sun", "mon"]);
  assert.equal(P.DAYS4.fri.ex.length, 6);
  assert.equal(P.DAYS4.sat.ex.length, 6);
  assert.equal(P.DAYS4.sun.ex.length, 7);
  assert.equal(P.DAYS4.mon.ex.length, 6);
  const ids4 = Object.values(P.DAYS4).flatMap((d) => d.ex.map((e) => e.id));
  assert.equal(new Set(ids4).size, ids4.length, "no lift appears twice in the 4-day week");
  const ids3 = Object.values(P.DAYS).flatMap((d) => d.ex.map((e) => e.id));
  for (const id of ids3) assert.ok(ids4.includes(id), id + " must survive the toggle");
  assert.deepEqual(ids4.filter((i) => !ids3.includes(i)), ["mon-hip-abduction"]);
});

test("DAYS4 reuses the 3-day lift objects (no copy can drift)", () => {
  const byId = {};
  Object.values(P.DAYS).forEach((d) => d.ex.forEach((e) => { byId[e.id] = e; }));
  Object.values(P.DAYS4).forEach((d) => d.ex.forEach((e) => {
    if (e.id === "mon-hip-abduction") {
      assert.equal(e.s, 2); assert.equal(e.r, 12); assert.equal(e.load, 205); // from Sunday's alt-week cue
    } else assert.strictEqual(e, byId[e.id]);
  }));
});

test("weekly sets per lift are identical across modes (volume is only redistributed)", () => {
  const sets = (DAYS) => {
    const out = {};
    Object.values(DAYS).forEach((d) => d.ex.forEach((e) => { out[e.id] = (out[e.id] || 0) + e.s; }));
    return out;
  };
  const a = sets(P.DAYS), b = sets(P.DAYS4);
  for (const id of Object.keys(a)) assert.equal(b[id], a[id], id);
});

test("4-day sessions fit the 75–90 min target and run shorter than 3-day sessions", () => {
  assert.equal(P.dayMins("fri", null, P.DAYS4), 80);
  assert.equal(P.dayMins("sat", null, P.DAYS4), 80);
  assert.equal(P.dayMins("sun", null, P.DAYS4), 90);
  assert.equal(P.dayMins("mon", null, P.DAYS4), 77);
  for (const d of Object.keys(P.DAYS4)) assert.ok(P.dayMins(d, null, P.DAYS4) <= 90, d);
  /* the default (3-day) call is untouched */
  assert.equal(P.dayMins("fri"), 105);
});

test("day helpers read the passed program set", () => {
  const st = { "mon:0": { done: 3, load: 180, reps: 6, rir: 2, sets: [] } };
  assert.equal(P.firstOpenLift("mon", st, 0, null, P.DAYS4), 1);
  assert.ok(P.dayMinsLeft("mon", st, null, P.DAYS4) < P.dayMins("mon", null, P.DAYS4));
});

test("split field: defaults to 3, only the exact string 4 survives normalize", () => {
  assert.equal(S.emptyPayload().split, "3");
  assert.equal(S.migrate(JSON.stringify({ v: 5, split: "4", state: {}, liftHistory: {} })).split, "4");
  assert.equal(S.migrate(JSON.stringify({ v: 5, split: "9", state: {}, liftHistory: {} })).split, "3");
  assert.equal(S.migrate(JSON.stringify({ v: 5, state: {}, liftHistory: {} })).split, "3");
});

test("todayDay/actualDay: the 4-day mode adds Monday, the default does not", () => {
  const g = new Date().getDay();
  assert.equal(S.todayDay("4"), g === 1 ? "mon" : S.todayDay());
  assert.equal(S.actualDay("4"), g === 1 ? "mon" : S.actualDay());
  assert.equal(S.validDay("mon"), true); // a banked Monday session stays valid in both modes
});

test("reconcile re-homes a lift's record and history across the toggle, both ways", () => {
  const p = S.emptyPayload();
  p.state = { "fri:0": { done: 3, load: 60, reps: 6, rir: 2, topHits: 0, lastRir: null, sets: [], exId: "fri-smith-squat" } };
  p.liftHistory = { "fri:0": [{ date: "2026-11-06", load: 60, reps: 6, rir: 2, hitTop: false, setsDone: 3, exId: "fri-smith-squat" }] };
  S.reconcile(p, P.DAYS4); // squat is Saturday's first lift in the 4-day split
  assert.ok(p.state["sat:0"], "state follows the lift to sat:0");
  assert.equal(p.state["fri:0"], undefined);
  assert.equal(p.liftHistory["sat:0"].length, 1);
  S.reconcile(p, P.DAYS); // and back
  assert.ok(p.state["fri:0"], "state returns to fri:0 in the 3-day split");
  assert.equal(p.liftHistory["fri:0"].length, 1);
});

test("weekStatus: a 4-day week reports Fri–Mon in order", () => {
  const w = Stats.weekStatus({ liftHistory: {}, sessionLog: [] }, "2026-11-09",
    { fri: 6, sat: 6, sun: 7, mon: 6 }, ["fri", "sat", "sun", "mon"]);
  assert.deepEqual(w.map((x) => x.day), ["fri", "sat", "sun", "mon"]);
  assert.deepEqual(w.map((x) => x.date), ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09"]);
  /* the default call still returns exactly the 3-day week */
  assert.equal(Stats.weekStatus({ liftHistory: {}, sessionLog: [] }, "2026-11-09").length, 3);
});
