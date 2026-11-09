const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const P = require("../program.js");
const S = require("../store.js");

/* The durability story is a single localStorage key. Make the ceiling visible
   before it becomes a production surprise: ~10 years of per-set history
   (24 lifts × 520 sessions × every set) must stay under quota.            */
test("ten years of per-set history stays under localStorage quota", () => {
  const p = S.emptyPayload();
  ["fri", "sat", "sun"].forEach((d) => {
    P.DAYS[d].ex.forEach((e, i) => {
      for (let n = 0; n < S.HISTORY_MAX; n++) {
        const sets = [];
        for (let s = 0; s < e.s; s++) sets.push({ load: e.load || P.BODYWEIGHT_LB, reps: e.r, rir: e.rir });
        S.pushHistory(p, d, i, {
          date: "2026-01-01", load: e.load || P.BODYWEIGHT_LB, reps: e.r, rir: e.rir,
          hitTop: true, setsDone: e.s, sets: sets, exId: e.id
        });
      }
    });
  });
  const chars = JSON.stringify(p).length;
  assert.ok(chars < 3.5 * 1024 * 1024, "payload is " + chars + " chars; keep it under 3.5 MB");
});

/* The service worker precaches the whole app, so the bytes an offline phone
   must download are bounded by the ASSETS list. Keep that ceiling visible. */
test("precached assets stay under 250 KB and every listed asset exists", () => {
  const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const listMatch = /const ASSETS\s*=\s*\[([\s\S]*?)\];/.exec(sw);
  assert.ok(listMatch, "sw.js must still expose the ASSETS array");
  const assets = [...listMatch[1].matchAll(/"([^"]+)"/g)]
    .map((m) => m[1].replace(/^\.\//, ""))
    .filter((a) => a !== "");
  assert.ok(assets.length >= 10, "ASSETS list looks truncated: " + assets.length);
  let bytes = 0;
  for (const a of assets) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", a)), "ASSETS lists a missing file: " + a);
    bytes += fs.statSync(path.join(__dirname, "..", a)).size;
  }
  assert.ok(bytes < 250 * 1024, "precached assets total " + bytes + " bytes; keep under 250 KB");
});
