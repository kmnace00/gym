/* ── rest orchestration helpers (pure) ──────────────────────────────────────
   The DOM controller still lives in app.js; the *decisions* it makes at GO
   (advance vs stay, next-lift index, two-tap finish arming) are pure and
   unit-tested here, mirroring machine.js. No DOM, no timers, no globals.
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
   * True when GO should move to the next lift: a lift was just completed and
   * the user is still looking at that same lift. Manual navigation clears
   * `pending`, so GO can never jump somewhere the user did not choose.
   * @param {boolean} pending
   * @param {string} cur
   * @param {string} pDay
   * @param {number} idx
   * @param {number} pIdx
   * @param {boolean} complete
   * @returns {boolean}
   */
  function canAdvance(pending, cur, pDay, idx, pIdx, complete) {
    return !!(pending && cur === pDay && idx === pIdx && complete);
  }

  /**
   * Index of the lift GO should open after the current one. Prefers the next
   * still-open lift (`firstOpen`), else the literal next index; -1 at the end.
   * @param {number} idx
   * @param {number} len
   * @param {number} firstOpen
   * @returns {number}
   */
  function nextLift(idx, len, firstOpen) {
    if (idx >= len - 1) return -1;
    return firstOpen >= 0 ? firstOpen : idx + 1;
  }

  /**
   * Arm the two-tap finish guard and return the deadline.
   * @param {number} nowMs
   * @param {number} [windowMs]
   * @returns {number}
   */
  function armFinish(nowMs, windowMs) { return nowMs + (typeof windowMs === "number" ? windowMs : 2500); }

  /**
   * True while the second tap is still valid.
   * @param {number} nowMs
   * @param {number} untilMs
   * @returns {boolean}
   */
  function finishArmed(nowMs, untilMs) { return untilMs > 0 && nowMs <= untilMs; }

  /**
   * Label for the GO / advance button.
   * @param {boolean} isAdvance
   * @param {boolean} isLastLift
   * @returns {string}
   */
  function advanceLabel(isAdvance, isLastLift) {
    if (!isAdvance) return "Start next set";
    return isLastLift ? "Finish" : "Next lift";
  }

  /**
   * Rest-screen message: the partials cue on flagged lifts, else a PR/top-reps
   * hint when one just fired, else the stretch cue; prefixed when this rest
   * was lengthened for a 0–1 RIR set.
   * @param {string} note
   * @param {number} sec
   * @param {number} baseRest
   * @param {string} [hint]
   * @returns {string}
   */
  function restMsg(note, sec, baseRest, hint) {
    var msg = note === "partials"
      ? "Add bottom-half partials to failure — then rest."
      : (hint || "Stretch — set up the next set.");
    return sec > baseRest ? "+30s for 0–1 RIR · " + msg : msg;
  }

  /**
   * Copy for the GO screen: moving to the next lift, finishing the workout,
   * or just another set of the same lift.
   * @param {boolean} isAdvance
   * @param {boolean} isLastLift
   * @returns {string}
   */
  function goLabel(isAdvance, isLastLift) {
    if (!isAdvance) return "Next set — go.";
    return isLastLift ? "Workout complete — nice work." : "Lift done — next up.";
  }

  /**
   * True when the next-set prep steppers belong on the rest screen: while a
   * rest is running (not idle, not GO), not editing a logged set, and with
   * sets still open on this lift.
   * @param {string} phase
   * @param {number} editSet
   * @param {number} done
   * @param {number} sets
   * @returns {boolean}
   */
  function prepVisible(phase, editSet, done, sets) {
    return phase !== "idle" && phase !== "go" && editSet < 0 && done < sets;
  }

  return {
    canAdvance: canAdvance, nextLift: nextLift,
    armFinish: armFinish, finishArmed: finishArmed, advanceLabel: advanceLabel,
    restMsg: restMsg, goLabel: goLabel, prepVisible: prepVisible
  };
});
