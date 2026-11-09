/* ── Gym controller: DOM wiring + render. Logic lives in program/store/timer ─ */
(function () {
  "use strict";

  var DAYS = Gym.DAYS, fmt = Gym.fmt, esc = Gym.esc, dayMins = Gym.dayMins, dayMinsLeft = Gym.dayMinsLeft,
      getLift = Gym.getLift, suggestLoad = Gym.suggestLoad, stallLoad = Gym.stallLoad,
      progressMetric = Gym.progressMetric,
      firstOpenLift = Gym.firstOpenLift, restDuration = Gym.restDuration,
      sessionElapsed = Gym.sessionElapsed, Machine = Gym, Stats = Gym;

  var DAY_LABEL = { fri: "Fri", sat: "Sat", sun: "Sun" };
  var RIR_KEY = "gym-rir-seen";

  /* ── state ─────────────────────────────────────────────────────────────── */
  var payload, cur, idx, view = "day", hintText = "", hintGood = false;

  function st(d, i) { return getLift(payload.state, d, i, DAYS[d].ex[i]); }
  function ex() { return DAYS[cur].ex[idx]; }
  function curSt() { return st(cur, idx); }

  /* ── persistence: immediate by default, coalesced on the 70ms stepper path ──
     The whole payload is small, but writing it ~14×/s during a press-and-hold
     is waste. Steppers schedule a trailing save; everything else saves now.   */
  var saveTimer = null, saveDirty = false;
  function persistNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    payload.cur = cur; payload.idx = idx;
    Gym.save(payload);
    saveDirty = false;
  }
  /* flush only when there is something to lose — a clean page must never
     overwrite data that changed outside its in-memory copy (e.g. a restore). */
  function flushSave() { if (saveDirty || saveTimer) persistNow(); }
  function scheduleSave() {
    saveDirty = true;
    payload.cur = cur; payload.idx = idx;
    if (saveTimer) return;
    saveTimer = setTimeout(function () { saveTimer = null; payload.cur = cur; payload.idx = idx; Gym.save(payload); saveDirty = false; }, 250);
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
  function renderDay() {
    var list = DAYS[cur].ex, totalDone = 0, totalSets = 0, i;
    for (i = 0; i < list.length; i++) { totalDone += Math.min(st(cur, i).done, list[i].s); totalSets += list[i].s; }
    document.getElementById("dayTitle").textContent = DAYS[cur].label;
    document.getElementById("daySummary").textContent = (totalSets > 0 && totalDone >= totalSets)
      ? "Workout complete — nice work"
      : "8 lifts · " + totalSets + " sets · ~" + (totalDone > 0 ? dayMinsLeft(cur, payload.state) : dayMins(cur)) + " min" + (totalDone > 0 ? " left" : " total");

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
  function renderSuggest() {
    var line = document.getElementById("suggestLine"), txt = document.getElementById("suggestText"), applyBtn = document.getElementById("applyLoad");
    var pri = priorEntries();
    var last = pri.length ? pri[pri.length - 1] : null;
    var stall = stallLoad(ex(), pri);
    var su = suggestLoad(ex(), last);
    if (!su.last) { line.hidden = true; applyBtn.hidden = true; return; }
    var base = "Last " + (DAY_LABEL[cur] || "") + ": " + esc(su.last.load) + " × " + esc(su.last.reps) + " @" + esc(su.last.rir) + " RIR";
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
    var vals = entries.map(function (h) { return progressMetric(h.load, h.reps); });
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
  /* the set log: one row per prescribed set, completed sets checked, the next
     set highlighted — rows flex to fill the vertical space (as in Hevy/Strong) */
  function renderSetLog(e, s) {
    var rows = Math.max(e.s, s.done);
    var html = "";
    for (var i = 0; i < rows; i++) {
      var done = i < s.done;
      var rec = (done && s.sets && s.sets[i]) ? s.sets[i] : { load: s.load, reps: s.reps, rir: s.rir };
      var cls = "setrow" + (done ? " done" : (i === s.done ? " now" : ""));
      var mark = done ? "✓" : (i === s.done ? "●" : "");
      html += '<div class="' + cls + '">'
        + '<span class="sn">' + (i + 1) + '</span>'
        + '<span class="sr">' + loadLabel(rec.load, e) + " × " + rec.reps + '</span>'
        + '<span class="srir">@' + rec.rir + ' RIR</span>'
        + '<span class="smark" aria-hidden="true">' + mark + '</span>'
        + '</div>';
    }
    document.getElementById("setLog").innerHTML = html;
    var complete = s.done >= e.s;
    document.getElementById("setCount").textContent = complete
      ? "All " + e.s + " sets done"
      : "Set " + (s.done + 1) + " of " + e.s;
  }
  function renderLift() {
    var e = ex(), s = curSt(), list = DAYS[cur].ex;
    var anyDone = false;
    list.forEach(function (x, i) { if (st(cur, i).done > 0) anyDone = true; });
    document.getElementById("liftMeta").textContent = (DAY_LABEL[cur] || "") + " · Lift " + (idx + 1) + " of " + list.length + " · ~" + (anyDone ? dayMinsLeft(cur, payload.state) : dayMins(cur)) + " min";
    document.getElementById("exName").textContent = e.n;

    var rirTxt = (e.partial && s.done === e.s - 1) ? "0–1 RIR · last set" : s.rir + " RIR";
    var loadBig = e.load === null
      ? (s.load > 0 ? "Load <b>" + s.load + "</b>" : "start light")
      : (e.load === 0 ? "bodyweight" : "Load <b>" + s.load + "</b>");
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
      b.classList.toggle("active", s.rir === parseInt(b.getAttribute("data-rir"), 10));
    });

    var btn = document.getElementById("doneBtn");
    btn.classList.toggle("complete", complete);
    btn.textContent = complete ? "✓ Add extra set" : "Set Done";
    btn.setAttribute("aria-pressed", complete ? "true" : "false");
    btn.setAttribute("aria-label", complete ? "All sets done. Tap to add an extra set." : "Set Done");

    var hint = document.getElementById("hint");
    hint.textContent = hintText;
    hint.className = "hint" + (hintText ? " show" : "") + (hintGood ? " good" : "");

    setNavDisabled();
    renderSuggest();
    renderSpark();
  }
  /* ── progress view ─────────────────────────────────────────────────────── */
  function compactVol(v) { v = Math.round(v); return v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v); }
  function topMovers() {
    var out = [];
    Object.keys(payload.liftHistory || {}).forEach(function (k) {
      var arr = payload.liftHistory[k];
      if (!arr || arr.length < 2) return;
      var first = progressMetric(arr[0].load, arr[0].reps);
      var last = progressMetric(arr[arr.length - 1].load, arr[arr.length - 1].reps);
      var p = k.split(":"), d = p[0], i = parseInt(p[1], 10);
      var nm = DAYS[d] && DAYS[d].ex[i] ? DAYS[d].ex[i].n : k;
      out.push({ name: nm, delta: Math.round((last - first) * 10) / 10 });
    });
    out.sort(function (a, b) { return b.delta - a.delta; });
    return out.slice(0, 3);
  }
  function renderProgress() {
    var sessions = Stats.sessionCount(payload), sets = Stats.setsRecorded(payload), days = Stats.uniqueDays(payload);
    document.getElementById("pSessions").textContent = sessions;
    document.getElementById("pSets").textContent = sets;
    document.getElementById("pDays").textContent = days;
    var todayKey = Gym.dateKey();
    document.getElementById("pSub").textContent = sessions
      ? sessions + " sessions · " + compactVol(Stats.totalVolume(payload)) + " kg · "
        + Stats.sessionsLast7(payload, todayKey) + "/3 this week"
      : "No sessions yet — open a lift to begin";

    var byDay = Stats.volumeByDay(payload, DAYS);
    var max = Math.max(1, byDay.fri, byDay.sat, byDay.sun);
    var labels = { fri: "Friday", sat: "Saturday", sun: "Sunday" };
    var bars = "";
    ["fri", "sat", "sun"].forEach(function (d) {
      var v = byDay[d], pct = Math.round((v / max) * 100);
      bars += '<div class="pdayrow"><span class="pdname">' + labels[d] + '</span>'
        + '<span class="pdbar"><i style="width:' + pct + '%"></i></span>'
        + '<span class="pdval">' + (v ? compactVol(v) + " kg" : "—") + '</span></div>';
    });
    document.getElementById("pDayBars").innerHTML = bars;

    var recent = Stats.recentVolume(payload, 12), svg = document.getElementById("pSpark");
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
    var wow = Stats.weekOverWeek(payload, todayKey);
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

    var movers = topMovers();
    document.getElementById("pMovers").innerHTML = movers.length
      ? movers.map(function (m) {
          var sign = m.delta > 0 ? "+" : "";
          return '<li class="pmover"><span class="pmname">' + esc(m.name) + '</span>'
            + '<span class="pmdelta ' + (m.delta >= 0 ? "up" : "down") + '">' + sign + m.delta + '</span></li>';
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
  var rest = Machine.idle();
  var rInt = null;
  /* One object for the rest *orchestration*. These used to be ten loose
     module-level variables that together encoded a second, implicit state
     machine (idle → resting → go → advance-or-finish) around the pure clock
     in machine.js. Keeping them together makes the control flow auditable.  */
  var restCtx = {
    label: "", pending: false, pIdx: -1, pDay: "",
    note: "", nextText: "", msg: "", goAtMs: 0, finishUntil: 0, skipTimer: null
  };

  function blurRestNav() { if (document.activeElement === rPrevBtn || document.activeElement === rNextBtn) document.activeElement.blur(); }
  function resetPauseUi() { timerBar.classList.remove("paused"); pauseBtn.textContent = "Pause"; }
  function stopInterval() { if (rInt) { clearInterval(rInt); rInt = null; } }
  function startInterval() { stopInterval(); rInt = setInterval(tickRest, 200); }
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

  function timerIdle(label, msg) {
    if (timerBar.contains(document.activeElement)) document.activeElement.blur();
    stopInterval();
    rest = Machine.idle();
    timerBar.classList.remove("active", "go");
    appEl.classList.remove("resting");
    setRestDetails(false);
    restCtx.pending = false; restCtx.pIdx = -1; restCtx.pDay = "";
    restCtx.finishUntil = 0;
    resetPauseUi();
    skipBtn.textContent = "End rest";
    document.getElementById("restTime").textContent = "Rest";
    document.getElementById("restTime").removeAttribute("aria-label");
    document.getElementById("restLive").setAttribute("aria-live", "polite");
    document.getElementById("rbarFill").style.width = "0";
    document.getElementById("restNext").textContent = "";
    setRestLabel(label || "", msg || "Starts after Set Done");
    applyVisibility();
  }
  function renderRest() {
    var clock = document.getElementById("restTime"), now = Date.now();
    if (rest.phase === Machine.GO) {
      clock.textContent = "GO";
      clock.setAttribute("aria-label", "Rest complete — GO");
      document.getElementById("rbarFill").style.width = "100%";
      return;
    }
    var secs = Machine.remaining(rest, now);
    clock.textContent = fmt(secs);
    clock.setAttribute("aria-label", rest.phase === Machine.PAUSED ? "Rest paused — " + fmt(secs) + " remaining" : "Rest time remaining");
    document.getElementById("rbarFill").style.width = Math.round(Machine.progress(rest, now) * 100) + "%";
  }

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
  function finishRest() {
    stopInterval();
    rest = { phase: Machine.GO, endMs: 0, left: 0, total: rest.total };
    resetPauseUi();
    restCtx.goAtMs = Date.now();
    timerBar.classList.remove("paused");
    timerBar.classList.add("go");
    document.getElementById("restLive").setAttribute("aria-live", "assertive");
    var rn = document.getElementById("restNext");
    rn.textContent = rn.textContent.replace("Up next —", "Up now —");
    restCtx.finishUntil = 0;
    var adv = restCtx.pending && cur === restCtx.pDay && idx === restCtx.pIdx;
    skipBtn.textContent = adv ? (idx < DAYS[cur].ex.length - 1 ? "Next lift" : "Finish") : "Start next set";
    setRestLabel("GO", adv ? (idx < DAYS[cur].ex.length - 1 ? "Lift done — next up." : "Workout complete — nice work.") : "Next set — go.");
    renderRest();
    if (navigator.vibrate) navigator.vibrate(200);
    beepGo();
    notifyRestDone();
  }
  function tickRest() {
    rest = Machine.tick(rest, Date.now());
    if (rest.phase === Machine.GO) { finishRest(); return; }
    renderRest();
  }
  function startRest(sec, label, lastSet, note, nextText) {
    stopInterval();
    rest = Machine.start(sec, Date.now());
    restCtx.pending = !!lastSet;
    if (restCtx.pending && restCtx.pIdx < 0) { restCtx.pIdx = idx; restCtx.pDay = cur; }
    restCtx.note = note || ""; restCtx.nextText = nextText || "";
    document.getElementById("restNext").textContent = restCtx.nextText;
    document.getElementById("restTime").setAttribute("aria-label", "Rest time remaining");
    document.getElementById("restLive").setAttribute("aria-live", "polite");
    timerBar.classList.add("active"); timerBar.classList.remove("go");
    appEl.classList.add("resting");
    if (document.activeElement && !timerBar.contains(document.activeElement)) document.activeElement.blur();
    setRestDetails(false);
    resetPauseUi();
    restCtx.finishUntil = 0;
    skipBtn.textContent = "End rest";
    var msg = note === "partials"
      ? "Add bottom-half partials to failure — then rest."
      : "Stretch — set up the next set.";
    if (sec > ex().rest) msg = "+30s for 0–1 RIR · " + msg;
    restCtx.msg = msg;
    setRestLabel(label, msg);
    renderRest();
    applyVisibility();
    startInterval();
  }
  document.getElementById("plus15").onclick = function () {
    if (rest.phase === Machine.IDLE) return;
    if (rest.phase === Machine.GO) { startRest(15, restCtx.label, restCtx.pending, restCtx.note, restCtx.nextText); return; }
    timerBar.classList.remove("go");
    skipBtn.textContent = "End rest";
    rest = Machine.extend(rest, 15);
    if (rest.phase === Machine.ACTIVE) startInterval();
    renderRest();
  };
  pauseBtn.onclick = function () {
    if (rest.phase === Machine.PAUSED) {
      rest = Machine.resume(rest, Date.now());
      timerBar.classList.remove("paused");
      pauseBtn.textContent = "Pause";
      document.getElementById("restMsg").textContent = restCtx.msg;
      startInterval();
      renderRest();
      return;
    }
    if (rest.phase !== Machine.ACTIVE) return;
    rest = Machine.pause(rest, Date.now());
    stopInterval();
    timerBar.classList.add("paused");
    pauseBtn.textContent = "Resume";
    document.getElementById("restMsg").textContent = "Paused — tap Resume to continue.";
    renderRest();
  };
  /* at GO the whole timer surface is the advance button (guarded against the
     same tap that just finished the rest) */
  timerBar.addEventListener("click", function (ev) {
    if (!timerBar.classList.contains("go")) return;
    if (ev.target.closest("button")) return;
    if (Date.now() - restCtx.goAtMs < 400) return;
    skipBtn.click();
  });
  function clearUndo() { appEl.classList.remove("can-undo"); }
  skipBtn.onclick = function () {
    var wasGo = rest.phase === Machine.GO;
    stopInterval();
    var adv = restCtx.pending && cur === restCtx.pDay && idx === restCtx.pIdx && curSt().done >= ex().s;
    if (adv) {
      if (idx < DAYS[cur].ex.length - 1) {
        restCtx.pending = false;
        var next = firstOpenLift(cur, payload.state, idx + 1);
        idx = next >= 0 ? next : idx + 1;
        hintText = ""; hintGood = false; commit();
        timerIdle("", "Next lift — go."); render();
      } else {
        /* last lift done — require a second tap so a stray tap can't end the session */
        if (Date.now() > restCtx.finishUntil) {
          restCtx.finishUntil = Date.now() + 2500;
          skipBtn.textContent = "Tap again to finish";
          clearTimeout(restCtx.skipTimer);
          restCtx.skipTimer = setTimeout(function () {
            if (timerBar.classList.contains("go") && Date.now() >= restCtx.finishUntil) skipBtn.textContent = "Finish";
          }, 2600);
          return;
        }
        restCtx.pending = false; restCtx.finishUntil = 0;
        timerIdle("", "Workout complete — nice work.");
        clearUndo();
        if (sInt) { pauseSession(); sAutoStopped = true; }
      }
      return;
    }
    restCtx.pending = false;
    timerIdle("", wasGo ? "Next set — go." : "Skipped — next set, go.");
  };
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
      if (arr && arr.length && arr[arr.length - 1].date === Gym.dateKey()) arr.pop();
    }
    stopInterval();
    restCtx.pending = false;
    hintText = ""; hintGood = false;
    timerIdle("", "Set removed — back to set " + (s.done + 1) + ".");
    commit(); render();
  }
  undoBtn.onclick = undoSet;
  undoSetBtn.onclick = undoSet;

  /* ── session timer ─────────────────────────────────────────────────────── */
  var sSec = 0, sInt = null, sBase = 0, sStart = 0, sAutoStopped = false;
  function tickSession() {
    sSec = sessionElapsed(sBase, sStart, Date.now());
    var el = document.getElementById("elapsed");
    if (el) el.textContent = fmt(sSec);
    if (sSec > 0) sessBtn.classList.add("has-time");
  }
  function pauseSession() {
    tickSession();
    clearInterval(sInt); sInt = null; sBase = sSec;
    releaseAwake();
    sessBtn.classList.remove("on");
    sessBtn.innerHTML = "▶ <span class='startlbl'>Start</span><span id='elapsed'>" + fmt(sSec) + "</span>";
  }
  sessBtn.onclick = function () {
    if (sInt) { pauseSession(); sAutoStopped = false; return; }
    sAutoStopped = false;
    sessBtn.classList.add("on");
    sessBtn.innerHTML = "⏸ <span id='elapsed'>" + fmt(sSec) + "</span>";
    sStart = Date.now();
    sInt = setInterval(tickSession, 500);
    keepAwake();
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
      b.onclick = function () { curSt().rir = rv; hideRirHint(); commit(); render(); };
      rirRow.appendChild(b);
    })(ri);
  }

  /* ── steppers — tap once, press-and-hold repeats ───────────────────────── */
  function stepLoad(d) {
    var s = curSt();
    s.load = d < 0 ? Math.max(0, Math.round((s.load - ex().step) * 100) / 100) : Math.round((s.load + ex().step) * 100) / 100;
    scheduleSave(); render();
  }
  function stepReps(d) { var s = curSt(); s.reps = Math.max(1, s.reps + d); scheduleSave(); render(); }
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
      curSt().load = Math.max(0, Gym.round2(v)); commit(); render();
    });
  }
  function editReps() {
    editValue(document.getElementById("repVal"), curSt().reps, 1, function (v) {
      curSt().reps = Math.max(1, Math.round(v)); commit(); render();
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
    var e = ex(), s = curSt();
    var wasComplete = s.done >= e.s;
    /* capture the log *before* this set so the PR check compares against
       history, not against the set we are about to bank */
    var priorHist = Gym.series(payload, cur, idx);
    var prevBest = -Infinity, hi;
    for (hi = 0; hi < priorHist.length; hi++) {
      prevBest = Math.max(prevBest, progressMetric(priorHist[hi].load || 0, priorHist[hi].reps || 0));
    }

    s.sets = s.sets || [];
    s.sets.push({ load: s.load, reps: s.reps, rir: s.rir });
    s.done = s.sets.length;
    s.lastRir = s.rir;
    if (s.reps >= e.top && s.rir >= e.rir) s.topHits++;

    hintText = ""; hintGood = false;
    var finished = !wasComplete && s.done >= e.s;
    var restNote = "";
    var newMetric = progressMetric(s.load, s.reps);

    /* a PR beats the progression nudge — celebrate it first */
    if (priorHist.length && newMetric > prevBest) {
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

    if (finished) {
      Gym.pushHistory(payload, cur, idx, {
        date: Gym.dateKey(),
        load: s.load, reps: s.reps, rir: s.lastRir,
        hitTop: (s.reps >= e.top && s.lastRir >= e.rir),
        setsDone: s.done
      });
    }

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

    restCtx.pIdx = -1; restCtx.pDay = "";
    commit();
    startRest(restDuration(e.rest, s.rir), e.n + " — set " + Math.min(s.done, e.s) + " done", s.done >= e.s, restNote, nextText);

    ensureAudio();
    if (navigator.vibrate) navigator.vibrate(10);
    if (!sInt && (sSec === 0 || sAutoStopped)) sessBtn.click();
    keepAwake();
    render();
  };

  /* apply suggested load */
  var applyLoadBtn = document.getElementById("applyLoad");
  applyLoadBtn.onclick = function () {
    var v = parseFloat(applyLoadBtn.getAttribute("data-load"));
    if (!isNaN(v)) { curSt().load = v; commit(); render(); }
  };

  /* restart this lift: clear its sets, keep the working weight */
  resetLiftBtn.onclick = function () {
    Gym.resetLift(payload, cur, idx);
    hintText = ""; hintGood = false;
    commit(); render();
  };

  /* ── navigation ────────────────────────────────────────────────────────── */
  /* moving between lifts by hand cancels a pending "auto-advance", so the
     GO button can never jump somewhere the user did not choose.             */
  function cancelPendingAdvance() { if (rest.phase !== Machine.IDLE) restCtx.pending = false; }
  function showDay() { view = "day"; hintText = ""; hintGood = false; commit(); render(); }
  function showProgress() { view = "progress"; hintText = ""; hintGood = false; commit(); render(); }
  function openLift(i) {
    if (i < 0 || i >= DAYS[cur].ex.length) return;
    cancelPendingAdvance();
    idx = i; view = "lift"; hintText = ""; hintGood = false; commit(); render();
  }
  function navigateLift(delta) {
    var n = idx + delta;
    if (n < 0 || n >= DAYS[cur].ex.length) return;
    cancelPendingAdvance();
    idx = n; hintText = ""; hintGood = false; commit(); render();
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
      idx = 0; hintText = ""; hintGood = false; view = "day";
      clearUndo(); sAutoStopped = false;
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
    if (ev.key !== "Tab") return;
    var items = modal.querySelectorAll("button, label.modalbtn, input");
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
    document.getElementById("modalFoot").textContent = "v" + Gym.CURRENT + " · " + historyCount() + " sessions · " + b;
    menuBtn.classList.toggle("needs-backup", Gym.backupDue(payload));
  }
  function noteBackup() { Gym.markBackup(payload); commit(); updateFoot(); }
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
  function downloadBackup() {
    var json = Gym.exportPayload(payload);
    var blob = new Blob([json], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gym-backup-" + Gym.dateKey() + ".json";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    noteBackup();
    setMsg("Backup downloaded ✓");
  }
  document.getElementById("exportDownload").onclick = downloadBackup;
  document.getElementById("importFile").addEventListener("change", function (ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var merged = Gym.importMerge(payload, String(reader.result));
        payload = merged; cur = payload.cur; idx = payload.idx;
        if (!DAYS[cur]) cur = "fri";
        if (idx >= DAYS[cur].ex.length) idx = 0;
        clearUndo(); view = "day";
        render(); commit(); updateFoot();
        setMsg("Backup imported — history merged ✓");
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
    try { new Notification("Rest done — GO", { body: restCtx.nextText || "Next set", tag: "gym-rest" }); } catch (e) {}
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
  function doResetDay() { Gym.resetDay(payload, cur); commit(); render(); updateFoot(); setMsg("Day reset — sets cleared."); }
  function doClearAll() {
    payload = Gym.emptyPayload(); cur = payload.cur; idx = 0; view = "day";
    clearUndo(); commit(); render(); updateFoot(); setMsg("All training data cleared.");
  }
  document.getElementById("resetDay").onclick = function () { twoTap(this, "Tap again to reset today", doResetDay); };
  document.getElementById("clearAll").onclick = function () { twoTap(this, "Tap again to erase everything", doClearAll); };

  /* ── boot ──────────────────────────────────────────────────────────────── */
  initTheme();
  payload = Gym.load();
  cur = payload.cur; idx = payload.idx;
  if (!DAYS[cur]) cur = "fri";
  if (idx >= DAYS[cur].ex.length) idx = 0;
  showRirHintIfNew();
  initNotify();
  updateFoot();
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }
  render();
  commit();
})();
