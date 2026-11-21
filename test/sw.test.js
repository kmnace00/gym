const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

/* Run the real service worker in a tiny sandbox so the fetch guard can be
   exercised without a browser. Only the globals the handler touches are stubbed. */
const swSource = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
const ORIGIN = "http://localhost:4173";

function fetchHandler(overrides) {
  const o = overrides || {};
  const listeners = {};
  const cache = { match: () => Promise.resolve(o.hit || null), put: o.put || (() => {}) };
  const sandbox = {
    URL: URL,
    importScripts: () => {},
    GYM_VERSION: "gym-test",
    fetch: o.fetch || (() => Promise.resolve({ ok: true, clone: () => ({}) })),
    caches: {
      open: () => Promise.resolve(cache),
      keys: () => Promise.resolve([]),
      delete: () => Promise.resolve(true),
      match: () => Promise.resolve(null)
    },
    self: {
      location: { origin: ORIGIN },
      addEventListener: (type, fn) => { listeners[type] = fn; },
      skipWaiting: () => {},
      clients: { claim: () => {} }
    }
  };
  vm.runInNewContext(swSource, sandbox);
  return listeners.fetch;
}

function dispatch(handler, url) {
  let handled = false;
  handler({
    request: { method: "GET", mode: "no-cors", url: url },
    respondWith: () => { handled = true; }
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
function respondedWith(handler, url) {
  let promise;
  handler({
    request: { method: "GET", mode: "no-cors", url: url },
    respondWith: (p) => { promise = p; }
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
