const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const P = require("../program.js");
const S = require("../store.js");
const C = require("../tools/check-sw-cache.js");

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
   must download are bounded by the ASSETS list. Keep that ceiling visible.
   Ceiling raised 250 -> 300 KB in v131 (Nov 13): the Phase 1 release Khang
   approved (timestamps + calibration engine, ramps, honest clock, notify
   rework) added ~18 KB of code; 272 KB total is still a small precache.
   Recorded in DECISIONS.md.
   Ceiling raised 300 -> 320 KB in v346 (Nov 26, 2026): the 4-day split
   Khang asked for (DAYS4 program set, split toggle, mode-aware week/stats
   plumbing) added ~6 KB; ~313 KB total is still a small one-shot precache.
   Recorded in DECISIONS.md. */
test("precached assets stay under 320 KB and every listed asset exists", () => {
  const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const assets = C.parseAssets(sw);
  assert.ok(assets, "sw.js must still expose a plausible ASSETS array");
  let bytes = 0;
  for (const a of assets) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", a)), "ASSETS lists a missing file: " + a);
    bytes += fs.statSync(path.join(__dirname, "..", a)).size;
  }
  assert.ok(bytes < 320 * 1024, "precached assets total " + bytes + " bytes; keep under 320 KB");
});

/* Every gate that reads sw.js must agree on what the ASSETS list is. If the
   list is missing or truncated, two gates currently pass with zero assets —
   so the shared parser must reject that instead of returning an empty list. */
test("the shared ASSETS parser rejects a truncated list and accepts both quotes", () => {
  const names = Array.from({ length: 14 }, (_, i) => "asset-" + i + ".js");
  const singleQuoted = "const ASSETS = [\n" + names.map((n) => "  './" + n + "'").join(",\n") + "\n];";
  assert.deepEqual(C.parseAssets(singleQuoted), names, "both quote styles parse");
  assert.equal(C.parseAssets("const ASSETS = [];"), null, "an empty list must fail closed");
});

/* The SWR comment quotes how many bytes conditional revalidation saves. Keep
   that claim honest — it is the argument for keeping the optimization. */
test("the offline refresh comment's byte estimate matches the real JS/CSS", () => {
  const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const stated = /re-downloading ~(\d+) KB of JS\/CSS/.exec(sw);
  assert.ok(stated, "sw.js must state the refresh cost in its comment");
  const jsCss = C.parseAssets(sw).filter((a) => /\.(?:js|css)$/.test(a));
  const bytes = jsCss.reduce((sum, a) => sum + fs.statSync(path.join(__dirname, "..", a)).size, 0);
  const actual = Math.round(bytes / 1024);
  assert.ok(Math.abs(Number(stated[1]) - actual) <= 10,
    "comment says ~" + stated[1] + " KB but the JS/CSS assets are ~" + actual + " KB");
});

/* The cache guard must see the real bytes of the two binary icons. A UTF-8
   decode maps every invalid byte to U+FFFD, so two different PNGs can collapse
   to the same string and a changed icon ships without a version bump. */
test("cache digest hashes raw bytes, not lossy UTF-8 text", () => {
  const a = Buffer.from([0xff, 0xfe, 0x80, 0x81, 0x82]);
  const b = Buffer.from([0xfd, 0xfc, 0x83, 0x84, 0x85]);
  assert.equal(a.toString("utf8"), b.toString("utf8"), "fixture: both decode identically");
  const da = C.assetDigest(["icon-192.png"], () => a);
  const db = C.assetDigest(["icon-192.png"], () => b);
  assert.notEqual(da, db, "different binary bytes must produce different digests");
});
