/* ── Gym controller: DOM wiring + render. Logic lives in program/store/timer ─ */
(function () {
  "use strict";

  var DAYS = Gym.DAYS, fmt = Gym.fmt, esc = Gym.esc, dayMins = Gym.dayMins, dayMinsLeft = Gym.dayMinsLeft,
      getLift = Gym.getLift, suggestLoad = Gym.suggestLoad, stallLoad = Gym.stallLoad,
      planFor = Gym.planFor, progressMetric = Gym.progressMetric,
      firstOpenLift = Gym.firstOpenLift, restDuration = Gym.restDuration,
      Machine = Gym, Stats = Gym, Rest = Gym;
  var DAY_LIFTS = { fri: DAYS.fri.ex.length, sat: DAYS.sat.ex.length, sun: DAYS.sun.ex.length };
  var DAY_LABEL = { fri: "Fri", sat: "Sat", sun: "Sun" };
  var RIR_KEY = "gym-rir-seen";

  /* ── state ─────────────────────────────────────────────────────────────── */
  var payload, cur, idx, view = "day", hintText = "", hintGood = false, planMsg = "";

  function st(d, i) { return getLift(payload.state, d, i, DAYS[d].ex[i]); }
  function ex() { return DAYS[cur].ex[idx]; }
  function curSt() { return st(cur, idx); }

  /* bodyweight-aware metric: total system weight, so adding a plate to a dip
     always moves the number up. */
  function metricFor(e, load, reps) {
    return progressMetric(load, reps, { bw: !!(e && e.bw), bodyweight: payload && payload.bodyweight });
  }
  /* bodyweight work is valued at the weight in force when that session was
     banked, so editing today's weight never rewrites past PRs. */
  function bwFor(entry) {
    return entry && typeof entry.bwKg === "number" && isFinite(entry.bwKg) && entry.bwKg > 0
      ? entry.bwKg
      : (payload && payload.bodyweight);
  }
  function metricForEntry(e, entry, load, reps) {
    return progressMetric(load, reps, { bw: !!(e && e.bw), bodyweight: bwFor(entry) });
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
    if (!s.sets || !s.sets.length || s.done < e.s) return;
    var top = topSetOf(e, s.sets) || s.sets[s.sets.length - 1];
    var hit = false;
    for (var j = 0; j < s.sets.length; j++) {
      if (s.sets[j].reps >= e.top && s.sets[j].rir >= e.rir) hit = true;
    }
    var entry = {
      date: Gym.sessionDate(payload), load: top.load, reps: top.reps, rir: top.rir,
      hitTop: hit, setsDone: s.sets.length,
      sets: s.sets.map(function (x) { return { load: x.load, reps: x.reps, rir: x.rir }; }),
      bw: !!e.bw, exId: e.id
    };
    if (e.bw && payload && typeof payload.bodyweight === "number" && payload.bodyweight > 0) entry.bwKg = payload.bodyweight;
    Gym.upsertHistory(payload, d, i, entry);
  }

  /* ── persistence: immediate by default, coalesced on the 70ms stepper path ──
     The whole payload is small, but writing it ~14×/s during a press-and-hold
     is waste. Steppers schedule a trailing save; everything else saves now.   */
  var saveTimer = null, saveDirty = false, saveFailed = false, dataWarn = null;
  function syncSaveBar() {
    if (!saveBar) return;
    if (dataWarn === "corrupt") {
      saveBar.hidden = false;
      saveBarText.textContent = "Couldn't read saved data — original copy kept";
      saveBarAction.hidden = false;
      saveBarAction.textContent = "Download copy";
    } else if (dataWarn === "future") {
      saveBar.hidden = false;
      saveBarText.textContent = "Saved data is from a newer version — showing an empty log; original copy kept";
      saveBarAction.hidden = false;
      saveBarAction.textContent = "Download copy";
    } else if (saveFailed || dataWarn === "save") {
      saveBar.hidden = false;
      saveBarText.textContent = "Couldn't save — storage may be full";
      saveBarAction.hidden = false;
      saveBarAction.textContent = "Export";
    } else {
      saveBar.hidden = true;
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

  /* ── element refs ──────────────────────────────────────────────────────── */
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
  var rPrevBtn = document.getElementById("rPrevBtn");
  var rNextBtn = document.getElementById("rNextBtn");
  var sessBtn = document.getElementById("sessBtn");
  var rirRow = document.getElementById("rirRow");
  var rirHint = document.getElementById("rirHint");
  var menuBtn = document.getElementById("menuBtn");
  var modal = document.getElementById("modal");
  var undoSetBtn = document.getElementById("undoSetBtn");
  var resetLiftBtn = document.getElementById("resetLiftBtn");
  var backupBar = document.getElementById("backupBar");
  var backupBarText = document.getElementById("backupBarText");
  var backupDismissed = false;
  var saveBar = document.getElementById("saveBar");
  var saveBarText = document.getElementById("saveBarText");
  var saveBarAction = document.getElementById("saveBarAction");
  var weekStrip = document.getElementById("weekStrip");
  var summary = document.getElementById("summary");
  var editSet = -1, editBackup = null;

  /* ── theme ─────────────────────────────────────────────────────────────── */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "light" ? "#f4f6f8" : "#0b0e12");
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
  function syncDays() {
    document.querySelectorAll(".day").forEach(function (b) {
      var on = b.getAttribute("data-day") === cur;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function setNavDisabled() {
    var first = idx === 0, last = idx === DAYS[cur].ex.length - 1;
    document.getElementById("prevLift").disabled = first;
    document.getElementById("nextLift").disabled = last;
    rPrevBtn.disabled = first;
    rNextBtn.disabled = last;
  }
  function renderWeekStrip() {
    if (!weekStrip) return;
    var status = Stats.weekStatus(payload, Gym.dateKey(), DAY_LIFTS);
    weekStrip.innerHTML = status.map(function (d) {
      var lbl = DAY_LABEL[d.day] || d.day;
      var mark = d.state === "done" ? "✓" : d.state === "partial" ? "·" : d.state === "missed" ? "—" : "";
      return '<span class="wk ' + d.state + '" title="' + esc(lbl + " " + d.date + " · " + d.state) + '">'
        + '<b>' + esc(lbl) + '</b><i>' + mark + '</i></span>';
    }).join("");
  }
  function renderDay() {
    var list = DAYS[cur].ex, totalDone = 0, totalSets = 0, i, hasHist = false;
    for (i = 0; i < list.length; i++) {
      totalDone += Math.min(st(cur, i).done, list[i].s); totalSets += list[i].s;
      if (!hasHist && Gym.series(payload, cur, i).length) hasHist = true;
    }
    var complete = firstOpenLift(cur, payload.state, 0) === -1;
    document.getElementById("dayTitle").textContent = DAYS[cur].label;
    var summary = complete
      ? "Workout complete — nice work"
      : list.length + " lifts · " + totalSets + " sets · ~" + (totalDone > 0 ? dayMinsLeft(cur, payload.state) : dayMins(cur)) + " min" + (totalDone > 0 ? " left" : " total");
    if (!Gym.actualDay()) {
      var gap = Gym.daysUntil(Gym.todayDay());
      summary = "Off day · next " + (DAY_LABEL[Gym.todayDay()] || "session") + (gap > 0 ? " in " + gap + "d" : "") + " · " + summary;
    }
    if (planMsg) summary += " · " + planMsg;
    document.getElementById("daySummary").textContent = summary;
    document.getElementById("planBtn").hidden = !hasHist || complete;
    renderWeekStrip();

    var firstOpen = firstOpenLift(cur, payload.state, 0);
    var contBtn = document.getElementById("continueBtn");
    if (contBtn) {
      contBtn.hidden = complete || firstOpen < 0 || totalDone === 0;
      contBtn.textContent = "Continue · Lift " + (firstOpen + 1);
    }
    var finBtn = document.getElementById("finishBtn");
    if (finBtn) {
      finBtn.hidden = !complete || (payload.active && payload.active.status === "complete");
      finBtn.textContent = "Finish workout";
    }

    var rows = "";
    list.forEach(function (e, i) {
      var s = st(cur, i), done = s.done >= e.s;
      var loadTxt = e.load === null ? (s.load > 0 ? "Load " + s.load : "start light")
        : e.load === 0 ? "bodyweight" : "Load " + s.load;
      var restTxt = fmt(e.rest + (s.rir <= 1 ? 30 : 0));
      rows += '<li class="liftrow' + (done ? " done" : "") + (i === idx ? " now" : "") + '" data-i="' + i + '" role="button" tabindex="0">'
        + '<span class="liftstatus">' + (done ? "✓" : "") + '</span>'
        + '<span class="liftmain"><span class="liftname">' + esc(e.n) + '</span>'
        + '<span class="liftmeta">' + e.s + '×' + e.r + (e.top > e.r ? "–" + e.top : "") + ' · ' + loadTxt + ' · ' + restTxt + ' rest</span></span>'
        + '<span class="chev">›</span></li>';
    });
    liftList.innerHTML = rows;

    var segs = "";
    list.forEach(function (e, i) {
      var s = st(cur, i);
      var pct = Math.max(0, Math.min(1, s.done / e.s));
      segs += '<span class="pseg"><i style="width:' + (pct * 100) + '%"></i></span>';
    });
    document.getElementById("progressSegs").innerHTML = segs;

    /* assertive backup nudge: localStorage is one Safari cleanup from gone */
    var due = !backupDismissed && Gym.backupDue(payload);
    backupBar.hidden = !due;
    if (due) {
      var age = Gym.backupAgeDays(payload);
      backupBarText.textContent = age === null
        ? "Never backed up — this log lives only on this phone"
        : "Backup " + age + " day" + (age === 1 ? "" : "s") + " old — keep your log safe";
    }
  }

  /* history entries *before* this session. If the current lift is already
     complete, the newest entry is this session, so skip it. */
  function priorEntries() {
    var entries = Gym.series(payload, cur, idx);
    var s = curSt();
    var skip = (s.done >= ex().s && entries.length > 0) ? 1 : 0;
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
    if (!su || !su.last) { el.hidden = true; return; }
    var e = ex(), txt;
    if (su.last.sets && su.last.sets.length) {
      txt = su.last.sets.map(function (st) { return loadLabel(st.load, e) + "×" + st.reps; }).join(" · ");
    } else {
      txt = loadLabel(su.last.load, e) + "×" + su.last.reps + " × " + (su.last.setsDone || 1) + " sets";
    }
    el.textContent = "Prev: " + txt;
    el.hidden = false;
  }
  function renderSuggest() {
    var line = document.getElementById("suggestLine"), txt = document.getElementById("suggestText"), applyBtn = document.getElementById("applyLoad");
    var pri = priorEntries();
    var last = pri.length ? pri[pri.length - 1] : null;
    var stall = stallLoad(ex(), pri);
    var su = suggestLoad(ex(), last);
    renderPrev(su);
    if (!su.last) { line.hidden = true; applyBtn.hidden = true; return; }
    var when = fmtDate(su.last.date) || DAY_LABEL[cur] || "";
    var base = "Last " + when + ": " + esc(su.last.load) + " × " + esc(su.last.reps) + " @" + esc(su.last.rir) + " RIR";
    if (stall) {
      /* a plateau — double progression can't help, so recommend the deload */
      txt.innerHTML = base + " · 3 sessions stalled → deload to <b>" + esc(stall.load) + "</b>";
      applyBtn.hidden = false;
      applyBtn.setAttribute("data-load", String(stall.load));
    } else if (su.hitTop && su.suggest !== su.last.load) {
      txt.innerHTML = base + " (hit top) → try <b>" + esc(su.suggest) + "</b>";
      applyBtn.hidden = false;
      applyBtn.setAttribute("data-load", String(su.suggest));
    } else {
      txt.textContent = base + " → keep " + su.last.load;
      applyBtn.hidden = true;
    }
    line.hidden = false;
  }
  function renderSpark() {
    var entries = Gym.series(payload, cur, idx, 12);
    var wrap = document.getElementById("sparkWrap"), svg = document.getElementById("sparkline");
    var toggle = document.getElementById("trendToggle");
    var has = entries.length >= 2;
    if (toggle) toggle.hidden = !has;
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
  function loadLabel(load, e) {
    if (e.load === null) return load > 0 ? String(load) : "light";
    if (e.load === 0) return load > 0 ? "BW+" + load : "BW";
    return load > 0 ? String(load) : "—";
  }
  /* weight-only display (header, rest prep): always names the imperial unit */
  function loadText(load, e) {
    var t = loadLabel(load, e);
    return (t === "light" || t === "BW" || t === "—") ? t : t + " lb";
  }
  /* the set log: one row per prescribed set, completed sets checked, the next
     set highlighted — rows flex to fill the vertical space (as in Hevy/Strong) */
  function renderSetLog(e, s) {
    var rows = Math.max(e.s, s.done);
    var html = "";
    for (var i = 0; i < rows; i++) {
      var done = i < s.done;
      var rec = (done && s.sets && s.sets[i]) ? s.sets[i] : { load: s.load, reps: s.reps, rir: s.rir };
      var cls = "setrow" + (done ? " done" : (i === s.done ? " now" : ""))
        + (i === editSet ? " editing" : "");
      var mark = done ? "✓" : (i === s.done ? "●" : "");
      html += '<div class="' + cls + '"' + (done ? ' data-set="' + i + '" role="button" tabindex="0"' : "") + '>'
        + '<span class="sn">' + (i + 1) + '</span>'
        + '<span class="sr">' + loadLabel(rec.load, e) + " × " + rec.reps + '</span>'
        + '<span class="srir">@' + rec.rir + ' RIR</span>'
        + '<span class="smark" aria-hidden="true">' + mark + '</span>'
        + '</div>';
    }
    document.getElementById("setLog").innerHTML = html;
    var complete = s.done >= e.s;
    document.getElementById("setCount").textContent = editSet >= 0
      ? "Editing set " + (editSet + 1) + " — tap Done"
      : complete ? "All " + e.s + " sets done" : "Set " + (s.done + 1) + " of " + e.s;
  }
  function renderLift() {
    var e = ex(), s = curSt(), list = DAYS[cur].ex;
    var anyDone = false;
    list.forEach(function (x, i) { if (st(cur, i).done > 0) anyDone = true; });
    document.getElementById("liftMeta").textContent = (DAY_LABEL[cur] || "") + " · Lift " + (idx + 1) + " of " + list.length + " · ~" + (anyDone ? dayMinsLeft(cur, payload.state) : dayMins(cur)) + " min";
    document.getElementById("exName").textContent = e.n;

    var rirTxt = (e.partial && s.done === e.s - 1) ? "0–1 RIR · last set" : s.rir + " RIR";
    var loadBig = e.load === null
      ? (s.load > 0 ? "Load <b>" + s.load + "</b> lb" : "start light")
      : (e.load === 0 ? "bodyweight" : "Load <b>" + s.load + "</b> lb");
    var effRest = e.rest + (s.rir <= 1 ? 30 : 0);
    document.getElementById("exPres").innerHTML =
      "<span class='big'><b>" + s.reps + (e.top > s.reps ? "–" + e.top : "") + "</b> reps · " + loadBig + "</span>"
      + "<span class='small'>" + rirTxt + " · Rest " + fmt(effRest) + "</span>";
    document.getElementById("exCue").textContent = e.cue;
    document.getElementById("tempoLine").style.display = idx === 0 ? "" : "none";

    var complete = s.done >= e.s;
    renderSetLog(e, s);

    document.getElementById("loadVal").textContent = (e.load === null && s.load === 0) ? "—" : s.load;
    document.getElementById("repVal").textContent = s.reps;
    rirRow.querySelectorAll(".rir").forEach(function (b) {
      var on = s.rir === parseInt(b.getAttribute("data-rir"), 10);
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false"); // the fill is invisible to a screen reader
    });

    var btn = document.getElementById("doneBtn");
    btn.classList.toggle("complete", complete);
    btn.textContent = editSet >= 0 ? "Done editing" : complete ? "✓ Add extra set" : "Set Done";
    btn.removeAttribute("aria-pressed");
    btn.setAttribute("aria-label", editSet >= 0 ? "Finish editing this set" : complete ? "All sets done. Tap to add an extra set." : "Set Done");

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
    ["fri", "sat", "sun"].forEach(function (d) {
      var v = byDay[d], pct = Math.round((v / max) * 100);
      bars += '<div class="pdayrow"><span class="pdname">' + labels[d] + '</span>'
        + '<span class="pdbar"><i style="width:' + pct + '%"></i></span>'
        + '<span class="pdval">' + (v ? Stats.compactVol(v) + " lb" : "—") + '</span></div>';
    });
    document.getElementById("pDayBars").innerHTML = bars;

    document.getElementById("heatmap").innerHTML = snap.weeks.map(function (w) {
      return '<span class="hweek">' + ["fri", "sat", "sun"].map(function (d) {
        return '<i class="hday' + (w[d] ? " on" : "") + '"></i>';
      }).join("") + "</span>";
    }).join("");
    document.getElementById("pHeatCount").textContent = snap.heatCount + "/" + snap.heatTotal;

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
    document.getElementById("pPr").textContent = pr ? "PR " + pr.name + " · " + Math.round(pr.metric) + " lb" : "";

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
    syncDays();
    applyVisibility();
    if (view === "day") renderDay();
    else if (view === "progress") renderProgress();
    else renderLift();
    syncUndo();
  }

  /* ── rest timer (timestamp-based: honest even if the phone sleeps) ─────── */
  /* The rest *orchestration* lives in restctl.js; this shell applies the
     effects it returns and paints its view model. `rInt` drives the 200 ms
     ticks and `rArmT` is the 2,600 ms two-tap finish window.                 */
  var rInt = null, rArmT = null, restNextRaw = "";

  function blurRestNav() { if (document.activeElement === rPrevBtn || document.activeElement === rNextBtn) document.activeElement.blur(); }
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
    sets: function () { return ex().s; },
    exRest: function () { return ex().rest; },
    editSet: function () { return editSet; },
    firstOpen: function (from) { return firstOpenLift(cur, payload.state, from); },
    elapsed: function () { return Gym.sessionElapsedSec(payload); },
    prep: function () {
      var e = ex(), s = curSt();
      return { name: "Set " + (s.done + 1) + " of " + e.s, load: loadText(s.load, e), reps: String(s.reps) };
    }
  });
  /* apply the controller's effect list in order, then paint its view */
  function apply(out) {
    var fx = out.effects, i, e;
    for (i = 0; i < fx.length; i++) {
      e = fx[i];
      if (e.type === "beep") beepGo();
      else if (e.type === "vibrate") { if (navigator.vibrate) navigator.vibrate(e.ms); }
      else if (e.type === "notify") notifyRestDone();
      else if (e.type === "advanceTo") { idx = e.idx; hintText = ""; hintGood = false; }
      else if (e.type === "finishWorkout") { clearUndo(); finishWorkout(); }
      else if (e.type === "commit") commit();
      else if (e.type === "render") render();
      else if (e.type === "scheduleFinishReset") {
        if (rArmT) clearTimeout(rArmT);
        rArmT = setTimeout(function () {
          renderRestView(restCtl.finishReset().view);
        }, e.ms);
      }
      else if (e.type === "clearSchedule") { if (rArmT) { clearTimeout(rArmT); rArmT = null; } }
      else if (e.type === "closeDetails") setRestDetails(false);
      else if (e.type === "blurIfOutside") { if (document.activeElement && !timerBar.contains(document.activeElement)) document.activeElement.blur(); }
    }
    renderRestView(out.view);
  }
  /* one paint routine for every phase — idle, GO and the running clock */
  function renderRestView(v) {
    syncRestInterval(v);
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
    restElapsedEl.hidden = false;
  }
  function setRestLabel(t, m) {
    document.getElementById("restLabel").textContent = t;
    document.getElementById("restMsg").textContent = m;
  }
  function setRestDetails(open) {
    if (open) blurRestNav();
    appEl.classList.toggle("show-details", !!open);
    detailsBtn.textContent = detailsBtn.getAttribute(open ? "data-hide" : "data-show");
    detailsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    applyVisibility();
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
  /* compact next-set controls on the rest screen — 60% of the session is
     spent here, so preparing the next set should not require leaving it. */
  function renderRestPrep(v) {
    var prep = document.getElementById("restPrep");
    if (!prep) return;
    prep.hidden = !v.showPrep;
    if (!v.showPrep) return;
    document.getElementById("restPrepName").textContent = v.prepName;
    document.getElementById("restPrepLoad").textContent = v.prepLoad;
    document.getElementById("restPrepReps").textContent = v.prepReps;
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
  /* undo always acts on the lift you are looking at, so the change is visible */
  function undoSet() {
    var s = curSt();
    if (s.done <= 0) return;
    var wasComplete = s.done >= ex().s;
    s.done--;
    if (s.sets && s.sets.length > s.done) s.sets.length = s.done;
    if (s.done <= 0) { s.topHits = 0; s.lastRir = null; }
    if (wasComplete && s.done < ex().s) {
      var arr = payload.liftHistory && payload.liftHistory[cur + ":" + idx];
      if (arr && arr.length && arr[arr.length - 1].date === Gym.sessionDate(payload)) arr.pop();
    } else if (s.done >= ex().s) {
      /* undoing an extra set leaves the lift complete: re-bank the shorter
         array so Prev/tonnage/PRs/CSV don't keep the removed set */
      bankLift(cur, idx);
    }
    stopInterval();
    hintText = ""; hintGood = false;
    timerIdle("", "Set removed — back to set " + (s.done + 1) + ".");
    commit(); render();
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
    var secs = sessionSecs(), t = fmt(secs);
    if (sInt) {
      sessBtn.classList.add("on");
      sessBtn.innerHTML = "⏸ <span id='elapsed'>" + t + "</span>";
    } else {
      /* "Start" only when nothing has elapsed yet — a paused clock is being
         resumed, not restarted, and the pill must not imply otherwise.      */
      sessBtn.classList.remove("on");
      sessBtn.innerHTML = "▶ <span class='startlbl'>" + (secs > 0 ? "Resume" : "Start") + "</span><span id='elapsed'>" + t + "</span>";
    }
    sessBtn.classList.toggle("has-time", secs > 0);
    sessBtn.setAttribute("aria-label", sInt ? "Pause workout timer" : (secs > 0 ? "Resume workout timer" : "Start workout timer"));
  }
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
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && sInt) keepAwake();
  });

  /* ── RIR picker — built once, with a one-time explainer ────────────────── */
  function showRirHintIfNew() {
    try { if (!localStorage.getItem(RIR_KEY)) rirHint.hidden = false; } catch (e) {}
  }
  function hideRirHint() {
    rirHint.hidden = true;
    try { localStorage.setItem(RIR_KEY, "1"); } catch (e) {}
  }
  for (var ri = 0; ri <= 4; ri++) {
    (function (rv) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "rir"; b.textContent = String(rv); b.setAttribute("data-rir", String(rv));
      b.setAttribute("aria-label", "RIR " + rv);
      b.onclick = function () {
        curSt().rir = rv;
        if (editSet >= 0) applySetEdit();
        hideRirHint(); commit(); render(); renderRestPrep(restCtl.view());
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
      /* the edited set vanished (undo shrank the log): put the working values
         back so the next set does not inherit the stale set's numbers. */
      if (editBackup) { s.load = editBackup.load; s.reps = editBackup.reps; s.rir = editBackup.rir; }
      editSet = -1; editBackup = null;
      return;
    }
    s.sets[editSet] = { load: s.load, reps: s.reps, rir: s.rir };
    if (s.done >= e.s) bankLift(cur, idx);
  }
  /** Enter inline edit for a completed set, snapshotting the working values. */
  function startEdit(i) {
    var s = curSt();
    if (!s.sets || !s.sets[i]) return;
    if (editSet !== i) editBackup = { load: s.load, reps: s.reps, rir: s.rir };
    editSet = i;
    s.load = s.sets[i].load; s.reps = s.sets[i].reps; s.rir = s.sets[i].rir;
    hintText = ""; hintGood = false;
    render();
  }
  /** Apply the edited set, then restore the working load/reps/RIR. */
  function finishEdit() {
    var s = curSt();
    if (editSet < 0) return;
    applySetEdit();
    if (editBackup) { s.load = editBackup.load; s.reps = editBackup.reps; s.rir = editBackup.rir; }
    editSet = -1; editBackup = null;
    hintText = ""; hintGood = false;
    commit(); render();
  }
  /* Upper bounds for direct input (B3-18): absurd typed/held values would
     otherwise poison 1RM, tonnage, suggestions and the CSV export. */
  var MAX_LOAD = 2000, MAX_REPS = 999;
  function clampLoad(v) { return Math.min(MAX_LOAD, Math.max(0, v)); }
  function clampReps(v) { return Math.min(MAX_REPS, Math.max(1, v)); }
  function stepLoad(d) {
    var s = curSt();
    s.load = clampLoad(d < 0 ? Math.max(0, Math.round((s.load - ex().step) * 100) / 100) : Math.round((s.load + ex().step) * 100) / 100);
    if (editSet >= 0) applySetEdit();
    scheduleSave(); render(); renderRestPrep(restCtl.view());
  }
  function stepReps(d) {
    var s = curSt();
    s.reps = clampReps(s.reps + d);
    if (editSet >= 0) applySetEdit();
    scheduleSave(); render(); renderRestPrep(restCtl.view());
  }
  function bindStepper(id, fn) {
    var b = document.getElementById(id), delay = null, rep = null, held = false;
    function stop() {
      if (delay) { clearTimeout(delay); delay = null; }
      if (rep) { clearInterval(rep); rep = null; }
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
  bindStepper("restLoadDown", function () { stepLoad(-1); });
  bindStepper("restLoadUp", function () { stepLoad(1); });
  bindStepper("restRepDown", function () { stepReps(-1); });
  bindStepper("restRepUp", function () { stepReps(1); });

  /* tap the number to type it — correcting "actually 67.5" shouldn't need
     five taps or a sprint on the press-and-hold repeat. The +/- stay for
     fine nudging; typing is for precision.                                  */
  var editingValue = false;
  function editValue(valueEl, current, step, apply) {
    if (editingValue) return;
    editingValue = true;
    var mid = valueEl.parentNode;
    var inp = document.createElement("input");
    inp.type = "number"; inp.inputMode = "decimal"; inp.step = String(step);
    inp.className = "vin"; inp.value = String(current);
    inp.setAttribute("aria-label", "Enter value");
    valueEl.style.display = "none";
    mid.appendChild(inp);
    inp.focus(); inp.select();
    function finish(commit) {
      if (!editingValue) return;
      editingValue = false;
      var v = parseFloat(inp.value);
      inp.remove();
      valueEl.style.display = "";
      if (commit && isFinite(v)) apply(v);
      else render();
    }
    inp.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
      else if (ev.key === "Escape") { ev.preventDefault(); finish(false); }
    });
    inp.addEventListener("blur", function () { finish(true); });
  }
  function editLoad() {
    editValue(document.getElementById("loadVal"), curSt().load, ex().step, function (v) {
      curSt().load = clampLoad(Gym.round2(v)); if (editSet >= 0) applySetEdit(); commit(); render(); renderRestPrep(restCtl.view());
    });
  }
  function editReps() {
    editValue(document.getElementById("repVal"), curSt().reps, 1, function (v) {
      curSt().reps = clampReps(Math.round(v)); if (editSet >= 0) applySetEdit(); commit(); render(); renderRestPrep(restCtl.view());
    });
  }
  document.getElementById("loadVal").parentNode.addEventListener("click", editLoad);
  document.getElementById("repVal").parentNode.addEventListener("click", editReps);

  /* trend sparkline is opt-in — reclaims vertical space on short phones */
  document.getElementById("trendToggle").onclick = function () {
    appEl.classList.toggle("show-trend");
    renderSpark();
  };

  /* ── set done ──────────────────────────────────────────────────────────── */
  document.getElementById("doneBtn").onclick = function () {
    if (editSet >= 0) { finishEdit(); return; }
    var e = ex(), s = curSt();
    if (s.done >= Gym.SETS_MAX) {
      hintText = "Set limit reached — " + Gym.SETS_MAX + " per lift.";
      hintGood = false;
      render();
      return;
    }
    var wasComplete = s.done >= e.s;
    /* capture the log *before* this set so the PR check compares against
       history, not against the set we are about to bank */
    var priorHist = priorEntries();
    var prevBest = -Infinity, hi, hj, topEntry;
    for (hi = 0; hi < priorHist.length; hi++) {
      topEntry = topSetOf(e, Stats.entrySets(priorHist[hi]), priorHist[hi]);
      if (topEntry) prevBest = Math.max(prevBest, metricForEntry(e, priorHist[hi], topEntry.load || 0, topEntry.reps || 0));
      else prevBest = Math.max(prevBest, metricForEntry(e, priorHist[hi], priorHist[hi].load || 0, priorHist[hi].reps || 0));
    }

    s.sets = s.sets || [];
    s.sets.push({ load: s.load, reps: s.reps, rir: s.rir });
    s.done = s.sets.length;
    s.lastRir = s.rir;
    if (s.reps >= e.top && s.rir >= e.rir) s.topHits++;

    hintText = ""; hintGood = false;
    var finished = !wasComplete && s.done >= e.s;
    var restNote = "";
    var newMetric = metricFor(e, s.load, s.reps);

    /* a PR beats the progression nudge — celebrate it first */
    if (prevBest > -Infinity && newMetric > prevBest) {
      hintText = "New PR — " + (s.load > 0
        ? loadLabel(s.load, e) + " × " + s.reps + " (est. 1RM " + Math.round(newMetric) + ")"
        : s.reps + " reps");
      hintGood = true;
    }

    if (finished && e.partial && s.lastRir <= 1) {
      restNote = "partials";
    } else if (!hintText && finished && s.topHits >= 1 && s.reps >= e.top && s.lastRir >= e.rir) {
      hintText = e.n + ": top reps at target RIR — do it again next session to add weight.";
      hintGood = true;
    }

    /* the set array is the truth: bank it on completion and on every extra set */
    bankLift(cur, idx);

    var list = DAYS[cur].ex, nextText = "";
    if (s.done >= e.s) {
      var nx = list[idx + 1];
      var nxLoad = !nx ? "" : nx.load === null
        ? (st(cur, idx + 1).load > 0 ? " · Load " + st(cur, idx + 1).load : " · start light")
        : nx.load === 0 ? " · bodyweight" : " · Load " + st(cur, idx + 1).load;
      nextText = nx ? "Up next — " + nx.n + " · " + nx.s + " × " + nx.r + (nx.top > nx.r ? "–" + nx.top : "") + nxLoad : "Last lift done — workout complete";
    } else {
      nextText = "Up next — Set " + (s.done + 1) + " of " + e.s + " · " + s.reps + " reps" +
        (e.load === null ? (s.load > 0 ? " · load " + s.load : " · start light") : (e.load === 0 ? " · bodyweight" : " · load " + s.load));
    }

    commit();
    restNextRaw = nextText;
    apply(restCtl.start(restDuration(e.rest, s.rir), e.n + " — set " + Math.min(s.done, e.s) + " done", s.done >= e.s, restNote, nextText, hintText));

    ensureAudio();
    if (navigator.vibrate) navigator.vibrate(10);
    if (!sInt) startSessionTimer();
    keepAwake();
    render();
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
    Gym.snapshot(payload, "pre-restart-lift");
    Gym.resetLift(payload, cur, idx);
    editSet = -1; editBackup = null;
    hintText = ""; hintGood = false;
    commit(); render();
  }
  resetLiftBtn.onclick = function () { twoTap(this, "Tap again to restart", doRestartLift); };

  /* plan the whole day: pre-fill each not-yet-started lift from its history */
  document.getElementById("planBtn").onclick = function () {
    var list = DAYS[cur].ex, up = 0, down = 0, keep = 0, manual = 0;
    list.forEach(function (e, i) {
      var s = st(cur, i);
      if (s.done > 0) return; // never overwrite an in-progress lift
      var dflt = e.load === null ? 0 : (e.load || 0);
      if (s.load !== dflt) { manual++; return; } // an explicit load (or an earlier plan) wins
      var p = planFor(e, Gym.series(payload, cur, i));
      if (p.action === "none") return;
      if (p.action === "up") up++;
      else if (p.action === "deload") down++;
      else keep++;
      if (p.load != null) s.load = p.load;
    });
    planMsg = (up || down)
      ? "Planned +" + up + (down ? " · deload " + down : "")
      : (manual > 0 ? "Planned · kept your loads" : "Planned · all keep");
    commit(); render();
  };

  /* ── finish workout + one-screen summary ───────────────────────────────── */
  function nextTrainingGap() {
    var order = ["fri", "sat", "sun"], orderDow = { fri: 5, sat: 6, sun: 0 };
    var now = new Date(), dow = now.getDay(), t = Gym.actualDay();
    var day;
    if (!t) day = Gym.todayDay();
    else {
      var i = order.indexOf(t);
      day = order[(i + 1) % 3];
    }
    var gap = (orderDow[day] - dow + 7) % 7;
    if (gap === 0) gap = 7;
    return { day: day, gap: gap };
  }
  var sumFocus = null;
  function showSummary(entry) {
    if (!summary) return;
    sumFocus = document.activeElement;
    var list = DAYS[cur].ex, sets = 0, i;
    for (i = 0; i < list.length; i++) sets += Math.min(st(cur, i).done, list[i].s);
    var vol = Math.round((Stats.volumeByDay(payload, DAYS) || {})[cur] || 0);
    /* the session's own date, not the wall clock: a workout that started
       before midnight banks its PRs on the day it began (B3-11).          */
    var sessionDay = Gym.sessionDate(payload);
    var prs = Stats.personalRecords(payload, DAYS, progressMetric).filter(function (p) { return p.date === sessionDay; }).length;
    var dur = entry && typeof entry.durationSec === "number" ? entry.durationSec : Gym.sessionElapsedSec(payload);
    document.getElementById("sumTitle").textContent = (DAY_LABEL[cur] || "") + " workout complete";
    document.getElementById("sumDuration").textContent = dur ? fmt(dur) : "—";
    document.getElementById("sumSets").textContent = String(sets);
    document.getElementById("sumVol").textContent = Stats.compactVol(vol) + " lb";
    document.getElementById("sumPrs").textContent = prs ? prs + " new" : "—";
    var nx = nextTrainingGap();
    var txt = "Next " + (DAY_LABEL[nx.day] || "session") + (nx.gap > 0 ? " in " + nx.gap + "d" : "");
    if (Gym.backupDue(payload)) txt += " · Back up tonight";
    document.getElementById("sumNext").textContent = txt;
    summary.hidden = false;
    var b = document.getElementById("sumDone");
    if (b) b.focus();
  }
  function finishWorkout() {
    if (sInt) pauseSession();
    var entry = Gym.finalizeSession(payload);
    commit();
    render();
    showSummary(entry);
  }
  document.getElementById("finishBtn").onclick = finishWorkout;
  document.getElementById("continueBtn").onclick = function () {
    var first = firstOpenLift(cur, payload.state, 0);
    if (first >= 0) openLift(first);
  };
  /* the summary is a modal dialog like the menu: put focus back where it was
     when it closes, so a keyboard user does not land in the page body. */
  function closeSummary() {
    /* move focus before hiding: hiding the dialog first makes the browser
       bounce the focused node to <body>, which would clobber the restore.   */
    var back = sumFocus;
    sumFocus = null;
    if (back && document.contains(back) && back.getClientRects().length && typeof back.focus === "function") back.focus();
    /* some openers (or <body>) cannot take focus; fall back to the header */
    if (document.activeElement !== back && menuBtn && menuBtn.getClientRects().length) menuBtn.focus();
    summary.hidden = true;
  }
  document.getElementById("sumDone").onclick = function () {
    closeSummary();
    render();
  };
  document.getElementById("sumClose").onclick = function () {
    closeSummary();
    render();
  };
  summary.addEventListener("click", function (ev) { if (ev.target === summary) closeSummary(); });
  summary.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { closeSummary(); return; }
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
    var s = curSt();
    if (editBackup && s) { s.load = editBackup.load; s.reps = editBackup.reps; s.rir = editBackup.rir; }
    editSet = -1; editBackup = null;
  }
  function showDay() {
    var left = idx;
    resetEdit(); view = "day"; hintText = ""; hintGood = false; commit(); render();
    /* focus back to the row the user just left — otherwise Tab restarts from
       the top of the document (the element they were on is now hidden).     */
    var row = liftList.querySelector('.liftrow[data-i="' + left + '"]');
    if (row) row.focus();
  }
  function showProgress() {
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
  rPrevBtn.onclick = function () { navigateLift(-1); };
  rNextBtn.onclick = function () { navigateLift(1); };
  document.querySelectorAll(".day").forEach(function (b) {
    b.onclick = function () {
      cur = b.getAttribute("data-day");
      idx = 0; hintText = ""; hintGood = false; view = "day"; planMsg = "";
      resetEdit(); clearUndo();
      var open = firstOpenLift(cur, payload.state, 0);
      idx = open >= 0 ? open : 0;
      commit(); render();
    };
  });

  /* ── backup modal (export / import) + focus management ─────────────────── */
  var lastFocus = null;
  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false; hideMsg(); updateFoot(); initNotify();
    var first = modal.querySelector(".modalbtn, .modalclose");
    if (first) first.focus();
  }
  function closeModal() {
    modal.hidden = true;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    lastFocus = null;
  }
  modal.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { closeModal(); return; }
    if (ev.key !== "Tab") return;
    var items = modal.querySelectorAll("button, label.modalbtn, input:not([hidden])");
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });
  function hideMsg() { document.getElementById("modalMsg").textContent = ""; }
  function setMsg(t) { document.getElementById("modalMsg").textContent = t; }
  function historyCount() {
    var n = 0; for (var k in payload.liftHistory) { if (payload.liftHistory.hasOwnProperty(k)) n += payload.liftHistory[k].length; }
    return n;
  }
  function updateFoot() {
    var age = Gym.backupAgeDays(payload);
    var b = age === null ? "never backed up" : (age === 0 ? "backed up today" : "backed up " + age + "d ago");
    document.getElementById("modalFoot").textContent = "v" + Gym.CURRENT + " · " + Stats.sessionCount(payload) + " workouts · " + b;
    menuBtn.classList.toggle("needs-backup", Gym.backupDue(payload));
    var snapBtn = document.getElementById("restoreSnapshot");
    if (snapBtn) snapBtn.hidden = !Gym.readSnapshot();
    renderBw();
  }
  function noteBackup() {
    Gym.markBackup(payload); commit(); updateFoot();
    if (view === "day") renderDay(); // clear the overdue banner immediately
  }
  menuBtn.onclick = openModal;
  document.getElementById("backupBarSave").onclick = openModal;
  document.getElementById("backupBarDismiss").onclick = function () { backupDismissed = true; renderDay(); };
  document.getElementById("modalClose").onclick = closeModal;
  modal.addEventListener("click", function (ev) { if (ev.target === modal) closeModal(); });
  document.getElementById("exportCopy").onclick = function () {
    var json = Gym.exportPayload(payload);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function () { noteBackup(); setMsg("Backup copied to clipboard ✓"); }, function () { setMsg("Copy blocked — use Download JSON"); });
    } else { downloadBackup(); }
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
    downloadText(Gym.exportPayload(payload), "gym-backup-" + Gym.dateKey() + ".json", "application/json");
    noteBackup();
    setMsg("Backup downloaded ✓");
  }
  document.getElementById("exportDownload").onclick = downloadBackup;
  document.getElementById("exportCsv").onclick = function () {
    downloadText(Stats.toCsv(payload, DAYS), "gym-" + Gym.dateKey() + ".csv", "text/csv");
    setMsg("CSV exported ✓");
  };
  function summaryText() {
    var sessions = Stats.sessionCount(payload), sets = Stats.setsRecorded(payload);
    var days = Stats.uniqueDays(payload), vol = Math.round(Stats.totalVolume(payload));
    return "Gym — " + sessions + " workouts · " + sets + " sets · " + days + " training days · " + vol + " lb tonnage";
  }
  document.getElementById("shareSummary").onclick = function () {
    var text = summaryText();
    if (navigator.share) {
      navigator.share({ title: "Gym", text: text }).then(function () { setMsg("Shared ✓"); }, function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { setMsg("Summary copied ✓"); }, function () { setMsg("Share not available"); });
    } else { setMsg("Share not available"); }
  };
  /* Restore (replace) is destructive: arm it with a second tap before the picker. */
  var replaceArmedUntil = 0, replaceBtn = document.getElementById("replaceBtn"), replaceFile = document.getElementById("replaceFile");
  replaceBtn.onclick = function () {
    if (Date.now() >= replaceArmedUntil) {
      replaceArmedUntil = Date.now() + 2500;
      replaceBtn.textContent = "Tap again to replace";
      setTimeout(function () {
        if (Date.now() >= replaceArmedUntil) replaceBtn.textContent = "Restore (replace)";
      }, 2600);
      return;
    }
    replaceArmedUntil = 0;
    replaceBtn.textContent = "Restore (replace)";
    replaceFile.click();
  };
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
  replaceFile.addEventListener("change", function (ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    if (f.size > MAX_IMPORT_SIZE) { rejectOversized(ev); return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var snapOk = Gym.snapshot(payload, "pre-restore");
        payload = Gym.reconcile(Gym.importRaw(String(reader.result)), DAYS);
        cur = payload.cur; idx = payload.idx;
        if (!DAYS[cur]) cur = "fri";
        if (idx >= DAYS[cur].ex.length) idx = 0;
        clearUndo(); view = "day";
        render(); commit(); updateFoot();
        setMsg("Backup restored — current data replaced ✓" + (snapOk ? "" : " (no undo copy — storage full)"));
      } catch (e) { setMsg("Restore failed — not a Gym backup"); }
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
        var snapOk = Gym.snapshot(payload, "pre-merge");
        var stats = { added: 0, collisions: 0 };
        var merged = Gym.importMerge(payload, String(reader.result), stats);
        payload = Gym.reconcile(merged, DAYS); cur = payload.cur; idx = payload.idx;
        if (!DAYS[cur]) cur = "fri";
        if (idx >= DAYS[cur].ex.length) idx = 0;
        clearUndo(); view = "day";
        render(); commit(); updateFoot();
        setMsg("Merged: +" + stats.added + " new sessions, " + stats.collisions + " same-date kept the fuller copy ✓" + (snapOk ? "" : " (no undo copy — storage full)"));
      } catch (e) { setMsg("Import failed — not a Gym backup"); }
    };
    reader.readAsText(f);
    ev.target.value = "";
  });

  /* ── rest-complete notifications (opt-in, best effort) ─────────────────── */
  var NOTIFY_KEY = "gym-notify";
  function notifyOn() { try { return localStorage.getItem(NOTIFY_KEY) === "1"; } catch (e) { return false; } }
  function renderNotify() {
    var b = document.getElementById("notifyToggle");
    if (b) b.textContent = "Rest notifications: " + (notifyOn() ? "On" : "Off");
  }
  function initNotify() { renderNotify(); }
  document.getElementById("notifyToggle").onclick = function () {
    if (notifyOn()) { try { localStorage.setItem(NOTIFY_KEY, "0"); } catch (e) {} renderNotify(); return; }
    if (!("Notification" in window)) { setMsg("Notifications are not supported here"); return; }
    try {
      Notification.requestPermission().then(function (perm) {
        try { localStorage.setItem(NOTIFY_KEY, perm === "granted" ? "1" : "0"); } catch (e) {}
        renderNotify();
        if (perm !== "granted") setMsg("Permission denied — enable in Settings");
      });
    } catch (e) { setMsg("Notifications are not available"); }
  };
  function notifyRestDone() {
    if (!notifyOn() || !("Notification" in window)) return;
    if (Notification.permission !== "granted" || !document.hidden) return;
    try { new Notification("Rest done — GO", { body: restNextRaw || "Next set", tag: "gym-rest" }); } catch (e) {}
  }

  /* two-tap confirm for destructive menu actions */
  var armedFn = null, armedUntil = 0;
  function twoTap(btn, confirmText, fn) {
    if (armedFn === fn && Date.now() < armedUntil) {
      armedFn = null; armedUntil = 0; fn(); btn.textContent = btn.getAttribute("data-label"); return;
    }
    armedFn = fn; armedUntil = Date.now() + 2500;
    if (!btn.getAttribute("data-label")) btn.setAttribute("data-label", btn.textContent);
    btn.textContent = confirmText;
    setTimeout(function () {
      if (armedFn === fn) { armedFn = null; armedUntil = 0; btn.textContent = btn.getAttribute("data-label"); }
    }, 2600);
  }
  function doResetDay() {
    var snap = Gym.snapshot(payload, "pre-reset-day");
    Gym.resetDay(payload, cur); commit(); render(); updateFoot();
    setMsg(snap ? "Day reset — sets cleared." : "Day reset — no undo copy (storage full).");
  }
  function doClearAll() {
    var snap = Gym.snapshot(payload, "pre-clear");
    payload = Gym.emptyPayload(); cur = payload.cur; idx = 0; view = "day";
    clearUndo(); resetEdit(); commit(); render(); updateFoot();
    setMsg(snap ? "All training data cleared." : "All training data cleared — no undo copy (storage full).");
  }
  document.getElementById("resetDay").onclick = function () { twoTap(this, "Tap again to reset today", doResetDay); };
  document.getElementById("clearAll").onclick = function () { twoTap(this, "Tap again to erase everything", doClearAll); };

  /* ── bodyweight + snapshot recovery ───────────────────────────────────── */
  function renderBw() {
    var inp = document.getElementById("bwInput");
    if (inp) inp.value = String(payload && payload.bodyweight ? payload.bodyweight : 165);
  }
  document.getElementById("bwInput").addEventListener("change", function () {
    var v = parseFloat(this.value);
    if (isFinite(v) && v >= 66 && v <= 700) {
      payload.bodyweight = Math.round(v * 10) / 10;
      commit(); render(); setMsg("Bodyweight set to " + payload.bodyweight + " lb");
    } else {
      renderBw(); setMsg("Bodyweight must be 66–700 lb");
    }
  });
  document.getElementById("restoreSnapshot").onclick = function () {
    var snap = Gym.readSnapshot();
    if (!snap || !snap.payload) { setMsg("No snapshot saved yet."); return; }
    var restored = Gym.migrate(JSON.stringify(snap.payload));
    if (!restored || restored.__future) { setMsg("Snapshot is not readable."); return; }
    var snapOk = Gym.snapshot(payload, "pre-snapshot-restore");
    payload = Gym.reconcile(restored, DAYS);
    cur = payload.cur; idx = payload.idx;
    if (!DAYS[cur]) cur = payload.active && payload.active.day ? payload.active.day : "fri";
    if (idx >= DAYS[cur].ex.length || idx < 0) idx = 0;
    clearUndo(); resetEdit(); view = "day";
    commit(); render(); updateFoot();
    setMsg(snapOk ? "Snapshot restored ✓" : "Snapshot restored ✓ — no undo copy (storage full)");
  };

  /* corrupt payload → offer the quarantined bytes; newer-version payload →
     offer the preserved copy; failed save → export now */
  saveBarAction.onclick = function () {
    if (dataWarn === "corrupt") {
      downloadText(Gym.quarantineRaw() || "", "gym-quarantine-" + Gym.dateKey() + ".json", "application/json");
    } else if (dataWarn === "future") {
      downloadText(Gym.futureRaw() || "", "gym-future-" + Gym.dateKey() + ".json", "application/json");
    } else {
      openModal();
    }
  };

  /* ── boot ──────────────────────────────────────────────────────────────── */
  initTheme();
  payload = Gym.reconcile(Gym.load(), DAYS);
  var loadErr = Gym.lastLoadError();
  if (loadErr && (loadErr.kind === "corrupt" || loadErr.kind === "future")) dataWarn = loadErr.kind;
  /* a session from an earlier date is banked; today starts fresh but keeps loads */
  Gym.rollSession(payload, Gym.todayDay());
  cur = payload.cur; idx = payload.idx;
  if (!DAYS[cur]) cur = payload.active && payload.active.day ? payload.active.day : "fri";
  if (idx >= DAYS[cur].ex.length || idx < 0) idx = 0;
  sessBtn.title = "Workout timer — starts automatically on your first set";
  showRirHintIfNew();
  initNotify();
  updateFoot();
  /* resume a clock that was running before the reload */
  if (payload.active && payload.active.runningSince) {
    sInt = setInterval(tickSession, 500);
    keepAwake();
  }
  renderSessionPill();
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }
  render();
  if (dataWarn) syncSaveBar(); else commit();
})();
