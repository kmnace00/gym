const test = require("node:test");
const assert = require("node:assert");
const P = require("../program.js");
const S = require("../store.js");

/* The durability story is a single localStorage key. Make the ceiling visible
   before it becomes a production surprise: a full year of per-set history
   (24 lifts × 52 sessions × every set) must stay comfortably under quota.   */
test("a full year of per-set history stays well under localStorage scale", () => {
  const p = S.emptyPayload();
  ["fri", "sat", "sun"].forEach((d) => {
    P.DAYS[d].ex.forEach((e, i) => {
      for (let n = 0; n < S.HISTORY_MAX; n++) {
        const sets = [];
        for (let s = 0; s < e.s; s++) sets.push({ load: e.load || P.BODYWEIGHT_KG, reps: e.r, rir: e.rir });
        S.pushHistory(p, d, i, {
          date: "2026-01-01", load: e.load || P.BODYWEIGHT_KG, reps: e.r, rir: e.rir,
          hitTop: true, setsDone: e.s, sets: sets, exId: e.id
        });
      }
    });
  });
  const bytes = JSON.stringify(p).length;
  assert.ok(bytes < 512 * 1024, "payload is " + bytes + " bytes; keep it under 512 KB");
});
