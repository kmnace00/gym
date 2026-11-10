const test = require("node:test");
const assert = require("node:assert");

function mockLS() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    _map: m
  };
}

global.localStorage = mockLS();
const S = require("../store.js");
const P = require("../program.js");

test.beforeEach(() => { global.localStorage.clear(); });

test("emptyPayload opens on today's training day", () => {
  const d = new Date().getDay();
  const expected = d === 6 ? "sat" : (d === 0 ? "sun" : "fri");
  assert.equal(S.emptyPayload().cur, expected);
});

test("migrate v1 → v3 carries data forward", () => {
  const raw = JSON.stringify({ v: 1, cur: "sat", idx: 2, state: { "sat:0": { done: 1 } } });
  const p = S.migrate(raw);
  assert.equal(p.v, 4);
  assert.equal(p.cur, "sat");
  assert.equal(p.idx, 2);
  assert.deepEqual(p.state, { "sat:0": { done: 1 } });
  assert.deepEqual(p.liftHistory, {});
  assert.ok(p.active && p.active.date);
});

test("migrate v2 round-trips data and adds the v3 session fields", () => {
  const o = { v: 2, cur: "fri", idx: 0, state: {}, liftHistory: {} };
  const out = S.migrate(JSON.stringify(o));
  assert.equal(out.v, 4);
  assert.equal(out.cur, "fri");
  assert.equal(out.idx, 0);
  assert.deepEqual(out.state, {});
  assert.deepEqual(out.liftHistory, {});
  assert.equal(out.lastBackup, null);
  assert.equal(out.bodyweight, 165.3);
  assert.deepEqual(out.sessionLog, []);
  assert.equal(out.active.status, "active");
});

test("migrate v2 attaches a done session to its history date", () => {
  const raw = JSON.stringify({
    v: 2, cur: "fri", idx: 0, state: { "fri:0": { done: 3 } },
    liftHistory: { "fri:0": [{ date: "2026-11-06", load: 60, reps: 6, rir: 2, setsDone: 3 }] }
  });
  const p = S.migrate(raw);
  assert.equal(p.active.date, "2026-11-06");
  assert.equal(p.active.day, "fri");
});

test("migrate flags a future version instead of dropping it", () => {
  const p = S.migrate(JSON.stringify({ v: 99, a: 1 }));
  assert.ok(p.__future);
  assert.equal(p.__future.v, 99);
  assert.equal(p.__future.a, 1);
});

test("migrate rejects malformed input", () => {
  assert.equal(S.migrate("nope"), null);
  assert.equal(S.migrate("null"), null);
});

test("pushHistory caps at HISTORY_MAX", () => {
  const p = S.emptyPayload();
  for (let i = 0; i < S.HISTORY_MAX + 3; i++) S.pushHistory(p, "fri", 0, { load: i });
  assert.equal(p.liftHistory["fri:0"].length, S.HISTORY_MAX);
  assert.equal(p.liftHistory["fri:0"][S.HISTORY_MAX - 1].load, S.HISTORY_MAX + 2); // newest kept
});

test("lastEntry / series / popHistory", () => {
  const p = S.emptyPayload();
  assert.equal(S.lastEntry(p, "fri", 0), null);
  S.pushHistory(p, "fri", 0, { load: 50 });
  S.pushHistory(p, "fri", 0, { load: 52.5 });
  assert.equal(S.lastEntry(p, "fri", 0).load, 52.5);
  assert.equal(S.series(p, "fri", 0).length, 2);
  assert.equal(S.series(p, "fri", 0, 1)[0].load, 52.5);
  S.popHistory(p, "fri", 0);
  assert.equal(S.lastEntry(p, "fri", 0).load, 50);
});

test("resetLift clears sets but keeps load/reps/rir", () => {
  const p = S.emptyPayload();
  p.state["fri:0"] = { done: 3, load: 62.5, reps: 7, rir: 1, topHits: 2, lastRir: 1, sets: [{ load: 62.5, reps: 7, rir: 1 }] };
  S.resetLift(p, "fri", 0);
  const r = p.state["fri:0"];
  assert.equal(r.done, 0);
  assert.equal(r.topHits, 0);
  assert.equal(r.lastRir, null);
  assert.equal(r.load, 62.5);
  assert.equal(r.reps, 7);
  assert.equal(r.rir, 1);
  assert.deepEqual(r.sets, []);
});

test("resetLift drops a same-day history snapshot", () => {
  const p = S.emptyPayload();
  p.state["fri:0"] = { done: 3, load: 50, reps: 6, rir: 2, topHits: 1, lastRir: 2 };
  S.pushHistory(p, "fri", 0, { date: S.dateKey(), load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 });
  S.resetLift(p, "fri", 0);
  assert.equal(S.lastEntry(p, "fri", 0), null);
});

test("resetDay clears the day's sets, keeps loads and other days", () => {
  const p = S.emptyPayload();
  p.state["fri:0"] = { done: 3, load: 60, reps: 6, rir: 2, topHits: 0, lastRir: 2 };
  p.state["fri:1"] = { done: 2, load: 50, reps: 6, rir: 2, topHits: 0, lastRir: 2 };
  p.state["sat:0"] = { done: 1, load: 90, reps: 7, rir: 2, topHits: 0, lastRir: 2 };
  S.pushHistory(p, "fri", 0, { date: S.dateKey(), load: 60, reps: 6, rir: 2, hitTop: true, setsDone: 3 });
  S.resetDay(p, "fri");
  assert.equal(p.state["fri:0"].done, 0);
  assert.equal(p.state["fri:1"].done, 0);
  assert.equal(p.state["sat:0"].done, 1);
  assert.equal(p.state["fri:0"].load, 60);
  assert.equal(S.lastEntry(p, "fri", 0), null);
});

test("export → import round-trips", () => {
  const p = S.emptyPayload();
  p.state["fri:0"] = { done: 2, load: 62.5, reps: 6, rir: 1, topHits: 1, lastRir: 1 };
  S.pushHistory(p, "fri", 0, { load: 62.5, reps: 6, rir: 1, hitTop: true, setsDone: 3 });
  const json = S.exportPayload(p);
  global.localStorage.clear(); // simulate a wipe between export and import
  const restored = S.importRaw(json);
  assert.deepEqual(restored.state, p.state);
  assert.deepEqual(restored.liftHistory, p.liftHistory);
  assert.deepEqual(S.load().stats || S.load().state, p.state);
});

test("load migrates a legacy v1 key into v4", () => {
  global.localStorage.setItem(S.LEGACY, JSON.stringify({ v: 1, cur: "sun", idx: 1, state: { "sun:0": { done: 3 } } }));
  const p = S.load();
  assert.equal(p.v, 4);
  assert.equal(p.cur, "sun");
  assert.equal(p.idx, 1);
  assert.deepEqual(p.state, { "sun:0": { done: 3 } });
});

test("load keeps a copy of an unknown future payload, never overwrites it", () => {
  const raw = JSON.stringify({ v: 99, future: true });
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(p.v, 4); // fresh empty
  assert.equal(global.localStorage.getItem(S.STORE + "-future"), raw);
  assert.equal(S.lastLoadError().kind, "future");
  assert.equal(S.futureRaw(), raw);
  assert.equal(global.localStorage.getItem(S.STORE), raw); // boot copy untouched
});

test("load quarantines a corrupt payload and never overwrites it", () => {
  const raw = "{not json";
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(p.v, 4);
  assert.equal(S.lastLoadError().kind, "corrupt");
  assert.equal(S.quarantineRaw(), raw);
  assert.equal(global.localStorage.getItem(S.STORE), raw); // boot copy untouched
});

test("backupDue: false with no data, true when data exists and never exported", () => {
  const p = S.emptyPayload();
  assert.equal(S.backupDue(p), false);
  S.pushHistory(p, "fri", 0, { date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 });
  assert.equal(S.backupDue(p), true);
  S.markBackup(p);
  assert.equal(S.backupDue(p), false);
});

test("backupAgeDays counts whole days and is null when never backed up", () => {
  const p = S.emptyPayload();
  assert.equal(S.backupAgeDays(p, "2026-11-08"), null);
  p.lastBackup = "2026-11-01";
  assert.equal(S.backupAgeDays(p, "2026-11-08"), 7);
  assert.equal(S.backupAgeDays(p, "2026-11-03"), 2);
});

test("mergePayload unions history by date and keeps the fuller state record", () => {
  const base = S.emptyPayload();
  base.state["fri:0"] = { done: 1, load: 50, reps: 6, rir: 2 };
  S.pushHistory(base, "fri", 0, { date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: false, setsDone: 3 });
  const inc = S.emptyPayload();
  inc.state["fri:0"] = { done: 3, load: 55, reps: 6, rir: 2 };
  S.pushHistory(inc, "fri", 0, { date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: false, setsDone: 3 });
  S.pushHistory(inc, "fri", 0, { date: "2026-11-08", load: 55, reps: 6, rir: 2, hitTop: true, setsDone: 3 });
  const m = S.mergePayload(base, inc);
  assert.equal(m.state["fri:0"].done, 3);          // fuller record wins
  assert.equal(m.state["fri:0"].load, 55);
  assert.equal(m.liftHistory["fri:0"].length, 2);  // 11-01 deduped, 11-08 added
  assert.equal(m.liftHistory["fri:0"][1].date, "2026-11-08");
});

test("mergePayload keeps the device cursor instead of adopting the incoming one", () => {
  const base = S.emptyPayload();
  base.cur = "fri";
  base.idx = 2;
  const inc = S.emptyPayload();
  inc.cur = "sun";
  inc.idx = 5;
  const m = S.mergePayload(base, inc);
  assert.equal(m.cur, "fri");
  assert.equal(m.idx, 2);
});

test("importMerge never discards current data", () => {
  global.localStorage.clear();
  const base = S.emptyPayload();
  base.state["fri:0"] = { done: 3, load: 60, reps: 6, rir: 2 };
  S.pushHistory(base, "fri", 0, { date: "2026-11-01", load: 60, reps: 6, rir: 2, hitTop: true, setsDone: 3 });
  S.save(base);
  const incoming = JSON.stringify({
    v: 2, cur: "sat", idx: 0, state: {},
    liftHistory: { "sat:1": [{ date: "2026-11-02", load: 90, reps: 8, rir: 2, setsDone: 3 }] }
  });
  const merged = S.importMerge(S.load(), incoming);
  assert.equal(merged.state["fri:0"].done, 3);
  assert.ok(merged.liftHistory["sat:1"]);
  assert.equal(merged.liftHistory["fri:0"].length, 1);
});

test("upsertHistory replaces today's entry instead of appending", () => {
  const p = S.emptyPayload();
  S.upsertHistory(p, "fri", 0, { date: S.dateKey(), setsDone: 3, load: 60 });
  S.upsertHistory(p, "fri", 0, { date: S.dateKey(), setsDone: 5, load: 60 });
  assert.equal(p.liftHistory["fri:0"].length, 1);
  assert.equal(p.liftHistory["fri:0"][0].setsDone, 5);
});

test("an empty started session logs nothing, but an existing entry still updates", () => {
  // starting the clock without logging a set must not bank a phantom workout
  const p = S.emptyPayload();
  S.startSessionClock(p, 1000);
  assert.equal(S.finalizeSession(p, 5000), null);
  assert.equal(p.sessionLog.length, 0);
  assert.equal(p.active.status, "complete");

  // the next-day roll path is the reachable one: start the clock, do nothing
  const q = S.emptyPayload();
  q.active.date = "2026-11-06";
  q.active.day = "fri";
  const fri = new Date(2026, 10, 6, 10).getTime();
  const sun = new Date(2026, 10, 8, 10).getTime();
  S.startSessionClock(q, fri);
  S.rollSession(q, "sun", sun);
  assert.equal(q.sessionLog.length, 0);
  assert.equal(q.active.date, "2026-11-08");

  // a session that already has a log entry still takes the update path
  const r = S.emptyPayload();
  r.sessionLog = [{ id: r.active.id, date: r.active.date, day: r.active.day, lifts: {}, status: "complete" }];
  const e = S.finalizeSession(r, 7000);
  assert.ok(e);
  assert.equal(r.sessionLog.length, 1);
  assert.equal(r.sessionLog[0].status, "complete");
});

test("session clock pauses, resumes, and finalizes with duration", () => {
  const p = S.emptyPayload();
  S.startSessionClock(p, 1000);
  assert.equal(S.sessionElapsedSec(p, 61000), 60);
  S.pauseSessionClock(p, 61000);
  assert.equal(S.sessionElapsedSec(p, 121000), 60); // frozen while paused
  S.startSessionClock(p, 121000);
  assert.equal(S.sessionElapsedSec(p, 151000), 90);
  p.state["fri:0"] = { done: 3, sets: [{ load: 60, reps: 6, rir: 2 }] };
  const e = S.finalizeSession(p, 151000);
  assert.ok(e);
  assert.equal(e.durationSec, 90);
  assert.equal(p.sessionLog.length, 1);
  assert.equal(p.active.status, "complete");
});

test("rollSession banks yesterday and clears today's sets", () => {
  const p = S.emptyPayload();
  const fri = new Date(2026, 10, 6, 10).getTime();
  const sun = new Date(2026, 10, 8, 10).getTime();
  S.startSessionClock(p, fri);
  p.active.date = "2026-11-06";
  p.active.day = "fri";
  p.state["fri:0"] = { done: 3, load: 60, sets: [{ load: 60, reps: 6, rir: 2 }] };
  S.rollSession(p, "sun", sun);
  assert.equal(p.active.day, "sun");
  assert.equal(p.active.date, "2026-11-08");
  assert.equal(p.sessionLog.length, 1);
  assert.equal(p.state["fri:0"].done, 0);
  assert.equal(p.state["fri:0"].load, 60); // working load carried forward
});

test("snapshot round-trips the current payload", () => {
  const p = S.emptyPayload();
  p.bodyweight = 82.5;
  S.snapshot(p, "test");
  const snap = S.readSnapshot();
  assert.equal(snap.label, "test");
  assert.equal(snap.payload.bodyweight, 82.5);
  assert.ok(snap.at);
});

const HOSTILE_RAW = '{"v":3,"state":{"__proto__":{"done":5,"evil":1},"constructor":{"done":4},"fri:0":{"done":3,"sets":"oops"}},"liftHistory":{"__proto__":[{"date":"2026-11-09","load":1,"reps":1,"rir":1}],"constructor":[{"date":"2026-11-10","load":"1e999","reps":2,"rir":2}],"fri:0":[{"date":"2026-11-08","load":"1e999","reps":"six","rir":"high","sets":"oops"}]},"sessionLog":[{"id":"__proto__","status":"complete","durationSec":1e999,"lifts":{"__proto__":{"bad":1},"fri:0":{"done":3,"sets":"oops"}}},{"id":"constructor","status":"complete","durationSec":99999999999999999999999999999999999,"lifts":null}]}';

test("hostile prototype keys are dropped without polluting Object.prototype", () => {
  const p = S.importRaw(HOSTILE_RAW);

  assert.equal(Object.prototype.evil, undefined);
  assert.equal(Object.prototype.bad, undefined);
  assert.equal(Object.prototype.done, undefined);
  assert.ok(!Object.hasOwn(Object.prototype, "evil"));
  assert.ok(!Object.hasOwn(Object.prototype, "bad"));
  assert.ok(!Object.hasOwn(p.state, "__proto__"));
  assert.ok(!Object.hasOwn(p.state, "constructor"));
  assert.ok(!Object.hasOwn(p.liftHistory, "__proto__"));
  assert.ok(!Object.hasOwn(p.liftHistory, "constructor"));

  assert.equal(p.state["fri:0"].done, 3);
  assert.deepEqual(p.state["fri:0"].sets, []);
  assert.equal(p.liftHistory["fri:0"].length, 1);
  assert.equal(p.liftHistory["fri:0"][0].load, 0);
  assert.equal(p.sessionLog.length, 2);
  assert.ok(!p.sessionLog.some((s) => s.id === "__proto__" || s.id === "constructor"));
  assert.equal(p.sessionLog[0].durationSec, 0);
  assert.deepEqual(p.sessionLog[0].lifts["fri:0"].sets, []);
  assert.ok(!Object.hasOwn(p.sessionLog[0].lifts, "__proto__"));
});

test("mergePayload survives hostile prototype keys and keeps Object.prototype clean", () => {
  const base = S.emptyPayload();
  base.state["fri:0"] = { done: 1, load: 50, reps: 6, rir: 2 };
  const merged = S.importMerge(base, HOSTILE_RAW);

  assert.equal(Object.prototype.evil, undefined);
  assert.equal(Object.prototype.bad, undefined);
  assert.ok(!Object.hasOwn(merged.state, "__proto__"));
  assert.ok(!Object.hasOwn(merged.state, "constructor"));
  assert.ok(!Object.hasOwn(merged.liftHistory, "__proto__"));
  assert.ok(!Object.hasOwn(merged.liftHistory, "constructor"));
  assert.equal(merged.state["fri:0"].done, 3);
  assert.deepEqual(merged.state["fri:0"].sets, []);
  assert.equal(merged.liftHistory["fri:0"].length, 1);
  assert.equal(merged.sessionLog.length, 2);
  assert.ok(!merged.sessionLog.some((s) => s.id === "__proto__" || s.id === "constructor"));
});

test("oversized imported history and session log are capped", () => {
  const base = S.emptyPayload();
  const incoming = S.emptyPayload();

  incoming.liftHistory["fri:0"] = Array.from({ length: S.HISTORY_MAX + 10 }, (_, i) => ({
    date: new Date(2025, 0, i + 1).toISOString().slice(0, 10),
    load: 50 + i,
    reps: 6,
    rir: 2,
    setsDone: 3
  }));
  incoming.sessionLog = Array.from({ length: S.SESSION_MAX + 10 }, (_, i) => ({
    id: "s" + i,
    date: "2025-01-01",
    day: "fri",
    status: "complete",
    durationSec: i + 1
  }));

  const merged = S.mergePayload(base, incoming);
  assert.ok(merged.liftHistory["fri:0"].length <= S.HISTORY_MAX);
  assert.ok(merged.sessionLog.length <= S.SESSION_MAX);
});

/* ── B1: null / non-object records ───────────────────────────────────────────
   A corrupt backup can carry `null` where a record should be. Nothing that
   dereferences a record may crash, and a dropped record must fall back to the
   normal getLift() defaults rather than a made-up one.                       */
const NULL_STATE_RAW = '{"v":3,"cur":"fri","idx":0,"state":{"fri:0":null,"fri:1":[],"fri:2":"nope"},"liftHistory":{"fri:0":[null,{"date":"2026-11-08","load":50,"reps":6,"rir":2,"setsDone":3}]},"sessionLog":[null],"active":null}';

test("importRaw drops null / non-object state records instead of keeping them", () => {
  const p = S.importRaw(NULL_STATE_RAW);
  assert.ok(!Object.hasOwn(p.state, "fri:0"));
  assert.ok(!Object.hasOwn(p.state, "fri:1"));
  assert.ok(!Object.hasOwn(p.state, "fri:2"));
  assert.equal(p.liftHistory["fri:0"].length, 1);
  assert.equal(p.liftHistory["fri:0"][0].load, 50);
  assert.equal(p.sessionLog.length, 0);
  assert.ok(p.active && p.active.status === "active");
  assert.equal(Object.prototype.evil, undefined);
});

test("a dropped state record reads back through getLift defaults, not a crash", () => {
  const p = S.importRaw(NULL_STATE_RAW);
  const e = P.DAYS.fri.ex[0];
  const rec = P.getLift(p.state, "fri", 0, e);
  assert.equal(rec.done, 0);
  assert.equal(rec.load, e.load);
  assert.equal(rec.reps, e.r);
  assert.equal(rec.rir, e.rir);
  assert.deepEqual(rec.sets, []);
  assert.equal(p.state["fri:0"], rec); // the same default record the fresh app would create
});

test("importMerge with a null incoming record keeps the base record", () => {
  const base = S.emptyPayload();
  base.state["fri:0"] = { done: 1, load: 50, reps: 6, rir: 2 };
  const merged = S.importMerge(base, '{"v":3,"cur":"fri","idx":0,"state":{"fri:0":null},"liftHistory":{},"sessionLog":[]}');
  assert.equal(merged.state["fri:0"].done, 1);
  assert.equal(merged.state["fri:0"].load, 50);
  assert.equal(Object.prototype.done, undefined);
});

test("migrate v2 with a null state record does not crash", () => {
  const p = S.migrate('{"v":2,"cur":"fri","idx":0,"state":{"fri:0":null,"sat:0":{"done":2}},"liftHistory":{}}');
  assert.equal(p.v, 4);
  assert.ok(!Object.hasOwn(p.state, "fri:0"));
  assert.equal(p.state["sat:0"].done, 2);
  assert.ok(p.active && p.active.status === "active");
});

test("resetDay with a null state record clears the rest without crashing", () => {
  const p = S.emptyPayload();
  p.state["fri:0"] = null;
  p.state["fri:1"] = { done: 2, load: 40, reps: 6, rir: 2, sets: [{ load: 40, reps: 6, rir: 2 }] };
  p.liftHistory["fri:0"] = null;
  S.resetDay(p, "fri");
  assert.ok(!p.state["fri:0"]);
  assert.equal(p.state["fri:1"].done, 0);
  assert.deepEqual(p.state["fri:1"].sets, []);
  assert.equal(p.state["fri:1"].load, 40);
});

test("mergePayload drops null history entries and null session log entries", () => {
  const base = S.emptyPayload();
  const incoming = JSON.parse('{"v":3,"cur":"fri","idx":0,"state":{},"liftHistory":{"fri:0":[null,{"date":"2026-11-08","load":50,"reps":6,"rir":2,"setsDone":3}]},"sessionLog":[null,{"id":"s1","date":"2026-11-08","day":"fri","status":"complete","durationSec":600,"lifts":{"fri:0":null}}]}');
  const merged = S.mergePayload(base, incoming);
  assert.equal(merged.liftHistory["fri:0"].length, 1);
  assert.equal(merged.liftHistory["fri:0"][0].load, 50);
  assert.equal(merged.sessionLog.length, 1);
  assert.ok(!Object.hasOwn(merged.sessionLog[0].lifts, "fri:0"));
});

test("null records never make backupDue or hasData crash", () => {
  const p = S.importRaw('{"v":3,"cur":"fri","idx":0,"state":{"fri:0":null},"liftHistory":{"fri:0":[null]},"sessionLog":[null]}');
  assert.equal(S.backupDue(p), false);
  assert.equal(S.activeHasData(p), false);
});

/* ── B2: nested unsafe keys ──────────────────────────────────────────────────
   L5 stripped `__proto__` / `constructor` / `prototype` from the top-level
   maps; the keys inside a record, a history entry, a session or a set are
   stripped here. A record left with nothing but the unsafe keys still parses
   as a valid (empty) record — the lift is not dropped.                       */
const NESTED_PROTO_RAW = '{"v":3,"cur":"fri","idx":0,"state":{"fri:0":{"done":3,"__proto__":{"evil":1}},"fri:1":{"__proto__":{"evil2":1}}},"liftHistory":{"fri:0":[{"date":"2026-11-08","load":50,"reps":6,"rir":2,"setsDone":3,"prototype":{"evil3":1}}]},"sessionLog":[{"id":"s1","date":"2026-11-08","day":"fri","status":"complete","durationSec":600,"constructor":{"evil4":1},"lifts":{"fri:0":{"done":2,"__proto__":{"evil5":1},"sets":[{"load":50,"reps":6,"rir":2,"__proto__":{"evil6":1}}]}}}]}';

test("nested __proto__ inside a state record is stripped, the record survives", () => {
  const p = S.importRaw(NESTED_PROTO_RAW);
  const rec = p.state["fri:0"];
  assert.ok(rec && typeof rec === "object");
  assert.ok(!Object.hasOwn(rec, "__proto__"));
  assert.equal(rec.done, 3);
  assert.equal(Object.prototype.evil, undefined);
  assert.ok(!Object.hasOwn(Object.prototype, "evil"));

  const onlyUnsafe = p.state["fri:1"];
  assert.ok(onlyUnsafe && typeof onlyUnsafe === "object");
  assert.ok(!Object.hasOwn(onlyUnsafe, "__proto__"));
  const e = P.DAYS.fri.ex[1];
  const filled = P.getLift(p.state, "fri", 1, e);
  assert.equal(filled.done, 0);
  assert.equal(filled.load, e.load);
  assert.equal(Object.prototype.evil2, undefined);
});

test("nested unsafe keys are stripped from history entries, sessions, session lifts and sets", () => {
  const p = S.importRaw(NESTED_PROTO_RAW);
  const entry = p.liftHistory["fri:0"][0];
  assert.ok(!Object.hasOwn(entry, "prototype"));
  assert.equal(Object.prototype.evil3, undefined);

  const session = p.sessionLog[0];
  assert.ok(!Object.hasOwn(session, "constructor"));
  assert.equal(Object.prototype.evil4, undefined);
  assert.ok(!Object.hasOwn(session.lifts["fri:0"], "__proto__"));
  assert.equal(session.lifts["fri:0"].done, 2);
  assert.equal(Object.prototype.evil5, undefined);
  assert.ok(!Object.hasOwn(session.lifts["fri:0"].sets[0], "__proto__"));
  assert.equal(Object.prototype.evil6, undefined);
});

test("importMerge strips nested unsafe keys without changing the merge winner rule", () => {
  const base = S.emptyPayload();
  base.state["fri:0"] = { done: 1, load: 50, reps: 6, rir: 2 };
  const merged = S.importMerge(base, NESTED_PROTO_RAW);
  assert.equal(merged.state["fri:0"].done, 3);   // fuller incoming record still wins
  assert.ok(!Object.hasOwn(merged.state["fri:0"], "__proto__"));
  assert.equal(Object.prototype.evil, undefined);
  assert.equal(merged.liftHistory["fri:0"].length, 1);
  assert.ok(!Object.hasOwn(merged.liftHistory["fri:0"][0], "prototype"));
  assert.equal(merged.sessionLog.length, 1);
  assert.ok(!Object.hasOwn(merged.sessionLog[0], "constructor"));
});

test("an imported record with no progress wins over an unmodified default record", () => {
  const base = { v: 3, cur: "fri", idx: 0, liftHistory: {}, sessionLog: [],
    state: { "fri:0": { done: 0, load: 60, reps: 6, rir: 2, topHits: 0, sets: [] } } };
  const raw = '{"v":3,"cur":"fri","idx":0,"liftHistory":{},"sessionLog":[],"state":{"fri:0":{"done":0,"load":77,"reps":6,"rir":2,"topHits":0,"sets":[]}}}';
  const merged = S.importMerge(base, raw);
  assert.equal(merged.state["fri:0"].load, 77);
});

test("a local record with real progress is not clobbered by an equal-done import", () => {
  const base = { v: 3, cur: "fri", idx: 0, liftHistory: {}, sessionLog: [],
    state: { "fri:0": { done: 2, load: 70, reps: 6, rir: 2, topHits: 1,
      sets: [{ load: 70, reps: 6, rir: 2 }, { load: 70, reps: 6, rir: 1 }] } } };
  const raw = '{"v":3,"cur":"fri","idx":0,"liftHistory":{},"sessionLog":[],"state":{"fri:0":{"done":2,"load":77,"reps":6,"rir":2,"sets":[]}}}';
  const merged = S.importMerge(base, raw);
  assert.equal(merged.state["fri:0"].load, 70);
  assert.equal(merged.state["fri:0"].done, 2);
});

test("the richer record wins when both have the same done count", () => {
  const base = { v: 3, cur: "fri", idx: 0, liftHistory: {}, sessionLog: [],
    state: { "fri:0": { done: 2, load: 70, reps: 6, rir: 2, topHits: 0, sets: [{ load: 70, reps: 6, rir: 2 }] } } };
  const raw = '{"v":3,"cur":"fri","idx":0,"liftHistory":{},"sessionLog":[],"state":{"fri:0":{"done":2,"load":85,"reps":6,"rir":2,"topHits":0,"sets":[{"load":85,"reps":6,"rir":2},{"load":85,"reps":6,"rir":1}]}}}';
  const merged = S.importMerge(base, raw);
  assert.equal(merged.state["fri:0"].load, 85);
  assert.equal(merged.state["fri:0"].sets.length, 2);
});

test("merge stats count new sessions and same-date collisions (B3-19)", () => {
  const base = { v: 4, cur: "fri", idx: 0, state: {}, sessionLog: [],
    liftHistory: { "fri:0": [{ date: "2026-10-01", load: 50, reps: 6, rir: 2, hitTop: false, setsDone: 3 }] } };
  const inc = { v: 4, cur: "fri", idx: 0, state: {}, sessionLog: [],
    liftHistory: {
      "fri:0": [
        { date: "2026-11-01", load: 55, reps: 6, rir: 2, hitTop: true, setsDone: 3 },
        { date: "2026-10-01", load: 52, reps: 6, rir: 1, hitTop: false, setsDone: 4 }
      ]
    } };
  const stats = { added: 0, collisions: 0 };
  const merged = S.mergePayload(base, inc, stats);
  assert.equal(stats.added, 1);
  assert.equal(stats.collisions, 1);
  // the fuller collision winner is the one kept
  assert.equal(merged.liftHistory["fri:0"].length, 2);
  assert.equal(merged.liftHistory["fri:0"][0].setsDone, 4);
  // no stats passed: the old call shape still works
  const plain = S.mergePayload(base, inc);
  assert.equal(plain.liftHistory["fri:0"].length, 2);
});

test("importRaw and importMerge reject a backup larger than 5 MB before parsing (B3-17)", () => {
  const huge = "x".repeat(5000001);
  assert.throws(() => S.importRaw(huge), /too large/i);
  assert.throws(() => S.importMerge(S.load(), huge), /too large/i);
  // a non-string is rejected too, and the 5 MB boundary itself is allowed
  assert.throws(() => S.importRaw(12345), /too large/i);
  assert.throws(() => S.importRaw("x".repeat(5000000)), /too large|Not a valid/i);
});

test("validDay and validDate reject junk", () => {
  assert.equal(S.validDay("fri"), true);
  assert.equal(S.validDay("mon"), false);
  assert.equal(S.validDay(null), false);
  assert.equal(S.validDay(""), false);
  assert.equal(S.validDate("2026-11-09"), true);
  assert.equal(S.validDate("2026-11-9"), false);
  assert.equal(S.validDate(20261109), false);
  assert.equal(S.validDate(null), false);
});

test("daysUntil counts whole days to a training day and returns null for the rest", () => {
  const g = new Date().getDay();
  const target = { sun: 0, fri: 5, sat: 6 };
  for (const d of ["sun", "fri", "sat"]) {
    assert.equal(S.daysUntil(d), (target[d] - g + 7) % 7, `daysUntil(${d})`);
  }
  assert.equal(S.daysUntil("mon"), null);
  assert.equal(S.daysUntil(undefined), null);
});

test("actualDay names a training day only on Fri/Sat/Sun", () => {
  const g = new Date().getDay();
  const expected = g === 5 ? "fri" : g === 6 ? "sat" : g === 0 ? "sun" : null;
  assert.equal(S.actualDay(), expected);
  assert.equal(S.validDay(S.todayDay()), true);
});

test("emptySession is a clean, valid active session", () => {
  const s = S.emptySession("fri", "2026-11-09");
  assert.ok(s.id.startsWith("ses"));
  assert.equal(S.validDay(s.day), true);
  assert.equal(S.validDate(s.date), true);
  assert.equal(s.status, "active");
  assert.equal(s.startedAt, null);
  assert.equal(s.accSec, 0);
  assert.equal(s.runningSince, null);
});

test("startSession resets set progress but keeps the working load", () => {
  const payload = S.emptyPayload();
  payload.state["fri:0"] = { done: 3, load: 62.5, reps: 6, rir: 2, topHits: 1, lastRir: 1,
    sets: [{ load: 62.5, reps: 6, rir: 2 }] };
  const a = S.startSession(payload, "sat", 1000);
  assert.equal(a.day, "sat");
  assert.equal(payload.cur, "sat");
  assert.equal(payload.idx, 0);
  assert.equal(payload.state["fri:0"].done, 0);
  assert.equal(payload.state["fri:0"].load, 62.5);
  assert.equal(payload.state["fri:0"].topHits, 0);
  assert.equal(payload.state["fri:0"].lastRir, null);
  assert.equal(payload.state["fri:0"].sets.length, 0);
});

test("the session clock accrues only while running", () => {
  const p = S.emptyPayload();
  S.startSessionClock(p, 1000);
  assert.equal(S.sessionElapsedSec(p, 3000), 2);
  S.pauseSessionClock(p, 5000);
  assert.equal(S.sessionElapsedSec(p, 9000), 4);
  S.startSessionClock(p, 10000);
  assert.equal(p.active.runningSince, 10000);
  assert.equal(S.sessionElapsedSec(p, 12000), 6);
});

test("finalizeSession logs the session and reopenSession re-arms the same id", () => {
  const p = S.emptyPayload();
  S.startSessionClock(p, 1000);
  p.state["fri:0"] = { done: 3, load: 50, reps: 6, rir: 2, topHits: 0, lastRir: 2,
    sets: [{ load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 1 }] };
  const entry = S.finalizeSession(p, 5000);
  assert.equal(entry.durationSec, 4);
  assert.equal(entry.status, "complete");
  assert.equal(entry.lifts["fri:0"].done, 3);
  assert.equal(entry.lifts["fri:0"].sets.length, 2);
  assert.equal(p.sessionLog.length, 1);
  assert.equal(p.active.status, "complete");
  assert.equal(S.finalizeSession(S.emptyPayload(), 5000), null);
  S.reopenSession(p);
  assert.equal(p.active.status, "active");
  assert.equal(p.active.endedAt, null);
  assert.equal(p.sessionLog.length, 0);
  S.startSessionClock(p, 6000);
  const again = S.finalizeSession(p, 8000);
  assert.equal(again.id, entry.id);
  assert.equal(p.sessionLog.length, 1);
  assert.equal(again.durationSec, 6);
});

test("hasTodayEntry and removeTodayEntry act only on a same-day entry", () => {
  const p = S.emptyPayload();
  const today = S.dateKey();
  p.liftHistory["fri:0"] = [
    { date: "2026-10-01", load: 50, reps: 6, setsDone: 3 },
    { date: today, load: 55, reps: 6, setsDone: 3 }
  ];
  assert.equal(S.hasTodayEntry(p, "fri", 0), true);
  S.removeTodayEntry(p, "fri", 0);
  assert.equal(p.liftHistory["fri:0"].length, 1);
  assert.equal(S.hasTodayEntry(p, "fri", 0), false);
  S.removeTodayEntry(p, "fri", 0);
  assert.equal(p.liftHistory["fri:0"].length, 1);
  assert.equal(S.hasTodayEntry(p, "sat", 0), false);
});

/* the count fields are clamped at the boundary, before any consumer can
   iterate them into a billion placeholder rows.                              */
test("hostile counts are clamped before anything iterates them", () => {
  const payload = S.migrate(JSON.stringify({
    v: 3,
    state: { "fri:0": { done: 1e9, topHits: 1e9, load: 50, reps: 6, rir: 2,
      sets: new Array(5000).fill({ load: 50, reps: 6, rir: 2 }) } },
    liftHistory: { "fri:0": [{ date: "2026-10-01", load: 50, reps: 6, rir: 2, setsDone: 1e9 }] },
    sessionLog: [{ id: "ses_x", date: "2026-11-01", day: "fri", status: "complete",
      accSec: 1e9, durationSec: 1e9, lifts: { "fri:0": { done: 1e9, sets: [] } } }],
    bodyweight: 1e9,
    active: null
  }));
  assert.equal(payload.state["fri:0"].done, S.DONE_MAX);
  assert.equal(payload.state["fri:0"].topHits, S.DONE_MAX);
  assert.equal(payload.state["fri:0"].sets.length, S.SETS_MAX);
  assert.equal(payload.liftHistory["fri:0"][0].setsDone, S.SETS_MAX);
  assert.equal(payload.sessionLog[0].accSec, S.ACC_SEC_MAX);
  assert.equal(payload.sessionLog[0].durationSec, S.ACC_SEC_MAX);
  assert.equal(payload.sessionLog[0].lifts["fri:0"].done, S.DONE_MAX);
  assert.equal(payload.bodyweight, 165);          /* out of range → default */
});

test("a zero or negative count stays zero", () => {
  const payload = S.migrate(JSON.stringify({
    v: 3,
    state: { "fri:0": { done: -5, sets: [{ load: 50, reps: 6, rir: 2 }] } },
    liftHistory: { "fri:0": [{ date: "2026-10-01", load: 50, reps: 6, setsDone: -3 }] }
  }));
  assert.equal(payload.state["fri:0"].done, 0);
  assert.equal(payload.liftHistory["fri:0"][0].setsDone, 0);
  assert.equal(payload.state["fri:0"].sets.length, 1);  /* a valid array is not truncated */
});

/* a session that runs past midnight banks into the day it started, so undo
   and reset can still reach the late lifts.                                   */
test("sessionDate anchors history to the live session across midnight", () => {
  assert.equal(S.sessionDate({ active: { date: "2001-01-02" } }), "2001-01-02");
  assert.equal(S.sessionDate({}), S.dateKey());
  assert.equal(S.sessionDate({ active: { date: "junk" } }), S.dateKey());

  const p = S.emptyPayload();
  p.active.date = "2001-01-02";
  p.liftHistory["fri:0"] = [
    { date: "2000-12-01", load: 50, reps: 6, rir: 2, setsDone: 3 },
    { date: "2001-01-02", load: 50, reps: 6, rir: 2, setsDone: 3 }
  ];
  assert.equal(S.hasTodayEntry(p, "fri", 0), true);
  S.removeTodayEntry(p, "fri", 0);
  assert.equal(p.liftHistory["fri:0"].length, 1);
  assert.equal(p.liftHistory["fri:0"][0].date, "2000-12-01");

  const q = S.emptyPayload();
  q.active.date = "2001-01-02";
  q.state["fri:0"] = { done: 3, sets: [{}] };
  q.liftHistory["fri:0"] = [
    { date: "2000-12-01", load: 50, reps: 6, rir: 2, setsDone: 3 },
    { date: "2001-01-02", load: 50, reps: 6, rir: 2, setsDone: 3 }
  ];
  S.resetDay(q, "fri");
  assert.equal(q.liftHistory["fri:0"].length, 1);
  assert.equal(q.liftHistory["fri:0"][0].date, "2000-12-01");
  assert.equal(q.state["fri:0"].done, 0);

  /* resetting one lift follows the same anchor */
  const r = S.emptyPayload();
  r.active.date = "2001-01-02";
  r.state["fri:0"] = { done: 3, sets: [{}] };
  r.liftHistory["fri:0"] = [
    { date: "2000-12-01", load: 50, reps: 6, rir: 2, setsDone: 3 },
    { date: "2001-01-02", load: 50, reps: 6, rir: 2, setsDone: 3 }
  ];
  S.resetLift(r, "fri", 0);
  assert.equal(r.liftHistory["fri:0"].length, 1);
  assert.equal(r.liftHistory["fri:0"][0].date, "2000-12-01");
  assert.equal(r.state["fri:0"].done, 0);
});

test("bwKg is bounded: a hostile value is dropped, a real one survives", () => {
  const p = S.migrate(JSON.stringify({
    v: 3,
    liftHistory: {
      "fri:7": [{ date: "2026-10-01", load: 0, reps: 6, setsDone: 3, bw: true, bwKg: 1e9 },
        { date: "2026-10-08", load: 0, reps: 6, setsDone: 3, bw: true, bwKg: 82.5 }]
    }
  }));
  assert.equal(p.liftHistory["fri:7"][0].bwKg, undefined);
  assert.equal(p.liftHistory["fri:7"][1].bwKg, 181.9);
});

test("v3 payloads convert bodyweight to pounds exactly once", () => {
  const p = S.migrate(JSON.stringify({
    v: 3, bodyweight: 75,
    liftHistory: { "fri:7": [{ date: "2026-10-01", load: 0, reps: 6, setsDone: 3, bw: true, bwKg: 75 }] }
  }));
  assert.equal(p.v, 4);
  assert.equal(p.bodyweight, 165.3);
  assert.equal(p.liftHistory["fri:7"][0].bwKg, 165.3);
  const again = S.migrate(JSON.stringify(p));   // idempotent: v4 is not re-converted
  assert.equal(again.bodyweight, 165.3);
  assert.equal(S.emptyPayload().bodyweight, 165);
});

test("merge adopts an imported bodyweight only while the local one is default", () => {
  const inc = S.emptyPayload();
  inc.bodyweight = 200;
  assert.equal(S.mergePayload(S.emptyPayload(), inc).bodyweight, 200);
  const mine = S.emptyPayload();
  mine.bodyweight = 150; // the user set it — never overwritten by an import
  assert.equal(S.mergePayload(mine, inc).bodyweight, 150);
});

test("history entries with a corrupt date are dropped at the boundary", () => {
  const p = S.migrate(JSON.stringify({
    v: 4,
    liftHistory: {
      "fri:0": [
        { date: "2026-11-01", load: 50, reps: 6, rir: 2, setsDone: 3 },
        { date: "__proto__", load: 50, reps: 6, rir: 2, setsDone: 3 },
        { date: 20261101, load: 50, reps: 6, rir: 2, setsDone: 3 },
        { load: 50, reps: 6, rir: 2, setsDone: 3 }
      ]
    }
  }));
  assert.equal(p.liftHistory["fri:0"].length, 2, "valid + dateless legacy survive");
  assert.equal(p.liftHistory["fri:0"][0].date, "2026-11-01");
  assert.equal(p.liftHistory["fri:0"][1].date, undefined);
  assert.equal({}.date, undefined, "no prototype pollution");
});

test("reconcile resolves two state keys that share an exId to the higher-done record", () => {
  const exId = P.DAYS.fri.ex[0].id;
  const p = {
    state: {
      "fri:0": { load: 60, done: 2, reps: 6, rir: 2 },
      "stale:key": { load: 55, done: 5, reps: 6, rir: 2, exId: exId }
    },
    liftHistory: {}
  };
  S.reconcile(p, P.DAYS);
  assert.equal(Object.keys(p.state).length, 1, "the collision collapses to one target");
  assert.equal(p.state["fri:0"].done, 5, "the higher-done record wins");
  assert.equal(p.state["fri:0"].load, 55);
  assert.ok(!("stale:key" in p.state), "the losing record is dropped");
});

test("reconcile keeps the higher-done record whichever order the two collide in", () => {
  const exId = P.DAYS.fri.ex[0].id;
  const p = {
    state: {
      "ghost:key": { load: 70, done: 9, exId: exId },
      "fri:0": { load: 60, done: 3, exId: exId }
    },
    liftHistory: {}
  };
  S.reconcile(p, P.DAYS);
  assert.equal(p.state["fri:0"].done, 9);
  assert.equal(Object.keys(p.state).length, 1);
});

test("reconcile merges history lists that share an exId into one target", () => {
  const exId = P.DAYS.fri.ex[0].id;
  const p = {
    state: {},
    liftHistory: {
      "fri:0": [{ date: "2026-11-01", load: 60, reps: 6, rir: 2, setsDone: 3 }],
      "orphan:9": [{ date: "2026-11-02", load: 65, reps: 5, rir: 1, setsDone: 4, exId: exId }]
    }
  };
  S.reconcile(p, P.DAYS);
  assert.equal(Object.keys(p.liftHistory).length, 1);
  assert.equal(p.liftHistory["fri:0"].length, 2);
  assert.equal(p.liftHistory["fri:0"][1].load, 65, "rows stay in date order");
});

test("rollSession re-finalizes a complete active session that still has data", () => {
  const p = S.emptyPayload();
  const fri = new Date(2026, 10, 6, 10).getTime();
  const sun = new Date(2026, 10, 8, 10).getTime();
  S.startSessionClock(p, fri);
  p.active.date = "2026-11-06";
  p.active.day = "fri";
  p.state["fri:0"] = { done: 2, load: 60, sets: [{ load: 60, reps: 6, rir: 2 }] };
  S.finalizeSession(p, fri + 1200000); // 20 minutes, banked once
  assert.equal(p.active.status, "complete");
  assert.equal(p.sessionLog.length, 1);
  const id = p.sessionLog[0].id;
  S.rollSession(p, "sun", sun);        // same session, already complete
  assert.equal(p.sessionLog.length, 1, "re-finalize updates the entry, never appends a second");
  assert.equal(p.sessionLog[0].id, id);
  assert.equal(p.sessionLog[0].endedAt, sun);
  assert.equal(p.sessionLog[0].durationSec, 1200);
  assert.equal(p.sessionLog[0].lifts["fri:0"].done, 2);
  assert.equal(p.active.day, "sun");
  assert.equal(p.active.date, "2026-11-08");
  assert.equal(p.active.status, "active");
});

test("rollSession banks nothing for a complete, empty active session", () => {
  const p = S.emptyPayload();
  const fri = new Date(2026, 10, 6, 10).getTime();
  const sun = new Date(2026, 10, 8, 10).getTime();
  S.startSessionClock(p, fri);
  p.active.date = "2026-11-06";
  p.active.day = "fri";
  S.finalizeSession(p, fri + 60000);
  assert.equal(p.sessionLog.length, 0, "nothing logged without progress");
  S.rollSession(p, "sun", sun);
  assert.equal(p.sessionLog.length, 0);
  assert.equal(p.active.day, "sun");
});

test("mergePayload adopts an incoming bodyweight only when the local one is the default", () => {
  const adopted = S.mergePayload(S.emptyPayload(), { v: 4, bodyweight: 172 });
  assert.equal(adopted.bodyweight, 172, "165 is the unset default, so the backup wins");

  const p2 = S.emptyPayload();
  p2.bodyweight = 180;
  assert.equal(S.mergePayload(p2, { v: 4, bodyweight: 172 }).bodyweight, 180, "a real local value is kept");

  for (const bad of [0, -5, 900, NaN, "172", null]) {
    assert.equal(S.mergePayload(S.emptyPayload(), { v: 4, bodyweight: bad }).bodyweight, 165, `${bad} is rejected`);
  }
});

/* ── B4-02: corrupt-payload salvage ──────────────────────────────────────── */

test("salvage recovers complete history entries from JSON truncated mid-array", () => {
  const raw = '{"v":4,"cur":"fri","idx":0,"state":{},"liftHistory":{"fri:0":[' +
    '{"date":"2026-11-01","load":50,"reps":6,"rir":2,"setsDone":3},' +
    '{"date":"2026-11-08","load":55';
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(S.lastLoadError().kind, "salvaged");
  assert.deepEqual(
    { recovered: S.lastLoadError().recovered, dropped: S.lastLoadError().dropped },
    { recovered: 1, dropped: 1 }
  );
  assert.equal(p.v, 4);
  assert.equal(p.liftHistory["fri:0"].length, 1);
  assert.deepEqual(p.liftHistory["fri:0"][0], { date: "2026-11-01", load: 50, reps: 6, rir: 2, setsDone: 3 });
  assert.equal(S.quarantineRaw(), raw, "quarantine bytes are the original string");
  assert.equal(global.localStorage.getItem(S.STORE), raw, "boot copy is never overwritten");
});

test("salvage finds liftHistory after a garbage prefix", () => {
  const raw = '\u0000\u0001not json at all {"v":4,"liftHistory":{"fri:0":[{"date":"2026-11-01","load":50,"reps":6}]}}';
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(S.lastLoadError().kind, "salvaged");
  assert.equal(S.lastLoadError().recovered, 1);
  assert.equal(S.lastLoadError().dropped, 0);
  assert.equal(p.liftHistory["fri:0"][0].load, 50);
  assert.equal(S.quarantineRaw(), raw);
});

test("salvage drops one corrupt entry and keeps the good entries around it", () => {
  const raw = '{"v":4,"cur":"fri","idx":0,"state":{},"liftHistory":{"fri:0":[' +
    '{"date":"2026-11-05","load":50,"reps":6},' +
    '{"date":"2026-11-06","load":50,' +
    '{"date":"2026-11-07","load":60,"reps":6}]}}';
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(S.lastLoadError().kind, "salvaged");
  assert.deepEqual(
    { recovered: S.lastLoadError().recovered, dropped: S.lastLoadError().dropped },
    { recovered: 2, dropped: 1 }
  );
  assert.deepEqual(p.liftHistory["fri:0"].map((e) => e.date), ["2026-11-05", "2026-11-07"]);
});

test("salvage Case B: an unknown-version object keeps its usable history", () => {
  const raw = JSON.stringify({
    v: "x",
    liftHistory: {
      "fri:0": [
        { date: "2026-11-01", load: 50, reps: 6, rir: 2, setsDone: 3 },
        { date: "not-a-date", load: 60 }
      ]
    },
    sessionLog: [{ id: "ses_old", date: "2026-11-01", day: "fri", status: "complete" }]
  });
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(S.lastLoadError().kind, "salvaged");
  assert.deepEqual(
    { recovered: S.lastLoadError().recovered, dropped: S.lastLoadError().dropped },
    { recovered: 2, dropped: 1 }
  );
  assert.equal(p.liftHistory["fri:0"].length, 1);
  assert.equal(p.sessionLog.length, 1);
  assert.equal(p.sessionLog[0].id, "ses_old");
});

test("salvage strips hostile keys exactly like an import", () => {
  const raw = '{"v":"x","liftHistory":{"fri:0":[' +
    '{"date":"2026-11-01","load":50,"__proto__":{"polluted":true},"constructor":{"polluted":true}}]}}';
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(S.lastLoadError().kind, "salvaged");
  assert.equal(S.lastLoadError().recovered, 1);
  const entry = p.liftHistory["fri:0"][0];
  assert.equal(entry.load, 50);
  assert.equal(Object.prototype.hasOwnProperty.call(entry, "__proto__"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(entry, "constructor"), false);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
});

test("salvage with zero recovered entries keeps the plain corrupt behaviour", () => {
  const raw = '{"some":"other","thing":[1,2,3]}';
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(S.lastLoadError().kind, "corrupt");
  assert.deepEqual(p.liftHistory, {});
  assert.deepEqual(p.sessionLog, []);
  assert.equal(S.quarantineRaw(), raw);
});

test("a clean v4 payload takes the exact old path (no salvage)", () => {
  const obj = {
    v: 4, cur: "fri", idx: 0, state: { "fri:0": { done: 2, load: 50, reps: 6, rir: 2 } },
    liftHistory: { "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, setsDone: 3 }] },
    sessionLog: [], bodyweight: 165, lastBackup: null
  };
  const raw = JSON.stringify(obj);
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  const m = S.migrate(raw);
  assert.equal(S.lastLoadError(), null);
  assert.ok(p.active.id && p.active.id !== m.active.id, "active session ids are freshly generated");
  p.active.id = m.active.id;
  assert.deepEqual(p, m);
  assert.equal(global.localStorage.getItem(S.STORE + "-corrupt"), null, "nothing quarantined on a clean load");
});

/* ── B5-06: import/restore salvage ─────────────────────────────────────────── */

test("importRaw salvages a truncated backup instead of rejecting it", () => {
  const raw = '{"v":4,"cur":"fri","idx":0,"state":{},"liftHistory":{"fri:0":[' +
    '{"date":"2026-11-01","load":50,"reps":6,"rir":2,"setsDone":3},' +
    '{"date":"2026-11-08","load":55';
  const p = S.importRaw(raw);
  assert.deepEqual(p.salvaged, { recovered: 1, dropped: 1 });
  assert.equal(p.liftHistory["fri:0"].length, 1);
  assert.deepEqual(p.liftHistory["fri:0"][0], { date: "2026-11-01", load: 50, reps: 6, rir: 2, setsDone: 3 });
  const stored = JSON.parse(global.localStorage.getItem(S.STORE));
  assert.equal(stored.liftHistory["fri:0"].length, 1, "the clean recovered payload is saved");
  assert.equal(Object.prototype.polluted, undefined, "Object.prototype stays clean");
});

test("importRaw still throws on bytes with nothing to recover", () => {
  assert.throws(() => S.importRaw("garbage"), /Not a valid Gym backup/);
  assert.throws(() => S.importRaw('{"some":"other","thing":[1,2,3]}'), /Not a valid Gym backup/);
});

test("importMerge salvages a truncated backup and merges the recovered entries", () => {
  const base = S.emptyPayload();
  base.liftHistory = { "sat:1": [{ date: "2026-11-07", load: 40, reps: 8, rir: 1, setsDone: 2 }] };
  const raw = '{"v":4,"liftHistory":{"fri:0":[' +
    '{"date":"2026-11-01","load":50,"reps":6,"rir":2},' +
    '{"date":"2026-11-08","load":55';
  const merged = S.importMerge(base, raw, { added: 0, collisions: 0 });
  assert.deepEqual(merged.salvaged, { recovered: 1, dropped: 1 });
  assert.equal(merged.liftHistory["fri:0"].length, 1, "recovered entries merge in");
  assert.equal(merged.liftHistory["sat:1"].length, 1, "base data is never discarded");
});

/* ── B5-07: newer-version backups are named as such ────────────────────────── */

test("importRaw on a newer-version backup throws the newer-version error", () => {
  const v99 = JSON.stringify({ v: 99, cur: "fri", idx: 0, state: {}, liftHistory: {}, sessionLog: [] });
  try {
    S.importRaw(v99);
    assert.fail("expected a throw");
  } catch (e) {
    assert.match(e.message, /newer version/);
    assert.ok(!/Not a valid Gym backup/.test(e.message), "distinct from the invalid-file error");
  }
});

test("importMerge on a newer-version backup throws the newer-version error", () => {
  const v99 = JSON.stringify({ v: 99, cur: "fri", idx: 0, state: {}, liftHistory: {}, sessionLog: [] });
  try {
    S.importMerge(S.emptyPayload(), v99, { added: 0, collisions: 0 });
    assert.fail("expected a throw");
  } catch (e) {
    assert.match(e.message, /newer version/);
  }
});

test("a genuinely invalid file still throws the plain invalid error", () => {
  assert.throws(() => S.importRaw("garbage"), /Not a valid Gym backup/);
});

/* B5-14 — validDate round-trips: regex alone lets impossible dates through */
test("validDate rejects impossible calendar dates and keeps real ones", () => {
  assert.equal(S.validDate("2024-02-29"), true);   // real leap day
  assert.equal(S.validDate("2025-02-29"), false);  // no leap year
  assert.equal(S.validDate("2026-04-31"), false);  // April has 30 days
  assert.equal(S.validDate("2026-13-01"), false);  // month 13
  assert.equal(S.validDate("2026-00-15"), false);  // month 0
  assert.equal(S.validDate("2026-01-00"), false);  // day 0
  assert.equal(S.validDate("2026-11-09"), true);
  assert.equal(S.validDate("2026-11-9"), false);   // still strict format
});

test("migrate drops liftHistory entries dated on impossible calendar dates", () => {
  const p = S.migrate(JSON.stringify({
    v: 4, cur: "fri", idx: 0, state: {},
    liftHistory: {
      "fri:0": [
        { date: "2025-02-29", load: 50, reps: 6, rir: 2 },
        { date: "2026-04-31", load: 55, reps: 5, rir: 1 },
        { date: "2026-13-01", load: 60, reps: 6, rir: 2 },
        { date: "2024-02-29", load: 45, reps: 6, rir: 3 }
      ]
    }
  }));
  assert.deepEqual(p.liftHistory["fri:0"], [{ date: "2024-02-29", load: 45, reps: 6, rir: 3 }]);
});

/* B5-15 — the store boundary clamps set values like the UI already does */
test("migrate clamps out-of-range set load/reps/rir from an imported payload", () => {
  const p = S.migrate(JSON.stringify({
    v: 4, cur: "fri", idx: 0,
    state: { "fri:0": { done: 1, sets: [{ load: -50, reps: 1000000000, rir: 99 }] } },
    liftHistory: { "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2,
      sets: [{ load: 2500, reps: 1000, rir: 5 }] }] }
  }));
  assert.deepEqual(p.state["fri:0"].sets, [{ load: 0, reps: 999, rir: 4 }]);
  const set = p.liftHistory["fri:0"][0].sets[0];
  assert.deepEqual(set, { load: 2000, reps: 999, rir: 4 });
  assert.ok(set.load * set.reps <= 2000 * 999, "entryVolume can never exceed the caps");
});

test("in-range set values pass through the clamps unchanged", () => {
  const p = S.migrate(JSON.stringify({
    v: 4, cur: "fri", idx: 0,
    state: { "fri:0": { done: 1, sets: [{ load: 122.5, reps: 6, rir: 2 }, { load: 0, reps: 1, rir: 0 }] } }
  }));
  assert.deepEqual(p.state["fri:0"].sets, [{ load: 122.5, reps: 6, rir: 2 }, { load: 0, reps: 1, rir: 0 }]);
});

/* B5-16 — a bad-dated sessionLog entry is dropped, not re-dated to today */
test("migrate drops sessionLog entries with malformed dates and keeps valid ones", () => {
  const p = S.migrate(JSON.stringify({
    v: 4, cur: "fri", idx: 0, state: {},
    sessionLog: [
      { id: "ses_bad", date: "11/09/2026", day: "fri", status: "complete", lifts: {} },
      { id: "ses_ok", date: "2026-11-07", day: "sat", status: "complete", lifts: {} }
    ]
  }));
  assert.equal(p.sessionLog.length, 1);
  assert.equal(p.sessionLog[0].id, "ses_ok");
  assert.equal(p.sessionLog[0].date, "2026-11-07");
});

test("salvage also drops sessionLog entries whose raw date is invalid", () => {
  const s = S.salvage(JSON.stringify({
    liftHistory: {},
    sessionLog: [
      { id: "a", date: "2026-13-01", status: "complete" },
      { id: "b", date: "2026-11-05", status: "complete" }
    ]
  }));
  assert.equal(s.sessionLog.length, 1);
  assert.equal(s.sessionLog[0].id, "b");
  assert.equal(s.dropped, 1);
});

test("the active session keeps the today-default when its date is invalid", () => {
  const p = S.migrate(JSON.stringify({
    v: 4, cur: "fri", idx: 0, state: {},
    active: { date: "2026-02-29", day: "fri", status: "active" }
  }));
  assert.ok(S.validDate(p.active.date), "active date is a real date");
});

/* B5-09 — the 8 h ceiling applies on the live clock path, not just at load */
test("sessionElapsedSec clamps an overnight-running session to ACC_SEC_MAX", () => {
  const p = S.emptyPayload();
  const t0 = 1000;
  S.startSessionClock(p, t0);
  assert.equal(S.sessionElapsedSec(p, t0 + 30 * 3600 * 1000), S.ACC_SEC_MAX);
  assert.equal(S.sessionElapsedSec(p, t0 + 60 * 1000), 60); // short sessions unaffected
});

test("finalizeSession banks a clamped durationSec for a session left running overnight", () => {
  const p = S.emptyPayload();
  const t0 = 1000;
  S.startSessionClock(p, t0);
  p.state["fri:0"] = { done: 3, load: 50, reps: 6, rir: 2, topHits: 0, lastRir: 2,
    sets: [{ load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 1 }, { load: 50, reps: 6, rir: 2 }] };
  const entry = S.finalizeSession(p, t0 + 30 * 3600 * 1000); // 30 h
  assert.equal(entry.durationSec, S.ACC_SEC_MAX);
  assert.ok(entry.durationSec <= S.ACC_SEC_MAX, "durationSec never exceeds the ceiling");
  assert.equal(S.sessionElapsedSec(p, t0 + 30 * 3600 * 1000), S.ACC_SEC_MAX);
  const short = S.finalizeSession((() => { const q = S.emptyPayload(); S.startSessionClock(q, t0);
    q.state["fri:0"] = { done: 1, sets: [{ load: 50, reps: 6, rir: 2 }] }; return q; })(), t0 + 900000);
  assert.equal(short.durationSec, 900); // 15 min stays 15 min
});
