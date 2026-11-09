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
   * Total sets recorded across all history entries.
   * @param {any} payload
   * @returns {number}
   */
  function setsRecorded(payload) {
    var n = 0, lh = (payload && payload.liftHistory) || {}, k, arr, i;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || [];
      for (i = 0; i < arr.length; i++) n += (arr[i].setsDone || 0);
    }
    return n;
  }

  /**
   * Tonnage for one history entry: load × reps × sets.
   * Bodyweight work (load === 0) is valued at `bwKg` per rep so pull-ups /
   * dips / calf raises do not read as zero volume on the dashboard.
   * @param {{load?:number,reps?:number,setsDone?:number}} e
   * @param {number} [bwKg] bodyweight in kg (default 75)
   * @returns {number}
   */
  function entryVolume(e, bwKg) {
    if (!e) return 0;
    var load = typeof e.load === "number" && isFinite(e.load) ? e.load : 0;
    var eff = load > 0 ? load : (load === 0 ? (typeof bwKg === "number" ? bwKg : 75) : 0);
    return eff * (e.reps || 0) * (e.setsDone || 0);
  }

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

  /* ── CSV export (portability) ──────────────────────────────────────────── */
  function csvCell(v) {
    var s = v == null ? "" : String(v);
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
   * @param {(load:number, reps:number) => number} metric
   * @returns {{key:string,name:string,load:number,reps:number,date:string,metric:number}[]}
   */
  function personalRecords(payload, DAYS, metric) {
    var lh = (payload && payload.liftHistory) || {}, out = [], k, arr, i, e, best, bestM, m, p, d, idx, name;
    for (k in lh) if (Object.prototype.hasOwnProperty.call(lh, k)) {
      arr = lh[k] || []; best = null; bestM = -Infinity;
      for (i = 0; i < arr.length; i++) {
        e = arr[i]; if (!e) continue;
        m = metric(e.load || 0, e.reps || 0);
        if (m > bestM) { bestM = m; best = e; }
      }
      if (!best) continue;
      p = k.split(":"); d = p[0]; idx = parseInt(p[1], 10);
      name = DAYS[d] && DAYS[d].ex[idx] ? DAYS[d].ex[idx].n : k;
      out.push({ key: k, name: name, load: best.load, reps: best.reps, date: best.date, metric: bestM });
    }
    out.sort(function (a, b) { return b.metric - a.metric; });
    return out;
  }

  return {
    historyKeys: historyKeys, sessionCount: sessionCount, setsLogged: setsLogged,
    setsRecorded: setsRecorded,
    entryVolume: entryVolume, totalVolume: totalVolume, sessionVolumes: sessionVolumes,
    recentVolume: recentVolume, volumeByDay: volumeByDay, uniqueDays: uniqueDays,
    weekOverWeek: weekOverWeek, sessionsLast7: sessionsLast7, personalRecords: personalRecords,
    trainingDays: trainingDays, toCsv: toCsv
  };
});
