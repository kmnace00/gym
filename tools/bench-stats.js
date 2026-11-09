/* Opt-in stats benchmark (not part of `npm run check`): builds a payload at the
   store caps (24 lifts × 520 sessions × 3 sets) and times the Progress view's
   aggregation, so performance work can be measured instead of guessed.
   Usage: node tools/bench-stats.js [iterations]                              */
const path = require("path");
const S = require(path.join(__dirname, "..", "stats.js"));
const P = require(path.join(__dirname, "..", "program.js"));

function maxPayload() {
  const lh = {};
  Object.keys(P.DAYS).forEach((d) => {
    P.DAYS[d].ex.forEach((e, i) => {
      const arr = [];
      for (let n = 0; n < 520; n++) {
        const dt = new Date(Date.UTC(2026, 0, 2) + n * 7 * 864e5);
        const date = dt.toISOString().slice(0, 10);
        const sets = [];
        for (let s = 0; s < 3; s++) sets.push({ load: 60 + (n % 10), reps: e.r, rir: e.rir });
        arr.push({ date: date, load: 60 + (n % 10), reps: e.r, rir: e.rir, setsDone: 3, bw: !!e.bw, sets: sets });
      }
      lh[d + ":" + i] = arr;
    });
  });
  return { v: 4, bodyweight: 165, liftHistory: lh, sessionLog: [], state: {} };
}

const iters = parseInt(process.argv[2], 10) || 5;
const p = maxPayload();
S.progressSnapshot(p, P.DAYS, P.progressMetric, "2026-11-09", { fri: 8, sat: 8, sun: 8 }); // warm up
const t0 = process.hrtime.bigint();
for (let i = 0; i < iters; i++) S.progressSnapshot(p, P.DAYS, P.progressMetric, "2026-11-09", { fri: 8, sat: 8, sun: 8 });
const ms = Number(process.hrtime.bigint() - t0) / 1e6 / iters;
console.log("progressSnapshot: " + ms.toFixed(1) + " ms/run · " + Object.keys(p.liftHistory).length + " lift keys × 520 sessions × 3 sets");
