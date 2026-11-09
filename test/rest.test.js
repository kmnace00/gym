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

test("restMsg picks the partials or stretch cue, prefixing only when lengthened", () => {
  const partials = "Add bottom-half partials to failure — then rest.";
  const stretch = "Stretch — set up the next set.";
  const prefix = "+30s for 0–1 RIR · ";
  assert.equal(R.restMsg("partials", 120, 120), partials);
  assert.equal(R.restMsg("partials", 150, 120), prefix + partials);
  assert.equal(R.restMsg("", 120, 120), stretch);
  assert.equal(R.restMsg(undefined, 90, 120), stretch);       // shorter than base
  assert.equal(R.restMsg("", 150, 120), prefix + stretch);    // only when sec > base
  assert.equal(R.restMsg("partials", 121, 120), prefix + partials);
});

test("goLabel matches the three GO-screen states", () => {
  assert.equal(R.goLabel(false, false), "Next set — go.");
  assert.equal(R.goLabel(false, true), "Next set — go.");
  assert.equal(R.goLabel(true, false), "Lift done — next up.");
  assert.equal(R.goLabel(true, true), "Workout complete — nice work.");
});

test("prepVisible only during a rest with sets still open and no set being edited", () => {
  assert.equal(R.prepVisible("active", -1, 0, 3), true);
  assert.equal(R.prepVisible("paused", -1, 2, 3), true);
  assert.equal(R.prepVisible("idle", -1, 0, 3), false);
  assert.equal(R.prepVisible("go", -1, 0, 3), false);
  assert.equal(R.prepVisible("active", 0, 0, 3), false);  // editing a logged set
  assert.equal(R.prepVisible("active", 2, 1, 3), false);
  assert.equal(R.prepVisible("active", -1, 3, 3), false); // lift already done
  assert.equal(R.prepVisible("active", -1, 4, 3), false);
});
