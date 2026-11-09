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

  return {
    canAdvance: canAdvance, nextLift: nextLift,
    armFinish: armFinish, finishArmed: finishArmed, advanceLabel: advanceLabel
  };
});
