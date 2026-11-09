/* ── persistence: schema v2 + real migration + per-lift history ─────────────
   Browser global (window.Gym) + Node module. localStorage is referenced at
   call time and guarded, so requiring this file in Node never throws.        */
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

  var CURRENT = 2;
  var STORE = "gym-tool-v2";   // v2 payload lives here
  var LEGACY = "gym-tool-v1";  // v1 payload read once, then migrated
  var THEME_KEY = "gym-theme";
  var HISTORY_MAX = 52;        // ~1 year of weekly sessions per lift

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }

  /* open on today's training day; Mon–Thu (off days) land on Fri, the next session */
  function todayDay() { var d = new Date().getDay(); return d === 6 ? "sat" : (d === 0 ? "sun" : "fri"); }
  function emptyPayload() { return { v: CURRENT, cur: todayDay(), idx: 0, state: {}, liftHistory: {}, lastBackup: null }; }

  /* ── sanitize on the way in ───────────────────────────────────────────────
     A backup is *untrusted input*: it is parsed and later rendered through
     innerHTML templates. Coerce every numeric field that is present to a real
     number (turning a hostile string into NaN-safe data), without adding or
     removing keys — missing fields must stay missing so getLift() can inject
     program defaults. This closes the import → innerHTML injection vector at
     the data boundary, before any render.                                    */
  function num(v, dflt) {
    var n = typeof v === "number" ? v : Number(v);
    return isFinite(n) ? n : dflt;
  }
  function coerceNum(obj, key) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = num(obj[key], 0);
  }
  function sanitizeRecord(r) {
    if (!r || typeof r !== "object") return r;
    var i, set;
    coerceNum(r, "load"); coerceNum(r, "reps"); coerceNum(r, "rir");
    coerceNum(r, "done"); coerceNum(r, "topHits");
    if (r.lastRir !== null && Object.prototype.hasOwnProperty.call(r, "lastRir")) coerceNum(r, "lastRir");
    if (Array.isArray(r.sets)) {
      for (i = 0; i < r.sets.length; i++) {
        set = r.sets[i];
        if (set && typeof set === "object") { coerceNum(set, "load"); coerceNum(set, "reps"); coerceNum(set, "rir"); }
      }
    }
    return r;
  }
  function sanitizeEntry(e) {
    if (!e || typeof e !== "object") return e;
    if (Object.prototype.hasOwnProperty.call(e, "date")) e.date = typeof e.date === "string" ? e.date : String(e.date);
    coerceNum(e, "load"); coerceNum(e, "reps"); coerceNum(e, "rir"); coerceNum(e, "setsDone");
    if (Object.prototype.hasOwnProperty.call(e, "hitTop")) e.hitTop = !!e.hitTop;
    return e;
  }
  function sanitizePayload(p) {
    var k, i;
    for (k in p.state) if (Object.prototype.hasOwnProperty.call(p.state, k)) sanitizeRecord(p.state[k]);
    for (k in p.liftHistory) if (Object.prototype.hasOwnProperty.call(p.liftHistory, k) && Array.isArray(p.liftHistory[k])) {
      for (i = 0; i < p.liftHistory[k].length; i++) sanitizeEntry(p.liftHistory[k][i]);
    }
    return p;
  }

  function normalize(p) {
    if (!p.state || typeof p.state !== "object") p.state = {};
    if (!p.liftHistory || typeof p.liftHistory !== "object") p.liftHistory = {};
    if (typeof p.idx !== "number" || p.idx < 0) p.idx = 0;
    if (!p.cur) p.cur = "fri";
    if (typeof p.lastBackup !== "string") p.lastBackup = null; // additive, no version bump
    p.v = CURRENT;
    return sanitizePayload(p);
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

  /* ── backup bookkeeping ── */
  function parseDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function hasData(p) {
    var lh = (p && p.liftHistory) || {}, st = (p && p.state) || {}, k;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k) && lh[k] && lh[k].length) return true;
    for (k in st) if (Object.prototype.hasOwnProperty.call(st, k) && (st[k].done || 0) > 0) return true;
    return false;
  }
  /** Record that a full export happened today. */
  function markBackup(p) { p.lastBackup = dateKey(); return p.lastBackup; }
  /** Whole days since the last export, or null when never backed up. */
  function backupAgeDays(p, now) {
    var last = parseDay(p && p.lastBackup);
    if (!last) return null;
    var today = typeof now === "string" ? parseDay(now) : parseDay(dateKey(now ? new Date(now) : new Date()));
    if (!today) today = parseDay(dateKey(new Date()));
    return Math.max(0, Math.round((today.getTime() - last.getTime()) / 86400000));
  }
  /** True when there is data and it is overdue for a backup (default 7 days). */
  function backupDue(p, days) {
    days = typeof days === "number" ? days : 7;
    if (!hasData(p)) return false;
    var age = backupAgeDays(p);
    return age === null || age >= days;
  }

  /* ── merge-on-import: union history by date, keep the fuller state record ── */
  function mergePayload(base, incoming) {
    var out = JSON.parse(JSON.stringify(base || emptyPayload()));
    out.state = out.state || {};
    out.liftHistory = out.liftHistory || {};
    var incState = (incoming && incoming.state) || {}, k;
    for (k in incState) if (Object.prototype.hasOwnProperty.call(incState, k)) {
      var mine = out.state[k], theirs = incState[k];
      if (!mine || (typeof theirs.done === "number" && theirs.done > (mine.done || 0))) {
        out.state[k] = JSON.parse(JSON.stringify(theirs));
      }
    }
    var incHist = (incoming && incoming.liftHistory) || {}, k2;
    for (k2 in incHist) if (Object.prototype.hasOwnProperty.call(incHist, k2)) {
      var seen = {};
      (out.liftHistory[k2] || []).concat(incHist[k2] || []).forEach(function (e) {
        if (!e) return;
        var dk = e.date || (e.load + ":" + e.reps + ":" + e.rir + ":" + e.setsDone);
        seen[dk] = e; // incoming wins on a same-date collision
      });
      var arr = Object.keys(seen).map(function (dk) { return seen[dk]; });
      arr.sort(function (x, y) { return String(x.date || "").localeCompare(String(y.date || "")); });
      while (arr.length > HISTORY_MAX) arr.shift();
      out.liftHistory[k2] = arr;
    }
    out.v = CURRENT;
    if (!out.lastBackup && incoming && incoming.lastBackup) out.lastBackup = incoming.lastBackup;
    /* adopt the backup's location so a restore lands where the data is */
    if (incoming && incoming.cur) out.cur = incoming.cur;
    if (incoming && typeof incoming.idx === "number") out.idx = incoming.idx;
    return out;
  }

  /** Merge a backup into the current payload (never discards current data). */
  function importMerge(base, raw) {
    var m = migrate(raw);
    if (!m || m.__future) throw new Error("Not a valid Gym backup");
    var merged = mergePayload(base, m);
    save(merged);
    return merged;
  }

  /* clear one lift's finished sets, keeping the working load / reps / RIR.
     A same-day snapshot (from a redo) is dropped so redoing replaces it.    */
  function resetLift(p, d, i) {
    var k = d + ":" + i, rec = p.state && p.state[k];
    if (rec) { rec.done = 0; rec.topHits = 0; rec.lastRir = null; rec.sets = []; }
    var arr = p.liftHistory && p.liftHistory[k];
    if (arr && arr.length && arr[arr.length - 1].date === dateKey()) arr.pop();
  }

  /* clear every lift's finished sets for one day, keeping loads + earlier history */
  function resetDay(p, d) {
    var prefix = d + ":", k;
    if (p.state) {
      for (k in p.state) {
        if (p.state.hasOwnProperty(k) && k.indexOf(prefix) === 0) {
          p.state[k].done = 0; p.state[k].topHits = 0; p.state[k].lastRir = null; p.state[k].sets = [];
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
    markBackup: markBackup, backupAgeDays: backupAgeDays, backupDue: backupDue,
    mergePayload: mergePayload, importMerge: importMerge,
    dateKey: dateKey
  };
});
