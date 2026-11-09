const test = require("node:test");
const assert = require("node:assert");
const S = require("../stats.js");
const P = require("../program.js");

function sample() {
  return {
    state: { "fri:0": { done: 3 }, "fri:1": { done: 1 } },
    liftHistory: {
      "fri:0": [
        { date: "2026-10-01", load: 50, reps: 6, rir: 2, setsDone: 3 },
        { date: "2026-11-01", load: 55, reps: 6, rir: 2, setsDone: 3 }
      ],
      "fri:1": [{ date: "2026-11-01", load: 40, reps: 8, rir: 2, setsDone: 3 }]
    }
  };
}

test("sessionCount and setsLogged", () => {
  const p = sample();
  assert.equal(S.sessionCount(p), 2); // two distinct workout dates, not three lifts
  assert.equal(S.setsLogged(p), 4);
  assert.equal(S.sessionCount({}), 0);
  assert.equal(S.setsLogged({}), 0);
});

test("setsRecorded sums sets across history entries", () => {
  assert.equal(S.setsRecorded(sample()), 9); // three entries × 3 sets
});

test("entryVolume is load × reps × sets, bodyweight valued at bwKg", () => {
  assert.equal(S.entryVolume({ load: 50, reps: 6, setsDone: 3 }), 900);
  // bodyweight no longer reads as zero volume (default 75 kg per rep)
  assert.equal(S.entryVolume({ load: 0, reps: 10, setsDone: 3 }), 75 * 10 * 3);
  assert.equal(S.entryVolume({ load: 0, reps: 10, setsDone: 3 }, 80), 80 * 10 * 3);
});

test("totalVolume sums every entry", () => {
  // 50*6*3 = 900, 55*6*3 = 990, 40*8*3 = 960
  assert.equal(S.totalVolume(sample()), 2850);
});

test("sessionVolumes groups by date and sorts oldest → newest", () => {
  const out = S.sessionVolumes(sample());
  assert.equal(out.length, 2);
  assert.equal(out[0].date, "2026-10-01");
  assert.equal(out[0].volume, 900);
  assert.equal(out[1].date, "2026-11-01");
  assert.equal(out[1].volume, 990 + 960);
});

test("recentVolume keeps the newest n", () => {
  const out = S.recentVolume(sample(), 1);
  assert.equal(out.length, 1);
  assert.equal(out[0].date, "2026-11-01");
});

test("volumeByDay uses each lift's latest entry", () => {
  const DAYS = { fri: { ex: [{}, {}] }, sat: { ex: [{}] }, sun: { ex: [] } };
  const out = S.volumeByDay(sample(), DAYS);
  assert.equal(out.fri, 990 + 960);
  assert.equal(out.sat, 0);
  assert.equal(out.sun, 0);
});

test("uniqueDays counts distinct calendar dates", () => {
  assert.equal(S.uniqueDays(sample()), 2);
});

test("entrySets expands legacy scalar entries into rows", () => {
  const sets = S.entrySets({ load: 50, reps: 6, rir: 2, setsDone: 3 });
  assert.equal(sets.length, 3);
  assert.deepEqual(sets[0], { load: 50, reps: 6, rir: 2 });
  assert.equal(S.entrySets({ sets: [{ load: 1, reps: 2, rir: 0 }] }).length, 1);
});

test("mixed sets use every set, not the last one", () => {
  const e = { sets: [{ load: 60, reps: 8, rir: 2 }, { load: 60, reps: 7, rir: 1 }, { load: 60, reps: 6, rir: 0 }] };
  assert.equal(S.entryVolume(e), 60 * (8 + 7 + 6));
});

test("weighted bodyweight work values total system weight", () => {
  const e = { bw: true, sets: [{ load: 2.5, reps: 6, rir: 2 }, { load: 2.5, reps: 6, rir: 2 }, { load: 2.5, reps: 6, rir: 2 }] };
  assert.equal(S.entryVolume(e, 75), 77.5 * 6 * 3);
});

test("personalRecords picks the best set and rewards added bodyweight", () => {
  const DAYS = { fri: { ex: [{ n: "Dip", bw: true }] } };
  const payload = {
    bodyweight: 75, liftHistory: {
      "fri:0": [
        { date: "2026-11-01", bw: true, sets: [{ load: 0, reps: 6, rir: 2 }] },
        { date: "2026-11-08", bw: true, sets: [{ load: 2.5, reps: 6, rir: 2 }] }
      ]
    }
  };
  const prs = S.personalRecords(payload, DAYS, P.progressMetric);
  assert.equal(prs.length, 1);
  assert.equal(prs[0].date, "2026-11-08");
  assert.ok(prs[0].metric > P.progressMetric(0, 6, { bw: true, bodyweight: 75 }));
});

test("weekStatus marks done / partial / missed in the current week", () => {
  const liftHistory = {};
  for (let i = 0; i < 8; i++) liftHistory["fri:" + i] = [{ date: "2026-11-06", load: 50 }];
  liftHistory["sat:0"] = [{ date: "2026-11-07", load: 50 }];
  liftHistory["sat:1"] = [{ date: "2026-11-07", load: 50 }];
  const w = S.weekStatus({ liftHistory }, "2026-11-09"); // Monday after
  assert.equal(w[0].state, "done");
  assert.equal(w[1].state, "partial");
  assert.equal(w[2].state, "missed");
});

test("weekStatus honours a per-day lift count", () => {
  const len = P.DAYS.fri.ex.length;
  const liftHistory = {};
  for (let i = 0; i < len; i++) {
    liftHistory["fri:" + i] = [{ date: "2026-11-06", load: 50, reps: 6, rir: 2, setsDone: 3 }];
  }
  assert.equal(S.weekStatus({ liftHistory }, "2026-11-09", { fri: len, sat: 1, sun: 1 })[0].state, "done");
  assert.equal(S.weekStatus({ liftHistory }, "2026-11-09", { fri: len + 1, sat: 1, sun: 1 })[0].state, "partial");
  assert.equal(S.weekStatus({ liftHistory }, "2026-11-09")[0].state, "done");
});

test("toCsv escapes formula-leading cells", () => {
  const csv = S.toCsv({ liftHistory: { "fri:0": [{ date: "2026-11-08", sets: [{ load: 0, reps: 1, rir: 0 }] }] } }, { fri: { ex: [{ n: "=cmd" }] } });
  assert.ok(csv.indexOf("'=cmd") !== -1);
});

test("sessionDrift needs three completed sessions before it reports", () => {
  assert.deepEqual(S.sessionDrift({}, "fri", 60), { n: 0, insufficient: true });
  assert.deepEqual(S.sessionDrift({ sessionLog: [{ day: "fri", status: "complete", durationSec: 3600 }] }, "fri", 60), { n: 1, insufficient: true });
  assert.deepEqual(S.sessionDrift({ sessionLog: [
    { day: "fri", status: "complete", durationSec: 3600 },
    { day: "fri", status: "complete", durationSec: 4200 }
  ] }, "fri", 60), { n: 2, insufficient: true });
});

test("sessionDrift compares the median actual session to the day estimate", () => {
  const r = S.sessionDrift({ sessionLog: [
    { day: "fri", status: "complete", durationSec: 3600 },
    { day: "fri", status: "complete", durationSec: 4200 },
    { day: "fri", status: "complete", durationSec: 4800 }
  ] }, "fri", 60);
  assert.equal(r.n, 3);
  assert.equal(r.estimateMin, 60);
  assert.equal(r.medianActualMin, 70);
  assert.equal(r.driftPct, 16.7);
});

test("sessionDrift takes the middle two for an even count", () => {
  const r = S.sessionDrift({ sessionLog: [
    { day: "fri", status: "complete", durationSec: 4800 },
    { day: "fri", status: "complete", durationSec: 3000 },
    { day: "fri", status: "complete", durationSec: 4200 },
    { day: "fri", status: "complete", durationSec: 3600 }
  ] }, "fri", 60);
  assert.equal(r.n, 4);
  assert.equal(r.medianActualMin, 65);
  assert.equal(r.driftPct, 8.3);
});

test("sessionDrift ignores incomplete, zero-length and other-day sessions", () => {
  const r = S.sessionDrift({ sessionLog: [
    { day: "fri", status: "complete", durationSec: 3600 },
    { day: "fri", status: "active", durationSec: 5000 },
    { day: "fri", status: "complete", durationSec: 0 },
    { day: "fri", status: "complete" },
    { day: "sat", status: "complete", durationSec: 4000 },
    { day: "fri", status: "complete", durationSec: 4200 },
    { day: "fri", status: "complete", durationSec: 3900 }
  ] }, "fri", 65);
  assert.equal(r.n, 3);
  assert.equal(r.medianActualMin, 65);
  assert.equal(r.driftPct, 0);
});

test("sessionDrift works with the real program estimate", () => {
  const r = S.sessionDrift({ sessionLog: [
    { day: "fri", status: "complete", durationSec: 4000 },
    { day: "fri", status: "complete", durationSec: 4400 },
    { day: "fri", status: "complete", durationSec: 4800 }
  ] }, "fri", P.dayMins);
  assert.equal(r.n, 3);
  assert.equal(r.estimateMin, 74);        // 74-min model for Friday
  assert.equal(r.medianActualMin, 73.3);
  assert.equal(r.driftPct, -0.9);
});

test("topSet picks the set with the highest metric", () => {
  const sets = [{ load: 60, reps: 5 }, { load: 70, reps: 3 }, { load: 50, reps: 10 }];
  // epley-ish: 60×1.167 = 70, 70×1.1 = 77, 50×1.333 = 66.7 → the 70×3 set wins
  assert.deepEqual(S.topSet(sets, (l, r) => l * (1 + r / 30)), { load: 70, reps: 3 });
  // by raw tonnage the 50×10 set (500) beats 60×5 (300) and 70×3 (210)
  assert.deepEqual(S.topSet(sets, (l, r) => l * r), { load: 50, reps: 10 });
  assert.equal(S.topSet([], (l, r) => l), null);
  assert.equal(S.topSet(null, (l, r) => l), null);
});

test("compactVol formats tonnage for the Progress view", () => {
  assert.equal(S.compactVol(999), "999");
  assert.equal(S.compactVol(1000), "1.0k");
  assert.equal(S.compactVol(12345), "12.3k");
  assert.equal(S.compactVol(undefined), "0");
});

test("topMovers ranks the first→last change in top-set metric", () => {
  const p = {
    bodyweight: 75,
    liftHistory: {
      "fri:0": [
        { date: "2026-10-01", load: 50, reps: 6, setsDone: 3 },
        { date: "2026-11-01", load: 55, reps: 6, setsDone: 3 }
      ],
      "fri:1": [{ date: "2026-11-01", load: 40, reps: 8, setsDone: 3 }]
    }
  };
  const m = S.topMovers(p, P.DAYS, P.epley1rm);
  assert.equal(m.length, 1); // the single-entry lift is skipped
  assert.equal(m[0].name, P.DAYS.fri.ex[0].n);
  assert.equal(m[0].delta, 6); // 66 − 60
  assert.equal(m[0].pct, 10);
  assert.ok(m[0].pct > 0);
  assert.deepEqual(S.topMovers({}, P.DAYS, P.epley1rm), []);
});

test("topMovers caps at three lifts, sorted by pct descending", () => {
  const m = S.topMovers({
    bodyweight: 75,
    liftHistory: {
      "fri:0": [{ date: "2026-10-01", load: 50, reps: 6, setsDone: 1 }, { date: "2026-11-01", load: 55, reps: 6, setsDone: 1 }],
      "fri:1": [{ date: "2026-10-01", load: 60, reps: 6, setsDone: 1 }, { date: "2026-11-01", load: 72, reps: 6, setsDone: 1 }],
      "sat:0": [{ date: "2026-10-01", load: 40, reps: 6, setsDone: 1 }, { date: "2026-11-01", load: 44, reps: 6, setsDone: 1 }],
      "sun:0": [{ date: "2026-10-01", load: 30, reps: 6, setsDone: 1 }, { date: "2026-11-01", load: 60, reps: 6, setsDone: 1 }]
    }
  }, P.DAYS, P.epley1rm);
  assert.equal(m.length, 3);
  assert.equal(m[0].name, P.DAYS.sun.ex[0].n); // +100 %
  assert.equal(m[1].name, P.DAYS.fri.ex[1].n); // +20 %
  assert.equal(m[2].name, P.DAYS.fri.ex[0].n); // +10 %
  assert.ok(m[0].pct >= m[1].pct && m[1].pct >= m[2].pct);
});

test("workoutDates unions history dates with the session log", () => {
  const p = {
    liftHistory: { "fri:0": [{ date: "2026-10-01", load: 50, reps: 6, setsDone: 3 }] },
    sessionLog: [{ date: "2026-11-01", day: "fri", durationSec: 60, status: "complete" }]
  };
  assert.deepEqual(S.workoutDates(p), ["2026-10-01", "2026-11-01"]);
  assert.deepEqual(S.workoutDates({}), []);
  assert.deepEqual(S.workoutDates({ sessionLog: [null] }), []);
});

test("topMovers forwards bodyweight options to the metric", () => {
  const i = P.DAYS.fri.ex.findIndex((e) => e.bw);
  const key = "fri:" + i;
  const p = {
    bodyweight: 90,
    liftHistory: {
      [key]: [
        { date: "2026-10-01", load: 0, reps: 6, setsDone: 3 },
        { date: "2026-11-01", load: 10, reps: 6, setsDone: 3 }
      ]
    }
  };
  const m = S.topMovers(p, P.DAYS, P.progressMetric);
  assert.equal(m.length, 1);
  assert.equal(m[0].name, P.DAYS.fri.ex[i].n);
  assert.equal(m[0].delta, 12);   // 90 -> 100 bodyweight-adjusted
  assert.equal(m[0].pct, 11.1);   // 90 x 1.2 = 108 -> 100 x 1.2 = 120
  // the opts ride through as the metric's third argument
  const bw = S.topMovers(p, P.DAYS, (l, r, o) => l + (o && o.bw ? (o.bodyweight || 0) : 0));
  assert.equal(bw.length, 1);
  assert.equal(bw[0].delta, 10);
  assert.equal(bw[0].pct, 11.1);
  // a load-only metric scores the first entry 0, and topMovers skips a lift
  // whose first metric is falsy, so the bodyweight lift drops out entirely.
  assert.deepEqual(S.topMovers(p, P.DAYS, (l, r) => l * (1 + r / 30)), []);
  assert.deepEqual(S.topMovers(p, P.DAYS, P.epley1rm), []);
});

test("bodyweight history is valued at the weight in force", () => {
  const i = P.DAYS.fri.ex.findIndex((x) => x.bw), key = "fri:" + i;
  const a = { date: "2026-10-01", load: 0, reps: 6, setsDone: 3, bw: true, bwKg: 75 };
  const b = { date: "2026-11-01", load: 0, reps: 6, setsDone: 3, bw: true, bwKg: 100 };
  assert.equal(S.entryVolume(a, 100), 1350); // 75 kg banked, not today's 100
  assert.equal(S.entryVolume(b, 100), 1800);
  // legacy entries (no bwKg) keep the scalar passed in
  assert.equal(S.entryVolume({ date: "2026-10-01", load: 0, reps: 6, setsDone: 3, bw: true }, 100), 1800);
  const p = { bodyweight: 100, liftHistory: { [key]: [a, b] } };
  assert.equal(S.totalVolume(p), 3150);
  assert.equal(S.personalRecords(p, P.DAYS, P.progressMetric)[0].metric, 120); // 100 × 1.2
  const mv = S.topMovers(p, P.DAYS, P.progressMetric);
  assert.equal(mv.length, 1);
  assert.equal(mv[0].pct, 33.3); // 90 -> 120

  /* the PR must come from the heavier session even when today is lighter:
     both entries at the payload's 75 kg would tie at 90 */
  const q = { bodyweight: 75, liftHistory: { [key]: [
    { date: "2026-10-01", load: 0, reps: 6, setsDone: 3, bw: true, bwKg: 100 },
    { date: "2026-11-01", load: 0, reps: 6, setsDone: 3, bw: true, bwKg: 75 }
  ] } };
  assert.equal(S.personalRecords(q, P.DAYS, P.progressMetric)[0].metric, 120);
});
