/* Rest controller: orchestration between the pure clock (machine.js) and the
   shell. Frozen clock, injected deps, no DOM and no real timers.             */
const test = require("node:test");
const assert = require("node:assert");
const M = require("../machine.js");
const R = require("../rest.js");
const C = require("../restctl.js");

function mk(over) {
  const clock = { t: 0 };
  const data = Object.assign({
    cur: "fri", idx: 0, len: 3, done: 0, sets: 3, exRest: 90, editSet: -1, firstOpen: -1,
    prep: { name: "Set 1 of 3", load: "60 kg", reps: "8" }
  }, over || {});
  const deps = {
    Machine: M, Rest: R,
    now: () => clock.t,
    cur: () => data.cur,
    idx: () => data.idx,
    dayLen: () => data.len,
    done: () => data.done,
    sets: () => data.sets,
    exRest: () => data.exRest,
    editSet: () => data.editSet,
    firstOpen: (from) => data.firstOpen,
    prep: () => data.prep
  };
  return { ctl: C.createRestController(deps), clock, data };
}

/** start a 90 s rest and run the frozen clock to GO */
function toGo(s, lastSet) {
  s.ctl.start(90, "Fri — set 1 done", lastSet !== false, "", "Up next — Set 2 of 3");
  s.clock.t = 90000;
  return s.ctl.tick(s.clock.t);
}

test("start opens an active rest with the shell's labels and two effects", () => {
  const s = mk();
  const out = s.ctl.start(90, "Fri — set 1 done", false, "", "Up next — Set 2 of 3");
  assert.deepEqual(out.state, { phase: "active", pending: false });
  assert.equal(out.view.phase, "active");
  assert.equal(out.view.secs, 90);
  assert.equal(out.view.progress, 0);
  assert.equal(out.view.label, "Fri — set 1 done");
  assert.equal(out.view.msg, "Stretch — set up the next set.");
  assert.equal(out.view.nextText, "Up next — Set 2 of 3");
  assert.equal(out.view.skipLabel, "End rest");
  assert.deepEqual(out.effects, [{ type: "closeDetails" }, { type: "blurIfOutside" }]);
});

test("start captures the lift for a pending advance, and prep shows while resting", () => {
  const s = mk();
  const out = s.ctl.start(90, "Fri — set 1 done", true, "", "");
  assert.equal(out.state.pending, true);
  assert.equal(out.view.showPrep, true);
  assert.equal(out.view.prepName, "Set 1 of 3");
  assert.equal(out.view.prepLoad, "60 kg");
  assert.equal(out.view.prepReps, "8");
});

test("tick re-derives the remaining time from the timestamp", () => {
  const s = mk();
  s.ctl.start(90, "Fri — set 1 done", false, "", "");
  s.clock.t = 60000;
  const out = s.ctl.tick(s.clock.t);
  assert.equal(out.view.phase, "active");
  assert.equal(out.view.secs, 30);  // 90 − 60, not 90 − 300 ticks of 200 ms
  assert.deepEqual(out.effects, []);
});

test("tick flips to GO with vibrate → beep → notify", () => {
  const s = mk();
  const out = toGo(s, false);
  assert.equal(out.state.phase, "go");
  assert.equal(out.view.label, "GO");
  assert.equal(out.view.msg, "Next set — go.");
  assert.equal(out.view.skipLabel, "Start next set");
  assert.equal(out.view.progress, 1);
  assert.deepEqual(out.effects, [{ type: "vibrate", ms: 200 }, { type: "beep" }, { type: "notify" }]);
});

test("GO rewrites nextText and the timer-surface guard ignores a tap within 400 ms", () => {
  const s = mk();
  const go = toGo(s, false);
  assert.equal(go.view.nextText, "Up now — Set 2 of 3");
  s.clock.t = 90399;
  const early = s.ctl.skip(true);
  assert.deepEqual(early.effects, []);
  assert.equal(early.state.phase, "go");
  s.clock.t = 90400;
  const late = s.ctl.skip(true);
  assert.equal(late.state.phase, "idle");
});

test("skip(false) on a completed lift advances with advanceTo → commit → render", () => {
  const s = mk({ done: 3, firstOpen: 2 });
  toGo(s);
  const out = s.ctl.skip(false);
  assert.deepEqual(out.effects, [{ type: "advanceTo", idx: 2 }, { type: "commit" }, { type: "render" }]);
  assert.equal(out.state.pending, false);
  assert.equal(out.view.phase, "idle");
  assert.equal(out.view.msg, "Next lift — go.");
});

test("skip without a pending advance just idles with the set-skip copy", () => {
  const s = mk();
  const active = s.ctl.start(90, "Fri — set 1 done", false, "", "");
  assert.equal(active.state.pending, false);
  const skipped = s.ctl.skip(false);
  assert.equal(skipped.view.msg, "Skipped — next set, go.");
  const s2 = mk();
  toGo(s2);
  assert.equal(s2.ctl.skip(false).view.msg, "Next set — go.");
});

test("last lift needs two taps: arm, then finish inside the window", () => {
  const s = mk({ idx: 2, done: 3 });
  toGo(s);
  const armed = s.ctl.skip(false);
  assert.deepEqual(armed.effects, [{ type: "scheduleFinishReset", ms: 2600 }]);
  assert.equal(armed.view.skipLabel, "Tap again to finish");
  assert.equal(armed.state.phase, "go");
  const done = s.ctl.skip(false);
  assert.deepEqual(done.effects, [{ type: "finishWorkout" }]);
  assert.equal(done.view.msg, "Workout complete — nice work.");
});

test("an expired two-tap window re-arms instead of finishing", () => {
  const s = mk({ idx: 2, done: 3 });
  toGo(s);
  s.ctl.skip(false);
  s.clock.t = 90000 + 2600;
  assert.equal(s.ctl.skip(false).view.skipLabel, "Tap again to finish"); // freshly re-armed
  const reset = s.ctl.finishReset();
  assert.equal(reset.view.skipLabel, "Finish"); // arm window lapsed: back to Finish
  assert.equal(reset.effects.length, 0);
});

test("cancelPendingAdvance clears the auto-advance and never emits effects", () => {
  const s = mk({ done: 3 });
  toGo(s);
  const out = s.ctl.cancelPendingAdvance();
  assert.deepEqual(out.effects, []);
  assert.equal(out.state.pending, false);
  assert.equal(s.ctl.view().phase, "go"); // no re-render, the view is unchanged
  assert.deepEqual(s.ctl.skip(false).effects, []);
});

test("pause and resume round-trip the message and the remaining time", () => {
  const s = mk();
  s.ctl.start(90, "Fri — set 1 done", false, "", "");
  s.clock.t = 30000;
  const paused = s.ctl.pause();
  assert.equal(paused.view.phase, "paused");
  assert.equal(paused.view.secs, 60);
  assert.equal(paused.view.msg, "Paused — tap Resume to continue.");
  s.clock.t = 150000;
  const resumed = s.ctl.resume();
  assert.equal(resumed.view.phase, "active");
  assert.equal(resumed.view.secs, 60);
  assert.equal(resumed.view.msg, "Stretch — set up the next set.");
  assert.equal(s.ctl.pause().view.msg, "Paused — tap Resume to continue.");
});

test("extend15 adds time while resting and restarts a 15 s rest at GO", () => {
  const s = mk();
  s.ctl.start(90, "Fri — set 1 done", false, "", "Up next — Set 2 of 3");
  s.clock.t = 10000;
  assert.equal(s.ctl.extend15().view.secs, 95);
  const g = mk();
  toGo(g);
  const out = g.ctl.extend15();
  assert.equal(out.view.phase, "active");
  assert.equal(out.view.secs, 15);
  assert.equal(out.view.label, ""); // ctx.label is never written, as before
  assert.deepEqual(out.effects, [{ type: "closeDetails" }, { type: "blurIfOutside" }]);
  const idle = mk();
  assert.deepEqual(idle.ctl.extend15().effects, []);
  assert.equal(idle.ctl.view().phase, "idle");
});

test("idle clears the pending advance and the prep row", () => {
  const s = mk({ done: 1 });
  s.ctl.start(90, "Fri — set 1 done", true, "", "");
  assert.equal(s.ctl.view().showPrep, true);
  const out = s.ctl.idle("", "Set removed — back to set 1.");
  assert.equal(out.state.phase, "idle");
  assert.equal(out.state.pending, false);
  assert.equal(out.view.label, "");
  assert.equal(out.view.msg, "Set removed — back to set 1.");
  assert.equal(out.view.skipLabel, "End rest");
  assert.equal(out.view.showPrep, false);
  assert.equal(out.view.prepName, "");
  assert.equal(out.view.nextText, "");
});

test("prep is hidden at GO and while editing a logged set", () => {
  const s = mk();
  assert.equal(toGo(s).view.showPrep, false);
  const e = mk({ editSet: 1 });
  e.ctl.start(90, "Fri — set 1 done", false, "", "");
  assert.equal(e.ctl.view().showPrep, false);
});
