/* ── rest state machine (pure) ──────────────────────────────────────────────
   Phases: idle → active ⇄ paused → go → idle.
   No DOM, no timers, no globals mutated. Callers pass `nowMs`, so the machine
   is frozen-clock testable and stays honest across device sleep (the clock is
   always re-derived from a timestamp, never accumulated by the interval).
   Browser global (window.Gym) + Node module (module.exports).               */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.Gym = root.Gym || {}; Object.assign(root.Gym, factory()); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var IDLE = "idle", ACTIVE = "active", PAUSED = "paused", GO = "go";

  /**
   * @typedef {{phase: string, endMs: number, left: number, total: number}} RestState
   */

  /** @returns {RestState} a fresh idle state */
  function idle() { return { phase: IDLE, endMs: 0, left: 0, total: 0 }; }

  /** @param {number} ms @returns {number} whole seconds, rounded up, clamped at 0 */
  function ceilSec(ms) { return Math.max(0, Math.ceil(ms / 1000)); }

  /**
   * Start a countdown.
   * @param {number} seconds
   * @param {number} nowMs
   * @returns {RestState}
   */
  function start(seconds, nowMs) {
    var s = Math.max(0, Math.round(seconds));
    return { phase: ACTIVE, endMs: nowMs + s * 1000, left: s, total: s };
  }

  /**
   * Seconds left in the current phase (0 for idle/go).
   * @param {RestState} state
   * @param {number} nowMs
   * @returns {number}
   */
  function remaining(state, nowMs) {
    if (state.phase === ACTIVE) return ceilSec(state.endMs - nowMs);
    if (state.phase === PAUSED) return Math.max(0, state.left);
    return 0;
  }

  /**
   * Advance the clock. Flips active → go when the countdown reaches zero.
   * @param {RestState} state
   * @param {number} nowMs
   * @returns {RestState}
   */
  function tick(state, nowMs) {
    if (state.phase !== ACTIVE) return state;
    var left = remaining(state, nowMs);
    if (left <= 0) return { phase: GO, endMs: 0, left: 0, total: state.total };
    return { phase: ACTIVE, endMs: state.endMs, left: left, total: state.total };
  }

  /**
   * Freeze the countdown, keeping the remaining seconds.
   * @param {RestState} state
   * @param {number} nowMs
   * @returns {RestState}
   */
  function pause(state, nowMs) {
    if (state.phase !== ACTIVE) return state;
    return { phase: PAUSED, endMs: 0, left: remaining(state, nowMs), total: state.total };
  }

  /**
   * Re-anchor the countdown to now + remaining.
   * @param {RestState} state
   * @param {number} nowMs
   * @returns {RestState}
   */
  function resume(state, nowMs) {
    if (state.phase !== PAUSED) return state;
    return { phase: ACTIVE, endMs: nowMs + state.left * 1000, left: state.left, total: state.total };
  }

  /**
   * Add seconds in either active or paused phase (no-op at idle/go).
   * @param {RestState} state
   * @param {number} seconds
   * @returns {RestState}
   */
  function extend(state, seconds) {
    if (state.phase === ACTIVE) {
      return { phase: ACTIVE, endMs: state.endMs + seconds * 1000, left: state.left + seconds, total: state.total + seconds };
    }
    if (state.phase === PAUSED) {
      return { phase: PAUSED, endMs: 0, left: state.left + seconds, total: state.total + seconds };
    }
    return state;
  }

  /**
   * 0..1 elapsed fraction for the progress bar.
   * @param {RestState} state
   * @param {number} nowMs
   * @returns {number}
   */
  function progress(state, nowMs) {
    if (state.total <= 0) return state.phase === GO ? 1 : 0;
    var left = remaining(state, nowMs);
    return Math.max(0, Math.min(1, 1 - left / state.total));
  }

  return {
    IDLE: IDLE, ACTIVE: ACTIVE, PAUSED: PAUSED, GO: GO,
    idle: idle, start: start, remaining: remaining, tick: tick,
    pause: pause, resume: resume, extend: extend, progress: progress
  };
});
