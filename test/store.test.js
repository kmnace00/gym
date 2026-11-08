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

test("migrate v1 → v2 carries data forward", () => {
  const raw = JSON.stringify({ v: 1, cur: "sat", idx: 2, state: { "sat:0": { done: 1 } } });
  const p = S.migrate(raw);
  assert.equal(p.v, 2);
  assert.equal(p.cur, "sat");
  assert.equal(p.idx, 2);
  assert.deepEqual(p.state, { "sat:0": { done: 1 } });
  assert.deepEqual(p.liftHistory, {});
});

test("migrate v2 round-trips unchanged", () => {
  const o = { v: 2, cur: "fri", idx: 0, state: {}, liftHistory: {} };
  assert.deepEqual(S.migrate(JSON.stringify(o)), o);
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

test("load migrates a legacy v1 key into v2", () => {
  global.localStorage.setItem(S.LEGACY, JSON.stringify({ v: 1, cur: "sun", idx: 1, state: { "sun:0": { done: 3 } } }));
  const p = S.load();
  assert.equal(p.v, 2);
  assert.equal(p.cur, "sun");
  assert.equal(p.idx, 1);
  assert.deepEqual(p.state, { "sun:0": { done: 3 } });
});

test("load keeps a copy of an unknown future payload, never overwrites it", () => {
  const raw = JSON.stringify({ v: 99, future: true });
  global.localStorage.setItem(S.STORE, raw);
  const p = S.load();
  assert.equal(p.v, 2); // fresh empty
  assert.equal(global.localStorage.getItem(S.STORE + "-future"), raw);
});
