/* ── progress analytics (pure) ──────────────────────────────────────────────
   Aggregates the per-lift history ring buffer for the Progress view. No DOM,
   no calendar "now" dependency, so results are deterministic and testable.
   Input shape: the persisted payload ({ state, liftHistory, … }).
   Browser global (window.Gym) + Node module.                                */
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
   * Distinct calendar dates with a completed lift or a logged session.
   * This is the "workouts" metric: one Friday is one workout, not eight.
   * @param {any} payload
   * @param {{date:string,volume:number}[]} [volumes] the sessionVolumes result, to avoid recomputing
   * @returns {string[]}
   */
  function workoutDates(payload, volumes) {
    /* B4-01: null prototype — the date keys come from imported history and the
       session log, so a "__proto__" date must become a key, not a prototype write. */
    var seen = Object.create(null), s = volumes || sessionVolumes(payload), i, log = (payload && payload.sessionLog) || [];
    for (i = 0; i < s.length; i++) if (s[i].date) seen[s[i].date] = 1;
    for (i = 0; i < log.length; i++) if (log[i] && log[i].date) seen[log[i].date] = 1;
    return Object.keys(seen).sort();
  }

  /**
   * Number of workouts recorded (distinct dates).
   * @param {any} payload
   * @param {{date:string,volume:number}[]} [volumes] the sessionVolumes result, to avoid recomputing
   * @returns {number}
   */
  function sessionCount(payload, volumes) {
    return workoutDates(payload, volumes).length;
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
   * Total sets recorded across all history entries.
   * @param {any} payload
   * @returns {number}
   */
  function setsRecorded(payload) {
    var n = 0, lh = (payload && payload.liftHistory) || {}, k, arr, i;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || [];
      for (i = 0; i < arr.length; i++) n += entrySets(arr[i]).length;
    }
    return n;
  }

  /**
   * The sets actually logged for a history entry. Legacy entries only stored
   * a representative load/reps and `setsDone`, so synthesize rows for them.
   * @param {{load?:number,reps?:number,rir?:number,setsDone?:number,sets?:any[]}} e
   * @returns {{load:number,reps:number,rir:number}[]}
   */
  function entrySets(e) {
    if (!e) return [];
    if (Array.isArray(e.sets) && e.sets.length) return e.sets;
    var n = Math.max(0, Math.round(e.setsDone || 0)), out = [], i;
    for (i = 0; i < n; i++) out.push({ load: e.load || 0, reps: e.reps || 0, rir: e.rir || 0 });
    return out;
  }

  /**
   * The highest-value set in a list, by the caller's metric.
   * @param {Array<{load:number,reps:number}>} sets
   * @param {(load: number, reps: number, opts?: object) => number} metric
   * @param {object} [opts] forwarded to metric as its third argument
   * @returns {object|null} the best set, or null when there are none
   */
  function topSet(sets, metric, opts) {
    var best = null, bestM = -Infinity, i, m;
    for (i = 0; i < (sets || []).length; i++) {
      m = metric((sets[i] && sets[i].load) || 0, (sets[i] && sets[i].reps) || 0, opts);
      if (m > bestM) { bestM = m; best = sets[i]; }
    }
    return best;
  }

  /**
   * The bodyweight in force for an entry: the banked `bwKg` when it is a sane
   * positive number, else `fallback` (usually the payload's current scalar),
   * else 165. One rule, four call sites (B3-35) — `app.js bwFor` and the three
   * places in this module that used to inline the same ternary.
   * @param {{bwKg?:number}} [entry]
   * @param {number} [fallback]
   * @returns {number}
   */
  function resolveBodyweight(entry, fallback) {
    if (entry && typeof entry.bwKg === "number" && isFinite(entry.bwKg) && entry.bwKg > 0) return entry.bwKg;
    return typeof fallback === "number" && isFinite(fallback) && fallback > 0 ? fallback : 165;
  }

  /**
   * Tonnage for one history entry: sum of load × reps across its sets.
   * Bodyweight work (explicit `bw`, or legacy load 0) is valued at
   * `bodyweight + added load` per rep, so adding a plate never lowers tonnage.
   * An entry's own `bwKg` (the weight in force when it was banked) wins over
   * the `bwLb` argument, so editing the scalar never rewrites past tonnage.
   * @param {{load?:number,reps?:number,setsDone?:number,sets?:any[],bw?:boolean,bwKg?:number}} e
   * @param {number} [bwLb] bodyweight in lb (default 165)
   * @returns {number}
   */
  function entryVolume(e, bwLb) {
    if (!e) return 0;
    var bw = resolveBodyweight(e, bwLb);
    var sets = entrySets(e), total = 0, i, load, eff;
    for (i = 0; i < sets.length; i++) {
      load = typeof sets[i].load === "number" && isFinite(sets[i].load) ? sets[i].load : 0;
      if (e.bw === true || (e.bw === undefined && load === 0)) eff = bw + Math.max(0, load);
      else eff = load > 0 ? load : 0;
      total += eff * (sets[i].reps || 0);
    }
    return total;
  }

  /**
   * Total tonnage across all recorded sessions.
   * @param {any} payload
   * @param {{date:string,volume:number}[]} [volumes] the sessionVolumes result, to avoid recomputing
   * @returns {number}
   */
  function totalVolume(payload, volumes) {
    if (Array.isArray(volumes)) {
      var tv = 0, vi;
      for (vi = 0; vi < volumes.length; vi++) tv += volumes[vi].volume;
      return tv;
    }
    var total = 0, lh = (payload && payload.liftHistory) || {}, k, arr, i, bw = payload && payload.bodyweight;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || [];
      for (i = 0; i < arr.length; i++) total += entryVolume(arr[i], bw);
    }
    return total;
  }

  /**
   * Tonnage per calendar day (a "session"), sorted oldest → newest.
   * @param {any} payload
   * @returns {{date:string, volume:number}[]}
   */
  function sessionVolumes(payload) {
    var lh = (payload && payload.liftHistory) || {}, byDate = Object.create(null), k, arr, i, e, d, bw = payload && payload.bodyweight;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || [];
      for (i = 0; i < arr.length; i++) {
        e = arr[i]; d = e.date || "";
        byDate[d] = (byDate[d] || 0) + entryVolume(e, bw);
      }
    }
    return Object.keys(byDate).sort().map(function (date) { return { date: date, volume: byDate[date] }; });
  }

  /**
   * The last `n` session volumes (all when `n` is falsy).
   * @param {any} payload
   * @param {number} [n]
   * @param {{date:string,volume:number}[]} [volumes] the sessionVolumes result, to avoid recomputing
   * @returns {{date:string, volume:number}[]}
   */
  function recentVolume(payload, n, volumes) {
    var s = volumes || sessionVolumes(payload);
    return n ? s.slice(Math.max(0, s.length - n)) : s;
  }

  /**
   * Tonnage of the most recent session per training day.
   * @param {any} payload
   * @param {Record<string, {ex: any[]}>} DAYS
   * @returns {Record<string, number>}
   */
  function volumeByDay(payload, DAYS) {
    var res = {}, lh = (payload && payload.liftHistory) || {}, d, i, arr, total, list, bw = payload && payload.bodyweight;
    for (d in DAYS) if (Object.prototype.hasOwnProperty.call(DAYS, d)) {
      list = DAYS[d].ex; total = 0;
      for (i = 0; i < list.length; i++) {
        arr = lh[d + ":" + i];
        if (arr && arr.length) total += entryVolume(arr[arr.length - 1], bw);
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
    return workoutDates(payload).length;
  }

  /* ── time-window analytics (deterministic: the caller passes `nowKey`) ─── */
  /* B6-01: the components must round-trip through Date, so an impossible
     date like 2026-02-30 (which rolls to Mar 2) is rejected, not silently
     moved to a neighbour — same rule as validDate in store.js (B5-14).     */
  function parseKey(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : null;
  }
  /** Format a Date as the "YYYY-MM-DD" payload key. */
  function keyOf(dt) {
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }
  /** Move a "YYYY-MM-DD" key `days` forward (negative back); null if invalid. */
  function shiftKey(nowKey, days) {
    var d = parseKey(nowKey);
    if (!d) return null;
    d.setDate(d.getDate() + days);
    return keyOf(d);
  }
  /** Sum session volumes whose date falls inside [fromKey, toKey].
   *  @param {any} payload
   *  @param {string} fromKey
   *  @param {string} toKey
   *  @param {{date:string,volume:number}[]} [volumes] the sessionVolumes result, to avoid recomputing
   */
  function volumeInRange(payload, fromKey, toKey, volumes) {
    var s = volumes || sessionVolumes(payload), t = 0, i;
    for (i = 0; i < s.length; i++) if (s[i].date >= fromKey && s[i].date <= toKey) t += s[i].volume;
    return t;
  }
  /**
   * Rolling 7-day tonnage vs the previous 7 days, anchored on `nowKey`.
   * @param {any} payload @param {string} nowKey
   * @param {{date:string,volume:number}[]} [volumes] the sessionVolumes result, to avoid recomputing
   * @returns {{thisWeek:number,lastWeek:number,deltaPct:number,hasPrev:boolean}}
   */
  function weekOverWeek(payload, nowKey, volumes) {
    var thisStart = shiftKey(nowKey, -6), lastStart = shiftKey(nowKey, -13), lastEnd = shiftKey(nowKey, -7);
    if (!thisStart) return { thisWeek: 0, lastWeek: 0, deltaPct: 0, hasPrev: false };
    var tw = volumeInRange(payload, thisStart, nowKey, volumes);
    var lw = volumeInRange(payload, lastStart, lastEnd, volumes);
    var pct = lw > 0 ? Math.round(((tw - lw) / lw) * 100) : (tw > 0 ? 100 : 0);
    return { thisWeek: tw, lastWeek: lw, deltaPct: pct, hasPrev: lw > 0 };
  }
  /**
   * Distinct session dates inside the last 7 days.
   * @param {any} payload @param {string} nowKey @returns {number}
   */
  function sessionsLast7(payload, nowKey) {
    var start = shiftKey(nowKey, -6);
    if (!start) return 0;
    var s = sessionVolumes(payload), n = 0, i;
    for (i = 0; i < s.length; i++) if (s[i].date >= start && s[i].date <= nowKey) n++;
    return n;
  }
  /* ── consistency heatmap: the last `weeks` Fri/Sat/Sun blocks ──────────── */
  function mostRecentFriday(today) {
    var dow = today.getDay();                 // 0 Sun … 5 Fri, 6 Sat
    var offset = dow === 5 ? 0 : dow === 6 ? 1 : dow === 0 ? 2 : dow + 2;
    var d = new Date(today);
    d.setDate(d.getDate() - offset);
    return d;
  }
  /**
   * One row per training week (Fri/Sat/Sun), oldest → newest. `fri/sat/sun`
   * are true when that calendar day has at least one recorded session.
   * @param {any} payload
   * @param {number} weeks
   * @param {string} nowKey YYYY-MM-DD
   * @returns {{fri:boolean,sat:boolean,sun:boolean,label:string}[]}
   */
  function trainingDays(payload, weeks, nowKey) {
    var today = parseKey(nowKey);
    if (!today) return [];
    var have = Object.create(null), s = sessionVolumes(payload), i;
    for (i = 0; i < s.length; i++) if (s[i].date) have[s[i].date] = 1;
    /* B6-02: off-day sessions light their covered training day (once). */
    var covered = sessionCoverage(payload), ck = Object.keys(covered);
    for (i = 0; i < ck.length; i++) have[ck[i]] = 1;
    var fri0 = mostRecentFriday(today), out = [], w;
    for (w = (weeks || 8) - 1; w >= 0; w--) {
      var fri = new Date(fri0); fri.setDate(fri0.getDate() - w * 7);
      var sat = new Date(fri); sat.setDate(fri.getDate() + 1);
      var sun = new Date(fri); sun.setDate(fri.getDate() + 2);
      out.push({ fri: !!have[keyOf(fri)], sat: !!have[keyOf(sat)], sun: !!have[keyOf(sun)], label: keyOf(fri) });
    }
    return out;
  }

  /* ── week strip: Fri/Sat/Sun of the current training week ────────────────
     `state` is done (all program lifts logged), partial (some), missed (past,
     none), today (today, none yet) or upcoming. Adherence lives here.       */
  function weekLiftIndex(payload) {
    var lh = (payload && payload.liftHistory) || {}, idx = Object.create(null), k, arr, i, e;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || [];
      for (i = 0; i < arr.length; i++) {
        e = arr[i];
        if (!e || !e.date) continue;
        if (!idx[e.date]) idx[e.date] = {};
        idx[e.date][k] = 1;
      }
    }
    return idx;
  }

  /* B6-02: count a session toward its recorded day in its Mon–Sun week. */
  function sessionLoggedLifts(s, day) {
    if (day !== "fri" && day !== "sat" && day !== "sun") return 0;
    var lifts = (s && s.lifts) || {}, prefix = day + ":", n = 0, k, rec;
    for (k in lifts) if (Object.prototype.hasOwnProperty.call(lifts, k) && k.indexOf(prefix) === 0) {
      rec = lifts[k];
      if (rec && ((rec.done || 0) > 0 || (Array.isArray(rec.sets) && rec.sets.length > 0))) n++;
    }
    return n;
  }
  /** Session's covered YYYY-MM-DD key, or null. */
  function sessionCoveredKey(s) {
    var day = s && s.day;
    if (day !== "fri" && day !== "sat" && day !== "sun") return null;
    var dt = parseKey(s.date);
    if (!dt) return null;
    var monday = new Date(dt), offs = { fri: 4, sat: 5, sun: 6 };
    monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    var key = new Date(monday);
    key.setDate(monday.getDate() + offs[day]);
    return keyOf(key);
  }
  /** Covered day → logged-lift count. */
  function sessionCoverage(payload) {
    var log = (payload && payload.sessionLog) || [], out = Object.create(null), i, s, key, n;
    for (i = 0; i < log.length; i++) {
      s = log[i];
      if (!s || s.status !== "complete") continue;
      n = sessionLoggedLifts(s, s.day);
      if (!n) continue;
      key = sessionCoveredKey(s);
      if (!key) continue;
      if (!out[key] || n > out[key]) out[key] = n;
    }
    return out;
  }

  /**
   * Status of the current training week (Fri/Sat/Sun), oldest → newest.
   * @param {any} payload @param {string} nowKey YYYY-MM-DD
   * @param {{fri:number,sat:number,sun:number}} [dayLens] lifts scheduled per day (default 8)
   * @returns {{day:string,date:string,state:string,lifts:number}[]}
   */
  function weekStatus(payload, nowKey, dayLens) {
    var today = parseKey(nowKey);
    if (!today) return [];
    var fri0 = mostRecentFriday(today), lifts = weekLiftIndex(payload);
    var covered = sessionCoverage(payload); // B6-02: covered by an off-day session
    var names = ["fri", "sat", "sun"], out = [], i;
    for (i = 0; i < 3; i++) {
      var dt = new Date(fri0); dt.setDate(fri0.getDate() + i);
      var key = keyOf(dt);
      var n = lifts[key] ? Object.keys(lifts[key]).length : 0;
      /* an off-day session that banked this day counts it too, once */
      if (covered[key] > n) n = covered[key];
      var need = dayLens && typeof dayLens[names[i]] === "number" && dayLens[names[i]] > 0 ? dayLens[names[i]] : 8;
      var state = dt > today ? "upcoming"
        : n >= need ? "done"
        : n > 0 ? "partial"
        : key === nowKey ? "today" : "missed";
      out.push({ day: names[i], date: key, state: state, lifts: n });
    }
    return out;
  }

  /* ── CSV export (portability) ──────────────────────────────────────────── */
  function csvCell(v) {
    var s = v == null ? "" : String(v);
    /* formula injection guard: a backup is untrusted input opened in a sheet */
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  /**
   * Every recorded set as CSV rows: date, day, lift, set, load, reps, rir.
   * @param {any} payload
   * @param {Record<string, {ex: any[]}>} DAYS
   * @returns {string}
   */
  function toCsv(payload, DAYS) {
    var rows = [["date", "day", "lift", "set", "load", "reps", "rir"]];
    var lh = (payload && payload.liftHistory) || {}, k, arr, i, j, e, p, d, idx, name, sets;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || [];
      p = k.split(":"); d = p[0]; idx = parseInt(p[1], 10);
      name = DAYS && DAYS[d] && DAYS[d].ex[idx] ? DAYS[d].ex[idx].n : k;
      for (i = 0; i < arr.length; i++) {
        e = arr[i]; if (!e) continue;
        sets = Array.isArray(e.sets) && e.sets.length ? e.sets : [{ load: e.load, reps: e.reps, rir: e.rir }];
        for (j = 0; j < sets.length; j++) rows.push([e.date || "", d, name, j + 1, sets[j].load, sets[j].reps, sets[j].rir]);
      }
    }
    return rows.map(function (r) { return r.map(csvCell).join(","); }).join("\n");
  }

  /**
   * Best estimated 1RM (or reps for bodyweight) per lift, ranked desc.
   * @param {any} payload
   * @param {Record<string, {ex: any[]}>} DAYS
   * @param {(load:number, reps:number, opts?:{bw?:boolean, bodyweight?:number}) => number} metric
   * @returns {{key:string,name:string,load:number,reps:number,date:string,metric:number}[]}
   */
  function personalRecords(payload, DAYS, metric) {
    var lh = (payload && payload.liftHistory) || {}, bwKg = payload && payload.bodyweight;
    var out = [], k, arr, i, j, e, sets, best, bestM, m, p, d, idx, name, ex, isBw, opts, set;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || []; best = null; bestM = -Infinity;
      p = k.split(":"); d = p[0]; idx = parseInt(p[1], 10);
      ex = DAYS && DAYS[d] && DAYS[d].ex ? DAYS[d].ex[idx] : null;
      name = ex ? ex.n : k;
      isBw = !!(ex && ex.bw);
      for (i = 0; i < arr.length; i++) {
        e = arr[i]; if (!e) continue;
        sets = entrySets(e);
        for (j = 0; j < sets.length; j++) {
          set = sets[j] || {};
          opts = { bw: isBw || e.bw === true, bodyweight: resolveBodyweight(e, bwKg) };
          m = metric(set.load || 0, set.reps || 0, opts);
          if (m > bestM) { bestM = m; best = { load: set.load || 0, reps: set.reps || 0, date: e.date }; }
        }
      }
      if (!best) continue;
      out.push({ key: k, name: name, load: best.load, reps: best.reps, date: best.date, metric: bestM, bw: isBw });
    }
    out.sort(function (a, b) { return b.metric - a.metric; });
    return out;
  }

  /** Compact tonnage label for the Progress view: 1234 → "1.2k", 999 → "999". */
  function compactVol(v) { v = Math.round(v || 0); return v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v); }

  /**
   * The three lifts with the largest first→last change in top-set metric.
   * Lifts with fewer than two history entries are skipped.
   * @param {any} payload
   * @param {object} DAYS
   * @param {(load: number, reps: number, opts?: object) => number} metric
   * @returns {Array<{name: string, delta: number, pct: number}>} sorted by pct descending
   */
  function topMovers(payload, DAYS, metric) {
    var lh = (payload && payload.liftHistory) || {}, bwKg = payload && payload.bodyweight;
    var out = [], k, arr, p, d, i, e, first, last, delta, pct;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || [];
      if (arr.length < 2) continue;
      p = k.split(":"); d = p[0]; i = parseInt(p[1], 10);
      e = DAYS && DAYS[d] && DAYS[d].ex ? DAYS[d].ex[i] : null;
      if (!e) continue;
      function optsFor(en) {
        return { bw: !!e.bw, bodyweight: resolveBodyweight(en, bwKg) };
      }
      first = topSet(entrySets(arr[0]), metric, optsFor(arr[0])) || arr[0];
      last = topSet(entrySets(arr[arr.length - 1]), metric, optsFor(arr[arr.length - 1])) || arr[arr.length - 1];
      var fm = metric(first.load || 0, first.reps || 0, optsFor(arr[0]));
      var lm = metric(last.load || 0, last.reps || 0, optsFor(arr[arr.length - 1]));
      if (!fm) continue;
      delta = lm - fm; pct = Math.round((delta / fm) * 1000) / 10;
      out.push({ name: e.n, delta: Math.round(delta * 10) / 10, pct: pct });
    }
    out.sort(function (a, b) { return b.pct - a.pct; });
    return out.slice(0, 3);
  }

  /**
   * Everything the Progress view needs, computed once.
   * @param {any} payload
   * @param {Record<string, { ex: any[] }>} DAYS
   * @param {(load:number, reps:number, opts?:object)=>number} metric
   * @param {string} nowKey YYYY-MM-DD
   * @param {{fri:number,sat:number,sun:number}} [dayLens]
   * @returns {{workouts:number, sets:number, weekDone:number, weekTotal:number,
   *            volume:number, byDay:object, weeks:any[], heatCount:number,
   *            heatTotal:number, recent:any[], wow:object, pr:any, movers:any[]}}
   */
  function progressSnapshot(payload, DAYS, metric, nowKey, dayLens) {
    var wk = weekStatus(payload, nowKey, dayLens), weekDone = 0, i, d;
    for (i = 0; i < wk.length; i++) if (wk[i].state === "done") weekDone++;
    var weeks = trainingDays(payload, 8, nowKey), days = Object.keys(DAYS || {}), heatCount = 0, j, w;
    for (i = 0; i < weeks.length; i++) {
      w = weeks[i];
      for (j = 0; j < days.length; j++) if (w[days[j]]) heatCount++;
    }
    var vols = sessionVolumes(payload);
    return {
      workouts: workoutDates(payload, vols).length,
      sets: setsRecorded(payload),
      weekDone: weekDone,
      weekTotal: wk.length,
      volume: totalVolume(payload, vols),
      byDay: volumeByDay(payload, DAYS),
      weeks: weeks,
      heatCount: heatCount,
      heatTotal: weeks.length * days.length,
      recent: recentVolume(payload, 12, vols),
      wow: weekOverWeek(payload, nowKey, vols),
      pr: personalRecords(payload, DAYS, metric)[0] || null,
      movers: topMovers(payload, DAYS, metric)
    };
  }

  /**
   * Estimate vs actual session length for one day, from the finished-session
   * log. The estimate comes from the program model (`Gym.dayMins(day)`) and is
   * passed in so this module stays free of program data — the same pattern as
   * `personalRecords(payload, DAYS, metric)`. Deterministic: no clock, no DOM.
   * @param {any} payload
   * @param {string} day
   * @param {number|((d:string)=>number)} estimate day-length model in minutes
   * @returns {{n:number, insufficient:true} | {n:number, estimateMin:number, medianActualMin:number, driftPct:number}}
   */
  function sessionDrift(payload, day, estimate) {
    var log = (payload && payload.sessionLog) || [];
    var durs = [], i, s, est, mid, medianSec, medianMin;
    for (i = 0; i < log.length; i++) {
      s = log[i];
      if (!s || s.day !== day || s.status !== "complete") continue;
      if (typeof s.durationSec !== "number" || !isFinite(s.durationSec) || s.durationSec <= 0) continue;
      durs.push(s.durationSec);
    }
    if (durs.length < 3) return { n: durs.length, insufficient: true };

    est = typeof estimate === "function" ? estimate(day) : estimate;
    if (typeof est !== "number" || !isFinite(est) || est <= 0) est = 0;

    durs.sort(function (a, b) { return a - b; });
    mid = Math.floor(durs.length / 2);
    medianSec = durs.length % 2 ? durs[mid] : (durs[mid - 1] + durs[mid]) / 2;
    medianMin = Math.round((medianSec / 60) * 10) / 10;
    return {
      n: durs.length,
      estimateMin: est,
      medianActualMin: medianMin,
      driftPct: est > 0 ? Math.round(((medianMin - est) / est) * 1000) / 10 : 0
    };
  }

  return {
    sessionCount: sessionCount, setsLogged: setsLogged,
    setsRecorded: setsRecorded, entrySets: entrySets, topSet: topSet,
    resolveBodyweight: resolveBodyweight,
    entryVolume: entryVolume, totalVolume: totalVolume, sessionVolumes: sessionVolumes,
    recentVolume: recentVolume, volumeByDay: volumeByDay, uniqueDays: uniqueDays,
    workoutDates: workoutDates, weekStatus: weekStatus,
    weekOverWeek: weekOverWeek, sessionsLast7: sessionsLast7, personalRecords: personalRecords,
    compactVol: compactVol, topMovers: topMovers,
    trainingDays: trainingDays, toCsv: toCsv, sessionDrift: sessionDrift,
    progressSnapshot: progressSnapshot
  };
});
