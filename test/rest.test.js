const test = require("node:test");
const assert = require("node:assert");
const R = require("../rest.js");

test("canAdvance only when the completed lift is still the visible one", () => {
  assert.equal(R.canAdvance(true, "fri", "fri", 0, 0, true), true);
  assert.equal(R.canAdvance(false, "fri", "fri", 0, 0, true), false); // manual nav cleared pending
  assert.equal(R.canAdvance(true, "fri", "sat", 0, 0, true), false);  // switched day
  assert.equal(R.canAdvance(true, "fri", "fri", 1, 0, true), false);  // switched lift
  assert.equal(R.canAdvance(true, "fri", "fri", 0, 0, false), false); // lift not complete
});

test("nextLift prefers the first open lift, else the next index, -1 at the end", () => {
  assert.equal(R.nextLift(0, 8, 3), 3);
  assert.equal(R.nextLift(0, 8, -1), 1);
  assert.equal(R.nextLift(6, 8, 7), 7);
  assert.equal(R.nextLift(7, 8, -1), -1);
});

test("finish guard arms a window and expires", () => {
  const until = R.armFinish(1000);
  assert.equal(until, 3500);
  assert.equal(R.finishArmed(1000, until), true);
  assert.equal(R.finishArmed(3500, until), true);
  assert.equal(R.finishArmed(3501, until), false);
  assert.equal(R.finishArmed(1000, 0), false); // never armed
  assert.equal(R.armFinish(1000, 1000), 2000);
});

test("advanceLabel matches the three GO states", () => {
  assert.equal(R.advanceLabel(false, false), "Start next set");
  assert.equal(R.advanceLabel(true, false), "Next lift");
  assert.equal(R.advanceLabel(true, true), "Finish");
});
