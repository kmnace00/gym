const test = require("node:test");
const assert = require("node:assert");
const T = require("../timer.js");

test("restDuration adds 30s at RIR 0–1 only", () => {
  assert.equal(T.restDuration(120, 2), 120);
  assert.equal(T.restDuration(120, 1), 150);
  assert.equal(T.restDuration(120, 0), 150);
  assert.equal(T.restDuration(90, 3), 90);
});

test("remainingSeconds rounds up and clamps at 0", () => {
  assert.equal(T.remainingSeconds(10000, 10000), 0);
  assert.equal(T.remainingSeconds(9500, 10000), 0);
  assert.equal(T.remainingSeconds(11500, 10000), 2); // ceil(1.5)
  assert.equal(T.remainingSeconds(30000, 10000), 20);
});

test("resumeEndMs anchors to now + remaining", () => {
  assert.equal(T.resumeEndMs(1000, 30), 31000);
  assert.equal(T.resumeEndMs(5000, 0), 5000);
});

test("extendEndMs adds +15s", () => {
  assert.equal(T.extendEndMs(1000, 15), 16000);
});

test("sessionElapsed accumulates whole seconds", () => {
  assert.equal(T.sessionElapsed(100, 1000, 31000), 130);
  assert.equal(T.sessionElapsed(0, 5000, 5000), 0);
});
