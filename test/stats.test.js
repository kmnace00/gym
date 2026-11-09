const test = require("node:test");
const assert = require("node:assert");
const S = require("../stats.js");

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
  assert.equal(S.sessionCount(p), 3);
  assert.equal(S.setsLogged(p), 4);
  assert.equal(S.sessionCount({}), 0);
  assert.equal(S.setsLogged({}), 0);
});

test("entryVolume is load × reps × sets", () => {
  assert.equal(S.entryVolume({ load: 50, reps: 6, setsDone: 3 }), 900);
  assert.equal(S.entryVolume({ load: 0, reps: 10, setsDone: 3 }), 0);
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
