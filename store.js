/* ── persistence: schema v2 + real migration + per-lift history ─────────────
   Browser global (window.Gym) + Node module. localStorage is referenced at
   call time and guarded, so requiring this file in Node never throws.        */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.Gym = root.Gym || {}; Object.assign(root.Gym, factory()); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CURRENT = 2;
  var STORE = "gym-tool-v2";   // v2 payload lives here
  var LEGACY = "gym-tool-v1";  // v1 payload read once, then migrated
  var THEME_KEY = "gym-theme";
  var HISTORY_MAX = 52;        // ~1 year of weekly sessions per lift

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }

  /* open on today's training day; Mon–Thu (off days) land on Fri, the next session */
  function todayDay() { var d = new Date().getDay(); return d === 6 ? "sat" : (d === 0 ? "sun" : "fri"); }
  function emptyPayload() { return { v: CURRENT, cur: todayDay(), idx: 0, state: {}, liftHistory: {} }; }

  function normalize(p) {
    if (!p.state || typeof p.state !== "object") p.state = {};
    if (!p.liftHistory || typeof p.liftHistory !== "object") p.liftHistory = {};
    if (typeof p.idx !== "number" || p.idx < 0) p.idx = 0;
    if (!p.cur) p.cur = "fri";
    p.v = CURRENT;
    return p;
  }

  /* v1 → v2 carries data forward; unknown/future versions are flagged, never dropped */
  function migrate(raw) {
    var p;
    try { p = JSON.parse(raw); } catch (e) { return null; }
    if (!p || typeof p !== "object") return null;
    if (p.v === CURRENT) return normalize(p);
    if (p.v === 1) {
      return normalize({ v: CURRENT, cur: p.cur || "fri", idx: typeof p.idx === "number" ? p.idx : 0, state: p.state && typeof p.state === "object" ? p.state : {}, liftHistory: {} });
    }
    if (typeof p.v === "number" && p.v > CURRENT) return { __future: p };
    return null;
  }

  function load() {
    var raw = read(STORE) || read(LEGACY);
    if (!raw) return emptyPayload();
    var m = migrate(raw);
    if (!m) return emptyPayload();
    if (m.__future) { write(STORE + "-future", raw); return emptyPayload(); } // keep a copy, never overwrite
    return m;
  }

  function save(p) { p.v = CURRENT; return write(STORE, JSON.stringify(p)); }

  function exportPayload(p) { return JSON.stringify(p); }

  function importRaw(raw) {
    var m = migrate(raw);
    if (!m || m.__future) throw new Error("Not a valid Gym backup");
    save(m);
    return m;
  }

  /* ── per-lift history ring buffer ── */
  function pushHistory(p, d, i, entry) {
    if (!p.liftHistory) p.liftHistory = {};
    var k = d + ":" + i, arr = p.liftHistory[k] || (p.liftHistory[k] = []);
    arr.push(entry);
    while (arr.length > HISTORY_MAX) arr.shift();
    return arr;
  }
  function lastEntry(p, d, i) {
    var arr = p.liftHistory && p.liftHistory[d + ":" + i];
    return arr && arr.length ? arr[arr.length - 1] : null;
  }
  function series(p, d, i, n) {
    var arr = (p.liftHistory && p.liftHistory[d + ":" + i]) || [];
    return n ? arr.slice(Math.max(0, arr.length - n)) : arr.slice();
  }
  function popHistory(p, d, i) {
    var arr = p.liftHistory && p.liftHistory[d + ":" + i];
    if (arr && arr.length) arr.pop();
  }

  /* clear one lift's finished sets, keeping the working load / reps / RIR.
     A same-day snapshot (from a redo) is dropped so redoing replaces it.    */
  function resetLift(p, d, i) {
    var k = d + ":" + i, rec = p.state && p.state[k];
    if (rec) { rec.done = 0; rec.topHits = 0; rec.lastRir = null; }
    var arr = p.liftHistory && p.liftHistory[k];
    if (arr && arr.length && arr[arr.length - 1].date === dateKey()) arr.pop();
  }

  /* clear every lift's finished sets for one day, keeping loads + earlier history */
  function resetDay(p, d) {
    var prefix = d + ":", k;
    if (p.state) {
      for (k in p.state) {
        if (p.state.hasOwnProperty(k) && k.indexOf(prefix) === 0) {
          p.state[k].done = 0; p.state[k].topHits = 0; p.state[k].lastRir = null;
        }
      }
    }
    if (p.liftHistory) {
      for (k in p.liftHistory) {
        if (p.liftHistory.hasOwnProperty(k) && k.indexOf(prefix) === 0) {
          var arr = p.liftHistory[k];
          while (arr.length && arr[arr.length - 1].date === dateKey()) arr.pop();
        }
      }
    }
  }

  function dateKey(dt) {
    dt = dt || new Date();
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }

  return {
    CURRENT: CURRENT, STORE: STORE, LEGACY: LEGACY, THEME_KEY: THEME_KEY, HISTORY_MAX: HISTORY_MAX,
    emptyPayload: emptyPayload, migrate: migrate, load: load, save: save,
    exportPayload: exportPayload, importRaw: importRaw,
    pushHistory: pushHistory, lastEntry: lastEntry, series: series, popHistory: popHistory,
    resetLift: resetLift, resetDay: resetDay,
    dateKey: dateKey
  };
});
