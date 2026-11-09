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

  var CURRENT = 3;
  var STORE = "gym-tool-v2";   // legacy key name; payload `v` is authoritative
  var LEGACY = "gym-tool-v1";  // v1 payload read once, then migrated
  var QUARANTINE = STORE + "-corrupt";
  var SNAPSHOT = STORE + "-snapshot";
  var THEME_KEY = "gym-theme";
  var HISTORY_MAX = 520;       // ~10 years of weekly sessions per lift
  var SESSION_MAX = 520;       // completed-session log cap (same horizon)

  var loadError = null;

  function uid(prefix) {
    try {
      if (typeof crypto !== "undefined" && crypto.randomUUID) return prefix + "_" + crypto.randomUUID();
    } catch (e) {}
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }

  /* open on today's training day; Mon–Thu (off days) land on Fri, the next session */
  function todayDay() { var d = new Date().getDay(); return d === 6 ? "sat" : (d === 0 ? "sun" : "fri"); }
  /* the actual weekday when it is a training day, else null (Mon–Thu) */
  function actualDay() { var d = new Date().getDay(); return d === 5 ? "fri" : d === 6 ? "sat" : d === 0 ? "sun" : null; }
  /* whole days until the next occurrence of a training day (0 = today) */
  function daysUntil(day) {
    var order = { sun: 0, fri: 5, sat: 6 }, target = order[day];
    if (target == null) return null;
    return (target - new Date().getDay() + 7) % 7;
  }
  function validDay(d) { return d === "fri" || d === "sat" || d === "sun"; }
  function validDate(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }

  function emptySession(day, date) {
    return {
      id: uid("ses"), date: validDate(date) ? date : dateKey(),
      day: validDay(day) ? day : todayDay(),
      startedAt: null, endedAt: null, accSec: 0, runningSince: null, status: "active"
    };
  }
  function emptyPayload() {
    return {
      v: CURRENT, cur: todayDay(), idx: 0, state: {}, liftHistory: {},
      lastBackup: null, active: emptySession(todayDay()), sessionLog: [],
      bodyweight: 75
    };
  }

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
  function unsafeKey(k) {
    return k === "__proto__" || k === "constructor" || k === "prototype";
  }
  /* a record / entry / session must be a real object: null, arrays, strings
     and numbers are not data the app can read, so they are dropped at the
     boundary instead of reaching a consumer that dereferences them.          */
  function isObj(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  /* how much real progress a record carries, used to break merge ties:
     a record with no sets and no done count is just a program default, so an
     imported record with the same done count must win over it. */
  function progressScore(r) {
    if (!isObj(r)) return -1;
    return (r.done || 0) * 1000 + (Array.isArray(r.sets) ? r.sets.length : 0) * 10 + (r.topHits || 0);
  }
  function stripUnsafeKeys(obj) {
    if (!obj || typeof obj !== "object") return obj;
    var keys = Object.keys(obj), i;
    for (i = 0; i < keys.length; i++) if (unsafeKey(keys[i])) delete obj[keys[i]];
    return obj;
  }
  function own(obj, key) {
    return obj && Object.prototype.hasOwnProperty.call(obj, key);
  }
  function coerceNum(obj, key) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = num(obj[key], 0);
  }
  function sanitizeSets(arr) {
    if (!Array.isArray(arr)) return;
    for (var i = 0; i < arr.length; i++) {
      var set = arr[i];
      if (set && typeof set === "object") {
        stripUnsafeKeys(set);
        coerceNum(set, "load"); coerceNum(set, "reps"); coerceNum(set, "rir");
        if (Object.prototype.hasOwnProperty.call(set, "kind")) set.kind = String(set.kind);
      }
    }
  }
  function sanitizeSetsField(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Object.prototype.hasOwnProperty.call(obj, "sets")) {
      if (Array.isArray(obj.sets)) sanitizeSets(obj.sets);
      else obj.sets = [];
    }
  }
  function sanitizeRecord(r) {
    if (!isObj(r)) return r;
    stripUnsafeKeys(r);               // nested `__proto__` must not survive the boundary
    coerceNum(r, "load"); coerceNum(r, "reps"); coerceNum(r, "rir");
    coerceNum(r, "done"); coerceNum(r, "topHits");
    if (r.lastRir !== null && Object.prototype.hasOwnProperty.call(r, "lastRir")) coerceNum(r, "lastRir");
    if (Object.prototype.hasOwnProperty.call(r, "exId")) r.exId = typeof r.exId === "string" ? r.exId : String(r.exId);
    if (Object.prototype.hasOwnProperty.call(r, "bw")) r.bw = !!r.bw;
    sanitizeSetsField(r);
    return r;
  }
  function sanitizeEntry(e) {
    if (!isObj(e)) return e;
    stripUnsafeKeys(e);
    if (Object.prototype.hasOwnProperty.call(e, "date")) e.date = typeof e.date === "string" ? e.date : String(e.date);
    coerceNum(e, "load"); coerceNum(e, "reps"); coerceNum(e, "rir"); coerceNum(e, "setsDone");
    if (Object.prototype.hasOwnProperty.call(e, "hitTop")) e.hitTop = !!e.hitTop;
    if (Object.prototype.hasOwnProperty.call(e, "bw")) e.bw = !!e.bw;
    if (Object.prototype.hasOwnProperty.call(e, "exId")) e.exId = typeof e.exId === "string" ? e.exId : String(e.exId);
    sanitizeSetsField(e);
    return e;
  }
  function sanitizeSession(s) {
    if (!isObj(s)) return s;
    stripUnsafeKeys(s);
    s.id = typeof s.id === "string" && s.id && !unsafeKey(s.id) ? s.id : uid("ses");
    s.date = validDate(s.date) ? s.date : dateKey();
    s.day = validDay(s.day) ? s.day : "fri";
    s.status = s.status === "complete" ? "complete" : "active";
    s.startedAt = typeof s.startedAt === "number" && isFinite(s.startedAt) ? s.startedAt : null;
    s.endedAt = typeof s.endedAt === "number" && isFinite(s.endedAt) ? s.endedAt : null;
    s.accSec = typeof s.accSec === "number" && isFinite(s.accSec) && s.accSec > 0 ? s.accSec : 0;
    s.runningSince = typeof s.runningSince === "number" && isFinite(s.runningSince) ? s.runningSince : null;
    coerceNum(s, "durationSec");
    if (!isObj(s.lifts)) s.lifts = {};
    stripUnsafeKeys(s.lifts);
    for (var k in s.lifts) if (own(s.lifts, k)) {
      if (!isObj(s.lifts[k])) delete s.lifts[k];
      else sanitizeRecord(s.lifts[k]);
    }
    return s;
  }
  function sanitizePayload(p) {
    var k, i;
    stripUnsafeKeys(p.state);
    stripUnsafeKeys(p.liftHistory);
    for (k in p.state) if (own(p.state, k)) {
      /* a null / non-object record is dropped, so getLift() injects defaults
         on the next read exactly as it would for a lift never touched.       */
      if (!isObj(p.state[k])) delete p.state[k];
      else sanitizeRecord(p.state[k]);
    }
    for (k in p.liftHistory) if (own(p.liftHistory, k)) {
      if (!Array.isArray(p.liftHistory[k])) p.liftHistory[k] = [];
      for (i = 0; i < p.liftHistory[k].length; i++) {
        if (!isObj(p.liftHistory[k][i])) p.liftHistory[k][i] = null;
        else sanitizeEntry(p.liftHistory[k][i]);
      }
      p.liftHistory[k] = p.liftHistory[k].filter(function (e) { return e !== null; });
    }
    if (Array.isArray(p.sessionLog)) {
      for (i = 0; i < p.sessionLog.length; i++) {
        if (!isObj(p.sessionLog[i])) p.sessionLog[i] = null;
        else sanitizeSession(p.sessionLog[i]);
      }
      p.sessionLog = p.sessionLog.filter(function (s) { return s !== null; });
    }
    if (isObj(p.active)) sanitizeSession(p.active);
    return p;
  }

  function normalize(p) {
    if (!isObj(p.state)) p.state = {};
    if (!isObj(p.liftHistory)) p.liftHistory = {};
    stripUnsafeKeys(p.state);
    stripUnsafeKeys(p.liftHistory);
    if (typeof p.idx !== "number" || p.idx < 0) p.idx = 0;
    if (!validDay(p.cur)) p.cur = "fri";
    if (typeof p.lastBackup !== "string") p.lastBackup = null;
    p.bodyweight = typeof p.bodyweight === "number" && isFinite(p.bodyweight) && p.bodyweight > 0 ? p.bodyweight : 75;
    if (!isObj(p.active)) p.active = emptySession(p.cur);
    sanitizeSession(p.active);
    if (!Array.isArray(p.sessionLog)) p.sessionLog = [];
    while (p.sessionLog.length > SESSION_MAX) p.sessionLog.shift();
    p.v = CURRENT;
    return sanitizePayload(p);
  }

  /* Latest history date + day key, used to attach an upgraded v2 payload to the
     session it actually belongs to (so a completed week can roll over).       */
  function latestHistory(p) {
    var best = null, k, arr, i, e;
    for (k in p.liftHistory) if (Object.prototype.hasOwnProperty.call(p.liftHistory, k)) {
      arr = p.liftHistory[k];
      if (!Array.isArray(arr)) continue;
      for (i = 0; i < arr.length; i++) {
        e = arr[i];
        if (e && validDate(e.date) && (!best || e.date > best.date)) best = { date: e.date, day: k.split(":")[0] };
      }
    }
    return best;
  }

  /* v1 / v2 → v3. The old key name is kept; the payload version is the source
     of truth. Old history entries become the per-lift index; sessions are
     counted by distinct history dates, so no lossy regrouping is needed.     */
  function migrateV2(p) {
    var out = {
      v: CURRENT,
      cur: p.cur || "fri", idx: typeof p.idx === "number" ? p.idx : 0,
      state: isObj(p.state) ? p.state : {},
      liftHistory: isObj(p.liftHistory) ? p.liftHistory : {},
      lastBackup: typeof p.lastBackup === "string" ? p.lastBackup : null,
      sessionLog: [], bodyweight: 75
    };
    var anyDone = false, k;
    for (k in out.state) if (Object.prototype.hasOwnProperty.call(out.state, k) && isObj(out.state[k]) && (out.state[k].done || 0) > 0) anyDone = true;
    var latest = latestHistory(out);
    var date = anyDone && latest ? latest.date : dateKey();
    var day = anyDone && latest && validDay(latest.day) ? latest.day : (out.cur || "fri");
    out.active = emptySession(day, date);
    return out;
  }

  /* v1 → v2 → v3; unknown/future versions are flagged, never dropped */
  function migrate(raw) {
    var p;
    try { p = JSON.parse(raw); } catch (e) { return null; }
    if (!p || typeof p !== "object") return null;
    if (p.v === CURRENT) return normalize(p);
    if (p.v === 1 || p.v === 2) return normalize(migrateV2(p));
    if (typeof p.v === "number" && p.v > CURRENT) return { __future: p };
    return null;
  }

  function load() {
    loadError = null;
    var raw = read(STORE) || read(LEGACY);
    if (!raw) return emptyPayload();
    var m = migrate(raw);
    if (!m) {
      /* never overwrite bytes we failed to parse: keep a copy for recovery */
      write(QUARANTINE, raw);
      loadError = { kind: "corrupt", key: QUARANTINE };
      return emptyPayload();
    }
    if (m.__future) {
      write(STORE + "-future", raw);
      loadError = { kind: "future" };
      return emptyPayload();
    }
    return m;
  }
  function lastLoadError() { return loadError; }

  function save(p) {
    if (!p) return false;
    p.v = CURRENT;
    p.savedAt = Date.now();
    return write(STORE, JSON.stringify(p));
  }

  /** Snapshot the current payload before a destructive action. */
  function snapshot(p, label) {
    return write(SNAPSHOT, JSON.stringify({ at: Date.now(), label: label || "pre-destructive", payload: p }));
  }
  function readSnapshot() {
    try { return JSON.parse(read(SNAPSHOT)); } catch (e) { return null; }
  }
  function quarantineRaw() { return read(QUARANTINE); }

  function exportPayload(p) { return JSON.stringify(p); }

  function importRaw(raw) {
    var m = migrate(raw);
    if (!m || m.__future) throw new Error("Not a valid Gym backup");
    save(m);
    return m;
  }

  /* ── per-lift history: append or replace today's entry in place ─────────── */
  function pushHistory(p, d, i, entry) {
    if (!p.liftHistory) p.liftHistory = {};
    var k = d + ":" + i, arr = p.liftHistory[k] || (p.liftHistory[k] = []);
    arr.push(entry);
    while (arr.length > HISTORY_MAX) arr.shift();
    return arr;
  }
  /** Upsert today's entry for one lift (extra sets / edits replace it). */
  function upsertHistory(p, d, i, entry) {
    if (!p.liftHistory) p.liftHistory = {};
    var k = d + ":" + i, arr = p.liftHistory[k] || (p.liftHistory[k] = []);
    var last = arr.length ? arr[arr.length - 1] : null;
    if (last && last.date === entry.date) arr[arr.length - 1] = entry;
    else arr.push(entry);
    while (arr.length > HISTORY_MAX) arr.shift();
    return arr;
  }
  function hasTodayEntry(p, d, i) {
    var arr = p.liftHistory && p.liftHistory[d + ":" + i];
    return !!(arr && arr.length && arr[arr.length - 1].date === dateKey());
  }
  function removeTodayEntry(p, d, i) {
    var arr = p.liftHistory && p.liftHistory[d + ":" + i];
    if (arr && arr.length && arr[arr.length - 1].date === dateKey()) arr.pop();
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

  /* ── session lifecycle ────────────────────────────────────────────────────
     `active` is the workout you are in; `sessionLog` keeps finished sessions
     (duration + a snapshot) for the summary. History remains the per-lift
     index, so old payloads keep working.                                      */
  function activeHasData(p) {
    var st = (p && p.state) || {}, k, rec;
    for (k in st) if (Object.prototype.hasOwnProperty.call(st, k)) {
      rec = st[k];
      if (rec && ((rec.done || 0) > 0 || (Array.isArray(rec.sets) && rec.sets.length > 0))) return true;
    }
    return false;
  }
  function startSessionClock(p, now) {
    if (!p.active) p.active = emptySession(p.cur || todayDay());
    var ts = now || Date.now();
    if (!p.active.startedAt) p.active.startedAt = ts;
    if (!p.active.runningSince) p.active.runningSince = ts;
    p.active.status = "active";
    p.active.endedAt = null;
    return p.active;
  }
  /** Freeze the clock without ending the session (pause). */
  function pauseSessionClock(p, now) {
    var a = p && p.active;
    if (!a || !a.runningSince) return a;
    var ts = now || Date.now();
    a.accSec = (a.accSec || 0) + Math.max(0, ts - a.runningSince) / 1000;
    a.runningSince = null;
    return a;
  }
  function sessionElapsedSec(p, now) {
    var a = p && p.active;
    if (!a) return 0;
    var total = a.accSec || 0;
    if (a.runningSince) total += Math.max(0, (now || Date.now()) - a.runningSince) / 1000;
    return Math.max(0, Math.round(total));
  }
  /** Close the current session and append its snapshot to the log. */
  function finalizeSession(p, now) {
    if (!p.active) return null;
    var a = p.active, ts = now || Date.now(), k;
    if (a.runningSince) { a.accSec = (a.accSec || 0) + Math.max(0, ts - a.runningSince) / 1000; a.runningSince = null; }
    var existing = null, i;
    for (i = 0; i < (p.sessionLog || []).length; i++) if (p.sessionLog[i].id === a.id) existing = p.sessionLog[i];
    if (!a.startedAt && !activeHasData(p) && !existing) { a.endedAt = ts; a.status = "complete"; return null; }
    var started = a.startedAt || ts;
    var durationSec = Math.max(0, Math.round(a.accSec || 0));
    var lifts = {}, rec;
    for (k in (p.state || {})) if (Object.prototype.hasOwnProperty.call(p.state, k)) {
      rec = p.state[k];
      if (rec && ((rec.done || 0) > 0 || (Array.isArray(rec.sets) && rec.sets.length > 0))) {
        lifts[k] = { done: rec.done || 0, sets: (rec.sets || []).slice() };
      }
    }
    var entry = {
      id: a.id, date: a.date, day: a.day, startedAt: started, endedAt: ts,
      durationSec: durationSec, status: "complete", lifts: lifts
    };
    if (existing) {
      for (k in entry) existing[k] = entry[k];
    } else {
      if (!p.sessionLog) p.sessionLog = [];
      p.sessionLog.push(entry);
      while (p.sessionLog.length > SESSION_MAX) p.sessionLog.shift();
    }
    a.endedAt = ts; a.status = "complete";
    return entry;
  }
  /** Clear set progress for a fresh workout while keeping working loads. */
  function startSession(p, day, now) {
    var d = validDay(day) ? day : todayDay(), k, rec;
    for (k in (p.state || {})) if (Object.prototype.hasOwnProperty.call(p.state, k)) {
      rec = p.state[k];
      if (!rec) continue;
      rec.done = 0; rec.topHits = 0; rec.lastRir = null; rec.sets = [];
    }
    p.active = emptySession(d, dateKey(now ? new Date(now) : new Date()));
    p.cur = d; p.idx = 0;
    return p.active;
  }
  /** On a new calendar day, close the old session and start today's. */
  function rollSession(p, day, now) {
    var ts = now || Date.now(), today = dateKey(new Date(ts));
    if (!p.active) { p.active = emptySession(day || p.cur || todayDay(), today); return p; }
    if (p.active.date !== today) {
      if (p.active.status !== "complete" || activeHasData(p)) finalizeSession(p, ts);
      startSession(p, validDay(day) ? day : todayDay(), ts);
    }
    return p;
  }

  /* ── backup bookkeeping ── */
  function parseDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function hasData(p) {
    var lh = (p && p.liftHistory) || {}, st = (p && p.state) || {}, k;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k) && lh[k] && lh[k].length) return true;
    for (k in st) if (Object.prototype.hasOwnProperty.call(st, k) && isObj(st[k]) && (st[k].done || 0) > 0) return true;
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
    out.state = isObj(out.state) ? out.state : {};
    out.liftHistory = isObj(out.liftHistory) ? out.liftHistory : {};
    out.sessionLog = Array.isArray(out.sessionLog) ? out.sessionLog : [];
    stripUnsafeKeys(out.state);
    stripUnsafeKeys(out.liftHistory);

    var incState = isObj(incoming && incoming.state) ? incoming.state : {}, k;
    for (k in incState) if (own(incState, k) && !unsafeKey(k)) {
      var mine = own(out.state, k) ? out.state[k] : null, theirs = incState[k];
      if (!isObj(theirs)) continue;            // a null record carries nothing
      var mineScore = progressScore(mine), theirsScore = progressScore(theirs);
      if (!mine || theirsScore > mineScore || (theirsScore === mineScore && mineScore === 0)) {
        out.state[k] = JSON.parse(JSON.stringify(theirs));
      }
    }

    var incHist = isObj(incoming && incoming.liftHistory) ? incoming.liftHistory : {}, k2;
    for (k2 in incHist) if (own(incHist, k2) && !unsafeKey(k2)) {
      var seen = Object.create(null);
      var existing = own(out.liftHistory, k2) && Array.isArray(out.liftHistory[k2]) ? out.liftHistory[k2] : [];
      var added = own(incHist, k2) && Array.isArray(incHist[k2]) ? incHist[k2] : [];
      existing.concat(added).forEach(function (e) {
        if (!e || typeof e !== "object") return;
        var dk = e.date || (e.load + ":" + e.reps + ":" + e.rir + ":" + e.setsDone);
        if (unsafeKey(dk)) return;
        var prev = seen[dk];
        /* same-date collision: keep the fuller session, never blindly clobber */
        if (!prev || (e.setsDone || (e.sets || []).length) > (prev.setsDone || (prev.sets || []).length)) seen[dk] = e;
      });
      var arr = Object.keys(seen).map(function (dk) { return seen[dk]; });
      arr.sort(function (x, y) { return String(x.date || "").localeCompare(String(y.date || "")); });
      while (arr.length > HISTORY_MAX) arr.shift();
      out.liftHistory[k2] = arr;
    }

    /* session log: union by id, keep the longer duration */
    var byId = Object.create(null);
    out.sessionLog.concat(Array.isArray(incoming && incoming.sessionLog) ? incoming.sessionLog : []).forEach(function (s) {
      if (!isObj(s)) return;
      var id = s.id || (s.date + ":" + s.day);
      if (unsafeKey(id)) return;
      if (!byId[id] || (s.durationSec || 0) > (byId[id].durationSec || 0)) byId[id] = s;
    });
    out.sessionLog = Object.keys(byId).map(function (id) { return byId[id]; })
      .sort(function (x, y) { return String(x.date || "").localeCompare(String(y.date || "")); });
    while (out.sessionLog.length > SESSION_MAX) out.sessionLog.shift();

    if (incoming && typeof incoming.bodyweight === "number" && isFinite(incoming.bodyweight) && incoming.bodyweight > 0 && out.bodyweight === 75) {
      out.bodyweight = incoming.bodyweight;
    }
    out.v = CURRENT;
    if (!out.lastBackup && incoming && incoming.lastBackup) out.lastBackup = incoming.lastBackup;
    if (incoming && incoming.cur) out.cur = incoming.cur;
    if (incoming && typeof incoming.idx === "number") out.idx = incoming.idx;
    return normalize(out);
  }

  /** Merge a backup into the current payload (never discards current data). */
  function importMerge(base, raw) {
    var m = migrate(raw);
    if (!m || m.__future) throw new Error("Not a valid Gym backup");
    var merged = mergePayload(base, m);
    save(merged);
    return merged;
  }

  /* ── stable identity: re-home day:index records after a program reorder ────
     Records and history entries stamp `exId`. If a future program edit moves
     a lift to a different index, the data follows its id instead of silently
     binding to whatever now sits at the old index. No-op for the current
     program (and for legacy records that never stored an exId).             */
  function reconcile(p, DAYS) {
    if (!p || !DAYS) return p;
    var idKey = {}, d, i, list, e, k, hk, arr, j, target;
    for (d in DAYS) if (Object.prototype.hasOwnProperty.call(DAYS, d)) {
      list = DAYS[d].ex;
      for (i = 0; i < list.length; i++) { e = list[i]; if (e && e.id) idKey[e.id] = d + ":" + i; }
    }
    p.state = isObj(p.state) ? p.state : {};
    p.liftHistory = isObj(p.liftHistory) ? p.liftHistory : {};

    var newState = {};
    for (k in p.state) if (Object.prototype.hasOwnProperty.call(p.state, k)) {
      var rec = p.state[k];
      target = rec && rec.exId && idKey[rec.exId] ? idKey[rec.exId] : k;
      if (newState[target]) {
        var a = newState[target], b = rec;
        newState[target] = (b && (b.done || 0) > (a.done || 0)) ? b : a;
      } else newState[target] = rec;
    }
    p.state = newState;

    var newHist = {};
    for (hk in p.liftHistory) if (Object.prototype.hasOwnProperty.call(p.liftHistory, hk)) {
      arr = p.liftHistory[hk] || [];
      target = hk;
      for (j = 0; j < arr.length; j++) {
        if (arr[j] && arr[j].exId && idKey[arr[j].exId]) { target = idKey[arr[j].exId]; break; }
      }
      newHist[target] = (newHist[target] || []).concat(arr);
    }
    for (k in newHist) if (Object.prototype.hasOwnProperty.call(newHist, k)) {
      var seen = {};
      newHist[k].forEach(function (en) {
        if (!en) return;
        seen[en.date || (en.load + ":" + en.reps + ":" + en.rir + ":" + en.setsDone)] = en;
      });
      var merged = Object.keys(seen).map(function (dk) { return seen[dk]; });
      merged.sort(function (x, y) { return String(x.date || "").localeCompare(String(y.date || "")); });
      while (merged.length > HISTORY_MAX) merged.shift();
      newHist[k] = merged;
    }
    p.liftHistory = newHist;
    return p;
  }

  /** Reopen the active session after a reset/restart so it can be finished again. */
  function reopenSession(p) {
    if (!p || !p.active) return p;
    p.active.status = "active";
    p.active.endedAt = null;
    if (Array.isArray(p.sessionLog)) p.sessionLog = p.sessionLog.filter(function (s) { return s.id !== p.active.id; });
    return p;
  }

  /* clear one lift's finished sets, keeping the working load / reps / RIR.
     A same-day snapshot (from a redo) is dropped so redoing replaces it.    */
  function resetLift(p, d, i) {
    var k = d + ":" + i, rec = p.state && p.state[k];
    if (rec) { rec.done = 0; rec.topHits = 0; rec.lastRir = null; rec.sets = []; }
    var arr = p.liftHistory && p.liftHistory[k];
    if (arr && arr.length && arr[arr.length - 1].date === dateKey()) arr.pop();
    reopenSession(p);
  }

  /* clear every lift's finished sets for one day, keeping loads + earlier history */
  function resetDay(p, d) {
    var prefix = d + ":", k;
    if (p.state) {
      for (k in p.state) {
        if (p.state.hasOwnProperty(k) && k.indexOf(prefix) === 0) {
          var rec = p.state[k];
          if (!rec) continue;                   // null record: nothing to clear
          rec.done = 0; rec.topHits = 0; rec.lastRir = null; rec.sets = [];
        }
      }
    }
    if (p.liftHistory) {
      for (k in p.liftHistory) {
        if (p.liftHistory.hasOwnProperty(k) && k.indexOf(prefix) === 0) {
          var arr = p.liftHistory[k];
          if (!Array.isArray(arr)) continue;
          while (arr.length && arr[arr.length - 1].date === dateKey()) arr.pop();
        }
      }
    }
    reopenSession(p);
  }

  function dateKey(dt) {
    dt = dt || new Date();
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }

  return {
    CURRENT: CURRENT, STORE: STORE, LEGACY: LEGACY, THEME_KEY: THEME_KEY,
    HISTORY_MAX: HISTORY_MAX, SESSION_MAX: SESSION_MAX,
    QUARANTINE: QUARANTINE, SNAPSHOT: SNAPSHOT,
    emptyPayload: emptyPayload, emptySession: emptySession, migrate: migrate, load: load, save: save,
    lastLoadError: lastLoadError, quarantineRaw: quarantineRaw, snapshot: snapshot, readSnapshot: readSnapshot,
    exportPayload: exportPayload, importRaw: importRaw,
    pushHistory: pushHistory, upsertHistory: upsertHistory, hasTodayEntry: hasTodayEntry,
    removeTodayEntry: removeTodayEntry, lastEntry: lastEntry, series: series, popHistory: popHistory,
    activeHasData: activeHasData, startSessionClock: startSessionClock, pauseSessionClock: pauseSessionClock,
    sessionElapsedSec: sessionElapsedSec,
    finalizeSession: finalizeSession, startSession: startSession, rollSession: rollSession, reopenSession: reopenSession,
    resetLift: resetLift, resetDay: resetDay,
    markBackup: markBackup, backupAgeDays: backupAgeDays, backupDue: backupDue,
    mergePayload: mergePayload, importMerge: importMerge, reconcile: reconcile,
    todayDay: todayDay, actualDay: actualDay, daysUntil: daysUntil, validDay: validDay, validDate: validDate,
    dateKey: dateKey
  };
});
