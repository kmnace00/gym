const test = require("node:test");
const assert = require("node:assert");
const P = require("../program.js");
const S = require("../store.js");
const A = require("../stats.js");

/* ── planFor: the one-tap "Plan today" decision ─────────────────────────── */

test("planFor: no history → no plan", () => {
  assert.deepEqual(P.planFor({ step: 2.5 }, []), { load: null, action: "none" });
});

test("planFor: two qualifying sessions → up one step", () => {
  const e = { step: 2.5, top: 6, rir: 2 };
  const r = P.planFor(e, [
    { load: 50, reps: 8, rir: 2, hitTop: true },
    { load: 50, reps: 8, rir: 2, hitTop: true }
  ]);
  assert.equal(r.action, "up");
  assert.equal(r.load, 52.5);
});

test("planFor: one qualifying session → keep the load", () => {
  const r = P.planFor({ step: 2.5, top: 6, rir: 2 }, [{ load: 50, reps: 8, rir: 2, hitTop: true }]);
  assert.equal(r.action, "keep");
  assert.equal(r.load, 50);
});

test("planFor: missed top once → keep the load", () => {
  const r = P.planFor({ step: 2.5, top: 6, rir: 2 }, [{ load: 50, reps: 5, hitTop: false }]);
  assert.equal(r.action, "keep");
  assert.equal(r.load, 50);
});

test("planFor: three missed sessions → deload", () => {
  const miss = () => ({ load: 60, reps: 5, hitTop: false });
  const r = P.planFor({ step: 2.5, top: 6, rir: 2 }, [miss(), miss(), miss()]);
  assert.equal(r.action, "deload");
  assert.equal(r.load, 55);
});

test("planFor: a stall still wins over a 2-for-2", () => {
  /* all three missed `hitTop`, yet the last two clear the rep bar */
  const q = () => ({ load: 60, reps: 8, rir: 2, hitTop: false });
  const r = P.planFor({ step: 2.5, top: 6, rir: 2 }, [q(), q(), q()]);
  assert.equal(r.action, "deload");
  assert.equal(r.load, 55);
});

/* ── reconcile: data follows its exercise id across a program reorder ───── */

const DAYS = {
  fri: { ex: [{ id: "a" }, { id: "b" }] },
  sat: { ex: [{ id: "c" }] },
  sun: { ex: [] }
};

test("reconcile re-homes state by exId when the program moves a lift", () => {
  const p = { state: { "fri:0": { done: 2, exId: "c" } }, liftHistory: {} };
  S.reconcile(p, DAYS);
  assert.ok(p.state["sat:0"]);
  assert.equal(p.state["sat:0"].done, 2);
  assert.ok(!p.state["fri:0"]);
});

test("reconcile re-homes history by the entry's exId", () => {
  const p = {
    state: {},
    liftHistory: { "fri:1": [{ date: "2026-11-01", load: 50, exId: "c" }] }
  };
  S.reconcile(p, DAYS);
  assert.ok(p.liftHistory["sat:0"]);
  assert.ok(!p.liftHistory["fri:1"]);
});

test("reconcile leaves legacy records (no exId) where they are", () => {
  const p = { state: { "fri:0": { done: 1 } }, liftHistory: { "fri:1": [{ load: 50 }] } };
  S.reconcile(p, DAYS);
  assert.ok(p.state["fri:0"]);
  assert.ok(p.liftHistory["fri:1"]);
});

test("reconcile retires a hostile exId to old:<id>, not an inherited function", () => {
  const p = {
    state: { "fri:0": { done: 2, exId: "toString" } },
    liftHistory: { "fri:1": [{ date: "2026-11-01", load: 50, exId: "constructor" }] }
  };
  S.reconcile(p, DAYS);
  assert.equal(p.state["old:toString"].done, 2, "the retired state uses the predictable old: key");
  assert.equal(p.liftHistory["old:constructor"][0].load, 50, "retired history uses the old: key too");
  assert.equal(Object.keys(p.state).length, 1, "no junk function-string key was created");
});

test("reconcile keeps the fuller record on a key collision", () => {
  const p = {
    state: { "fri:0": { done: 1, exId: "c" }, "sat:0": { done: 3, exId: "c" } },
    liftHistory: {}
  };
  S.reconcile(p, DAYS);
  assert.equal(p.state["sat:0"].done, 3);
});

/* N20 — a retired lift (no longer in the program) keeps its banked history
   under its old id and never strands at its old slot for the replacement. */
test("reconcile retires a stale-exId state record to old:<id>", () => {
  const p = { state: { "sat:4": { done: 3, load: 13, exId: "sat-bayesian-curl" } }, liftHistory: {} };
  S.reconcile(p, DAYS);
  assert.ok(p.state["old:sat-bayesian-curl"], "retired record moved to its retired key");
  assert.equal(p.state["old:sat-bayesian-curl"].done, 3);
  assert.ok(!p.state["sat:4"], "the slot is left empty for the replacement lift");
});

test("reconcile retires stale-exId history under old:<id>, not the old slot", () => {
  const p = {
    state: {},
    liftHistory: {
      "sat:4": [
        { date: "2026-11-01", load: 13, reps: 8, rir: 1, setsDone: 3, exId: "sat-bayesian-curl" },
        { date: "2026-11-08", load: 14, reps: 8, rir: 1, setsDone: 3, exId: "sat-bayesian-curl" }
      ]
    }
  };
  S.reconcile(p, DAYS);
  assert.equal(p.liftHistory["old:sat-bayesian-curl"].length, 2, "history preserved under the old id");
  assert.ok(!p.liftHistory["sat:4"], "the slot carries nothing for the new lift");
});

test("reconcile keeps real program lifts resolving alongside retired ones", () => {
  const p = {
    state: { "sat:4": { done: 2, exId: "sat-rope-hammer-curl" } },
    liftHistory: {
      "sat:4": [{ date: "2026-11-15", load: 15, reps: 10, rir: 1, setsDone: 3, exId: "sat-rope-hammer-curl" }]
    }
  };
  S.reconcile(p, DAYS); // DAYS has no "sat-rope-hammer-curl", so as far as reconcile knows it is retired
  assert.equal(p.state["old:sat-rope-hammer-curl"].done, 2);
  assert.equal(p.liftHistory["old:sat-rope-hammer-curl"].length, 1);
});

/* ── trainingDays: the 8-week Fri/Sat/Sun heatmap ───────────────────────── */

test("trainingDays marks the Fri/Sat/Sun of each training week", () => {
  // 2026-11-06 is a Friday; 11-07 Saturday.
  const p = {
    liftHistory: {
      "fri:0": [{ date: "2026-11-06", load: 50, reps: 6, setsDone: 3 }],
      "sat:0": [{ date: "2026-11-07", load: 90, reps: 8, setsDone: 3 }]
    }
  };
  const weeks = A.trainingDays(p, 2, "2026-11-06");
  assert.equal(weeks.length, 2);
  const last = weeks[1];
  assert.equal(last.fri, true);
  assert.equal(last.sat, true);
  assert.equal(last.sun, false);
  assert.equal(weeks[0].fri, false);
});

test("trainingDays is empty for an invalid nowKey", () => {
  assert.deepEqual(A.trainingDays({}, 8, "nope"), []);
});

/* ── toCsv: per-set export ──────────────────────────────────────────────── */

test("toCsv writes one row per set with the lift name", () => {
  const p = {
    liftHistory: {
      "fri:0": [{
        date: "2026-11-01", load: 50, reps: 6, rir: 2, setsDone: 2,
        sets: [{ load: 50, reps: 6, rir: 2 }, { load: 52.5, reps: 5, rir: 1 }]
      }]
    }
  };
  const csv = A.toCsv(p, { fri: { ex: [{ n: "Smith squat" }] }, sat: { ex: [] }, sun: { ex: [] } });
  const lines = csv.split("\n");
  assert.equal(lines[0], "date,day,lift,set,load,reps,rir");
  assert.equal(lines.length, 3);
  assert.match(lines[1], /2026-11-01,fri,Smith squat,1,50,6,2/);
  assert.match(lines[2], /2026-11-01,fri,Smith squat,2,52.5,5,1/);
});

test("toCsv counts a legacy multi-set entry's setsDone rows, like entrySets does", () => {
  /* A pre-set-array entry stores flat load/reps/rir + setsDone. Every other
     history reader synthesizes setsDone copies (entrySets), so the export must
     too — not a single flat row (which under-reported a 3-set session as one). */
  const p = {
    liftHistory: {
      "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, setsDone: 3 }]
    }
  };
  const csv = A.toCsv(p, { fri: { ex: [{ n: "Smith squat" }] }, sat: { ex: [] }, sun: { ex: [] } });
  const lines = csv.split("\n");
  assert.equal(lines.length, 4); // header + three synthesized sets
  assert.match(lines[1], /2026-11-01,fri,Smith squat,1,50,6,2/);
  assert.match(lines[2], /2026-11-01,fri,Smith squat,2,50,6,2/);
  assert.match(lines[3], /2026-11-01,fri,Smith squat,3,50,6,2/);
});

test("toCsv keeps a lone flat row for an entry with no sets and no count", () => {
  const p = {
    liftHistory: {
      "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2 }]
    }
  };
  const csv = A.toCsv(p, { fri: { ex: [{ n: "Smith squat" }] }, sat: { ex: [] }, sun: { ex: [] } });
  assert.equal(csv.split("\n").length, 2); // header + one row, nothing dropped
});
