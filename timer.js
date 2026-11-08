/* ── timer math (pure) — the rest/session state machines stay in app.js ──────
   Browser global (window.Gym) + Node module.                                 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.Gym = root.Gym || {}; Object.assign(root.Gym, factory()); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var RIR_PENALTY = 30; // extra rest after a 0–1 RIR set

  function restDuration(baseRest, rir) { return baseRest + (rir <= 1 ? RIR_PENALTY : 0); }
  function remainingSeconds(endMs, nowMs) { return Math.max(0, Math.ceil((endMs - nowMs) / 1000)); }
  function resumeEndMs(nowMs, remainingSec) { return nowMs + remainingSec * 1000; }
  function extendEndMs(endMs, addSec) { return endMs + addSec * 1000; }
  function sessionElapsed(baseSec, startMs, nowMs) { return baseSec + Math.max(0, Math.floor((nowMs - startMs) / 1000)); }

  return {
    RIR_PENALTY: RIR_PENALTY,
    restDuration: restDuration, remainingSeconds: remainingSeconds,
    resumeEndMs: resumeEndMs, extendEndMs: extendEndMs, sessionElapsed: sessionElapsed
  };
});
