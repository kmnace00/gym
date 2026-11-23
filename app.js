/* ── Gym controller: DOM wiring + render. Logic lives in program/store/timer ─ */
(function () {
  "use strict";

  var DAYS = Gym.DAYS, fmt = Gym.fmt, esc = Gym.esc, dayMins = Gym.dayMins, dayMinsLeft = Gym.dayMinsLeft,
      getLift = Gym.getLift, suggestLoad = Gym.suggestLoad, stallLoad = Gym.stallLoad,
      qualifies = Gym.qualifies, countsForProgression = Gym.countsForProgression,
      planFor = Gym.planFor, progressMetric = Gym.progressMetric,
      firstOpenLift = Gym.firstOpenLift, restDuration = Gym.restDuration,
      deloadSets = Gym.deloadSets, deloadLoad = Gym.deloadLoad, deloadActive = Gym.deloadActive,
      Machine = Gym, Stats = Gym, Rest = Gym;
  var DAY_LIFTS = { fri: DAYS.fri.ex.length, sat: DAYS.sat.ex.length, sun: DAYS.sun.ex.length };
  var DAY_LABEL = { fri: "Fri", sat: "Sat", sun: "Sun" };

  /* ── state ─────────────────────────────────────────────────────────────── */
  var payload, cur, idx, view = "day", hintText = "", hintGood = false, planMsg = "";

  function st(d, i) { return getLift(payload.state, d, i, DAYS[d].ex[i]); }
  function ex() { return DAYS[cur].ex[idx]; }
  function curSt() { return st(cur, idx); }
  /* B6-09: the one place effective set targets are decided — reduced during
     a deload week, otherwise the programme's own `s`. */
  function effSets(e) { return deloadActive(payload) ? deloadSets(e) : e.s; }
  /** The first open lift of the current day for the effective (deload-aware) target. */
  function firstOpen(from) { return firstOpenLift(cur, payload.state, from, effSets); }
  /* N6/N10: the time model's calibration. Seeds until the learned values
     exist (Stats.calibration over the last 6 timestamped sessions, >= 3 to
     engage), stored outside the workout payload so they never export. */
  var CALIB_KEY = "gym-calibration";
  function learnedCal() {
    try { var c = JSON.parse(localStorage.getItem(CALIB_KEY) || "null"); return c && typeof c === "object" ? c : null; }
    catch (e) { return null; }
  }
  function calOpts() {
    var c = learnedCal();
    /* only calibration()'s own contract (0–1200 / 5–40, finite) is accepted */
    return {
      stretch: c && typeof c.warmupSec === "number" && isFinite(c.warmupSec) && c.warmupSec >= 0 && c.warmupSec <= 1200 ? c.warmupSec : Gym.STRETCH_SECS,
      setup: c && typeof c.overheadSec === "number" && isFinite(c.overheadSec) && c.overheadSec >= 5 && c.overheadSec <= 40 ? c.overheadSec : Gym.SETUP_SECS,
      /* B6-09: deload week cuts sets — estimate must agree. */
      deload: deloadActive(payload)
    };
  }
  function refreshCalibration() {
    var c = Stats.calibration(payload, DAYS, {
      setSecs: Gym.SET_SECS, setupSeed: Gym.SETUP_SECS,
      restSecs: function (e, prev) { return restDuration(e.rest, prev ? prev.rir : 2); },
      rampSecs: function (e, load, isFirst) { var r = Gym.rampFor(e, load, isFirst); return r ? r.secs : 0; }
    });
    try {
      if (c) localStorage.setItem(CALIB_KEY, JSON.stringify({ warmupSec: c.warmupSec, overheadSec: c.overheadSec, sessions: c.sessions, at: Date.now() }));
      else localStorage.removeItem(CALIB_KEY);
    } catch (e) {}
    renderCalib();
  }
  function renderCalib() {
    var info = document.getElementById("calibInfo");
    if (!info) return;
    var c = learnedCal();
    var warm = c && typeof c.warmupSec === "number" && isFinite(c.warmupSec) && c.warmupSec >= 0 && c.warmupSec <= 1200;
    var over = c && typeof c.overheadSec === "number" && isFinite(c.overheadSec) && c.overheadSec >= 5 && c.overheadSec <= 40;
    if (c && c.sessions >= 3 && (warm || over)) {
      var parts = [];
      if (warm) parts.push("warm-up ~" + Math.round(c.warmupSec / 60) + " min");
      if (over) parts.push("per-set overhead ~" + c.overheadSec + "s");
      info.textContent = "Clock learning (from " + c.sessions + " timed sessions): " + parts.join(" · ");
    } else info.textContent = "Clock learning: starter values until 3 timed sessions.";
    info.hidden = false;
  }
  /* resolve a lift id to its current working load (state first, program
     fallback) — the anchor lookup for starting guesses */
  function loadForId(id) {
    for (var d in DAYS) {
      var list = DAYS[d].ex;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { var r = st(d, i); return r.load > 0 ? r.load : list[i].load; }
      }
    }
    return null;
  }
  function rampText(ramp) {
    return (ramp.kind === "full" ? "Ramp: " : ramp.kind === "feeler" ? "Feeler: " : "Warm-up: ") + ramp.steps.map(function (s2) { return s2.load + "×" + s2.reps; }).join(" · ");
  }
  /* B6-10: the one progression-read filter — excludes swaps (B6-06) and
     deload sessions (B6-09); volume/completion reads deliberately skip it. */
  function progressionEntry(e) { return countsForProgression(e) && !e.deload; }

  /* bodyweight-aware metric: total system weight, so adding a plate to a dip
     always moves the number up. */
  function metricFor(e, load, reps) {
    return progressMetric(load, reps, { bw: !!(e && e.bw), assist: !!(e && e.assist), bodyweight: payload && payload.bodyweight });
  }
  /* swap-aware metric for LIVE sets: while a lift is swapped its sets carry the
     alternate's own external load, so they must be valued as plain weight
     (bw:false, assist:false) — same rule liftValuation/bankLift use — never as
     the original lift's bodyweight-minus-help. The doneBtn PR hint reads live
     sets, so it must agree with how those sets are banked and valued elsewhere. */
  function metricForLive(e, s, load, reps) {
    var val = liftValuation(e, s);
    return progressMetric(load, reps, { bw: val.bw, assist: val.assist, bodyweight: payload && payload.bodyweight });
  }
  /* bodyweight work is valued at the weight in force when that session was
     banked, so editing today's weight never rewrites past PRs. */
  function bwFor(entry) {
    return Stats.resolveBodyweight(entry, payload && payload.bodyweight);
  }
  function metricForEntry(e, entry, load, reps) {
    return progressMetric(load, reps, { bw: !!(e && e.bw), assist: !!(e && e.assist), bodyweight: bwFor(entry) });
  }
  /** Highest-value set in a list for the lift's metric; `entry` supplies its banked weight. */
  function topSetOf(e, sets, entry) {
    if (entry && typeof entry.bwKg === "number" && isFinite(entry.bwKg) && entry.bwKg > 0) {
      return Stats.topSet(sets, function (l, r) { return metricForEntry(e, entry, l, r); });
    }
    return Stats.topSet(sets, function (l, r) { return metricFor(e, l, r); });
  }
  /* Bank the *whole* set array for a lift: this is the single source of truth
     for tonnage, PRs, CSV and the progression nudge (extra sets included). */
  /** Bank a lift's whole set array into today's history entry (volume/PR/CSV truth). */
  function bankLift(d, i) {
    var e = DAYS[d].ex[i], s = st(d, i);
    if (!s.sets || !s.sets.length || s.done < effSets(e)) return;
    var val = liftValuation(e, s);
    /* the representative top set is valued exactly like the sets are banked
       (B6-07 / v148): while swapped they carry the alternate's plain external
       load, so an original bodyweight/assist flag must not invert the pick —
       for an assisted lift, bodyweight-minus-help would crown the LIGHTER of a
       descending run. This matches the shared rule volume/PR already use. */
    var top = Stats.topSet(s.sets, function (l, r) {
      return progressMetric(l, r, { bw: val.bw, assist: val.assist, bodyweight: payload && payload.bodyweight });
    }) || s.sets[s.sets.length - 1];
    var hit = false;
    for (var j = 0; j < s.sets.length; j++) {
      if (s.sets[j].reps >= e.top && s.sets[j].rir >= e.rir) hit = true;
    }
    var entry = {
      date: Gym.sessionDate(payload), load: top.load, reps: top.reps, rir: top.rir,
      hitTop: hit, setsDone: s.sets.length,
      sets: s.sets.map(function (x) {
        var o = { load: x.load, reps: x.reps, rir: x.rir };
        if (typeof x.t === "number") o.t = x.t; // N10: timestamps ride into history too
        if (x.edited) o.edited = true;
        return o;
      }),
      bw: val.bw, exId: e.id
    };
    if (val.assist) entry.assist = true; // N15: the banked load is assistance — stats value it as bodyweight minus load
    if ((val.bw || val.assist) && payload && typeof payload.bodyweight === "number" && payload.bodyweight > 0) entry.bwKg = payload.bodyweight;
    if (s.swapAlt) entry.swap = s.swapAlt; // B6-06: logged under an alternate — excluded from progression/PRs
    if (deloadActive(payload)) entry.deload = true; // B6-09: banked during a deload week
    Gym.upsertHistory(payload, d, i, entry);
  }

  /* immediate saves; steppers coalesce writes during press-and-hold */
  var saveTimer = null, saveDirty = false, saveFailed = false, dataWarn = null, saveBarMsg = "";
  function syncSaveBar() {
    if (!saveBar) return;
    /* a one-shot success note lives in the view-agnostic bar itself: the
       backup bar is hidden outside the day view and the header hides in rest */
    if (saveBarMsg) {
      saveBar.hidden = false;
      saveBarText.textContent = saveBarMsg; saveBarMsg = "";
      saveBarAction.hidden = true; saveBarDownload.hidden = true;
      return;
    }
    /* a live save failure outranks every load warning: the thing at risk right
       now is the write, and the salvage counts are folded into its copy so the
       recovered log is still named (B5-11) */
    if (saveFailed || dataWarn === "save") {
      var le = dataWarn === "salvaged" ? (Gym.lastLoadError() || {}) : null;
      saveBar.hidden = false;
      saveBarText.textContent = "Couldn't save — storage may be full" +
        (le ? " — the " + (le.recovered || 0) + " recovered entries are not saved yet: export them now" : "");
      saveBarAction.hidden = false;
      saveBarAction.textContent = "Export";
      saveBarDownload.hidden = !le;
    } else if (dataWarn === "salvaged") {
      var se = Gym.lastLoadError() || {};
      saveBar.hidden = false;
      saveBarText.textContent = "Some saved data was damaged — " + (se.recovered || 0) + " log entries recovered, " + (se.dropped || 0) + " couldn't be read — keep the recovered log or download the original.";
      saveBarAction.hidden = false;
      saveBarAction.textContent = "Keep recovered log";
      saveBarDownload.hidden = false;
    } else if (dataWarn === "corrupt") {
      saveBar.hidden = false;
      saveBarText.textContent = "Saved data couldn't be read — showing an empty log. Your original file is kept; download it before doing anything else.";
      saveBarAction.hidden = false;
      saveBarAction.textContent = "Download copy";
      saveBarDownload.hidden = true;
    } else if (dataWarn === "future") {
      saveBar.hidden = false;
      saveBarText.textContent = "Saved data is from a newer version — showing an empty log; original copy kept";
      saveBarAction.hidden = false;
      saveBarAction.textContent = "Download copy";
      saveBarDownload.hidden = true;
    } else {
      saveBar.hidden = true;
      saveBarAction.hidden = false;
      saveBarDownload.hidden = true;
    }
  }
  function persistNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    payload.cur = cur; payload.idx = idx;
    saveFailed = !Gym.save(payload);
    saveDirty = false;
    syncSaveBar();
  }
  /* flush only when there is something to lose — a clean page must never
     overwrite data that changed outside its in-memory copy (e.g. a restore). */
  function flushSave() { if (saveDirty || saveTimer) persistNow(); }
  function scheduleSave() {
    saveDirty = true;
    payload.cur = cur; payload.idx = idx;
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null; payload.cur = cur; payload.idx = idx;
      saveFailed = !Gym.save(payload); saveDirty = false; syncSaveBar();
    }, 250);
  }
  function commit() { saveDirty = true; persistNow(); }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flushSave(); });
  window.addEventListener("pagehide", flushSave);

  var appEl = document.getElementById("app");
  var header = document.getElementById("header");
  var dayView = document.getElementById("dayView");
  var liftView = document.getElementById("liftView");
  var progressView = document.getElementById("progressView");
  var liftList = document.getElementById("liftList");
  var timerBar = document.getElementById("timerBar");
  var restClock = document.getElementById("restTime");
  var restBarFill = document.getElementById("rbarFill");
  var restNext = document.getElementById("restNext");
  var restElapsedEl = document.getElementById("restElapsed");
  var restLive = document.getElementById("restLive");
  var detailsBtn = document.getElementById("detailsBtn");
  var skipBtn = document.getElementById("skipRest");
  var pauseBtn = document.getElementById("pauseRest");
  var undoBtn = document.getElementById("undoBtn");
  var sessBtn = document.getElementById("sessBtn");
  var rirRow = document.getElementById("rirRow");
  var rirHint = document.getElementById("rirHint");
  var menuBtn = document.getElementById("menuBtn");
  var modal = document.getElementById("modal");
  var undoSetBtn = document.getElementById("undoSetBtn");
  var resetLiftBtn = document.getElementById("resetLiftBtn");
  var backupBar = document.getElementById("backupBar");
  var backupBarText = document.getElementById("backupBarText");
  var backupDismissed = false, backupMsg = "";
  var saveBar = document.getElementById("saveBar");
  var saveBarText = document.getElementById("saveBarText");
  var saveBarAction = document.getElementById("saveBarAction");
  var saveBarDownload = document.getElementById("saveBarDownload");
  var summary = document.getElementById("summary");
  var editSet = -1, editBackup = null, editSetOrig = null;
  var swapOpen = false; // N14

  /* ── theme ─────────────────────────────────────────────────────────────── */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute("content", t === "light" ? "#fdebd2" : "#17100b"); });
    var b = document.getElementById("themeToggle");
    if (b) b.textContent = t === "light" ? "Theme: Light" : "Theme: Dark";
  }
  function initTheme() {
    var t = null;
    try { var saved = localStorage.getItem(Gym.THEME_KEY); if (saved === "light" || saved === "dark") t = saved; } catch (e) {}
    if (!t) { try { if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) t = "light"; } catch (e) {} }
    applyTheme(t || "dark");
  }
  document.getElementById("themeToggle").onclick = function () {
    var t = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    try { localStorage.setItem(Gym.THEME_KEY, t); } catch (e) {}
    applyTheme(t);
  };

  /* ── visibility: only one view (and the right chrome) shows at a time ──── */
  function applyVisibility() {
    var resting = appEl.classList.contains("resting");
    var peek = appEl.classList.contains("show-details");
    var showCurrent = !resting || peek;
    appEl.classList.toggle("progress-mode", view === "progress");
    dayView.style.display = (showCurrent && view === "day") ? "flex" : "none";
    liftView.style.display = (showCurrent && view === "lift") ? "flex" : "none";
    progressView.style.display = (showCurrent && view === "progress") ? "flex" : "none";
    header.style.display = (resting && !peek) ? "none" : "flex";
  }

  /* ── render ────────────────────────────────────────────────────────────── */
  function setNavDisabled() {
    var first = idx === 0, last = idx === DAYS[cur].ex.length - 1;
    document.getElementById("prevLift").disabled = first;
    document.getElementById("nextLift").disabled = last;
  }
  /* N12 (updated): day switching lives on the header day tabs (#dayCluster of
     Fri/Sat/Sun buttons, added back in N24) AND the day view's ‹ › chevrons —
     both route through switchDay. Stats.weekStatus stays; its original N12
     tab-rendering lifecycle note is obsolete since the tabs are back. */
  /* ── B6-10: deload follow-through nudge ────────────────────────────────────
     Derived from existing dates only: last deload start + 7 d, else the first
     logged session; never stored or auto-started, and only in an empty week. */
  function dayNum(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function keyOfNum(ms) { return new Date(ms).toISOString().slice(0, 10); }
  /** Monday of the Mon–Sun week that contains `key`. */
  function weekStartKey(key) {
    var d = dayNum(key);
    if (d === null) return null;
    var dow = new Date(d).getUTCDay();                 // 0 Sun … 6 Sat
    return keyOfNum(d - (dow === 0 ? 6 : dow - 1) * 86400000);
  }
  /** Whole days from `from` to `to`, both "YYYY-MM-DD". */
  function daysBetween(from, to) {
    var a = dayNum(from), b = dayNum(to);
    if (a === null || b === null) return null;
    return Math.round((b - a) / 86400000);
  }
  /** Has any session been recorded in the current Mon–Sun week yet? */
  function loggedThisWeek(today) {
    var start = weekStartKey(today), log = (payload && payload.sessionLog) || [], i, d;
    if (start === null) return false;
    for (i = 0; i < log.length; i++) {
      d = log[i] && log[i].date;
      if (Gym.validDate(d) && d >= start && d <= today) return true;
    }
    return Gym.activeHasData(payload); // sets logged today are already training
  }
  /** 5+ weeks since the last deload ended, and nothing logged this week. */
  function deloadNudgeDue() {
    if (deloadActive(payload)) return false;
    var today = Gym.dateKey(), anchor = null, i, log = (payload && payload.sessionLog) || [];
    if (Gym.validDate(payload && payload.deloadSince)) anchor = keyOfNum(dayNum(payload.deloadSince) + 7 * 86400000);
    else {
      for (i = 0; i < log.length; i++) {
        var d = log[i] && log[i].date;
        if (Gym.validDate(d) && (anchor === null || d < anchor)) anchor = d;
      }
    }
    if (anchor === null) return false;
    return daysBetween(anchor, today) >= 35 && !loggedThisWeek(today);
  }

  /* N24: header day tabs with weekStatus dots; switchDay keeps chevron
     semantics (incl. mid-edit reset, B5-05). A11y gets one week sentence. */
  var WEEK_STATE_WORD = { done: "done", today: "today", partial: "partly logged", missed: "missed", upcoming: "upcoming" };
  function renderDayWeek() {
    var wk = Stats.weekStatus(payload, Gym.dateKey(), DAY_LIFTS);
    var cluster = document.getElementById("dayCluster");
    if (cluster) {
      cluster.innerHTML = wk.map(function (w) {
        return '<button type="button" class="daytab ' + w.state + (w.day === cur ? " on" : "") + '"' +
          ' data-day="' + w.day + '" aria-pressed="' + (w.day === cur) + '"' +
          ' aria-label="' + DAY_LABEL[w.day] + ' — ' + (WEEK_STATE_WORD[w.state] || w.state) + '">' +
          '<i class="dwdot" aria-hidden="true"></i>' + DAY_LABEL[w.day] + "</button>";
      }).join("");
      var btns = cluster.querySelectorAll(".daytab");
      for (var b = 0; b < btns.length && b < wk.length; b++) {
        btns[b].onclick = (function (d) { return function () { switchDay(d); var t = cluster.querySelector('.daytab[data-day="' + d + '"]'); if (t) t.focus(); }; })(wk[b].day);
      }
    }
    var sr = document.getElementById("dayWeekSummary");
    if (sr) {
      var spoken = wk.map(function (w) {
        return DAY_LABEL[w.day] + " " + (WEEK_STATE_WORD[w.state] || w.state);
      }).join(", ");
      /* N41: mirror the on-screen summary — once any set of the day is logged,
         the spoken estimate switches from the full-day plan to time left. */
      var list = DAYS[cur].ex, dDone = 0, di;
      for (di = 0; di < list.length; di++) dDone += Math.min(st(cur, di).done, effSets(list[di]));
      sr.textContent = "This week: " + spoken + ". Viewing " + DAY_LABEL[cur] +
        " — about " + (dDone > 0 ? dayMinsLeft(cur, payload.state, calOpts()) : dayMins(cur, calOpts())) + " minutes" +
        (dDone > 0 ? " left" : "") + ".";
    }
  }

  function renderDay() {
    var list = DAYS[cur].ex, totalDone = 0, totalSets = 0, i, hasHist = false;
    for (i = 0; i < list.length; i++) {
      totalDone += Math.min(st(cur, i).done, effSets(list[i])); totalSets += effSets(list[i]);
      if (!hasHist && Gym.series(payload, cur, i).length) hasHist = true;
    }
    var complete = firstOpen(0) === -1;
    /* B6-09: the deload banner sits above the lift rows for the whole week */
    var deloadBar = document.getElementById("deloadBar");
    if (deloadBar) deloadBar.hidden = !deloadActive(payload);
    document.getElementById("dayTitle").textContent = DAYS[cur].label;
    renderDayWeek();
    var summary = complete
      ? "Workout complete — nice work"
      : list.length + " lifts · " + totalSets + " sets · ~" + (totalDone > 0 ? dayMinsLeft(cur, payload.state, calOpts()) : dayMins(cur, calOpts())) + " min" + (totalDone > 0 ? " left" : "");
    if (!Gym.actualDay()) {
      /* B6-02: say which training day this session banks under */
      summary = "Off day · logs as " + (DAYS[Gym.todayDay()] ? DAYS[Gym.todayDay()].label.split(" — ")[0] : "the next session") + " · " + summary;
    }
    if (planMsg && totalDone === 0) summary += " · " + planMsg; // planning is over once sets are logged
    /* B6-10: one nudge line, gone as soon as the week has a session in it */
    if (deloadNudgeDue()) summary += " · 5+ weeks since a deload — start one in the Menu.";
    document.getElementById("daySummary").textContent = summary;
    /* today-band tally (tall Home-Screen canvas): sets done, time left */
    var bandInfo = document.getElementById("bandInfo");
    if (bandInfo) {
      bandInfo.textContent = totalDone + "/" + totalSets + " sets"
        + (complete ? " · done" : " · ~" + (totalDone > 0 ? dayMinsLeft(cur, payload.state, calOpts()) : dayMins(cur, calOpts())) + " min left");
    }
    // first-run guidance: one line until the very first set is ever logged
    var firstRun = document.getElementById("firstRunHint");
    if (firstRun) firstRun.hidden = Gym.hasData(payload);
    document.getElementById("planBtn").hidden = !hasHist || complete;

    var firstOpenIdx = firstOpen(0);
    var contBtn = document.getElementById("continueBtn");
    if (contBtn) {
      contBtn.hidden = complete || firstOpenIdx < 0 || totalDone === 0;
      contBtn.textContent = "Continue · Lift " + (firstOpenIdx + 1);
    }
    var finBtn = document.getElementById("finishBtn");
    if (finBtn) {
      /* P8: a time-boxed session that stops at lift 6 still gets a close —
         any logged data can finish; only an already-complete session can't */
      finBtn.hidden = !(totalDone > 0) || (payload.active && payload.active.status === "complete");
      finBtn.textContent = complete ? "Finish workout" : "Finish partial workout";
    }

    var rows = "";
    list.forEach(function (e, i) {
      var s = st(cur, i), done = s.done >= effSets(e);
      /* B6-07/N14: while a lift is swapped, the day row must show the ALTERNATE's
         working load — plain add weight, "Load N lb" / "start light" — just like
         the lift view, not the original's dormant load with its own semantics. */
      var wl = workingLoad(s);
      var loadTxt = s.swapAlt ? (wl > 0 ? "Load " + wl + " lb" : "start light")
        : e.assist ? (s.load > 0 ? "Help " + s.load + " lb" : "bodyweight")
          : e.load === null ? (s.load > 0 ? "Load " + s.load + (s.guess && !(s.sets || []).length ? " (guess)" : "") : "start light")
            : e.load === 0 ? "bodyweight" : "Load " + s.load;
      var restTxt = fmt(restDuration(e.rest, s.rir));
      rows += '<li class="liftrow' + (done ? " done" : "") + (i === idx ? " now" : "") + '" data-i="' + i + '" role="button" tabindex="0">'
        + '<span class="liftstatus">' + (done ? "✓" : "") + '</span>'
        + '<span class="liftmain"><span class="liftname">' + esc(e.n) + '</span>'
        + '<span class="liftmeta">' + effSets(e) + '×' + e.r + (e.top > e.r ? "–" + e.top : "") + ' · ' + loadTxt + ' · ' + restTxt + ' rest</span></span>'
        + '<span class="chev">›</span></li>';
    });
    liftList.innerHTML = rows;

    var segs = "";
    list.forEach(function (e, i) {
      var s = st(cur, i);
      var pct = Math.max(0, Math.min(1, s.done / effSets(e)));
      segs += '<span class="pseg"><i style="width:' + (pct * 100) + '%"></i></span>';
    });
    document.getElementById("progressSegs").innerHTML = segs;

    var due = !backupDismissed && Gym.backupDue(payload);
    backupBar.hidden = !due && !backupMsg;
    if (backupMsg) { backupBarText.textContent = backupMsg; backupMsg = ""; }
    else if (due) { var age = Gym.backupAgeDays(payload); backupBarText.textContent = age === null ? "Never backed up — this log lives only on this phone" : "Backup " + age + " day" + (age===1?"":"s") + " old — keep your log safe"; }
  }

  /* history entries *before* this session. If the current lift is already
     complete, the newest entry is this session, so skip it. */
  function priorEntries() {
    var entries = Gym.series(payload, cur, idx).filter(progressionEntry); // swaps and deload weeks don't feed progression
    var s = curSt();
    /* only drop the newest filtered entry when it IS this session's banked
       entry (dated today). If the lift was completed via a swap or during a
       deload week, today's raw entry is filtered out here, so the last filtered
       entry is a REAL prior session and must be kept — otherwise skip would
       throw away genuine history and the suggestion would read two sessions back. */
    var last = entries.length ? entries[entries.length - 1] : null;
    var skip = last && s.done >= effSets(ex()) && last.date === Gym.sessionDate(payload);
    return skip ? entries.slice(0, entries.length - 1) : entries;
  }
  function fmtDate(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
    if (!m) return "";
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m[2] - 1] + " " + (+m[3]);
  }
  /* per-set history: what the last session actually did, one compact line */
  function renderPrev(su) {
    var el = document.getElementById("prevLine");
    /* the swap-aware Prev reads the newest entry even when it is a swap —
       this is NOT the progression read, which filters swaps (B6-06/07) */
    var all = Gym.series(payload, cur, idx);
    var newest = all.length ? all[all.length - 1] : null;
    if (newest && newest.swap) {
      el.textContent = "Prev (swap): " + newest.swap + " " + (newest.load > 0 ? newest.load + "×" : "light×") + newest.reps;
      el.hidden = false;
      return;
    }
    if (newest && newest.deload) {
      var de = ex(), dtxt;
      if (newest.sets && newest.sets.length) dtxt = newest.sets.map(function (st) { return loadLabel(st.load, de) + "×" + st.reps; }).join(" · ");
      else dtxt = loadLabel(newest.load, de) + "×" + newest.reps + " × " + (newest.setsDone || 1) + ((newest.setsDone || 1) === 1 ? " set" : " sets");
      el.textContent = "Prev (deload): " + dtxt;
      el.hidden = false;
      return;
    }
    if (!su || !su.last) { el.hidden = true; return; }
    var e = ex(), txt;
    if (su.last.sets && su.last.sets.length) {
      txt = su.last.sets.map(function (st) { return loadLabel(st.load, e) + "×" + st.reps; }).join(" · ");
    } else {
      txt = loadLabel(su.last.load, e) + "×" + su.last.reps + " × " + (su.last.setsDone || 1) + ((su.last.setsDone || 1) === 1 ? " set" : " sets");
    }
    el.textContent = "Prev: " + txt;
    el.hidden = false;
  }
  function renderSuggest() {
    var line = document.getElementById("suggestLine"), txt = document.getElementById("suggestText"), applyBtn = document.getElementById("applyLoad");
    var pri = priorEntries();
    var last = pri.length ? pri[pri.length - 1] : null;
    var prior = pri.length > 1 ? pri[pri.length - 2] : null;
    var stall = stallLoad(ex(), pri);
    var su = suggestLoad(ex(), last, prior);
    renderPrev(su);
    /* B6-07: the suggestion is the ORIGINAL lift's next load, computed from its
       own progression (swapped entries are excluded from suggestions / P11).
       While a lift is swapped, the alternate's load lives in swapLoad/swapLoads,
       so the original's nudge is noise and Apply would write a dormant field —
       hide the line (the Prev read above is still shown). */
    if (curSt().swapAlt) { line.hidden = true; applyBtn.hidden = true; return; }
    if (!su.last) { line.hidden = true; applyBtn.hidden = true; return; }
    /* B6-09: while a deload week runs, the suggestion is planFor's load taken
       10% lighter (snapped to the step), and the line says why. */
    if (deloadActive(payload)) {
      var dp = planFor(ex(), pri);
      if (dp && typeof dp.load === "number" && dp.load > 0) {
        var dl = deloadLoad(ex(), dp.load);
        var dwhen = fmtDate(su.last.date) || DAY_LABEL[cur] || "";
        var dbase = "Last " + dwhen + ": " + esc(loadNum(su.last.load, ex())) + " × " + esc(su.last.reps) + " @" + esc(su.last.rir) + " RIR";
        txt.innerHTML = "Deload week → " + dbase + " · try <b>" + esc(loadNum(dl, ex())) + "</b>";
        applyBtn.hidden = false;
        applyBtn.setAttribute("data-load", String(dl));
        line.hidden = false;
        return;
      }
    }
    var when = fmtDate(su.last.date) || DAY_LABEL[cur] || "";
    var base = "Last " + when + ": " + esc(loadNum(su.last.load, ex())) + " × " + esc(su.last.reps) + " @" + esc(su.last.rir) + " RIR";
    if (stall) {
      /* a plateau — double progression can't help, so recommend the stall reset */
      txt.innerHTML = base + " · 3 sessions stalled → reset to <b>" + esc(loadNum(stall.load, ex())) + "</b>";
      applyBtn.hidden = false;
      applyBtn.setAttribute("data-load", String(stall.load));
    } else if (su.qualified === 2 && su.suggest !== su.last.load) {
      txt.innerHTML = base + " (hit top twice) → try <b>" + esc(loadNum(su.suggest, ex())) + "</b>";
      applyBtn.hidden = false;
      applyBtn.setAttribute("data-load", String(su.suggest));
    } else if (su.qualified === 1 && qualifies(ex(), last)) {
      /* latest session cleared the bar, but it takes two in a row */
      txt.textContent = base + " → keep " + loadNum(su.last.load, ex()) + " · one more top session to go up";
      applyBtn.hidden = true;
    } else {
      txt.textContent = base + " → keep " + loadNum(su.last.load, ex());
      applyBtn.hidden = true;
    }
    line.hidden = false;
  }
  function renderSpark() {
    /* filter first, window second (as priorEntries does): windowing raw
       history first lets swapped/deload sessions eat the trend window.    */
    var entries = Gym.series(payload, cur, idx).filter(progressionEntry).slice(-12); // the original lift's trend
    var wrap = document.getElementById("sparkWrap"), svg = document.getElementById("sparkline");
    var toggle = document.getElementById("trendToggle");
    var has = entries.length >= 2;
    if (toggle) { toggle.hidden = !has; toggle.setAttribute("aria-pressed", appEl.classList.contains("show-trend")?"true":"false"); }
    if (!has) { wrap.hidden = true; return; }
    var vals = entries.map(function (h) {
      var top = topSetOf(ex(), Stats.entrySets(h), h);
      if (!top) return metricForEntry(ex(), h, h.load || 0, h.reps || 0);
      return metricForEntry(ex(), h, top.load || 0, top.reps || 0);
    });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = (max - min) || 1;
    var W = 120, H = 28, pad = 2, n = vals.length, d = "";
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? 0 : (i / (n - 1)) * W;
      var y = H - pad - ((vals[i] - min) / span) * (H - 2 * pad);
      d += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    svg.innerHTML = '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    wrap.hidden = !appEl.classList.contains("show-trend");
  }
  /* N15/N26: an assisted lift's stored number is the machine's HELP, not a
     load. It is displayed as a negative load — "-45", 0 = bodyweight — so a
     lower number reads as harder, and any prose calls it what it is: help. */
  function assistLabel(load) { return load > 0 ? "-" + load : "BW"; }
  function assistWord(load) { return load > 0 ? "help " + load + " lb" : "bodyweight"; }
  /* a bare number for prose: assisted lifts read as negative help, the rest
     exactly as they always have */
  function loadNum(load, e) { return e && e.assist ? assistLabel(load) : String(load); }
  function loadLabel(load, e) {
    if (e.assist) return assistLabel(load);
    if (e.load === null) return load > 0 ? String(load) : "light";
    if (e.load === 0) return load > 0 ? "BW+" + load : "BW";
    return load > 0 ? String(load) : "—";
  }
  /* weight-only display (header, rest prep): always names the imperial unit */
  function loadText(load, e) {
    var t = loadLabel(load, e);
    return (t === "light" || t === "BW" || t === "—") ? t : t + " lb";
  }
  /* B6-07: while a lift is swapped, every load is the alternate's own added
     weight — plain numbers, 0 renders as start light; the original lift's
     bodyweight semantics don't apply. The working load lives in the record's
     swapLoad field while swapped, and in `load` otherwise.                 */
  function workingLoad(s) { return s.swapAlt ? (typeof s.swapLoad === "number" ? s.swapLoad : 0) : s.load; }
  /* swapped sets use the alternate's real external weight (bw:false,
     assist:false), never bodyweight-minus-help; bankLift/showSummary share this rule. */
  function liftValuation(e, s) {
    return (s && s.swapAlt) ? { bw: false, assist: false } : { bw: !!e.bw, assist: !!e.assist };
  }
  /* N14: per-alternate load memory for the day — swapLoad stays the ACTIVE
     alternate's load; swapLoads remembers each alternate's own, so swapping
     away and back restores it instead of carrying the last-used load over. */
  function stashSwapLoad(s) {
    if (!s.swapAlt || typeof s.swapLoad !== "number") return;
    if (!s.swapLoads || typeof s.swapLoads !== "object") s.swapLoads = {};
    s.swapLoads[s.swapAlt] = s.swapLoad;
  }
  function setWorkingLoad(s, v) { if (s.swapAlt) { s.swapLoad = v; stashSwapLoad(s); } else s.load = v; }
  function swLoadLabel(load) { return load > 0 ? String(load) : "light"; }
  function swLoadText(load) { return load > 0 ? load + " lb" : "light"; }
  /* the set log: one row per prescribed set, completed sets checked, the next
     set highlighted — rows stay compact and top-aligned; the log scrolls
     when a lift has more sets than fit */
  function renderSetLog(e, s) {
    var rows = Math.max(effSets(e), s.done);
    var html = "";
    for (var i = 0; i < rows; i++) {
      var done = i < s.done;
      var rec = (done && s.sets && s.sets[i]) ? s.sets[i] : { load: workingLoad(s), reps: s.reps, rir: s.rir };
      var cls = "setrow" + (done ? " done" : (i === s.done ? " now" : ""))
        + (i === editSet ? " editing" : "");
      var mark = done ? "✓" : (i === s.done ? "●" : "");
      html += '<div class="' + cls + '"' + (done ? ' data-set="' + i + '" role="button" tabindex="0"' : "") + '>'
        + '<span class="sn">' + (i + 1) + '</span>'
        + '<span class="sr">' + (s.swapAlt ? swLoadLabel(rec.load) : loadLabel(rec.load, e)) + " × " + rec.reps + '</span>'
        + '<span class="srir">@' + rec.rir + ' RIR</span>'
        + '<span class="smark" aria-hidden="true">' + mark + '</span>'
        + '</div>';
    }
    document.getElementById("setLog").innerHTML = html;
    var complete = s.done >= effSets(e);
    document.getElementById("setCount").textContent = editSet >= 0
      ? "Editing set " + (editSet + 1) + " — tap Done"
      : complete ? "All " + effSets(e) + " sets done" : "Set " + (s.done + 1) + " of " + effSets(e);
  }
  /* Light path for stepper taps (B5-20): a press-and-hold fires every 70 ms,
     and a full render() each time rebuilds the set log, suggestion and
     sparkline ~14× per second. During the hold only the numeric readouts and
     the row being adjusted change, so patch those in place; the full render
     runs on release.                                          */
  function updateLiftReadouts() {
    var e = ex(), s = curSt();
    var wl = workingLoad(s);
    document.getElementById("loadVal").textContent = s.swapAlt
      ? swLoadLabel(wl)
      : e.assist ? (s.load > 0 ? "-" + s.load : "0")
        : ((e.load === null && s.load === 0) ? "—" : s.load);
    document.getElementById("repVal").textContent = s.reps;
    var rirTxt = (e.partial && s.done === effSets(e) - 1) ? "0–1 RIR · last set" : s.rir + " RIR";
    var effRest = restDuration(e.rest, s.rir);
    var loadBig = s.swapAlt
      ? (wl > 0 ? "Load <b>" + wl + "</b> lb" : "start light")
      : e.assist
        ? (s.load > 0 ? "help <b>" + s.load + "</b> lb" : "bodyweight")
        : (e.load === null
          ? (s.load > 0 ? "Load <b>" + s.load + "</b> lb" : "start light")
          : (e.load === 0 ? "bodyweight" : "Load <b>" + s.load + "</b> lb"));
    document.getElementById("exPres").innerHTML =
      "<b>" + s.reps + (e.top > s.reps ? "–" + e.top : "") + "</b> reps · " + loadBig
      + " · " + rirTxt + " · Rest " + fmt(effRest);
    var row = editSet >= 0 ? document.querySelector(".setrow.editing") : document.querySelector(".setrow.now");
    if (row) {
      row.querySelector(".sr").textContent = (s.swapAlt ? swLoadLabel(wl) : loadLabel(s.load, e)) + " × " + s.reps;
      row.querySelector(".srir").textContent = "@" + s.rir + " RIR";
    }
  }
  function renderLift() {
    syncRestQuiet();
    var e = ex(), s = curSt(), list = DAYS[cur].ex;
    var sw = !!s.swapAlt, wl = workingLoad(s), setsLogged = (s.sets || []).length > 0;
    var anyDone = false;
    list.forEach(function (x, i) { if (st(cur, i).done > 0) anyDone = true; });
    document.getElementById("liftMeta").textContent = (DAY_LABEL[cur] || "") + " · Lift " + (idx + 1) + " of " + list.length + " · ~" + (anyDone ? dayMinsLeft(cur, payload.state, calOpts()) : dayMins(cur, calOpts())) + " min";
    document.getElementById("exName").textContent = sw ? s.swapAlt : e.n;
    /* the swap's one-line state: what it replaced, or why it is locked */
    var swapSub = document.getElementById("swapSub");
    if (swapSub) {
      swapSub.hidden = !(sw || setsLogged);
      swapSub.textContent = setsLogged ? "Swap locked — sets logged" : "Swapped for " + e.n;
    }
    var swapBtn = document.getElementById("swapBtn");
    if (swapBtn) {
      swapBtn.disabled = setsLogged;
      swapBtn.textContent = sw ? "Using " + s.swapAlt + " — undo" : "Swap";
      swapBtn.setAttribute("aria-expanded", swapOpen && !sw && !setsLogged ? "true" : "false");
    }
    /* N14: alternatives chooser */
    var scEl = document.getElementById("swapChoices");
    if (scEl) {
      var showChoices = swapOpen && !sw && !setsLogged;
      if (!showChoices && scEl.contains(document.activeElement)) swapBtn.focus();
      scEl.hidden = !showChoices;
      if (showChoices) {
        scEl.innerHTML = "";
        (e.alts || []).forEach(function (name) {
          var b = document.createElement("button");
          b.type = "button"; b.className = "swapchoice"; b.textContent = name;
          b.onclick = function () { chooseSwap(name); };
          scEl.appendChild(b);
        });
        var cx = document.createElement("button");
        cx.type = "button"; cx.className = "swapchoice cancel"; cx.textContent = "Cancel";
        cx.onclick = function () { swapOpen = false; render(); };
        scEl.appendChild(cx);
      }
    }

    /* N8: seed the one defensible starting guess into a fresh record so the
       stepper starts somewhere sane. Marked (s.guess); the first logged set
       clears the mark. Records with sets or a real load are never touched. */
    if (!sw && e.load === null && s.load === 0 && !setsLogged && !s.guess && Gym.LOAD_GUESS_FROM[e.id]) {
      var gLoad = Gym.guessLoad(e, loadForId(Gym.LOAD_GUESS_FROM[e.id]));
      if (gLoad) { s.load = gLoad; s.guess = 1; commit(); }
    }

    var rirTxt = (e.partial && s.done === effSets(e) - 1) ? "0–1 RIR · last set" : s.rir + " RIR";
    var loadBig = sw
      ? (wl > 0 ? "Load <b>" + wl + "</b> lb" : "start light")
      : e.assist
        ? (s.load > 0 ? "help <b>" + s.load + "</b> lb" : "bodyweight")
        : (e.load === null
          ? (s.load > 0 ? "Load <b>" + s.load + "</b> lb" + (s.guess && !setsLogged ? " · starting guess" : "") : "start light")
          : (e.load === 0 ? "bodyweight" : "Load <b>" + s.load + "</b> lb"));
    var effRest = restDuration(e.rest, s.rir);
    document.getElementById("exPres").innerHTML =
      "<b>" + s.reps + (e.top > s.reps ? "–" + e.top : "") + "</b> reps · " + loadBig
      + " · " + rirTxt + " · Rest " + fmt(effRest);
    document.getElementById("exCue").textContent = e.cue;
    /* the cue describes the original movement — hide it while swapped (B6-07) */
    document.getElementById("exCue").style.display = sw ? "none" : "";
    document.getElementById("tempoLine").style.display = ""; // the cue is the same for every lift

    /* N2: per-side lifts — both sides are one set, then the full rest. The
       line says so outright; the cue alone ("Per leg.") never settled it. */
    var perLine = document.getElementById("perLine");
    if (perLine) {
      var perSide = !sw && e.per === "side";
      perLine.hidden = !perSide;
      if (perSide) perLine.textContent = "Both sides = 1 set · then rest " + fmt(effRest);
    }
    /* N4: from the last prescribed set onward, name the next lift — he was
       leaving this view mid-set just to learn where to head next. Name only
       when the next load is unknown (no dangling separator). */
    var nextLine = document.getElementById("nextLine");
    if (nextLine) {
      var showNext = editSet < 0 && s.done >= effSets(e) - 1;
      nextLine.hidden = !showNext;
      if (showNext) {
        if (idx >= list.length - 1) {
          nextLine.textContent = "Last lift of the day";
        } else {
          var ne = list[idx + 1], ns = st(cur, idx + 1);
          var nName = ns.swapAlt ? ns.swapAlt : ne.n;
          var nLoadTxt = "";
          /* N26: an assisted next lift reports the help it will actually use —
             "bodyweight" only when there is none stored (its programme load is
             0, so the old `ne.load === 0` branch read as bodyweight even at
             45 lb of help). */
          if (!ns.swapAlt && ne.assist) nLoadTxt = ns.load > 0 ? "help " + ns.load : "bodyweight";
          else if (!ns.swapAlt && ne.load === 0) nLoadTxt = "bodyweight";
          else {
            var nLoad = ns.swapAlt ? workingLoad(ns) : (ns.load > 0 ? ns.load : ne.load);
            /* when the next lift has no load yet (a swapped start-light or a
               load===null lift at 0), say so like the rest screen does — the
               three surfaces must not disagree. */
            if (nLoad != null && nLoad > 0) nLoadTxt = String(nLoad);
            else nLoadTxt = "start light";
          }
          nextLine.innerHTML = "Next: <b>" + esc(nName) + "</b>" + (nLoadTxt ? " · " + esc(nLoadTxt) : "");
        }
      }
    }
    /* N7: the ramp guide — display only, never logged. Only before the
       lift's first set, and only off a real load: a starting guess (s.guess)
       never qualifies a lift for a ramp. */
    var rampLine = document.getElementById("rampLine");
    if (rampLine) {
      var ramp = null;
      if (editSet < 0 && s.done === 0 && !s.guess) {
        ramp = Gym.rampFor(e, sw ? wl : (s.load > 0 ? s.load : e.load), idx === 0);
      }
      rampLine.hidden = !ramp;
      if (ramp) rampLine.textContent = rampText(ramp);
    }

    var complete = s.done >= effSets(e);
    renderSetLog(e, s);

    document.getElementById("loadVal").textContent = sw
      ? swLoadLabel(wl)
      : e.assist ? (s.load > 0 ? "-" + s.load : "0")
        : ((e.load === null && s.load === 0) ? "—" : s.load);
    document.getElementById("repVal").textContent = s.reps;
    rirRow.querySelectorAll(".rir").forEach(function (b) {
      var on = s.rir === parseInt(b.getAttribute("data-rir"), 10);
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false"); // the fill is invisible to a screen reader
    });
    rirHint.textContent = rirText(s.rir); // N13: the selected RIR, in plain words

    var btn = document.getElementById("doneBtn");
    btn.classList.toggle("complete", complete);
    btn.textContent = editSet >= 0 ? "Done editing" : complete ? "✓ Add extra set" : "Set Done";
    btn.removeAttribute("aria-pressed");
    btn.setAttribute("aria-label", editSet >= 0 ? "Done editing — finish editing this set" : complete ? "All sets done. Tap to add an extra set." : "Set Done");

    /* N5: on a finished lift the primary action is moving on — the earliest
       still-open lift, the same target GO picks (B3-34). "Add extra set"
       stays one tap below it. With the day complete it routes to the day
       view, where Finish lives. */
    var goBtn = document.getElementById("goNextBtn");
    if (goBtn) {
      var openIdx = complete && editSet < 0 ? firstOpen(0) : -1;
      var showGo = complete && editSet < 0;
      goBtn.hidden = !showGo;
      if (showGo) {
        if (openIdx >= 0) {
          var oe = list[openIdx], os = st(cur, openIdx);
          var oName = os.swapAlt ? os.swapAlt : oe.n;
          goBtn.textContent = "Next: " + oName + " →";
          goBtn.setAttribute("aria-label", "Go to the next unfinished lift: " + oName);
          goBtn.onclick = function () { openLift(openIdx); };
        } else {
          goBtn.textContent = "All lifts done — finish ✓";
          goBtn.setAttribute("aria-label", "All lifts done — back to the day view to finish");
          goBtn.onclick = function () { showDay(); };
        }
      }
    }

    var hint = document.getElementById("hint");
    hint.textContent = hintText;
    hint.className = "hint" + (hintText ? " show" : "") + (hintGood ? " good" : "");

    setNavDisabled();
    renderSuggest();
    renderSpark();
  }
  /* ── progress view ─────────────────────────────────────────────────────── */
  function renderProgress() {
    var todayKey = Gym.dateKey();
    var snap = Stats.progressSnapshot(payload, DAYS, progressMetric, todayKey, DAY_LIFTS);
    document.getElementById("pSessions").textContent = snap.workouts;
    document.getElementById("pSets").textContent = snap.sets;
    document.getElementById("pDays").textContent = snap.weekDone + "/" + snap.weekTotal;
    document.getElementById("pSub").textContent = snap.workouts
      ? snap.workouts + " workout" + (snap.workouts === 1 ? "" : "s") + " · " + Stats.compactVol(snap.volume) + " lb · "
        + snap.weekDone + "/" + snap.weekTotal + " this week"
      : "No workouts yet — open a lift to begin";

    var byDay = snap.byDay;
    var max = Math.max(1, byDay.fri, byDay.sat, byDay.sun);
    var labels = { fri: "Friday", sat: "Saturday", sun: "Sunday" };
    var bars = "";
    DAY_KEYS.forEach(function (d) {
      var v = byDay[d], pct = Math.round((v / max) * 100);
      bars += '<div class="pdayrow"><span class="pdname">' + labels[d] + '</span>'
        + '<span class="pdbar' + (v ? "" : " zero") + '"><i style="width:' + pct + '%"></i></span>'
        + '<span class="pdval">' + (v ? Stats.compactVol(v) + " lb" : "—") + '</span></div>';
    });
    document.getElementById("pDayBars").innerHTML = bars;

    document.getElementById("heatmap").innerHTML = snap.weeks.map(function (w) {
      return '<span class="hweek">' + DAY_KEYS.map(function (d) {
        return '<i class="hday' + (w[d] ? " on" : "") + '"></i>';
      }).join("") + "</span>";
    }).join("");
    document.getElementById("pHeatCount").textContent = snap.heatCount + "/" + snap.heatTotal;
    document.getElementById("pHeatTitle").textContent = "Training days · " + snap.heatWeeks + " weeks"; // HEAT_WEEKS via the snapshot, not a hardcoded copy
    var heatSum = document.getElementById("heatSummary");
    if (heatSum) heatSum.textContent = snap.heatCount + " of " + snap.heatTotal + " training days in the last " + snap.heatWeeks + " weeks";

    var recent = snap.recent, svg = document.getElementById("pSpark");
    if (recent.length < 2) { svg.innerHTML = ""; }
    else {
      var vals = recent.map(function (r) { return r.volume; });
      var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), span = (mx - mn) || 1;
      var W = 280, H = 64, pad = 4, n = vals.length, path = "";
      for (var i = 0; i < n; i++) {
        var x = (i / (n - 1)) * W;
        var y = H - pad - ((vals[i] - mn) / span) * (H - 2 * pad);
        path += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      }
      svg.innerHTML = '<path d="' + path + '" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    }
    var wow = snap.wow;
    var wowTxt = "";
    if (recent.length) {
      if (wow.hasPrev) {
        wowTxt = " · " + (wow.deltaPct >= 0 ? "▲" : "▼") + Math.abs(wow.deltaPct) + "% vs prior 7d";
      } else {
        wowTxt = " · tonnage trend";
      }
    }
    document.getElementById("pNote").textContent = recent.length
      ? "Last " + recent.length + " session" + (recent.length === 1 ? "" : "s") + wowTxt
      : "Log a full lift to see the trend";

    var pr = snap.pr;
    /* v202: a plain load-less lift's PR metric is a rep count, not a 1RM. */
    var prTxt = !pr ? "" : "PR " + pr.name + " · " + (pr.bw || pr.assist || pr.load > 0
      ? Math.round(pr.metric) + " lb" : pr.reps + " reps");
    document.getElementById("pPr").textContent = prTxt;

    var movers = snap.movers;
    document.getElementById("pMovers").innerHTML = movers.length
      ? movers.map(function (m) {
          var sign = m.pct > 0 ? "+" : "";
          return '<li class="pmover"><span class="pmname">' + esc(m.name) + '</span>'
            + '<span class="pmdelta ' + (m.pct >= 0 ? "up" : "down") + '">' + sign + m.pct + '%</span></li>';
        }).join("")
      : '<li class="pmover empty">No lift logged twice yet</li>';
  }

  /* undo/restart are per-lift controls: enabled only when the visible lift has sets */
  function syncUndo() {
    var done = view === "lift" ? curSt().done : 0;
    undoSetBtn.disabled = done === 0;
    resetLiftBtn.disabled = done === 0;
    appEl.classList.toggle("can-undo", done > 0);
  }
  function render() {
    appEl.classList.toggle("lift-mode", view === "lift");
    applyVisibility();
    if (view === "day") renderDay();
    else if (view === "progress") renderProgress();
    else renderLift();
    syncUndo();
    if (appEl.classList.contains("resting")) renderRestView(restCtl.view());
  }

  /* ── rest timer (timestamp-based: honest even if the phone sleeps) ─────── */
  /* restctl.js orchestrates; this shell paints its effects. `rInt` ticks every
     200 ms; `rArmT` is the 2,600 ms two-tap finish window.                   */
  var rInt = null, rArmT = null, restNextRaw = "", restPrepIdx = -1;

  function resetPauseUi() { timerBar.classList.remove("paused"); pauseBtn.textContent = "Pause"; }
  function stopInterval() { if (rInt) { clearInterval(rInt); rInt = null; } }
  function startInterval() { stopInterval(); rInt = setInterval(tickRest, 200); }
  /* the interval follows the view: an active, unfrozen rest ticks, everything
     else stops (the two-tap "finish" arm freezes the visible clock) */
  function syncRestInterval(v) {
    if (v.ticking) { if (!rInt) startInterval(); }
    else stopInterval();
  }
  var restCtl = Gym.createRestController({
    Machine: Machine, Rest: Rest,
    now: function () { return Date.now(); },
    cur: function () { return cur; },
    idx: function () { return idx; },
    dayLen: function () { return DAYS[cur].ex.length; },
    done: function () { return curSt().done; },
    sets: function () { return effSets(ex()); },
    exRest: function () { return ex().rest; },
    editSet: function () { return editSet; },
    firstOpen: function (from) { return firstOpen(from); },
    elapsed: function () { return Gym.sessionElapsedSec(payload); },
    prep: function (tIdx) {
      var e = DAYS[cur].ex[tIdx], s = st(cur, tIdx);
      var wl = workingLoad(s);
      return {
        name: tIdx === idx ? "Set " + (s.done + 1) + " of " + effSets(e)
                           : "Next — " + (s.swapAlt ? s.swapAlt : e.n) + ", Set " + (s.done + 1) + " of " + effSets(e),
        load: s.swapAlt ? swLoadText(wl) : (e.assist ? assistLabel(wl) : loadText(wl, e)), reps: String(s.reps)
      };
    }
  });
  function apply(out) {
    var fx = out.effects, i, e;
    for (i = 0; i < fx.length; i++) {
      e = fx[i];
      if (e.type === "beep") beepGo();
      else if (e.type === "vibrate") { if (navigator.vibrate) navigator.vibrate(e.ms); }
      else if (e.type === "notify") notifyRestDone("done");
      else if (e.type === "notifyPrep") notifyRestDone("prep");
      else if (e.type === "advanceTo") { resetEdit(); idx = e.idx; hintText = ""; hintGood = false; }
      else if (e.type === "finishWorkout") { clearUndo(); finishWorkout(); }
      else if (e.type === "commit") commit();
      else if (e.type === "render") render();
      else if (e.type === "scheduleFinishReset") {
        if (rArmT) clearTimeout(rArmT);
        rArmT = setTimeout(function () {
          renderRestView(restCtl.finishReset().view);
        }, e.ms);
      }
      else if (e.type === "closeDetails") setRestDetails(false);
      else if (e.type === "blurIfOutside") { if (document.activeElement && !timerBar.contains(document.activeElement)) document.activeElement.blur(); }
    }
    renderRestView(out.view);
    if (out.focusLift) {
      var ft;
      if (editSet>=0){ft=document.getElementById("doneBtn");if(!ft||!ft.getClientRects().length)ft=document.querySelector('.setrow[data-set="'+editSet+'"]');}
      if(!ft) ft=view==="lift"?document.getElementById("exName"):liftList.querySelector('.liftrow[data-i="'+idx+'"]')||liftList.querySelector(".liftrow");
      if(ft&&ft.getClientRects().length) ft.focus();
    }
  }
  function syncRestQuiet() {
    var v = restCtl.view();
    appEl.classList.toggle("rest-quiet", (v.phase === "active" || v.phase === "paused") && editSet < 0);
  }
  function renderRestView(v) {
    syncRestInterval(v);
    syncRestQuiet();
    if (v.phase === "active" && v.secs > 0) restEndEst = Date.now() + v.secs * 1000; // N9: stale-fire suppression anchor
    if (v.phase === "idle") {
      if (timerBar.contains(document.activeElement)) document.activeElement.blur();
      timerBar.classList.remove("active", "go");
      appEl.classList.remove("resting");
      setRestDetails(false);
      resetPauseUi();
      skipBtn.textContent = "End rest";
      restClock.textContent = "Rest";
      restClock.removeAttribute("aria-label");
      restLive.setAttribute("aria-live", "polite");
      restBarFill.style.width = "0";
      restNext.textContent = "";
      setRestElapsed(null);
      setRestLabel(v.label || "", v.msg || "Starts after Set Done");
      renderRestPrep(v);
      applyVisibility();
      return;
    }
    if (v.phase === "go") {
      timerBar.classList.remove("paused");
      timerBar.classList.add("go");
      resetPauseUi();
      restLive.setAttribute("aria-live", "assertive");
      restClock.textContent = "GO";
      restClock.setAttribute("aria-label", "Rest complete — GO");
      restBarFill.style.width = "100%";
      restNext.textContent = v.nextText;
      setRestElapsed(v.elapsedSec);
      skipBtn.textContent = v.skipLabel;
      setRestLabel("GO", v.msg);
      renderRestPrep(v);
      return;
    }
    timerBar.classList.add("active");
    timerBar.classList.remove("go");
    appEl.classList.add("resting");
    restLive.setAttribute("aria-live", "polite");
    if (v.phase === "paused") { timerBar.classList.add("paused"); pauseBtn.textContent = "Resume"; }
    else { timerBar.classList.remove("paused"); pauseBtn.textContent = "Pause"; }
    restClock.textContent = fmt(v.secs);
    restClock.setAttribute("aria-label", v.phase === "paused" ? "Rest paused — " + fmt(v.secs) + " remaining" : "Rest time remaining");
    restBarFill.style.width = Math.round(v.progress * 100) + "%";
    restNext.textContent = v.nextText;
    setRestElapsed(v.elapsedSec);
    skipBtn.textContent = v.skipLabel;
    setRestLabel(v.label, v.msg);
    renderRestPrep(v);
    applyVisibility();
  }
  /* B3-16: the rest screen shows how long the workout has been running */
  function setRestElapsed(sec) {
    if (sec === null || sec === undefined) {
      restElapsedEl.hidden = true;
      restElapsedEl.textContent = "";
      return;
    }
    restElapsedEl.textContent = "Workout " + fmt(sec);
    restElapsedEl.hidden = appEl.classList.contains("show-details");
  }
  function setRestLabel(t, m) {
    document.getElementById("restLabel").textContent = t;
    document.getElementById("restMsg").textContent = m;
  }
  function setRestDetails(open) {
    var fe=!open&&editSet>=0&&appEl.classList.contains("resting");
    if(fe) finishEdit();
    appEl.classList.toggle("show-details",!!open);
    detailsBtn.textContent=detailsBtn.getAttribute(open?"data-hide":"data-show");
    detailsBtn.setAttribute("aria-expanded",open?"true":"false");
    applyVisibility(); if(fe) detailsBtn.focus();
  }
  detailsBtn.onclick = function () { setRestDetails(!appEl.classList.contains("show-details")); };

  function tickRest() { apply(restCtl.tick(Date.now())); }
  function timerIdle(label, msg) { apply(restCtl.idle(label, msg)); }

  var actx = null;
  function ensureAudio() {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
    } catch (e) {}
  }
  function beepGo() {
    if (!actx) return;
    try {
      var t = actx.currentTime;
      [0, 0.22].forEach(function (off) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = "sine"; o.frequency.value = 880;
        o.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.22, t + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.16);
        o.start(t + off); o.stop(t + off + 0.18);
      });
    } catch (e) {}
  }
  function renderRestPrep(v) {
    var prep = document.getElementById("restPrep");
    if (!prep) return;
    var dayOk = !appEl.classList.contains("resting") || !payload.active || payload.active.day === cur;
    prep.hidden = !v.showPrep || !dayOk;
    if (prep.hidden) {
      if (prep.contains(document.activeElement)||document.activeElement===restClock||document.activeElement===pauseBtn) { var go = document.getElementById("skipRest"); if (go && go.getClientRects().length) go.focus(); }
      restPrepIdx = -1; return;
    }
    restPrepIdx = v.prepIdx;
    document.getElementById("restPrepName").textContent = v.prepName;
    document.getElementById("restPrepLoad").textContent = v.prepLoad;
    document.getElementById("restPrepReps").textContent = v.prepReps;
    var rampEl = document.getElementById("restPrepRamp");
    if (rampEl) {
      var tIdx = v.prepIdx, rRamp = null;
      if (tIdx >= 0) {
        var te = DAYS[cur].ex[tIdx], ts = st(cur, tIdx);
        if (ts.done === 0 && !ts.guess) {
          rRamp = Gym.rampFor(te, ts.swapAlt ? workingLoad(ts) : (ts.load > 0 ? ts.load : te.load), tIdx === 0);
        }
      }
      rampEl.hidden = !rRamp;
      if (rRamp) rampEl.textContent = rampText(rRamp);
    }
  }
  document.getElementById("plus15").onclick = function () { apply(restCtl.extend15()); };
  pauseBtn.onclick = function () {
    var ph = restCtl.view().phase;
    if (ph === "paused") apply(restCtl.resume());
    else if (ph === "active") apply(restCtl.pause());
  };
  /* at GO the whole timer surface is the advance button (guarded against the
     same tap that just finished the rest) */
  timerBar.addEventListener("click", function (ev) {
    if (!timerBar.classList.contains("go")) return;
    if (ev.target.closest("button")) return;
    apply(restCtl.skip(true));
  });
  function clearUndo() { appEl.classList.remove("can-undo"); }
  skipBtn.onclick = function () { apply(restCtl.skip(false)); };
  /* undo acts on viewed lift */
  function undoSet() {
    resetEdit();
    var s = curSt();
    if (s.done <= 0) return;
    var wasComplete = s.done >= effSets(ex());
    s.done--;
    if (s.sets && s.sets.length > s.done) s.sets.length = s.done;
    if (s.done <= 0) { s.topHits = 0; s.lastRir = null; }
    if (wasComplete && s.done < effSets(ex())) {
      var arr = payload.liftHistory && payload.liftHistory[cur + ":" + idx];
      if (arr && arr.length && arr[arr.length - 1].date === Gym.sessionDate(payload)) arr.pop();
    } else if (s.done >= effSets(ex())) {
      bankLift(cur, idx);
    }
    stopInterval();
    hintText = ""; hintGood = false;
    timerIdle("", "Set removed — back to set " + (s.done + 1) + ".");
    commit(); render();
    var ae=document.activeElement;
    if(!ae||ae===document.body||ae.disabled||!ae.getClientRects().length){var ft=document.getElementById("doneBtn"); if(ft&&ft.getClientRects().length) ft.focus();}
  }
  undoBtn.onclick = undoSet;
  undoSetBtn.onclick = undoSet;

  /* ── session timer — derived from the persisted active session clock ───── */
  var sInt = null;
  function sessionSecs() { return Gym.sessionElapsedSec(payload); }
  function tickSession() {
    var secs = sessionSecs();
    var el = document.getElementById("elapsed");
    if (el) el.textContent = fmt(secs);
    sessBtn.classList.toggle("has-time", secs > 0);
  }
  function renderSessionPill() {
    var secs = sessionSecs();
    var done = payload.active && payload.active.status === "complete";
    var t = fmt(done ? 0 : secs);
    if (sInt) {
      sessBtn.classList.add("on");
      sessBtn.innerHTML = "⏸ <span id='elapsed'>" + t + "</span>";
    } else {
      /* "Start" only when nothing has elapsed yet; paused means Resume. */
      sessBtn.classList.remove("on");
      sessBtn.innerHTML = "▶ <span class='startlbl'>" + (!done && secs > 0 ? "Resume" : "Start") + "</span><span id='elapsed'>" + t + "</span>";
    }
    sessBtn.classList.toggle("has-time", secs > 0 && !done);
    sessBtn.setAttribute("aria-label", sInt ? "Pause workout timer" : (!done && secs > 0 ? "Resume workout timer" : "Start workout timer"));
  }
  function syncClock(){var run=!!(payload.active&&payload.active.runningSince);if(run&&!sInt){sInt=setInterval(tickSession,500);keepAwake();}if(!run&&sInt){clearInterval(sInt);sInt=null;if(!appEl.classList.contains("resting"))releaseAwake();}renderSessionPill();}
  function startSessionTimer() {
    if (sInt) return;
    Gym.startSessionClock(payload);
    sInt = setInterval(tickSession, 500);
    renderSessionPill();
    keepAwake();
    commit();
  }
  function pauseSession() {
    tickSession();
    clearInterval(sInt); sInt = null;
    Gym.pauseSessionClock(payload);
    releaseAwake();
    renderSessionPill();
    commit();
  }
  sessBtn.onclick = function () {
    if (sInt) { pauseSession(); return; }
    if (payload.active && payload.active.status === "complete") { Gym.startSession(payload, Gym.todayDay()); render(); }
    startSessionTimer();
  };

  /* ── wake lock — best effort, silent if unavailable ────────────────────── */
  var wakeLock = null;
  function keepAwake() {
    if (!("wakeLock" in navigator)) return;
    if (wakeLock && !wakeLock.released) return;
    navigator.wakeLock.request("screen").then(function (w) {
      wakeLock = w;
      w.addEventListener("release", function () { if (wakeLock === w) wakeLock = null; });
    }).catch(function () {});
  }
  function releaseAwake() {
    if (!wakeLock) return;
    var w = wakeLock; wakeLock = null;
    try { var p = w.release(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
    /* throttle SW update checks on return */
  var swCheckAt = 0;
  function checkForDeploy() {
    if (!swReg || typeof swReg.update !== "function") return;
    if (Date.now() - swCheckAt < 600000) return; // at most once every 10 min
    swCheckAt = Date.now();
    try {
      var p = swReg.update();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") return;
    /* N9: the wake lock is released whenever the page hides — re-acquire it
       on return while a session or a rest is live (iOS 18.4+ honors it in
       standalone apps), so the countdown stays on screen at the rack. */
    if (sInt || appEl.classList.contains("resting")) keepAwake();
    checkForDeploy();
  });

  var RIR_TXT = [
    "0 in the tank — couldn't do another rep",
    "1 in the tank — one more rep if you had to",
    "2 in the tank — two more reps if you had to",
    "3 in the tank — three more reps if you had to",
    "4 in the tank — easy, four or more left"
  ];
  function rirText(rir) { return RIR_TXT[Math.max(0, Math.min(4, rir | 0))]; }
  for (var ri = 0; ri <= 4; ri++) {
    (function (rv) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "rir"; b.textContent = String(rv); b.setAttribute("data-rir", String(rv));
      b.setAttribute("aria-label", rirText(rv));
      b.onclick = function () {
        curSt().rir = rv;
        if (editSet >= 0) applySetEdit();
        commit(); render(); renderRestPrep(restCtl.view());
      };
      rirRow.appendChild(b);
    })(ri);
  }

  /* ── steppers — tap once, press-and-hold repeats ───────────────────────── */
  /** Write the working load/reps/RIR into the set currently being edited. */
  function applySetEdit() {
    var s = curSt(), e = ex();
    if (editSet < 0) return;
    if (!s.sets || !s.sets[editSet]) {
      if (editBackup) { setWorkingLoad(s, editBackup.load); s.reps = editBackup.reps; s.rir = editBackup.rir; }
      editSet = -1; editBackup = null; editSetOrig = null;
      return;
    }
    var prevSet = s.sets[editSet];
    s.sets[editSet] = { load: workingLoad(s), reps: s.reps, rir: s.rir, edited: true };
    if (prevSet && typeof prevSet.t === "number") s.sets[editSet].t = prevSet.t;
    if (s.done >= effSets(e)) bankLift(cur, idx);
  }
  function startEdit(i) {
    var s = curSt();
    if (!s.sets || !s.sets[i]) return;
    if (editSet !== i) { editBackup = { load: workingLoad(s), reps: s.reps, rir: s.rir }; editSetOrig = JSON.parse(JSON.stringify(s.sets[i])); }
    editSet = i;
    setWorkingLoad(s, s.sets[i].load); s.reps = s.sets[i].reps; s.rir = s.sets[i].rir;
    hintText = ""; hintGood = false; render();
    var db=document.getElementById("doneBtn"); if(db) db.focus();
  }
  function finishEdit() {
    var s = curSt();
    if (editSet < 0) return;
    var ei = editSet;
    applySetEdit();
    if (editBackup) { setWorkingLoad(s, editBackup.load); s.reps = editBackup.reps; s.rir = editBackup.rir; }
    editSet = -1; editBackup = null; editSetOrig = null;
    hintText = ""; hintGood = false;
    commit(); render();
    var db=document.getElementById("doneBtn");
    var ft=(db&&db.getClientRects().length)?db:document.querySelector('.setrow[data-set="'+ei+'"]');
    if(ft&&ft.focus) ft.focus();
  }
  /* Upper bounds for direct input (B3-18): absurd typed/held values would
     otherwise poison 1RM, tonnage, suggestions and the CSV export. */
  var MAX_LOAD = 2000, MAX_REPS = 999;
  function clampLoad(v) { return Math.min(MAX_LOAD, Math.max(0, v)); }
  function clampReps(v) { return Math.min(MAX_REPS, Math.max(1, v)); }
  /* Steppers can target any lift of the day — the lift view edits the current
     one, the rest prep edits the lift it targets (B5-02: the next lift once
     the current one is complete). */
  function stepLoad(d, tIdx) {
    if (tIdx === undefined || tIdx < 0) tIdx = idx;
    var s = st(cur, tIdx), e = DAYS[cur].ex[tIdx];
    /* the working load field follows the swap mode (B6-07) */
    var wl = workingLoad(s);
    /* N26: an assisted lift's number is displayed as negative help, so ▲ adds
       strength (LESS help) and ▼ adds help — the visible number always moves
       toward "harder" when it rises. */
    var dir = (!s.swapAlt && e.assist) ? -d : d;
    setWorkingLoad(s, clampLoad(Math.round((wl + dir * e.step) * 100) / 100));
    if (editSet >= 0) applySetEdit();
    scheduleSave();
    if (view === "lift") updateLiftReadouts();
    renderRestPrep(restCtl.view());
  }
  function stepReps(d, tIdx) {
    if (tIdx === undefined || tIdx < 0) tIdx = idx;
    var s = st(cur, tIdx);
    s.reps = clampReps(s.reps + d);
    if (editSet >= 0) applySetEdit();
    scheduleSave();
    if (view === "lift") updateLiftReadouts();
    renderRestPrep(restCtl.view());
  }
  function bindStepper(id, fn) {
    var b = document.getElementById(id), delay = null, rep = null, held = false;
    function stop() {
      if (delay) { clearTimeout(delay); delay = null; }
      if (rep) { clearInterval(rep); rep = null; render(); } // full render on hold release (B5-20)
      flushSave();
    }
    b.addEventListener("pointerdown", function () {
      held = false; stop();
      delay = setTimeout(function () { delay = null; fn(); held = true; rep = setInterval(fn, 70); }, 400);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { b.addEventListener(ev, stop); });
    b.addEventListener("click", function () { if (held) { held = false; return; } fn(); });
  }
  bindStepper("loadDown", function () { stepLoad(-1); });
  bindStepper("loadUp", function () { stepLoad(1); });
  bindStepper("repDown", function () { stepReps(-1); });
  bindStepper("repUp", function () { stepReps(1); });
  bindStepper("restLoadDown", function () { if (restPrepIdx >= 0) stepLoad(-1, restPrepIdx); });
  bindStepper("restLoadUp", function () { if (restPrepIdx >= 0) stepLoad(1, restPrepIdx); });
  bindStepper("restRepDown", function () { if (restPrepIdx >= 0) stepReps(-1, restPrepIdx); });
  bindStepper("restRepUp", function () { if (restPrepIdx >= 0) stepReps(1, restPrepIdx); });

  var editingValue = false;
  function editValue(valueEl, current, step, apply) {
    if (editingValue) return;
    editingValue = true;
    var mid = valueEl.parentNode, prev = document.activeElement;
    var inp = document.createElement("input");
    inp.type = "number"; inp.inputMode = "decimal"; inp.step = String(step);
    inp.className = "vin"; inp.value = String(current); inp.setAttribute("aria-label","Enter value");
    valueEl.style.display = "none"; mid.appendChild(inp); inp.focus(); inp.select();
    function finish(commit, fromBlur) {
      if (!editingValue) return;
      editingValue = false;
      var v = parseFloat(inp.value), vid = valueEl.id;
      inp.remove(); valueEl.style.display = "";
      if (commit && isFinite(v)) apply(v); else render();
      var lmEl = vid && document.getElementById(vid) ? /** @type {HTMLElement|null} */ (document.getElementById(vid).parentElement) : null;
      var ft = /** @type {HTMLElement|null} */ ((prev && prev instanceof HTMLElement && prev.isConnected && prev.getClientRects().length) ? prev : (lmEl && lmEl.querySelector(".step[aria-label]")) || lmEl);
      if (!fromBlur && ft) try { ft.focus(); } catch(e){}
    }
    inp.onkeydown = function (ev) { if (ev.key==="Enter"||ev.key==="Escape") { ev.preventDefault(); ev.stopPropagation(); finish(ev.key==="Enter"); } };
    inp.onblur = function () { finish(true, 1); };
  }
  function editLoad() {
    var s = curSt(), cur_ex = ex(), wl = workingLoad(s);
    /* the field prefills the same signed number it displays ("-45" of help) */
    var shown = (!s.swapAlt && cur_ex.assist && wl > 0) ? -wl : wl;
    editValue(document.getElementById("loadVal"), shown, cur_ex.step, function (v) {
      /* N26: on an assisted lift the field shows negative help ("-45"); typing
         either -45 or 45 means 45 lb of help, and the stored value stays the
         positive help number every rule in program.js expects. */
      var typed = (!s.swapAlt && cur_ex.assist) ? Math.abs(v) : v;
      setWorkingLoad(s, clampLoad(Gym.round2(typed))); if (editSet >= 0) applySetEdit(); commit(); render(); renderRestPrep(restCtl.view());
    });
  }
  function editReps() {
    editValue(document.getElementById("repVal"), curSt().reps, 1, function (v) {
      curSt().reps = clampReps(Math.round(v)); if (editSet >= 0) applySetEdit(); commit(); render(); renderRestPrep(restCtl.view());
    });
  }
  [{id:"loadVal",fn:editLoad,lab:"Edit load"},{id:"repVal",fn:editReps,lab:"Edit reps"}].forEach(function(x){
    var m=/** @type {HTMLElement} */ (document.getElementById(x.id).parentNode);
    m.tabIndex=0; m.setAttribute("role","button"); m.setAttribute("aria-label",x.lab);
    m.onclick=x.fn; m.onkeydown=function(ev){ if(ev.key==="Enter"||ev.key===" "){ev.preventDefault(); x.fn();} };
  });

  /* trend sparkline is opt-in — reclaims vertical space on short phones */
  document.getElementById("trendToggle").onclick = function () {
    appEl.classList.toggle("show-trend");
    renderSpark();
  };

  /* ── set done ──────────────────────────────────────────────────────────── */
  document.getElementById("doneBtn").onclick = function () {
    var e = ex(), s = curSt();
    /* Day-switch guard (v159): one active session keyed by `cur` but dated by
       active.date — logging on another day mis-dates the entry; before edits. */
    var actDay = payload.active && payload.active.day;
    if (actDay && actDay !== cur) {
      hintText = "This is " + (DAY_LABEL[cur] || "another day") + "'s lift, but the session is " +
        (DAY_LABEL[actDay] || actDay) + " — switch back to log sets.";
      hintGood = false;
      render();
      return;
    }
    if (editSet >= 0) { finishEdit(); return; }
    if (s.done >= Gym.SETS_MAX) {
      hintText = "Set limit reached — " + Gym.SETS_MAX + " per lift.";
      hintGood = false;
      render();
      return;
    }
    var wasComplete = s.done >= effSets(e);
    /* the working load follows the swap mode (B6-07); reps/RIR targets stay
       the original lift's */
    var wl = workingLoad(s);
    /* capture the log *before* this set so the PR check compares against
       history, not against the set we are about to bank */
    var priorHist = priorEntries();
    var prevBest = -Infinity, hi, hj, topEntry;
    for (hi = 0; hi < priorHist.length; hi++) {
      topEntry = topSetOf(e, Stats.entrySets(priorHist[hi]), priorHist[hi]);
      if (topEntry) prevBest = Math.max(prevBest, metricForEntry(e, priorHist[hi], topEntry.load || 0, topEntry.reps || 0));
      else prevBest = Math.max(prevBest, metricForEntry(e, priorHist[hi], priorHist[hi].load || 0, priorHist[hi].reps || 0));
    }
    /* sets already banked today are today's PR: an extra set at a lighter
       load must not announce a new PR (B5-08) */
    for (hj = 0; hj < (s.sets || []).length; hj++) {
      prevBest = Math.max(prevBest, metricForLive(e, s, s.sets[hj].load || 0, s.sets[hj].reps || 0));
    }

    s.sets = s.sets || [];
    s.sets.push({ load: wl, reps: s.reps, rir: s.rir, t: Date.now() }); // N10: every set is timestamped
    if (s.guess) delete s.guess; // N8: the first real set retires the guess mark
    s.done = s.sets.length;
    s.lastRir = s.rir;
    if (s.reps >= e.top && s.rir >= e.rir) s.topHits++;

    hintText = ""; hintGood = false;
    var finished = !wasComplete && s.done >= effSets(e);
    var restNote = "";
    var newMetric = metricForLive(e, s, wl, s.reps);

    /* a PR beats the progression nudge — celebrate it first */
    if (prevBest > -Infinity && newMetric > prevBest) {
      hintText = "New PR — " + (wl > 0
        ? (s.swapAlt ? swLoadLabel(wl) : e.assist ? "help " + wl : loadLabel(wl, e)) + " × " + s.reps + " (est. 1RM " + Math.round(newMetric) + ")"
        : s.reps + " reps");
      hintGood = true;
    }

    if (finished && e.partial && s.lastRir <= 1 && !s.swapAlt) {
      /* the lengthened-partials cue is the original movement's evidence — it
         does not speak for an alternate (B6-07) */
      restNote = "partials";
    } else if (!hintText && finished && s.topHits >= 1 && s.reps >= e.top && s.lastRir >= e.rir) {
      hintText = e.n + ": top reps at target RIR — do it again next session to add weight.";
      hintGood = true;
    }

    /* bank set array on completion/extra sets */
    bankLift(cur, idx);

    var list = DAYS[cur].ex, nextText = "";
    if (s.done >= effSets(e)) {
      var nx = list[idx + 1];
      var nxLoad = "";
      var nxName = nx ? nx.n : "";
      if (nx) {
        var nsx = st(cur, idx + 1);
        nxName = nsx.swapAlt ? nsx.swapAlt : nx.n;
        /* N26/swap-consistent: a swapped next lift reports the ALTERNATE's
           name and plain working load, exactly like the lift view's Next line
           (nextLine) and the rest-prep card. */
        if (nsx.swapAlt) {
          var nsw = workingLoad(nsx);
          nxLoad = nsw > 0 ? " · Load " + nsw : " · start light";
        } else if (nx.assist) {
          nxLoad = nsx.load > 0 ? " · help " + nsx.load : " · bodyweight";
        } else if (nx.load === null) {
          nxLoad = nsx.load > 0 ? " · Load " + nsx.load : " · start light";
        } else if (nx.load === 0) {
          nxLoad = " · bodyweight";
        } else {
          nxLoad = " · Load " + nsx.load;
        }
      }
      nextText = nx ? "Up next — " + nxName + " · " + effSets(nx) + " × " + nx.r + (nx.top > nx.r ? "–" + nx.top : "") + nxLoad : "Last lift done — workout complete";
    } else {
      nextText = "Up next — Set " + (s.done + 1) + " of " + effSets(e) + " · " + s.reps + " reps" +
        (s.swapAlt ? (wl > 0 ? " · load " + wl : " · start light")
          : e.assist ? " · " + assistWord(s.load)
            : (e.load === null ? (s.load > 0 ? " · load " + s.load : " · start light") : (e.load === 0 ? " · bodyweight" : " · load " + s.load)));
    }

    commit();
    restNextRaw = nextText;
    apply(restCtl.start(restDuration(e.rest, s.rir), e.n + " — set " + Math.min(s.done, effSets(e)) + " done", s.done >= effSets(e), restNote, nextText, hintText));

    ensureAudio();
    if (navigator.vibrate) navigator.vibrate(10);
    if (!sInt) startSessionTimer();
    keepAwake();
    render();
    restClock.focus();
  };

  /* tap a completed set to correct it with the same adjusters */
  document.getElementById("setLog").addEventListener("click", function (ev) {
    var row = ev.target.closest("[data-set]");
    if (!row) return;
    startEdit(parseInt(row.getAttribute("data-set"), 10));
  });
  document.getElementById("setLog").addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var row = ev.target.closest("[data-set]");
    if (!row) return;
    ev.preventDefault();
    startEdit(parseInt(row.getAttribute("data-set"), 10));
  });

  /* apply suggested load */
  var applyLoadBtn = document.getElementById("applyLoad");
  applyLoadBtn.onclick = function () {
    var v = parseFloat(applyLoadBtn.getAttribute("data-load"));
    if (!isNaN(v)) { curSt().load = v; commit(); render(); }
  };

  /* restart this lift: clear its sets, keep the working weight (two taps) */
  function doRestartLift() {
    resetEdit();
    Gym.snapshot(payload, "pre-restart-lift");
    Gym.resetLift(payload, cur, idx);
    hintText = ""; hintGood = false;
    commit(); render();
  }
  resetLiftBtn.onclick = function () { twoTap(this, "Tap again to restart", doRestartLift); };

  /* B6-07 + N14: one swap control on the lift view. Unswapped, it opens the
     alternatives chooser (program.js lists 2–3 per lift); swapped, it undoes
     back to the programmed lift. Once sets exist it locks (the banked entry
     already carries the marker, so the mode must not change mid-set). */
  function lastSwapLoad(name) {
    var hist = (payload.liftHistory || {})[cur + ":" + idx] || [];
    for (var i = hist.length - 1; i >= 0; i--) {
      var en = hist[i];
      if (en && en.swap === name) {
        if (typeof en.load === "number" && en.load > 0) return en.load;
        if (en.sets && en.sets.length && typeof en.sets[en.sets.length - 1].load === "number") return en.sets[en.sets.length - 1].load;
      }
    }
    return null;
  }
  function chooseSwap(name) {
    var s = curSt();
    if ((s.sets || []).length > 0) return;
    stashSwapLoad(s);
    s.swapAlt = name;
    /* the alternate's own load: today's memory first, then its last banked
       session in history, else 0 (step it up, like a fresh swap always did) */
    var mem = s.swapLoads && typeof s.swapLoads[name] === "number" ? s.swapLoads[name] : null;
    var seed = mem !== null ? mem : lastSwapLoad(name);
    s.swapLoad = seed !== null ? seed : 0;
    swapOpen = false;
    hintText = ""; hintGood = false;
    commit();
    render();
    renderRestPrep(restCtl.view());
  }
  document.getElementById("swapBtn").onclick = function () {
    var s = curSt();
    if ((s.sets || []).length > 0) return;
    if (s.swapAlt) {
      stashSwapLoad(s);
      s.swapAlt = null;
      swapOpen = false;
      hintText = ""; hintGood = false;
      commit();
      render();
      renderRestPrep(restCtl.view());
      return;
    }
    swapOpen = !swapOpen;
    render();
  };

  /* plan the whole day: pre-fill each not-yet-started lift from its history */
  document.getElementById("planBtn").onclick = function () {
    var list = DAYS[cur].ex, up = 0, down = 0, keep = 0, manual = 0;
    list.forEach(function (e, i) {
      var s = st(cur, i);
      if (s.done > 0) return; // never overwrite an in-progress lift
      var dflt = e.load === null ? 0 : (e.load || 0);
      if (s.load !== dflt) { manual++; return; } // an explicit load (or an earlier plan) wins
      var p = planFor(e, Gym.series(payload, cur, i).filter(progressionEntry));
      if (p.action === "none") return;
      if (p.action === "up") up++;
      else if (p.action === "deload") down++;
      else keep++;
      /* B6-09: a planned load is taken 10% lighter during a deload week */
      var planned = (deloadActive(payload) && p.load) ? deloadLoad(e, p.load) : p.load;
      if (planned != null) s.load = planned;
    });
    planMsg = (up || down)
      ? "Planned +" + up + (down ? " · reset " + down : "")
      : (manual > 0 ? "Planned · no changes" : "Planned · all keep");
    commit(); render();
  };

  /* ── finish workout + one-screen summary ───────────────────────────────── */
  function nextTrainingGap() {
    var order = DAY_KEYS, orderDow = { fri: 5, sat: 6, sun: 0 };
    var now = new Date(), dow = now.getDay(), t = Gym.actualDay();
    var day;
    if (!t) day = Gym.todayDay();
    else {
      var i = order.indexOf(t);
      day = order[(i + 1) % 3];
    }
    var gap = (orderDow[day] - dow + 7) % 7;
    return { day: day, gap: gap };
  }
  var sumFocus = null;
  function showSummary(entry) {
    if (!summary) return;
    sumFocus = document.activeElement;
    var list = DAYS[cur].ex, sets = 0, vol = 0, i;
    for (i = 0; i < list.length; i++) {
      var s = st(cur, i);
      /* volumes by the same rule bankLift/stats use for history: the live set
         array valued in place, so extra-set sessions (sets > s) count the same
         tonnage here as they will in CSV. A dormant lift has done 0 and no
         sets, so it contributes 0 — and can never read a stale prior load. */
      sets += s.done;
      var val = liftValuation(list[i], s);
      vol += Stats.entryVolume({ sets: s.sets || [], load: s.load, reps: s.reps, setsDone: s.done || 0, bw: val.bw, assist: val.assist }, payload.bodyweight);
    }
    vol = Math.round(vol);
    /* the session's own date, not the wall clock: a workout that started
       before midnight banks its PRs on the day it began (B3-11).          */
    var sessionDay = Gym.sessionDate(payload);
    var prs = Stats.personalRecords(payload, DAYS, progressMetric).filter(function (p) { return p.date === sessionDay; }).length;
    var dur = entry && typeof entry.durationSec === "number" ? entry.durationSec : Gym.sessionElapsedSec(payload);
    /* P8: title the partial case honestly — count the lifts that are done */
    var doneLifts = 0;
    for (i = 0; i < list.length; i++) if (st(cur, i).done >= effSets(list[i])) doneLifts++;
    document.getElementById("sumTitle").textContent = doneLifts < list.length
      ? (DAY_LABEL[cur] || "") + " — partial, " + doneLifts + " of " + list.length + " lifts"
      : (DAY_LABEL[cur] || "") + " workout complete";
    document.getElementById("sumDuration").textContent = dur ? fmt(dur) : "—";
    document.getElementById("sumSets").textContent = String(sets);
    document.getElementById("sumVol").textContent = Stats.compactVol(vol) + " lb";
    document.getElementById("sumPrs").textContent = prs ? prs + " new" : "—";
    var nx = nextTrainingGap();
    var txt = "Next " + (DAY_LABEL[nx.day] || "session") + (nx.gap > 0 ? " in " + nx.gap + "d" : "");
    if (Gym.backupDue(payload)) txt += " · Back up tonight";
    document.getElementById("sumNext").textContent = txt;
    /* N10/R4: once the clock has learned his pace, grade the estimate
       against the actual — full days only, where the two are comparable. */
    var estEl = document.getElementById("sumEst");
    if (estEl) {
      if (learnedCal() && doneLifts === list.length && dur) {
        estEl.hidden = false;
        estEl.textContent = "Estimated " + dayMins(cur, calOpts()) + " min · Actual " + Math.round(dur / 60) + " min";
      } else estEl.hidden = true;
    }
    summary.hidden = false;
    var b = document.getElementById("sumDone");
    if (b) b.focus();
  }
  function finishWorkout() {
    resetEdit();
    timerIdle("", "Workout complete — nice work."); // a live rest must not outlive the workout
    if (sInt) pauseSession();
    var entry = Gym.finalizeSession(payload);
    commit();
    render(); syncClock();
    showSummary(entry);
    refreshCalibration(); // N10: learn from the session just banked — after the summary has read the prior values
  }
  document.getElementById("finishBtn").onclick = finishWorkout;
  document.getElementById("continueBtn").onclick = function () {
    var first = firstOpen(0);
    if (first >= 0) openLift(first);
  };
  function closeSummary() {
    var back = sumFocus; sumFocus = null;
    if (back && document.contains(back) && back.getClientRects().length) back.focus();
    summary.hidden = true;
  }
  function afterSummaryClose() {
    closeSummary(); render();
    var ae = document.activeElement;
    if (ae && ae !== document.body && !summary.contains(ae) && ae.getClientRects().length) return;
    var t = [document.getElementById("continueBtn"), document.getElementById("finishBtn"), menuBtn].find(function (b) { return b && !b.hidden && b.getClientRects().length; });
    if (t) t.focus();
  }
  document.getElementById("sumDone").onclick = afterSummaryClose;
  document.getElementById("sumClose").onclick = afterSummaryClose;
  summary.addEventListener("click", function (ev) { if (ev.target === summary) afterSummaryClose(); });
  summary.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { ev.stopPropagation();afterSummaryClose(); return; }
    if (ev.key !== "Tab") return;
    var items = summary.querySelectorAll("button:not([hidden]), input:not([hidden]), [href]");
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });

  /* ── navigation ────────────────────────────────────────────────────────── */
  /* moving between lifts by hand cancels a pending "auto-advance", so the
     GO button can never jump somewhere the user did not choose.             */
  function cancelPendingAdvance() { restCtl.cancelPendingAdvance(); }
  /* navigating away abandons an in-progress set edit: the set's own value is
     already applied live by applySetEdit(), so just put the working load/
     reps/RIR back — the next set must not inherit the edited set's numbers. */
  function resetEdit() {
    disarmTwoTap();
    var s = curSt();
    if (editSetOrig && s && s.sets && editSet >= 0 && s.sets[editSet]) s.sets[editSet] = editSetOrig;
    if (editBackup && s) { setWorkingLoad(s, editBackup.load); s.reps = editBackup.reps; s.rir = editBackup.rir; }
    editSet = -1; editBackup = null; editSetOrig = null; swapOpen = false;
  }
  function showDay() {
    var left = idx;
    cancelPendingAdvance();
    resetEdit(); view = "day"; hintText = ""; hintGood = false; commit(); render();
    /* focus back to the row the user just left — otherwise Tab restarts from
       the top of the document (the element they were on is now hidden).     */
    var row = liftList.querySelector('.liftrow[data-i="' + left + '"]');
    if (row) row.focus();
  }
  function showProgress() {
    cancelPendingAdvance();
    resetEdit(); view = "progress"; hintText = ""; hintGood = false; commit(); render();
    var head = document.getElementById("progTitle");
    if (head) head.focus();
  }
  function openLift(i) {
    if (i < 0 || i >= DAYS[cur].ex.length) return;
    cancelPendingAdvance(); resetEdit();
    idx = i; view = "lift"; hintText = ""; hintGood = false; commit(); render();
    document.getElementById("exName").focus();
  }
  function navigateLift(delta) {
    var n = idx + delta;
    if (n < 0 || n >= DAYS[cur].ex.length) return;
    cancelPendingAdvance(); resetEdit();
    idx = n; hintText = ""; hintGood = false; commit(); render();
    document.getElementById("exName").focus();
  }
  document.getElementById("backBtn").onclick = showDay;
  document.getElementById("progressBtn").onclick = showProgress;
  liftList.addEventListener("click", function (ev) {
    var row = ev.target.closest(".liftrow"); if (!row) return;
    openLift(parseInt(row.getAttribute("data-i"), 10));
  });
  liftList.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var row = ev.target.closest(".liftrow"); if (!row) return;
    ev.preventDefault(); openLift(parseInt(row.getAttribute("data-i"), 10));
  });
  document.getElementById("prevLift").onclick = function () { navigateLift(-1); };
  document.getElementById("nextLift").onclick = function () { navigateLift(1); };
  /* N12 (updated): day switching — the ‹ › chevrons beside the day title
     cycle the three training days, sharing switchDay with the header day
     tabs (#dayCluster, back in N24). */
  var DAY_KEYS = ["fri", "sat", "sun"];
  function switchDay(d) {
    /* reset the in-progress set edit BEFORE switching days: the backup
       restores into curSt(), so switching first writes it into the wrong
       day's lift (B5-05, matching openLift's order) */
    cancelPendingAdvance();
    resetEdit(); clearUndo();
    cur = d;
    idx = 0; hintText = ""; hintGood = false; view = "day"; planMsg = "";
    var open = firstOpen(0);
    idx = open >= 0 ? open : 0;
    commit(); render();
  }
  function stepDay(dir) {
    var i = DAY_KEYS.indexOf(cur);
    switchDay(DAY_KEYS[(i + dir + DAY_KEYS.length) % DAY_KEYS.length]);
  }
  document.getElementById("dayPrev").onclick = function () { stepDay(-1); };
  document.getElementById("dayNext").onclick = function () { stepDay(1); };

  /* backup modal */
  var lastFocus = null;
  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false; hideMsg(); updateFoot(); initNotify(); renderCalib();
    var first = modal.querySelector(".modalbtn, .modalclose");
    if (first) first.focus();
  }
  function closeModal() {
    disarmTwoTap();
    var back = lastFocus; lastFocus = null;
    if (back && document.contains(back) && back.getClientRects().length) back.focus();
    if (modal.contains(document.activeElement) && menuBtn && menuBtn.getClientRects().length) menuBtn.focus();
    if (modal.contains(document.activeElement) && document.activeElement) document.activeElement.blur();
    modal.hidden = true;
  }
  document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&modal.hidden&&summary.hidden){if(appEl.classList.contains("resting")&&appEl.classList.contains("show-details")){setRestDetails(false);return}if(view==="progress")showDay();else if(swapOpen&&view==="lift"){swapOpen=!1;render();document.getElementById("swapBtn").focus()}}});
  modal.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { ev.stopPropagation();closeModal(); return; }
    if (ev.key !== "Tab") return;
    var items = modal.querySelectorAll("button, label.modalbtn, input:not([hidden])");
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });
  function hideMsg() { document.getElementById("modalMsg").textContent = ""; }
  function setMsg(t) { document.getElementById("modalMsg").textContent = t; }
  function updateFoot() {
    var age = Gym.backupAgeDays(payload);
    var b = age === null ? "never backed up" : (age === 0 ? "backed up today" : "backed up " + age + "d ago");
    document.getElementById("modalFoot").textContent = "v" + Gym.CURRENT + " · " + (typeof GYM_VERSION === "string" ? GYM_VERSION : "dev") + " · " + Stats.sessionCount(payload) + " workouts · " + b;
    /* support line: the numbers that decide the Home-Screen layout — the app
       box, the reported viewport, the resolved safe-area insets, the mode */
    var sf = document.getElementById("screenFoot");
    if (sf) {
      var appBox = document.getElementById("app");
      var cs = getComputedStyle(appBox);
      var vp = window.innerHeight;
      var vv = window.visualViewport ? Math.round(window.visualViewport.height) : vp;
      var safeTop = Math.round(parseFloat(cs.paddingTop) - 12);
      var safeBot = Math.round(parseFloat(cs.paddingBottom) - 12);
      var mode = "browser";
      if ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
        /** @type {any} */ (window.navigator).standalone === true) mode = "standalone";
      sf.textContent = "Screen " + screen.width + "×" + screen.height +
        " · app " + Math.round(appBox.getBoundingClientRect().height) +
        " · vp " + vp + "/" + vv + " · safe " + safeTop + "/" + safeBot + " · " + mode;
    }
    menuBtn.classList.toggle("needs-backup", Gym.backupDue(payload));
    var snapBtn = document.getElementById("restoreSnapshot");
    if (snapBtn) {
      var snap = Gym.readSnapshot();
      if (!snap) {
        snapBtn.hidden = true;
        snapBtn.textContent = "Undo last reset / restore";
      } else {
        snapBtn.hidden = false;
        // name the snapshot: what it was and when it was taken (B3-20)
        var label = String(snap.label || "last change").replace(/^pre-/, "").replace(/-/g, " ");
        label = label.charAt(0).toUpperCase() + label.slice(1);
        var when = snap.at ? fmtDate(Gym.dateKey(new Date(snap.at))) : "";
        snapBtn.textContent = "Undo " + label + (when ? " (" + when + ")" : "");
      }
    }
    renderBw();
    renderDeload();
  }
  function exportWithFreshBackup() {
    Gym.markBackup(payload);
    var json = Gym.exportPayload(payload);
    commit(); updateFoot();
    if (view === "day") renderDay(); // clear overdue banner
    return json;
  }
  menuBtn.onclick = openModal;
  /* B5-04 */
  document.getElementById("backupBarSave").onclick = downloadBackup;
  document.getElementById("backupBarDismiss").onclick = function () { backupDismissed = true; backupMsg = ""; renderDay(); menuBtn.focus(); };
  document.getElementById("modalClose").onclick = closeModal;
  modal.addEventListener("click", function (ev) { if (ev.target === modal) closeModal(); });
  document.getElementById("exportCopy").onclick = function () {
    var json = exportWithFreshBackup();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function () { setMsg("Backup copied to clipboard ✓"); }, function () { setMsg("Copy blocked — use Download JSON"); });
    } else { downloadText(json, "gym-backup-" + Gym.dateKey() + ".json", "application/json"); setMsg("Backup downloaded ✓"); }
  };
  function downloadText(text, name, type) {
    var blob = new Blob([text], { type: type || "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function downloadBackup() {
    downloadText(exportWithFreshBackup(),"gym-backup-"+Gym.dateKey()+".json","application/json");
    setMsg("Backup downloaded ✓"); backupMsg = "Backup downloaded ✓"; renderDay();
  }
  document.getElementById("exportDownload").onclick = downloadBackup;
  document.getElementById("exportCsv").onclick = function () {
    downloadText(Stats.toCsv(payload, DAYS), "gym-" + Gym.dateKey() + ".csv", "text/csv");
    setMsg("CSV exported ✓");
  };
  function summaryText() {
    var sessions = Stats.sessionCount(payload), sets = Stats.setsRecorded(payload);
    var vol = Math.round(Stats.totalVolume(payload));
    return "Gym — " + sessions + " workouts · " + sets + " sets · " + vol + " lb tonnage";
  }
  document.getElementById("shareSummary").onclick = function () {
    var text = summaryText();
    if (navigator.share) {
      navigator.share({ title: "Gym", text: text }).then(function () { setMsg("Shared ✓"); }, function () { setMsg("Share cancelled"); });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { setMsg("Summary copied ✓"); }, function () { setMsg("Share not available"); });
    } else { setMsg("Share not available"); }
  }; /* shareSummary */

  /* Restore (replace) is destructive: arm it with the same two-tap guard as
     Reset day and Clear (B3-22); the second tap opens the picker. */
  var replaceBtn = document.getElementById("replaceBtn"), replaceFile = document.getElementById("replaceFile");
  /* the arm check compares function identity, so the action must be a stable
     reference — an inline literal would be a new function on every tap. */
  var openReplacePicker = function () { replaceFile.click(); };
  replaceBtn.onclick = function () { twoTap(this, "Tap again to replace", openReplacePicker); };
  /* Import is a plain button so the keyboard can reach the one recovery path
     a switch/keyboard user needs; it clicks the hidden file input. */
  document.getElementById("importBtn").onclick = function () { document.getElementById("importFile").click(); };
  /* Import size guard (B3-17): reject oversized files before reading them,
     so a multi-MB "backup" can never freeze the tab in readAsText/JSON.parse. */
  var MAX_IMPORT_SIZE = 5000000; // 5 MB
  function rejectOversized(ev) {
    setMsg("File too large — backups must be under 5 MB");
    ev.target.value = "";
  }
  function saveResult(snapOk) { return saveFailed ? " — NOT saved — storage full; export now" : " ✓" + (snapOk ? "" : " (no undo copy — storage full)"); }
  replaceFile.addEventListener("change", function (ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    if (f.size > MAX_IMPORT_SIZE) { rejectOversized(ev); return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var restored = Gym.reconcile(Gym.importRaw(String(reader.result)), DAYS);
        resetEdit(); timerIdle("", "");
        var snapOk = Gym.snapshot(payload, "pre-restore");
        payload = restored;
        Gym.rollSession(payload, Gym.todayDay());
        cur = payload.cur; idx = payload.idx;
        if (!DAYS[cur]) cur = "fri";
        if (idx >= DAYS[cur].ex.length) idx = 0;
        clearUndo(); view = "day";
        render(); syncClock(); commit(); updateFoot();
        setMsg((restored.salvaged ? "Recovered " + restored.salvaged.recovered + " entries from a damaged backup" : "Backup restored") + " — current data replaced" + saveResult(snapOk));
      } catch (e) { setMsg(/newer version/.test(e.message) ? "That backup is from a newer version of the app — reload the app, then try again" : "Restore failed — not a Gym backup"); }
    };
    reader.readAsText(f);
    ev.target.value = "";
  });
  document.getElementById("importFile").addEventListener("change", function (ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    if (f.size > MAX_IMPORT_SIZE) { rejectOversized(ev); return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var stats = { added: 0, collisions: 0 };
        var merged = Gym.importMerge(payload, String(reader.result), stats);
        resetEdit(); timerIdle("", "");
        var snapOk = Gym.snapshot(payload, "pre-merge");
        payload = Gym.reconcile(merged, DAYS); cur = payload.cur; idx = payload.idx;
        if (!DAYS[cur]) cur = "fri";
        if (idx >= DAYS[cur].ex.length) idx = 0;
        clearUndo(); view = "day";
        render(); syncClock(); commit(); updateFoot();
        setMsg((merged.salvaged ? "Recovered " + merged.salvaged.recovered + " entries from a damaged backup — " : "") + "Merged: +" + stats.added + " new sessions, " + stats.collisions + " same-date kept the fuller copy" + saveResult(snapOk));
      } catch (e) { setMsg(/newer version/.test(e.message) ? "That backup is from a newer version of the app — reload the app, then try again" : "Import failed — not a Gym backup"); }
    };
    reader.readAsText(f);
    ev.target.value = "";
  });

  /* ── rest-complete notifications (opt-in, best effort) ─────────────────── */
  var NOTIFY_KEY = "gym-notify";
  function notifyOn() { try { return localStorage.getItem(NOTIFY_KEY) === "1"; } catch (e) { return false; } }
  function notifyAllowed() { return "Notification" in window && !!window.Notification && window.Notification.permission === "granted"; }
  function renderNotify() { var b = document.getElementById("notifyToggle"); if (b) b.textContent = "Rest notifications: " + (notifyOn() && notifyAllowed() ? "On" : "Off"); }
  function initNotify() { if (notifyOn() && !notifyAllowed()) { try { localStorage.setItem(NOTIFY_KEY, "0"); } catch (e) {} } renderNotify(); }
  document.getElementById("notifyToggle").onclick = function () {
    if (notifyOn()) { try { localStorage.setItem(NOTIFY_KEY, "0"); } catch (e) {} renderNotify(); return; }
    if (!("Notification" in window)) { setMsg("Notifications are not supported here"); return; }
    try {
      Notification.requestPermission().then(function (perm) {
        try { localStorage.setItem(NOTIFY_KEY, perm === "granted" ? "1" : "0"); } catch (e) {}
        renderNotify();
        if (perm !== "granted") setMsg("Not enabled — change in Settings");
      });
    } catch (e) { setMsg("Notifications are not available"); }
  };
  document.getElementById("calibReset").onclick = function () {
    try { localStorage.removeItem(CALIB_KEY); } catch (e) {}
    renderCalib();
    setMsg("Clock learning reset — starter values until 3 new timed sessions.");
  };
  /* iOS rejects the Notification constructor — use the SW registration, with
     the constructor as fallback. The 10 s heads-up and GO share `gym-rest`
     (GO replaces it) and each closes after 30 s. Only while JS is alive; a
     tick >20 s past the rest's end stays silent. Full history: BACKLOG v204. */
  var restEndEst = 0, notifyCloseT = null;
  var NOTIFY_TTL_MS = 30000;
  function closeRestNotification(handle) {
    if (handle && handle.close) { try { handle.close(); } catch (e) {} return; }
    if (!navigator.serviceWorker || !navigator.serviceWorker.ready) return;
    navigator.serviceWorker.ready.then(function (reg) {
      if (!reg || !reg.getNotifications) return;
      return reg.getNotifications({ tag: "gym-rest" }).then(function (list) {
        var i;
        for (i = 0; i < list.length; i++) { try { list[i].close(); } catch (e) {} }
      });
    }).catch(function () {});
  }
  /* GO's timer replaces the heads-up's so the shared tag isn't closed early. */
  function scheduleNotifyClose(handle) {
    if (notifyCloseT) clearTimeout(notifyCloseT);
    notifyCloseT = setTimeout(function () {
      notifyCloseT = null;
      closeRestNotification(handle);
    }, NOTIFY_TTL_MS);
  }
  function notifyRestDone(kind) {
    if (!notifyOn() || !window.Notification || window.Notification.permission !== "granted" || !document.hidden) return;
    if (restEndEst && Date.now() - restEndEst > 20000) return;
    var title = kind === "prep" ? "Rest almost done — get ready" : "Rest done — GO";
    var opts = { body: restNextRaw || "Next set", tag: "gym-rest" };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (reg) {
        if (reg && reg.showNotification) {
          reg.showNotification(title, opts);
          scheduleNotifyClose();
        }
      }).catch(function () {});
      return;
    }
    try { scheduleNotifyClose(new Notification(title, opts)); } catch (e) {}
  }

  /* two-tap confirm for destructive menu actions */
  var armedFn = null, armedUntil = 0, armedBtn = null, armedT = null;
  function disarmTwoTap() {
    if (armedT) clearTimeout(armedT);
    armedT = null;
    if (armedBtn) armedBtn.textContent = armedBtn.getAttribute("data-label");
    armedFn = null; armedUntil = 0; armedBtn = null;
  }
  function twoTap(btn, confirmText, fn) {
    if (armedFn === fn && Date.now() < armedUntil) {
      disarmTwoTap(); fn(); btn.textContent = btn.getAttribute("data-label"); return;
    }
    /* arming a different button restores the previous one's label now (B5-10) */
    if (armedBtn && armedBtn !== btn) armedBtn.textContent = armedBtn.getAttribute("data-label");
    armedBtn = btn;
    armedFn = fn; armedUntil = Date.now() + 2600;
    if (!btn.getAttribute("data-label")) btn.setAttribute("data-label", btn.textContent);
    btn.textContent = confirmText;
    if (armedT) clearTimeout(armedT);
    armedT = setTimeout(function () {
      if (armedFn === fn) disarmTwoTap();
    }, 2600);
  }
  function doResetDay() {
    resetEdit(); timerIdle("", "");
    var snap = Gym.snapshot(payload, "pre-reset-day");
    Gym.resetDay(payload, cur); commit(); render(); updateFoot();
    setMsg("Day reset" + saveResult(snap));
  }
  function doClearAll() {
    resetEdit(); timerIdle("", "");
    var snap = Gym.snapshot(payload, "pre-clear");
    payload = Gym.emptyPayload(); cur = payload.cur; idx = 0; view = "day";
    clearUndo(); render(); syncClock(); commit(); updateFoot();
    setMsg("All training data cleared" + saveResult(snap));
  }
  document.getElementById("resetDay").onclick = function () { twoTap(this, "Tap again to reset today", doResetDay); };
  document.getElementById("clearAll").onclick = function () { twoTap(this, "Tap again to erase everything", doClearAll); };

  /* ── bodyweight + snapshot recovery ───────────────────────────────────── */
  /* N17: persist legal bodyweight values on every input event — a render or
     dismissed keypad can swallow `change`. Never clobber a focused field. */
  function saveBw(raw) {
    var v = parseFloat(raw);
    if (!(isFinite(v) && v >= 66 && v <= 700)) return false;
    v = Math.round(v * 10) / 10;
    if (payload.bodyweight === v && payload.bodyweightSet === true) return true;
    payload.bodyweight = v;
    payload.bodyweightSet = true;
    commit();
    return true;
  }
  function renderBw() {
    var inp = document.getElementById("bwInput");
    if (!inp || document.activeElement === inp) return;
    inp.value = String(payload && payload.bodyweight ? payload.bodyweight : 165);
  }
  /* B6-09: the deload controls only show the action that is available */
  function renderDeload() {
    var active = deloadActive(payload);
    var start = document.getElementById("deloadStart"), end = document.getElementById("deloadEnd");
    if (start) start.hidden = active;
    if (end) end.hidden = !active;
  }
  document.getElementById("deloadStart").onclick = function () {
    payload.deloadSince = Gym.dateKey();
    commit(); render(); updateFoot();
    setMsg("Deload week started — fewer sets, ~10% lighter.");
    var e = document.getElementById("deloadEnd"); if (e && e.getClientRects().length) e.focus();
  };
  document.getElementById("deloadEnd").onclick = function () {
    payload.deloadSince = null;
    commit(); render(); updateFoot();
    setMsg("Deload week ended — normal targets restored.");
    var s = document.getElementById("deloadStart"); if (s && s.getClientRects().length) s.focus();
  };
  var bwInput = document.getElementById("bwInput");
  bwInput.addEventListener("input", function () {
    if (saveBw(this.value)) setMsg("Bodyweight set to " + payload.bodyweight + " lb");
  });
  bwInput.addEventListener("change", function () {
    if (saveBw(this.value)) {
      render(); setMsg("Bodyweight set to " + payload.bodyweight + " lb");
    } else {
      /* still focused, so renderBw() would decline — restore in place */
      this.value = String(payload.bodyweight || 165);
      setMsg("Bodyweight must be 66–700 lb");
    }
  });
  document.getElementById("restoreSnapshot").onclick = function () {
    var snap = Gym.readSnapshot();
    if (!snap || !snap.payload) { setMsg("No snapshot saved yet."); return; }
    var restored = Gym.migrate(JSON.stringify(snap.payload));
    if (!restored || restored.__future) { setMsg("Snapshot is not readable."); return; }
    resetEdit(); timerIdle("", "");
    var snapOk = Gym.snapshot(payload, "pre-snapshot-restore");
    payload = Gym.reconcile(restored, DAYS);
    Gym.rollSession(payload, Gym.todayDay());
    cur = payload.cur; idx = payload.idx;
    if (!DAYS[cur]) cur = payload.active && payload.active.day ? payload.active.day : "fri";
    if (idx >= DAYS[cur].ex.length || idx < 0) idx = 0;
    clearUndo(); view = "day";
    render(); syncClock(); commit(); updateFoot();
    setMsg("Snapshot restored" + saveResult(snapOk));
  };

  /* corrupt payload → offer the quarantined bytes; newer-version payload →
     offer the preserved copy; failed save → export now */
  saveBarAction.onclick = function () {
    if (saveFailed) { openModal(); return; }   /* "Export" — the write is failing, not the load */
    if (dataWarn === "salvaged") {
      /* the recovered payload lives in memory only — save it explicitly */
      persistNow();
      if (saveFailed) { setMsg("Couldn't save — export now"); }
      else { dataWarn = null; saveBarMsg = "Recovered log kept ✓"; syncSaveBar(); var ft = menuBtn.getClientRects().length ? menuBtn : document.getElementById("skipRest"); if (ft && ft.getClientRects().length) ft.focus(); }
    } else if (dataWarn === "corrupt") {
      downloadText(Gym.quarantineRaw() || "", "gym-quarantine-" + Gym.dateKey() + ".json", "application/json");
    } else if (dataWarn === "future") {
      downloadText(Gym.futureRaw() || "", "gym-future-" + Gym.dateKey() + ".json", "application/json");
    } else {
      openModal();
    }
  };
  saveBarDownload.onclick = function () {
    downloadText(Gym.quarantineRaw() || "", "gym-quarantine-" + Gym.dateKey() + ".json", "application/json");
  };

  /* ── boot ──────────────────────────────────────────────────────────────── */
  /* Home-Screen mode on iOS can under-report the dynamic viewport height, so
     the app box ends above the real screen bottom (a strip of body shows).
     Pin the shell to window.innerHeight — the one height the engine always
     reports correctly — and keep it in step with rotation and the URL bar. */
  function syncViewportHeight() {
    var h = window.innerHeight;
    var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      /** @type {any} */ (window.navigator).standalone === true;
    /* Standalone paints to the physical screen edge (852 px on a 15 Pro), but
       the usable box is innerHeight (793 px); reserve the 59 px difference at
       the bottom so content clears the system chrome. safe-area alone lies. */
    var gap = 0;
    if (standalone && window.screen && window.screen.height > h && window.screen.height - h <= 200) {
      gap = window.screen.height - h;
      h = window.screen.height;
    }
    document.documentElement.style.setProperty("--app-h", h + "px");
    document.documentElement.style.setProperty("--app-b", gap + "px");
  }
  syncViewportHeight();
  window.addEventListener("resize", syncViewportHeight);
  window.addEventListener("orientationchange", syncViewportHeight);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", syncViewportHeight);
  initTheme();
  payload = Gym.reconcile(Gym.load(), DAYS);
  var loadErr = Gym.lastLoadError();
  if (loadErr && (loadErr.kind === "corrupt" || loadErr.kind === "future" || loadErr.kind === "salvaged")) dataWarn = loadErr.kind;
  /* a session from an earlier date is banked; today starts fresh but keeps loads */
  Gym.rollSession(payload, Gym.todayDay());
  cur = payload.cur; idx = payload.idx;
  if (!DAYS[cur]) cur = payload.active && payload.active.day ? payload.active.day : "fri";
  if (idx >= DAYS[cur].ex.length || idx < 0) idx = 0;
  sessBtn.title = "Workout timer — starts automatically on your first set";
  initNotify();
  updateFoot();
  /* resume a clock that was running before the reload */
  if (payload.active && payload.active.runningSince) {
    sInt = setInterval(tickSession, 500);
    keepAwake();
  }
  renderSessionPill();
  var swReg = null;
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("./sw.js").then(function (reg) { swReg = reg; }).catch(function () {});
  }
  render();
  if (dataWarn) syncSaveBar(); else commit();
})();
