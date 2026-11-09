/* ── timer math (pure) — the rest/session state machines stay in app.js ──────
   Browser global (window.Gym) + Node module.                                 */
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

  var RIR_PENALTY = 30; // extra rest after a 0–1 RIR set

  /** @param {number} baseRest @param {number} rir @returns {number} seconds */
  function restDuration(baseRest, rir) { return baseRest + (rir <= 1 ? RIR_PENALTY : 0); }
  /** @param {number} baseSec @param {number} startMs @param {number} nowMs @returns {number} */
  function sessionElapsed(baseSec, startMs, nowMs) { return baseSec + Math.max(0, Math.floor((nowMs - startMs) / 1000)); }

  /* The countdown / pause / extend math now lives in machine.js; keeping a
     second copy here was a trap for a future caller. */
  return {
    RIR_PENALTY: RIR_PENALTY,
    restDuration: restDuration, sessionElapsed: sessionElapsed
  };
});
