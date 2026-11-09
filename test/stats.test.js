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

test("toCsv escapes formula-leading cells", () => {
  const csv = S.toCsv({ liftHistory: { "fri:0": [{ date: "2026-11-08", sets: [{ load: 0, reps: 1, rir: 0 }] }] } }, { fri: { ex: [{ n: "=cmd" }] } });
  assert.ok(csv.indexOf("'=cmd") !== -1);
});
