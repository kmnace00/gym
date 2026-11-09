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

test.beforeEach(() => { global.localStorage.clear(); });

test("emptyPayload opens on today's training day", () => {
  const d = new Date().getDay();
  const expected = d === 6 ? "sat" : (d === 0 ? "sun" : "fri");
  assert.equal(S.emptyPayload().cur, expected);
});

test("migrate v1 → v3 carries data forward", () => {
  const raw = JSON.stringify({ v: 1, cur: "sat", idx: 2, state: { "sat:0": { done: 1 } } });
  const p = S.migrate(raw);
  assert.equal(p.v, 3);
  assert.equal(p.cur, "sat");
  assert.equal(p.idx, 2);
  assert.deepEqual(p.state, { "sat:0": { done: 1 } });
  assert.deepEqual(p.liftHistory, {});
  assert.ok(p.active && p.active.date);
});

test("migrate v2 round-trips data and adds the v3 session fields", () => {
  const o = { v: 2, cur: "fri", idx: 0, state: {}, liftHistory: {} };
  const out = S.migrate(JSON.stringify(o));
  assert.equal(out.v, 3);
  assert.equal(out.cur, "fri");
  assert.equal(out.idx, 0);
  assert.deepEqual(out.state, {});
  assert.deepEqual(out.liftHistory, {});
  assert.equal(out.lastBackup, null);
  assert.equal(out.bodyweight, 75);
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

test("load migrates a legacy v1 key into v3", () => {
  global.localStorage.setItem(S.LEGACY, JSON.stringify({ v: 1, cur: "sun", idx: 1, state: { "sun:0": { done: 3 } } }));
  const p = S.load();
  assert.equal(p.v, 3);
  assert.equal(p.cur, "sun");
  assert.equal(p.idx, 1);
  assert.deepEqual(p.state, { "sun:0": { done: 3 } });
});

test("load keeps a copy of an unknown future payload, never overwrites it", () => {
  const raw = JSON.stringify({ v: 99, future: true });
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(p.v, 3); // fresh empty
  assert.equal(global.localStorage.getItem(S.STORE + "-future"), raw);
});

test("load quarantines a corrupt payload and never overwrites it", () => {
  const raw = "{not json";
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(p.v, 3);
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
