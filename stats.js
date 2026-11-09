/* ── progress analytics (pure) ──────────────────────────────────────────────
   Aggregates the per-lift history ring buffer for the Progress view. No DOM,
   no calendar "now" dependency, so results are deterministic and testable.
   Input shape: the persisted payload ({ state, liftHistory, … }).
   Browser global (window.Gym) + Node module.                                */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.Gym = root.Gym || {}; Object.assign(root.Gym, factory()); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** @param {any} payload @returns {string[]} every "day:index" key with history */
  function historyKeys(payload) {
    var out = [], lh = (payload && payload.liftHistory) || {}, k;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k) && lh[k] && lh[k].length) out.push(k);
    return out;
  }

  /**
   * Number of completed lift sessions recorded.
   * @param {any} payload
   * @returns {number}
   */
  function sessionCount(payload) {
    var n = 0, lh = (payload && payload.liftHistory) || {}, k;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) n += (lh[k] || []).length;
    return n;
  }

  /**
   * Total sets marked done across every lift's current state.
   * @param {any} payload
   * @returns {number}
   */
  function setsLogged(payload) {
    var n = 0, st = (payload && payload.state) || {}, k;
    for (k in st) if (Object.prototype.hasOwnProperty.call(st, k)) n += Math.max(0, st[k].done || 0);
    return n;
  }

  /**
   * Tonnage for one history entry: load × reps × sets.
   * @param {{load?:number,reps?:number,setsDone?:number}} e
   * @returns {number}
   */
  function entryVolume(e) { return (e.load || 0) * (e.reps || 0) * (e.setsDone || 0); }

  /**
   * Total tonnage across all recorded sessions.
   * @param {any} payload
   * @returns {number}
   */
  function totalVolume(payload) {
    var total = 0, lh = (payload && payload.liftHistory) || {}, k, arr, i;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || [];
      for (i = 0; i < arr.length; i++) total += entryVolume(arr[i]);
    }
    return total;
  }

  /**
   * Tonnage per calendar day (a "session"), sorted oldest → newest.
   * @param {any} payload
   * @returns {{date:string, volume:number}[]}
   */
  function sessionVolumes(payload) {
    var lh = (payload && payload.liftHistory) || {}, byDate = {}, k, arr, i, e, d;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || [];
      for (i = 0; i < arr.length; i++) {
        e = arr[i]; d = e.date || "";
        byDate[d] = (byDate[d] || 0) + entryVolume(e);
      }
    }
    return Object.keys(byDate).sort().map(function (date) { return { date: date, volume: byDate[date] }; });
  }

  /**
   * The last `n` session volumes (all when `n` is falsy).
   * @param {any} payload
   * @param {number} [n]
   * @returns {{date:string, volume:number}[]}
   */
  function recentVolume(payload, n) {
    var s = sessionVolumes(payload);
    return n ? s.slice(Math.max(0, s.length - n)) : s;
  }

  /**
   * Tonnage of the most recent session per training day.
   * @param {any} payload
   * @param {Record<string, {ex: any[]}>} DAYS
   * @returns {Record<string, number>}
   */
  function volumeByDay(payload, DAYS) {
    var res = {}, lh = (payload && payload.liftHistory) || {}, d, i, arr, total, list;
    for (d in DAYS) if (Object.prototype.hasOwnProperty.call(DAYS, d)) {
      list = DAYS[d].ex; total = 0;
      for (i = 0; i < list.length; i++) {
        arr = lh[d + ":" + i];
        if (arr && arr.length) total += entryVolume(arr[arr.length - 1]);
      }
      res[d] = total;
    }
    return res;
  }

  /**
   * Distinct calendar days with at least one recorded session.
   * @param {any} payload
   * @returns {number}
   */
  function uniqueDays(payload) {
    var s = sessionVolumes(payload), n = 0, last = null, i;
    for (i = 0; i < s.length; i++) { if (s[i].date && s[i].date !== last) { n++; last = s[i].date; } }
    return n;
  }

  return {
    historyKeys: historyKeys, sessionCount: sessionCount, setsLogged: setsLogged,
    entryVolume: entryVolume, totalVolume: totalVolume, sessionVolumes: sessionVolumes,
    recentVolume: recentVolume, volumeByDay: volumeByDay, uniqueDays: uniqueDays
  };
});
