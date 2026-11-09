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

  /** @param {any} payload @returns {string[]} every "day:index" key with history */
  function historyKeys(payload) {
    var out = [], lh = (payload && payload.liftHistory) || {}, k;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k) && lh[k] && lh[k].length) out.push(k);
    return out;
  }

  /**
   * Distinct calendar dates with a completed lift or a logged session.
   * This is the "workouts" metric: one Friday is one workout, not eight.
   * @param {any} payload
   * @returns {string[]}
   */
  function workoutDates(payload) {
    var seen = {}, s = sessionVolumes(payload), i, log = (payload && payload.sessionLog) || [];
    for (i = 0; i < s.length; i++) if (s[i].date) seen[s[i].date] = 1;
    for (i = 0; i < log.length; i++) if (log[i] && log[i].date) seen[log[i].date] = 1;
    return Object.keys(seen).sort();
  }

  /**
   * Number of workouts recorded (distinct dates).
   * @param {any} payload
   * @returns {number}
   */
  function sessionCount(payload) {
    return workoutDates(payload).length;
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
   * Tonnage for one history entry: sum of load × reps across its sets.
   * Bodyweight work (explicit `bw`, or legacy load 0) is valued at
   * `bodyweight + added load` per rep, so adding a plate never lowers tonnage.
   * @param {{load?:number,reps?:number,setsDone?:number,sets?:any[],bw?:boolean}} e
   * @param {number} [bwKg] bodyweight in kg (default 75)
   * @returns {number}
   */
  function entryVolume(e, bwKg) {
    if (!e) return 0;
    var bw = typeof bwKg === "number" && isFinite(bwKg) && bwKg > 0 ? bwKg : 75;
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
   * @returns {number}
   */
  function totalVolume(payload) {
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
    var lh = (payload && payload.liftHistory) || {}, byDate = {}, k, arr, i, e, d, bw = payload && payload.bodyweight;
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
  function parseKey(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function keyOf(dt) {
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }
  function shiftKey(nowKey, days) {
    var d = parseKey(nowKey);
    if (!d) return null;
    d.setDate(d.getDate() + days);
    return keyOf(d);
  }
  function volumeInRange(payload, fromKey, toKey) {
    var s = sessionVolumes(payload), t = 0, i;
    for (i = 0; i < s.length; i++) if (s[i].date >= fromKey && s[i].date <= toKey) t += s[i].volume;
    return t;
  }
  /**
   * Rolling 7-day tonnage vs the previous 7 days, anchored on `nowKey`.
   * @param {any} payload @param {string} nowKey @returns {{thisWeek:number,lastWeek:number,deltaPct:number,hasPrev:boolean}}
   */
  function weekOverWeek(payload, nowKey) {
    var thisStart = shiftKey(nowKey, -6), lastStart = shiftKey(nowKey, -13), lastEnd = shiftKey(nowKey, -7);
    if (!thisStart) return { thisWeek: 0, lastWeek: 0, deltaPct: 0, hasPrev: false };
    var tw = volumeInRange(payload, thisStart, nowKey);
    var lw = volumeInRange(payload, lastStart, lastEnd);
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
    var have = {}, s = sessionVolumes(payload), i;
    for (i = 0; i < s.length; i++) if (s[i].date) have[s[i].date] = 1;
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
    var lh = (payload && payload.liftHistory) || {}, idx = {}, k, arr, i, e;
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
  /**
   * Status of the current training week (Fri/Sat/Sun), oldest → newest.
   * @param {any} payload @param {string} nowKey YYYY-MM-DD
   * @returns {{day:string,date:string,state:string,lifts:number}[]}
   */
  function weekStatus(payload, nowKey) {
    var today = parseKey(nowKey);
    if (!today) return [];
    var fri0 = mostRecentFriday(today), lifts = weekLiftIndex(payload);
    var names = ["fri", "sat", "sun"], out = [], i;
    for (i = 0; i < 3; i++) {
      var dt = new Date(fri0); dt.setDate(fri0.getDate() + i);
      var key = keyOf(dt);
      var n = lifts[key] ? Object.keys(lifts[key]).length : 0;
      var state = dt > today ? "upcoming"
        : n >= 8 ? "done"
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
          opts = { bw: isBw || e.bw === true, bodyweight: bwKg };
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

  return {
    historyKeys: historyKeys, sessionCount: sessionCount, setsLogged: setsLogged,
    setsRecorded: setsRecorded, entrySets: entrySets,
    entryVolume: entryVolume, totalVolume: totalVolume, sessionVolumes: sessionVolumes,
    recentVolume: recentVolume, volumeByDay: volumeByDay, uniqueDays: uniqueDays,
    workoutDates: workoutDates, weekStatus: weekStatus,
    weekOverWeek: weekOverWeek, sessionsLast7: sessionsLast7, personalRecords: personalRecords,
    trainingDays: trainingDays, toCsv: toCsv
  };
});
