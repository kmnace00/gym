const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

/* Run the real service worker in a tiny sandbox so the fetch guard can be
   exercised without a browser. Only the globals the handler touches are stubbed. */
const swSource = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
const ORIGIN = "http://localhost:4173";

function fetchHandler() {
  const listeners = {};
  const cache = { match: () => Promise.resolve(null), put: () => {} };
  const sandbox = {
    URL: URL,
    importScripts: () => {},
    GYM_VERSION: "gym-test",
    fetch: () => Promise.resolve({ ok: true, clone: () => ({}) }),
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
