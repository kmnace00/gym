const test = require("node:test");
const assert = require("node:assert");
const T = require("../timer.js");

test("restDuration adds 30s at RIR 0–1 only", () => {
  assert.equal(T.restDuration(120, 2), 120);
  assert.equal(T.restDuration(120, 1), 150);
  assert.equal(T.restDuration(120, 0), 150);
  assert.equal(T.restDuration(90, 3), 90);
});

test("sessionElapsed accumulates whole seconds", () => {
  assert.equal(T.sessionElapsed(100, 1000, 31000), 130);
  assert.equal(T.sessionElapsed(0, 5000, 5000), 0);
});
