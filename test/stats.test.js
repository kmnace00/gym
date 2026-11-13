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
  // bodyweight no longer reads as zero volume (default 165 lb per rep)
  assert.equal(S.entryVolume({ load: 0, reps: 10, setsDone: 3 }), 165 * 10 * 3);
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

test("B6-02: a Wednesday session covers Friday in the week containing its date", () => {
  const lifts = {};
  for (let i = 0; i < 8; i++) lifts["fri:" + i] = { done: 3, sets: [{ load: 50, reps: 6, rir: 2 }] };
  const payload = { sessionLog: [{ date: "2026-11-04", day: "fri", status: "complete", lifts }] };
  // Wed 4 Nov still projects the previous Fri–Sun block; the covered day is Fri 6 Nov.
  const prev = S.weekStatus(payload, "2026-11-04");
  assert.equal(prev[0].date, "2026-10-30");
  assert.equal(prev[0].state, "missed");
  const fri = S.weekStatus(payload, "2026-11-06");
  assert.equal(fri[0].state, "done");
  assert.equal(fri[0].lifts, 8);
  assert.equal(S.weekStatus(payload, "2026-11-09")[0].state, "done"); // Monday after too
  const weeks = S.trainingDays(payload, 8, "2026-11-06");
  assert.equal(weeks[weeks.length - 1].fri, true);
  assert.equal(weeks[weeks.length - 1].sat, false);
  const snap = S.progressSnapshot(payload, P.DAYS, P.progressMetric, "2026-11-06", { fri: 8, sat: 8, sun: 8 });
  assert.equal(snap.heatCount, 1);
});

test("B6-02: a covered day counts once and needs a complete session with work", () => {
  const mk = (date, day) => {
    const lifts = {};
    for (let i = 0; i < 8; i++) lifts[day + ":" + i] = { done: 3, sets: [{ load: 50, reps: 6, rir: 2 }] };
    return { date, day, status: "complete", lifts };
  };
  const liftHistory = {};
  for (let i = 0; i < 8; i++) liftHistory["fri:" + i] = [{ date: "2026-11-06", load: 50, reps: 6, rir: 2, setsDone: 3 }];
  const payload = { liftHistory, sessionLog: [mk("2026-11-04", "fri"), mk("2026-11-06", "fri")] };
  const snap = S.progressSnapshot(payload, P.DAYS, P.progressMetric, "2026-11-06", { fri: 8, sat: 8, sun: 8 });
  assert.equal(snap.heatCount, 1, "Friday is one training day, not two");
  assert.equal(S.weekStatus(payload, "2026-11-06")[0].lifts, 8, "coverage is not summed");

  // an incomplete session, or one with no logged lifts, covers nothing
  const none = { sessionLog: [
    { date: "2026-11-04", day: "fri", status: "active", lifts: mk("2026-11-04", "fri").lifts },
    { date: "2026-11-04", day: "fri", status: "complete", lifts: {} }
  ] };
  assert.equal(S.trainingDays(none, 8, "2026-11-06").pop().fri, false);
  assert.equal(S.weekStatus(none, "2026-11-07")[0].state, "missed");

  // some but not all of the day's lifts logged → partial
  const half = { sessionLog: [{ date: "2026-11-04", day: "fri", status: "complete", lifts: {
    "fri:0": { done: 3, sets: [] }, "fri:1": { done: 3, sets: [] }, "fri:2": { done: 3, sets: [] }
  } }] };
  assert.equal(S.weekStatus(half, "2026-11-06")[0].state, "partial");
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
  assert.equal(r.estimateMin, 92);        // N6 honest clock: 75 base + stretch/setup/ramps
  assert.equal(r.medianActualMin, 73.3);
  assert.equal(r.driftPct, -20.3);
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

test("workoutDates / trainingDays are null-prototype maps — a __proto__ date counts, it does not touch Object.prototype", () => {
  const p = {
    liftHistory: {
      "fri:0": [{ date: "2026-11-06", load: 50, reps: 6, rir: 2, setsDone: 3 }],
      "sat:0": [{ date: "__proto__", load: 50, reps: 6, rir: 2, setsDone: 3 }]
    },
    sessionLog: [{ id: "s1", date: "__proto__", day: "sun", durationSec: 600, status: "complete", lifts: {} }]
  };
  const dates = S.workoutDates(p);
  assert.ok(dates.includes("__proto__"), "the hostile date is a key of the map, not a prototype write");
  assert.equal(dates.length, 2, "no double-counting, no lost day");
  const weeks = S.trainingDays(p, 8, "2026-11-09");
  assert.equal(weeks.filter((w) => w.fri || w.sat || w.sun).length, 1, "the real training day still counts");
  assert.equal(Object.getPrototypeOf(Object.prototype), null, "Object.prototype is untouched");
  assert.equal(Object.prototype.evil, undefined);
});

test("topMovers forwards bodyweight options to the metric", () => {
  const i = P.DAYS.sun.ex.findIndex((e) => e.bw); // pull-ups — Friday's dip is assisted since N15
  const key = "sun:" + i;
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
  assert.equal(m[0].name, P.DAYS.sun.ex[i].n);
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
  const i = P.DAYS.sun.ex.findIndex((x) => x.bw), key = "sun:" + i; // pull-ups (the dip is assisted since N15)
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

test("progressSnapshot assembles the dashboard from one payload", () => {
  const p = { bodyweight: 165, liftHistory: { "fri:0": [
    { date: "2026-11-01", load: 100, reps: 6, rir: 2, setsDone: 3 },
    { date: "2026-11-08", load: 110, reps: 6, rir: 2, setsDone: 3 }
  ] } };
  const snap = S.progressSnapshot(p, P.DAYS, P.progressMetric, "2026-11-09", { fri: 8, sat: 8, sun: 8 });
  assert.equal(snap.workouts, 2);
  assert.equal(snap.sets, 6);
  assert.equal(snap.volume, 3780);
  assert.equal(snap.weekTotal, 3);
  assert.equal(snap.weekDone, 0); // only fri:0 logged, so that Friday is partial
  // volumeByDay is the *most recent* session per day, not the sum of the week:
  // fri is 1980 (the 11-08 entry), not 1800 + 1980 = 3780.
  assert.equal(snap.byDay.fri, 1980);
  assert.equal(snap.heatTotal, 24);
  assert.equal(snap.heatCount, 2);
  assert.equal(snap.recent.length, 2);
  assert.equal(snap.pr.metric, 132);
  assert.equal(snap.movers.length, 1);
  assert.equal(snap.movers[0].pct, 10);
  // hasPrev is true, not false: 11-01 lands in the prior 7-day window
  // (2026-10-27 … 2026-11-02) when nowKey is 2026-11-09.
  assert.equal(snap.wow.hasPrev, true);
});

test("progressSnapshot equals the individual stats", () => {
  const p = { bodyweight: 165, liftHistory: { "fri:0": [
    { date: "2026-11-01", load: 100, reps: 6, rir: 2, setsDone: 3 },
    { date: "2026-11-08", load: 110, reps: 6, rir: 2, setsDone: 3 }
  ] } };
  const snap = S.progressSnapshot(p, P.DAYS, P.progressMetric, "2026-11-09", { fri: 8, sat: 8, sun: 8 });
  assert.equal(snap.workouts, S.sessionCount(p));
  assert.equal(snap.volume, S.totalVolume(p));
  assert.deepEqual(snap.recent, S.recentVolume(p, 12));
  assert.deepEqual(snap.wow, S.weekOverWeek(p, "2026-11-09"));
  assert.deepEqual(snap.byDay, S.volumeByDay(p, P.DAYS));

  // the threaded `volumes` argument must give exactly the same answers
  const vols = S.sessionVolumes(p);
  assert.deepEqual(S.workoutDates(p, vols), S.workoutDates(p));
  assert.equal(S.totalVolume(p, vols), S.totalVolume(p));
  assert.deepEqual(S.recentVolume(p, 5, vols), S.recentVolume(p, 5));
  assert.deepEqual(S.weekOverWeek(p, "2026-11-09", vols), S.weekOverWeek(p, "2026-11-09"));
});

test("resolveBodyweight: banked weight wins, then the fallback, then 165", () => {
  assert.equal(S.resolveBodyweight({ bwKg: 220 }, 175), 220);
  assert.equal(S.resolveBodyweight({}, 175), 175);
  assert.equal(S.resolveBodyweight(null, 175), 175);
  assert.equal(S.resolveBodyweight(undefined, 175), 175);
  for (const bad of [0, -3, NaN, Infinity, "220", null]) {
    assert.equal(S.resolveBodyweight({ bwKg: bad }, 175), 175, `invalid banked ${bad} falls back`);
  }
  for (const bad of [0, -1, NaN, "175", undefined, null]) {
    assert.equal(S.resolveBodyweight({}, bad), 165, `invalid fallback ${bad} uses the default`);
  }
});

test("the helper leaves tonnage and PR numbers exactly as the inlined rule did", () => {
  const DAYS = { fri: { ex: [{ n: "Dip", bw: true, s: 3, r: 6, step: 2.5 }] } };
  const payload = {
    bodyweight: 75,
    liftHistory: {
      "fri:0": [
        { date: "2026-11-01", bw: true, bwKg: 75, sets: [{ load: 0, reps: 6, rir: 2 }] },
        { date: "2026-11-08", bw: true, bwKg: 220, sets: [{ load: 2.5, reps: 6, rir: 2 }] }
      ]
    }
  };
  // entry 2 is valued at its banked 220 lb, not today's 75
  assert.equal(S.entryVolume(payload.liftHistory["fri:0"][1], payload.bodyweight), 222.5 * 6);
  assert.equal(S.totalVolume(payload), 75 * 6 + 222.5 * 6);
  const pr = S.personalRecords(payload, DAYS, P.progressMetric)[0];
  assert.equal(pr.metric, P.progressMetric(2.5, 6, { bw: true, bodyweight: 220 }));
});

/* B6-01: parseKey is internal, so the impossible-date guard is proven through
   the public consumers that call it (weekStatus, trainingDays, weekOverWeek,
   sessionsLast7). */
test("parseKey rejects impossible dates instead of rolling them", () => {
  for (const bad of ["2026-02-30", "2026-04-31", "2026-13-01", "0000-01-01"]) {
    assert.deepEqual(S.weekStatus({}, bad), [], `${bad} must not parse into a week`);
    assert.deepEqual(S.trainingDays({}, 2, bad), [], `${bad} must not parse into a week strip`);
    assert.deepEqual(S.weekOverWeek({}, bad), { thisWeek: 0, lastWeek: 0, deltaPct: 0, hasPrev: false }, `${bad} must not parse into a window`);
    assert.equal(S.sessionsLast7({}, bad), 0, `${bad} must not parse into a window`);
  }
  // a real leap date still round-trips: 2024-02-29 is a Thursday
  const rows = S.weekStatus({}, "2024-02-29");
  assert.equal(rows.length, 3);
  assert.equal(rows[0].date, "2024-02-23");
  assert.equal(rows[2].date, "2024-02-25");
  // ordinary dates are unchanged by the guard
  assert.deepEqual(S.weekStatus({}, "2026-11-09").map((r) => r.date), ["2026-11-06", "2026-11-07", "2026-11-08"]);
});

test("an impossible date in the payload is never attributed to Mar 2", () => {
  const payload = { liftHistory: { "fri:0": [{ date: "2026-02-30", load: 100, reps: 5, rir: 2, setsDone: 3 }] } };
  const protoBefore = Object.getOwnPropertyNames(Object.prototype).length;
  const vols = S.sessionVolumes(payload);
  assert.equal(vols.length, 1);
  assert.equal(vols[0].date, "2026-02-30"); // kept verbatim, never rewritten
  assert.equal(S.sessionsLast7(payload, "2026-02-30"), 0); // no window, no phantom session
  assert.equal(S.trainingDays(payload, 2, "2026-02-30").length, 0);
  const strip = S.trainingDays(payload, 2, "2026-03-02"); // the week Fri 27 – Sun 1
  assert.equal(strip.length, 2);
  assert.equal(strip[0].fri + strip[0].sat + strip[0].sun, 0);
  assert.equal(S.weekStatus(payload, "2026-02-30").length, 0);
  assert.equal(Object.getOwnPropertyNames(Object.prototype).length, protoBefore, "Object.prototype must stay unpolluted");
});

test("countsForProgression is the one swap-exclusion rule (B6-06)", () => {
  assert.equal(S.countsForProgression(null), false);
  assert.equal(S.countsForProgression({}), true);
  assert.equal(S.countsForProgression({ swap: "DB reverse lunge" }), false);
  assert.equal(S.countsForProgression({ swap: null }), true, "a dropped marker is not a swap");
});

test("swap entries are invisible to PRs but still counted in volume", () => {
  const p = sample();
  p.liftHistory["fri:0"].push({ date: "2026-11-08", load: 80, reps: 8, rir: 2, setsDone: 3, swap: "DB reverse lunge" });
  const DAYS = { fri: { ex: [{}, {}] }, sat: { ex: [{}] }, sun: { ex: [] } };
  const pr = S.personalRecords(p, DAYS, P.progressMetric)[0];
  assert.equal(pr.load, 55, "the swapped 80 lb session is not this lift's PR");
  /* the work was done — session volume keeps counting it */
  const vols = S.sessionVolumes(p);
  assert.equal(vols[vols.length - 1].volume, 80 * 8 * 3);
  assert.equal(vols[vols.length - 2].volume, 990 + 960);
});

/* ── N10: self-calibrating clock ─────────────────────────────────────────── */
const CAL_OPTS = {
  setSecs: P.SET_SECS, setupSeed: P.SETUP_SECS,
  restSecs: (e, prev) => e.rest + ((prev && prev.rir <= 1) ? 30 : 0),
  rampSecs: (e, load, isFirst) => { const r = P.rampFor(e, load, isFirst); return r ? r.secs : 0; }
};
function timedSession(startedAt, warmSec, residSec, extraLift) {
  // first set lands after ramp (270) + set (50) + setup seed (15) + warmSec
  const t1 = startedAt + (270 + 50 + 15 + warmSec) * 1000;
  const gap = (50 + 180 + residSec) * 1000; // set + squat rest + residual
  const lifts = {
    "fri:0": { done: 3, sets: [
      { load: 60, reps: 6, rir: 2, t: t1 },
      { load: 60, reps: 6, rir: 2, t: t1 + gap },
      { load: 60, reps: 6, rir: 2, t: t1 + gap * 2 }
    ] }
  };
  if (extraLift) {
    // a second lift starting long after — its boundary gap must NOT become
    // an overhead sample; its own within-lift residual is residSec too
    const u1 = t1 + gap * 2 + 900 * 1000;
    lifts["fri:1"] = { done: 2, sets: [
      { load: 50, reps: 6, rir: 2, t: u1 },
      { load: 50, reps: 6, rir: 2, t: u1 + (50 + 120 + residSec) * 1000 }
    ] };
  }
  return { id: "s" + startedAt, date: "2026-11-13", day: "fri", startedAt, endedAt: startedAt + 5400000, durationSec: 5400, status: "complete", lifts };
}

test("calibration: medians from the last timed sessions", () => {
  const base = 1700000000000;
  const p = { sessionLog: [
    timedSession(base, 240, 14, true),
    timedSession(base + 86400000, 300, 20, true),
    timedSession(base + 2 * 86400000, 360, 26, true)
  ] };
  assert.deepEqual(S.calibration(p, P.DAYS, CAL_OPTS), { sessions: 3, warmupSec: 300, overheadSec: 20 });
});

test("calibration: fewer than 3 timed sessions stays silent", () => {
  const base = 1700000000000;
  const untimed = { id: "old", date: "2026-11-01", day: "fri", startedAt: base - 86400000, status: "complete",
    lifts: { "fri:0": { done: 3, sets: [{ load: 60, reps: 6, rir: 2 }] } } };
  const p = { sessionLog: [untimed, timedSession(base, 240, 20), timedSession(base + 86400000, 300, 20)] };
  assert.equal(S.calibration(p, P.DAYS, CAL_OPTS), null);
});

test("calibration: clamps hold the learned values sane", () => {
  const base = 1700000000000;
  const p = { sessionLog: [
    timedSession(base, 5000, 500), timedSession(base + 86400000, 5000, 500), timedSession(base + 2 * 86400000, 5000, 500)
  ] };
  const c = S.calibration(p, P.DAYS, CAL_OPTS);
  assert.equal(c.warmupSec, 1200);
  assert.equal(c.overheadSec, 40);
});
