const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const C = require("../tools/check-sw-cache.js");

/* Run the real service worker in a tiny sandbox so the fetch guard can be
   exercised without a browser. Only the globals the handler touches are stubbed. */
const swSource = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
const ORIGIN = "http://localhost:4173";

function fetchHandler(overrides) {
  const o = overrides || {};
  const listeners = {};
  const cache = {
    match: () => Promise.resolve(o.hit || null),
    put: o.put || (() => Promise.resolve()),
    addAll: o.addAll || (() => Promise.resolve())
  };
  const sandbox = {
    URL: URL,
    importScripts: () => {},
    GYM_VERSION: "gym-test",
    fetch: o.fetch || (() => Promise.resolve({ ok: true, clone: () => ({}) })),
    caches: {
      open: () => Promise.resolve(cache),
      keys: o.keys || (() => Promise.resolve([])),
      delete: o.delete || (() => Promise.resolve(true)),
      match: () => Promise.resolve(null)
    },
    self: {
      location: { origin: ORIGIN },
      addEventListener: (type, fn) => { listeners[type] = fn; },
      skipWaiting: o.skipWaiting || (() => {}),
      clients: { claim: o.claim || (() => {}) }
    }
  };
  vm.runInNewContext(swSource, sandbox);
  const handler = listeners.fetch;
  handler.install = listeners.install;
  handler.activate = listeners.activate;
  return handler;
}

function dispatch(handler, url) {
  let handled = false;
  handler({
    request: { method: "GET", mode: "no-cors", url: url },
    respondWith: () => { handled = true; },
    waitUntil: () => {}
  });
  return handled;
}

test("SW ignores a different origin that merely starts with its origin", () => {
  const handler = fetchHandler();
  assert.equal(
    dispatch(handler, "http://localhost:41730/evil"),
    false,
    "http://localhost:41730 is a different origin and must not be handled as local"
  );
});

test("SW still handles a genuine same-origin asset request", () => {
  const handler = fetchHandler();
  assert.equal(dispatch(handler, ORIGIN + "/app.js"), true);
});

/* A warm cache takes the stale-while-revalidate branch: revalidate with the
   cached validators, and keep serving the cached body if nothing changed. */
function respondedWith(handler, url, waits) {
  let promise;
  handler({
    request: { method: "GET", mode: "no-cors", url: url },
    respondWith: (p) => { promise = p; },
    waitUntil: waits ? (p) => { waits.push(p); } : () => {}
  });
  return promise;
}

test("a cached asset is revalidated by ETag and a 304 keeps the cached body", async () => {
  const cached = { headers: { get: (k) => (k === "etag" ? '"abc"' : null) } };
  let revalidateInit;
  const handler = fetchHandler({
    hit: cached,
    fetch: (req, init) => { revalidateInit = init; return Promise.resolve({ status: 304, ok: false }); }
  });
  const result = await respondedWith(handler, ORIGIN + "/app.js");
  assert.deepEqual(revalidateInit, { headers: { "If-None-Match": '"abc"' } });
  assert.equal(result, cached, "a 304 must serve the cached body, not the bodyless 304");
});

test("a cached asset without an ETag revalidates by Last-Modified", async () => {
  const cached = { headers: { get: (k) => (k === "last-modified" ? "Mon, 01 Jan 2026" : null) } };
  let revalidateInit;
  const handler = fetchHandler({
    hit: cached,
    fetch: (req, init) => { revalidateInit = init; return Promise.resolve({ status: 200, ok: true, clone: () => ({}) }); }
  });
  await respondedWith(handler, ORIGIN + "/style.css");
  assert.deepEqual(revalidateInit, { headers: { "If-Modified-Since": "Mon, 01 Jan 2026" } });
});

test("a failed revalidation keeps serving the good cached copy", async () => {
  const cached = { headers: { get: () => null } };
  const handler = fetchHandler({
    hit: cached,
    fetch: () => Promise.reject(new Error("offline"))
  });
  const result = await respondedWith(handler, ORIGIN + "/app.js");
  assert.equal(result, cached, "the cached copy survives a network failure");
});

/* An asset write must keep the worker alive and must never reject the event
   when storage is full — the same contract as the navigation shell. */
async function assertWriteKeepsWorkerAlive(waits, release) {
  assert.equal(waits.length, 1, "the cache write is registered with the fetch event");
  let settled = false;
  waits[0].then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false, "the event stays alive while the write is in flight");
  release();
  await waits[0];
  assert.equal(settled, true);
}

test("a first-time asset keeps the worker alive until it is cached", async () => {
  let releasePut;
  const handler = fetchHandler({
    put: () => new Promise((resolve) => { releasePut = resolve; }),
    fetch: () => Promise.resolve({ ok: true, clone: () => ({}) })
  });
  const waits = [];
  await respondedWith(handler, ORIGIN + "/app.js", waits);
  await assertWriteKeepsWorkerAlive(waits, () => releasePut());
});

test("a refreshed asset keeps the worker alive until the new body is cached", async () => {
  const cached = { headers: { get: () => null } };
  let releasePut;
  const handler = fetchHandler({
    hit: cached,
    put: () => new Promise((resolve) => { releasePut = resolve; }),
    fetch: () => Promise.resolve({ status: 200, ok: true, clone: () => ({}) })
  });
  const waits = [];
  await respondedWith(handler, ORIGIN + "/app.js", waits);
  await assertWriteKeepsWorkerAlive(waits, () => releasePut());
});

test("a full storage quota on the first save does not reject the event", async () => {
  const handler = fetchHandler({
    put: () => Promise.reject(new Error("quota")),
    fetch: () => Promise.resolve({ ok: true, clone: () => ({}) })
  });
  const waits = [];
  await respondedWith(handler, ORIGIN + "/app.js", waits);
  assert.equal(waits.length, 1, "the failed write is still registered with the event");
  await waits[0];
});

test("a full storage quota on a refresh does not reject the event", async () => {
  const cached = { headers: { get: () => null } };
  const handler = fetchHandler({
    hit: cached,
    put: () => Promise.reject(new Error("quota")),
    fetch: () => Promise.resolve({ status: 200, ok: true, clone: () => ({}) })
  });
  const waits = [];
  await respondedWith(handler, ORIGIN + "/app.js", waits);
  assert.equal(waits.length, 1, "the failed refresh write is still registered with the event");
  await waits[0];
});

/* Install precaches the app; activate must evict older versions so a phone
   doesn't accumulate a fresh ~300 KB copy on every update. */
function lifecycleDone(handler, type) {
  let done;
  handler[type]({ waitUntil: (p) => { done = p; } });
  return done;
}

test("install precaches the asset list and skips waiting", async () => {
  const added = [];
  let skipped = false;
  const handler = fetchHandler({
    addAll: (names) => { added.push(...names); return Promise.resolve(); },
    skipWaiting: () => { skipped = true; }
  });
  await lifecycleDone(handler, "install");
  const precached = added.map((a) => a.replace(/^\.\//, "")).filter(Boolean);
  assert.deepEqual(precached, C.parseAssets(swSource), "the whole asset list is precached");
  assert.equal(skipped, true, "a new worker takes over without a manual reload");
});

/* A navigation refreshes the cached app shell. That write must be registered
   with the worker event, or the worker can be terminated before it completes. */
function navigateEvent(handler, url, waits) {
  let respond;
  handler({
    request: { method: "GET", mode: "navigate", url: url },
    respondWith: (p) => { respond = p; },
    waitUntil: (p) => { waits.push(p); }
  });
  return respond;
}

test("a successful navigation keeps the worker alive until the shell is saved", async () => {
  let releasePut;
  const put = () => new Promise((resolve) => { releasePut = resolve; });
  const handler = fetchHandler({
    put: put,
    fetch: () => Promise.resolve({ ok: true, clone: () => ({}) })
  });
  const waits = [];
  await navigateEvent(handler, ORIGIN + "/", waits);
  assert.equal(waits.length, 1, "the shell write is registered with the navigation event");
  let settled = false;
  waits[0].then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false, "the event stays alive while the write is still in flight");
  releasePut();
  await waits[0];
  assert.equal(settled, true);
});

test("a failed shell write does not reject the navigation event", async () => {
  const handler = fetchHandler({
    put: () => Promise.reject(new Error("quota")),
    fetch: () => Promise.resolve({ ok: true, clone: () => ({}) })
  });
  const waits = [];
  await navigateEvent(handler, ORIGIN + "/", waits);
  assert.equal(waits.length, 1, "the failed write is still registered with the event");
  await waits[0];
});

test("activate deletes stale caches, keeps the current one, then claims clients", async () => {
  const deleted = [];
  let claimed = false;
  const handler = fetchHandler({
    keys: () => Promise.resolve(["gym-v208", "gym-test", "gym-v209"]),
    delete: (key) => { deleted.push(key); return Promise.resolve(true); },
    claim: () => { claimed = true; }
  });
  await lifecycleDone(handler, "activate");
  assert.deepEqual(deleted, ["gym-v208", "gym-v209"], "only older versions are evicted");
  assert.equal(claimed, true, "the new worker takes control of the page");
});
