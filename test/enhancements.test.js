const test = require("node:test");
const assert = require("node:assert");
const S = require("../store.js");
const P = require("../program.js");
const A = require("../stats.js");

/* ── import/persist sanitization (blocks the backup → innerHTML vector) ─── */

test("migrate coerces hostile numeric fields to numbers", () => {
  const raw = JSON.stringify({
    v: 2, cur: "fri", idx: 0,
    state: {
      "fri:0": {
        done: "3", load: "<img src=x onerror=alert(1)>", reps: "6", rir: "2",
        sets: [{ load: "50", reps: "<b>", rir: "1" }]
      }
    },
    liftHistory: {
      "fri:0": [{ date: "2026-11-01", load: "50", reps: "6", rir: "2", hitTop: 1, setsDone: "3" }]
    }
  });
  const p = S.migrate(raw);
  assert.strictEqual(p.state["fri:0"].done, 3);
  assert.strictEqual(p.state["fri:0"].load, 0);     // hostile string → NaN-safe default
  assert.strictEqual(p.state["fri:0"].reps, 6);
  assert.strictEqual(p.state["fri:0"].sets[0].reps, 0);
  assert.strictEqual(p.liftHistory["fri:0"][0].hitTop, true);
  assert.strictEqual(p.liftHistory["fri:0"][0].setsDone, 3);
});

test("sanitize never adds keys (missing fields stay for getLift to fill)", () => {
  const p = S.migrate(JSON.stringify({ v: 2, cur: "fri", idx: 0, state: { "fri:0": { done: 1 } } }));
  assert.ok(!("load" in p.state["fri:0"]));
  assert.ok(!("reps" in p.state["fri:0"]));
});

/* ── deload / stall guard ───────────────────────────────────────────────── */

const miss = (load) => ({ load: load, hitTop: false });

test("stallLoad needs three consecutive misses", () => {
  const e = { step: 2.5 };
  assert.strictEqual(P.stallLoad(e, [miss(60)]), null);
  assert.strictEqual(P.stallLoad(e, [miss(60), miss(60)]), null);
  assert.ok(P.stallLoad(e, [miss(60), miss(60), miss(60)]));
});

test("stallLoad deloads ~10% snapped to the step", () => {
  const e = { step: 2.5 };
  const s = P.stallLoad(e, [miss(60), miss(60), miss(60)]);
  assert.strictEqual(s.load, 55);          // 54 → snapped to 2.5 → 55
  assert.ok(s.load < 60);
});

test("stallLoad is null when any of the last three hit top", () => {
  const e = { step: 5 };
  assert.strictEqual(P.stallLoad(e, [miss(100), { load: 100, hitTop: true }, miss(100)]), null);
});

test("stallLoad ignores the recent past before a hot streak? — only last 3 count", () => {
  const e = { step: 5 };
  const s = P.stallLoad(e, [{ load: 80, hitTop: true }, miss(100), miss(100), miss(100)]);
  assert.strictEqual(s.load, 90);
});

/* ── time-window analytics ──────────────────────────────────────────────── */

function windowed() {
  return {
    liftHistory: {
      "fri:0": [
        { date: "2026-11-01", load: 40, reps: 5, setsDone: 3 }, // prior 7d
        { date: "2026-11-08", load: 50, reps: 6, setsDone: 3 }  // this 7d
      ]
    }
  };
}

test("weekOverWeek compares the last 7 days to the prior 7", () => {
  const w = A.weekOverWeek(windowed(), "2026-11-08");
  assert.strictEqual(w.thisWeek, 900);   // 50*6*3 on 11-08
  assert.strictEqual(w.lastWeek, 600);   // 40*5*3 on 11-01
  assert.strictEqual(w.deltaPct, 50);
  assert.strictEqual(w.hasPrev, true);
});

test("sessionsLast7 counts distinct session dates in the window", () => {
  assert.strictEqual(A.sessionsLast7(windowed(), "2026-11-08"), 1); // 11-01 is too old
});

test("personalRecords ranks the best entry per lift", () => {
  const DAYS = { fri: { ex: [{ n: "Smith squat" }] }, sat: { ex: [] }, sun: { ex: [] } };
  const p = {
    liftHistory: {
      "fri:0": [
        { date: "2026-11-01", load: 50, reps: 6, setsDone: 3 },
        { date: "2026-11-08", load: 55, reps: 5, setsDone: 3 }
      ]
    }
  };
  const metric = (load, reps) => (load > 0 ? load * (1 + reps / 30) : reps);
  const prs = A.personalRecords(p, DAYS, metric);
  assert.strictEqual(prs.length, 1);
  assert.strictEqual(prs[0].name, "Smith squat");
  assert.strictEqual(prs[0].load, 55);
});
