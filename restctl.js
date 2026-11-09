/* ── rest controller: orchestration between the pure clock and the DOM ──────
   Owns the rest *controller* state (the Machine state plus the small context
   the timer surface needs) and turns every user action into a plain effect
   list. It never touches the DOM, never starts an interval and never reads a
   global — the shell (app.js) applies effects and renders the returned view
   model, so this file is frozen-clock testable in Node.
   Browser global (window.Gym) + Node module (module.exports).               */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else {
    /* flat-namespace registration with a collision guard: two modules that
       export the same key must never silently clobber each other.            */
    root.Gym = root.Gym || {};
    var mod = factory(), k;
    for (k in mod) if (Object.prototype.hasOwnProperty.call(mod, k)) {
      if (Object.prototype.hasOwnProperty.call(root.Gym, k) && typeof console === "object") console.warn("[gym] duplicate export: " + k);
      root.Gym[k] = mod[k];
    }
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * @typedef {{phase: string, secs: number, progress: number, label: string,
   *            msg: string, nextText: string, skipLabel: string,
   *            showPrep: boolean, prepName: string, prepLoad: string,
   *            prepReps: string}} RestView
   * @typedef {{type: string, [key: string]: any}} RestEffect
   * @typedef {{state: {phase: string, pending: boolean},
   *            view: RestView, effects: RestEffect[]}} RestOut
   * @typedef {{Machine: any, Rest: any, now: () => number, cur: () => string,
   *            idx: () => number, dayLen: () => number, done: () => number,
   *            sets: () => number, exRest: () => number, editSet: () => number,
   *            firstOpen: (from: number) => number,
   *            prep: () => {name: string, load: string, reps: string}}} RestDeps
   */

  /**
   * Build a rest controller bound to the shell's data accessors.
   * @param {RestDeps} deps
   */
  function createRestController(deps) {
    var Machine = deps.Machine, Rest = deps.Rest;

    var rest = Machine.idle();
    /* Orchestration context. Every field mirrors what the old app.js object
       held, minus the interval/arm timer handles, which are shell concerns.
       `label` is never written: extend15-at-GO restarts a rest with it, and
       today that value is always "" — keeping it preserves the strings.      */
    var ctx = {
      label: "", pending: false, pIdx: -1, pDay: "",
      note: "", nextText: "", msg: "", goAtMs: 0, finishUntil: 0, frozen: false,
      startLabel: "", idleLabel: "", idleMsg: ""
    };

    function lastLift() { return deps.idx() >= deps.dayLen() - 1; }

    /** 0 when idle, the full fraction at GO. */
    function view() {
      var now = deps.now(), phase = rest.phase;
      var armed = Rest.finishArmed(now, ctx.finishUntil);
      var label = "", msg = "", nextText = "", skipLabel = "End rest";
      if (phase === "go") {
        var adv = Rest.canAdvance(ctx.pending, deps.cur(), ctx.pDay, deps.idx(), ctx.pIdx, true);
        label = "GO";
        msg = Rest.goLabel(adv, lastLift());
        nextText = ctx.nextText.replace("Up next —", "Up now —");
        skipLabel = armed
          ? "Tap again to finish"
          : Rest.advanceLabel(adv, lastLift());
      } else if (phase === "paused") {
        label = ctx.startLabel;
        msg = "Paused — tap Resume to continue.";
        nextText = ctx.nextText;
        skipLabel = armed ? "Tap again to finish" : "End rest";
      } else if (phase === "active") {
        label = ctx.startLabel;
        msg = ctx.msg;
        nextText = ctx.nextText;
        skipLabel = armed ? "Tap again to finish" : "End rest";
      } else {
        label = ctx.idleLabel;
        msg = ctx.idleMsg;
      }
      var showPrep = Rest.prepVisible(phase, deps.editSet(), deps.done(), deps.sets());
      var prep = showPrep ? deps.prep() : null;
      return {
        phase: phase,
        ticking: phase === "active" && !ctx.frozen,
        secs: Machine.remaining(rest, now),
        progress: Machine.progress(rest, now),
        label: label, msg: msg, nextText: nextText, skipLabel: skipLabel,
        showPrep: showPrep,
        prepName: prep ? prep.name : "",
        prepLoad: prep ? prep.load : "",
        prepReps: prep ? prep.reps : ""
      };
    }

    /** @param {RestEffect[]} effects @returns {RestOut} */
    function out(effects) {
      return { state: { phase: rest.phase, pending: ctx.pending }, view: view(), effects: effects };
    }

    /** Back to idle, clearing exactly what the old timerIdle cleared. */
    function toIdle(label, msg) {
      rest = Machine.idle();
      ctx.pending = false; ctx.pIdx = -1; ctx.pDay = "";
      ctx.finishUntil = 0; ctx.frozen = false;
      ctx.idleLabel = label || ""; ctx.idleMsg = msg || "";
    }

    function go(nowMs) {
      ctx.goAtMs = nowMs;
      ctx.finishUntil = 0;
      ctx.frozen = false;
      /* current finishRest order: vibrate, beep, notification */
      return out([{ type: "vibrate", ms: 200 }, { type: "beep" }, { type: "notify" }]);
    }

    function start(sec, label, lastSet, note, nextText) {
      rest = Machine.start(sec, deps.now());
      ctx.pending = !!lastSet;
      if (ctx.pending) { ctx.pIdx = deps.idx(); ctx.pDay = deps.cur(); }
      ctx.startLabel = label;
      ctx.note = note || ""; ctx.nextText = nextText || "";
      ctx.finishUntil = 0; ctx.frozen = false;
      ctx.msg = Rest.restMsg(note, sec, deps.exRest());
      return out([{ type: "closeDetails" }, { type: "blurIfOutside" }]);
    }

    function idle(label, msg) {
      toIdle(label, msg);
      return out([]);
    }

    function tick(nowMs) {
      if (rest.phase !== "active") return out([]);
      rest = Machine.tick(rest, nowMs);
      if (rest.phase === "go") return go(nowMs);
      return out([]);
    }

    function finish() {
      if (rest.phase !== "active") return out([]);
      rest = { phase: Machine.GO, endMs: 0, left: 0, total: rest.total };
      return go(deps.now());
    }

    function pause() {
      if (rest.phase !== "active") return out([]);
      rest = Machine.pause(rest, deps.now());
      ctx.frozen = false;
      return out([]);
    }

    function resume() {
      if (rest.phase !== "paused") return out([]);
      rest = Machine.resume(rest, deps.now());
      ctx.frozen = false;
      return out([]);
    }

    function extend15() {
      if (rest.phase === "idle") return out([]);
      if (rest.phase === "go") return start(15, ctx.label, ctx.pending, ctx.note, ctx.nextText);
      ctx.frozen = false;
      rest = Machine.extend(rest, 15);
      return out([]);
    }

    function skip(fromTimerBar) {
      /* the whole timer surface is the advance button at GO, but not for the
         same tap that just finished the rest */
      if (fromTimerBar && deps.now() - ctx.goAtMs < 400) return out([]);
      var isGo = rest.phase === "go";
      var adv = Rest.canAdvance(ctx.pending, deps.cur(), ctx.pDay, deps.idx(), ctx.pIdx, deps.done() >= deps.sets());
      if (adv) {
        var nx = Rest.nextLift(deps.idx(), deps.dayLen(), deps.firstOpen(deps.idx() + 1));
        if (nx >= 0) {
          ctx.pending = false;
          toIdle("", "Next lift — go.");
          return out([{ type: "advanceTo", idx: nx }, { type: "commit" }, { type: "render" }]);
        }
        /* last lift done — require a second tap so a stray tap can't end the session */
        if (!Rest.finishArmed(deps.now(), ctx.finishUntil)) {
          ctx.finishUntil = Rest.armFinish(deps.now());
          if (rest.phase !== "go") ctx.frozen = true;
          return out([{ type: "scheduleFinishReset", ms: 2600 }]);
        }
        toIdle("", "Workout complete — nice work.");
        return out([{ type: "finishWorkout" }]);
      }
      toIdle("", isGo ? "Next set — go." : "Skipped — next set, go.");
      return out([]);
    }

    /** The 2,600 ms two-tap window expired: forget the arm and thaw the clock. */
    function finishReset() {
      ctx.finishUntil = 0;
      ctx.frozen = false;
      return out([]);
    }

    /** Manual navigation cancels a pending auto-advance; callers never render. */
    function cancelPendingAdvance() {
      if (rest.phase !== Machine.IDLE) ctx.pending = false;
      return out([]);
    }

    return {
      start: start, tick: tick, finish: finish, idle: idle,
      pause: pause, resume: resume, extend15: extend15, skip: skip,
      finishReset: finishReset, cancelPendingAdvance: cancelPendingAdvance,
      view: view
    };
  }

  return { createRestController: createRestController };
});
