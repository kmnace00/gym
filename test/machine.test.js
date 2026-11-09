const test = require("node:test");
const assert = require("node:assert");
const M = require("../machine.js");

test("idle is inactive at zero", () => {
  const s = M.idle();
  assert.equal(s.phase, M.IDLE);
  assert.equal(M.remaining(s, 1000), 0);
  assert.equal(M.progress(s, 1000), 0);
});

test("start begins active and counts down by timestamp", () => {
  const s = M.start(90, 1000);
  assert.equal(s.phase, M.ACTIVE);
  assert.equal(M.remaining(s, 1000), 90);
  assert.equal(M.remaining(s, 31000), 60);
  assert.equal(M.remaining(s, 91000), 0);
});

test("tick flips to go at zero and stays there", () => {
  let s = M.start(10, 0);
  s = M.tick(s, 5000);
  assert.equal(s.phase, M.ACTIVE);
  assert.equal(s.left, 5);
  s = M.tick(s, 10000);
  assert.equal(s.phase, M.GO);
  assert.equal(M.remaining(s, 99999), 0);
  assert.equal(M.tick(s, 20000).phase, M.GO);
});

test("pause freezes remaining and resume re-anchors to now", () => {
  let s = M.start(60, 0);
  s = M.pause(s, 20000);
  assert.equal(s.phase, M.PAUSED);
  assert.equal(s.left, 40);
  assert.equal(M.remaining(s, 200000), 40); // frozen, not drifting
  s = M.resume(s, 200000);
  assert.equal(s.phase, M.ACTIVE);
  assert.equal(M.remaining(s, 200000), 40);
  assert.equal(M.remaining(s, 240000), 0);
});

test("extend adds time in active and paused, ignores idle/go", () => {
  let s = M.start(30, 0);
  s = M.extend(s, 15);
  assert.equal(s.total, 45);
  assert.equal(M.remaining(s, 0), 45);
  s = M.pause(s, 0);
  s = M.extend(s, 15);
  assert.equal(s.left, 60);
  assert.equal(s.total, 60);
  assert.equal(M.extend(M.idle(), 15).phase, M.IDLE);
});

test("progress is clamped 0..1", () => {
  const s = M.start(100, 0);
  assert.equal(M.progress(s, 0), 0);
  assert.equal(M.progress(s, 50000), 0.5);
  assert.equal(M.progress(s, 100000), 1);
  assert.equal(M.progress(s, 150000), 1);
});

test("invalid transitions are no-ops", () => {
  const s = M.start(10, 0);
  assert.equal(M.resume(s, 0), s); // already active
  assert.equal(M.pause(M.idle(), 0).phase, M.IDLE);
});
