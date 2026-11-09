/* ── Gym controller: DOM wiring + render. Logic lives in program/store/timer ─ */
(function () {
  "use strict";

  var DAYS = Gym.DAYS, fmt = Gym.fmt, esc = Gym.esc, dayMins = Gym.dayMins, dayMinsLeft = Gym.dayMinsLeft,
      getLift = Gym.getLift, suggestLoad = Gym.suggestLoad, progressMetric = Gym.progressMetric,
      restDuration = Gym.restDuration, remainingSeconds = Gym.remainingSeconds,
      resumeEndMs = Gym.resumeEndMs, extendEndMs = Gym.extendEndMs, sessionElapsed = Gym.sessionElapsed;

  var DAY_LABEL = { fri: "Fri", sat: "Sat", sun: "Sun" };
  var RIR_KEY = "gym-rir-seen";

  /* ── state ─────────────────────────────────────────────────────────────── */
  var payload, cur, idx, view = "day", hintText = "", hintGood = false;

  function st(d, i) { return getLift(payload.state, d, i, DAYS[d].ex[i]); }
  function ex() { return DAYS[cur].ex[idx]; }
  function curSt() { return st(cur, idx); }
  function commit() { payload.cur = cur; payload.idx = idx; Gym.save(payload); }

  /* ── element refs ──────────────────────────────────────────────────────── */
  var appEl = document.getElementById("app");
  var header = document.getElementById("header");
  var dayView = document.getElementById("dayView");
  var liftView = document.getElementById("liftView");
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
    dayView.style.display = (showCurrent && view === "day") ? "flex" : "none";
    liftView.style.display = (showCurrent && view === "lift") ? "flex" : "none";
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
  }

  /* previous-session entry for the suggestion. If the current lift is already
     complete, the newest history entry is *this* session, so skip it. */
  function prevForSuggest() {
    var entries = Gym.series(payload, cur, idx);
    var s = curSt();
    var skip = (s.done >= ex().s && entries.length > 0) ? 1 : 0;
    var i = entries.length - 1 - skip;
    return i >= 0 ? entries[i] : null;
  }
  function renderSuggest() {
    var line = document.getElementById("suggestLine"), txt = document.getElementById("suggestText"), applyBtn = document.getElementById("applyLoad");
    var su = suggestLoad(ex(), prevForSuggest());
    if (!su.last) { line.hidden = true; applyBtn.hidden = true; return; }
    var base = "Last " + (DAY_LABEL[cur] || "") + ": " + su.last.load + " × " + su.last.reps + " @" + su.last.rir + " RIR";
    if (su.hitTop && su.suggest !== su.last.load) {
      txt.innerHTML = base + " (hit top) → try <b>" + su.suggest + "</b>";
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
    if (entries.length < 2) { wrap.hidden = true; return; }
    var vals = entries.map(function (h) { return progressMetric(h.load, h.reps); });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = (max - min) || 1;
    var W = 120, H = 28, pad = 2, n = vals.length, d = "";
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? 0 : (i / (n - 1)) * W;
      var y = H - pad - ((vals[i] - min) / span) * (H - 2 * pad);
      d += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    svg.innerHTML = '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    wrap.hidden = false;
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
    btn.textContent = complete ? "✓ Done — tap for extra set" : "Set Done";

    var hint = document.getElementById("hint");
    hint.textContent = hintText;
    hint.className = "hint" + (hintText ? " show" : "") + (hintGood ? " good" : "");

    setNavDisabled();
    renderSuggest();
    renderSpark();
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
    if (view === "day") renderDay(); else renderLift();
    syncUndo();
  }

  /* ── rest timer (timestamp-based: honest even if the phone sleeps) ─────── */
  var rLeft = 0, rInt = null, rEnd = 0, rTotal = 0, rLabel = "", pendingNext = false, pendingIdx = -1,
      pendingDay = "", rPaused = false, rNote = "", rNextText = "", rMsg = "", goAt = 0, finishArmedUntil = 0, skipResetId = null;

  function blurRestNav() { if (document.activeElement === rPrevBtn || document.activeElement === rNextBtn) document.activeElement.blur(); }
  function resetPause() { rPaused = false; timerBar.classList.remove("paused"); pauseBtn.textContent = "Pause"; }
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
    timerBar.classList.remove("active", "go");
    appEl.classList.remove("resting");
    setRestDetails(false);
    pendingIdx = -1; pendingDay = "";
    finishArmedUntil = 0;
    resetPause();
    skipBtn.textContent = "End rest";
    document.getElementById("restTime").textContent = "Rest";
    document.getElementById("restTime").removeAttribute("aria-label");
    document.getElementById("rbarFill").style.width = "0";
    document.getElementById("restNext").textContent = "";
    setRestLabel(label || "", msg || "Starts after Set Done");
    applyVisibility();
  }
  function updateRbar() {
    var f = rTotal > 0 ? 1 - (rLeft / rTotal) : 0;
    document.getElementById("rbarFill").style.width = Math.max(0, Math.min(100, f * 100)) + "%";
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
    clearInterval(rInt); rInt = null; rLeft = 0;
    resetPause();
    goAt = Date.now();
    document.getElementById("restTime").textContent = "GO";
    document.getElementById("restTime").setAttribute("aria-label", "Rest complete — GO");
    document.getElementById("rbarFill").style.width = "100%";
    var rn = document.getElementById("restNext");
    rn.textContent = rn.textContent.replace("Up next —", "Up now —");
    timerBar.classList.add("go");
    finishArmedUntil = 0;
    var adv = pendingNext && cur === pendingDay && idx === pendingIdx;
    skipBtn.textContent = adv ? (idx < DAYS[cur].ex.length - 1 ? "Next lift" : "Finish") : "Start next set";
    setRestLabel("GO", adv ? (idx < DAYS[cur].ex.length - 1 ? "Lift done — next up." : "Workout complete — nice work.") : "Next set — go.");
    if (navigator.vibrate) navigator.vibrate(200);
    beepGo();
  }
  function tickRest() {
    rLeft = remainingSeconds(rEnd, Date.now());
    document.getElementById("restTime").textContent = fmt(rLeft);
    updateRbar();
    if (rLeft <= 0) finishRest();
  }
  function startRest(sec, label, lastSet, note, nextText) {
    clearInterval(rInt); rTotal = sec; rEnd = Date.now() + sec * 1000; rLeft = sec; rLabel = label; pendingNext = !!lastSet;
    if (pendingNext && pendingIdx < 0) { pendingIdx = idx; pendingDay = cur; }
    rNote = note || ""; rNextText = nextText || "";
    document.getElementById("restNext").textContent = rNextText;
    document.getElementById("restTime").setAttribute("aria-label", "Rest time remaining");
    timerBar.classList.add("active"); timerBar.classList.remove("go");
    appEl.classList.add("resting");
    if (document.activeElement && !timerBar.contains(document.activeElement)) document.activeElement.blur();
    setRestDetails(false);
    resetPause();
    finishArmedUntil = 0;
    skipBtn.textContent = "End rest";
    document.getElementById("restTime").textContent = fmt(rLeft);
    updateRbar();
    var msg = note === "partials"
      ? "Add bottom-half partials to failure — then rest."
      : "Stretch — set up the next set.";
    if (sec > ex().rest) msg = "+30s for 0–1 RIR · " + msg;
    rMsg = msg;
    setRestLabel(label, msg);
    applyVisibility();
    rInt = setInterval(tickRest, 200);
  }
  document.getElementById("plus15").onclick = function () {
    if (!timerBar.classList.contains("active")) return;
    if (!rInt && !rPaused && rLeft <= 0) { startRest(15, rLabel, pendingNext, rNote, rNextText); return; }
    timerBar.classList.remove("go");
    skipBtn.textContent = "End rest";
    if (rPaused) {
      rLeft += 15; rTotal += 15;
      document.getElementById("restTime").textContent = fmt(rLeft);
      updateRbar();
      return;
    }
    rEnd = extendEndMs(rEnd, 15); rTotal += 15; tickRest();
  };
  pauseBtn.onclick = function () {
    if (!timerBar.classList.contains("active") || timerBar.classList.contains("go")) return;
    if (rPaused) {
      rPaused = false;
      timerBar.classList.remove("paused");
      pauseBtn.textContent = "Pause";
      rEnd = resumeEndMs(Date.now(), rLeft);
      rInt = setInterval(tickRest, 200);
      document.getElementById("restMsg").textContent = rMsg;
      document.getElementById("restTime").setAttribute("aria-label", "Rest time remaining");
      tickRest();
      return;
    }
    if (!rInt) return;
    rLeft = remainingSeconds(rEnd, Date.now());
    clearInterval(rInt); rInt = null;
    rPaused = true;
    timerBar.classList.add("paused");
    pauseBtn.textContent = "Resume";
    document.getElementById("restTime").textContent = fmt(rLeft);
    document.getElementById("restTime").setAttribute("aria-label", "Rest paused — " + fmt(rLeft) + " remaining");
    document.getElementById("restMsg").textContent = "Paused — tap Resume to continue.";
    updateRbar();
  };
  /* at GO the whole timer surface is the advance button (guarded against the
     same tap that just finished the rest) */
  timerBar.addEventListener("click", function (ev) {
    if (!timerBar.classList.contains("go")) return;
    if (ev.target.closest("button")) return;
    if (Date.now() - goAt < 400) return;
    skipBtn.click();
  });
  function clearUndo() { appEl.classList.remove("can-undo"); }
  skipBtn.onclick = function () {
    var wasGo = timerBar.classList.contains("go");
    clearInterval(rInt); rInt = null; rLeft = 0;
    resetPause();
    if (pendingNext && cur === pendingDay && idx === pendingIdx) {
      if (idx < DAYS[cur].ex.length - 1) {
        pendingNext = false;
        idx++; hintText = ""; hintGood = false; commit();
        timerIdle("", "Next lift — go."); render();
      } else {
        /* last lift done — require a second tap so a stray tap can't end the session */
        if (Date.now() > finishArmedUntil) {
          finishArmedUntil = Date.now() + 2500;
          skipBtn.textContent = "Tap again to finish";
          clearTimeout(skipResetId);
          skipResetId = setTimeout(function () {
            if (timerBar.classList.contains("go") && Date.now() >= finishArmedUntil) skipBtn.textContent = "Finish";
          }, 2600);
          return;
        }
        pendingNext = false; finishArmedUntil = 0;
        timerIdle("", "Workout complete — nice work.");
        clearUndo();
        if (sInt) { pauseSession(); sAutoStopped = true; }
      }
      return;
    }
    pendingNext = false;
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
    clearInterval(rInt); rInt = null; rLeft = 0; pendingNext = false;
    resetPause();
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
      b.type = "button"; b.className = "rir"; b.textContent = rv; b.setAttribute("data-rir", rv);
      b.setAttribute("aria-label", "RIR " + rv);
      b.onclick = function () { curSt().rir = rv; hideRirHint(); commit(); render(); };
      rirRow.appendChild(b);
    })(ri);
  }

  /* ── steppers — tap once, press-and-hold repeats ───────────────────────── */
  function stepLoad(d) {
    var s = curSt();
    s.load = d < 0 ? Math.max(0, Math.round((s.load - ex().step) * 100) / 100) : Math.round((s.load + ex().step) * 100) / 100;
    commit(); render();
  }
  function stepReps(d) { var s = curSt(); s.reps = Math.max(1, s.reps + d); commit(); render(); }
  function bindStepper(id, fn) {
    var b = document.getElementById(id), delay = null, rep = null, held = false;
    function stop() {
      if (delay) { clearTimeout(delay); delay = null; }
      if (rep) { clearInterval(rep); rep = null; }
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

  /* ── set done ──────────────────────────────────────────────────────────── */
  document.getElementById("doneBtn").onclick = function () {
    var e = ex(), s = curSt();
    var wasComplete = s.done >= e.s;
    s.sets = s.sets || [];
    s.sets.push({ load: s.load, reps: s.reps, rir: s.rir });
    s.done = s.sets.length;
    s.lastRir = s.rir;
    if (s.reps >= e.top && s.rir >= e.rir) s.topHits++;

    hintText = ""; hintGood = false;
    var finished = !wasComplete && s.done >= e.s;
    var restNote = "";
    if (finished && e.partial && s.lastRir <= 1) {
      restNote = "partials";
    } else if (finished && s.topHits >= 1 && s.reps >= e.top && s.lastRir >= e.rir) {
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

    pendingIdx = -1; pendingDay = "";
    commit();
    startRest(restDuration(e.rest, s.rir), e.n + " — set " + Math.min(s.done, e.s) + " done", s.done >= e.s, restNote, nextText);

    ensureAudio();
    if (navigator.vibrate) navigator.vibrate(10);
    if (!sInt && (sSec === 0 || sAutoStopped)) sessBtn.click();
    keepAwake();
    render();
  };

  /* apply suggested load */
  document.getElementById("applyLoad").onclick = function () {
    var v = parseFloat(this.getAttribute("data-load"));
    if (!isNaN(v)) { curSt().load = v; commit(); render(); }
  };

  /* restart this lift: clear its sets, keep the working weight */
  resetLiftBtn.onclick = function () {
    Gym.resetLift(payload, cur, idx);
    hintText = ""; hintGood = false;
    commit(); render();
  };

  /* ── navigation ────────────────────────────────────────────────────────── */
  function showDay() { view = "day"; hintText = ""; hintGood = false; commit(); render(); }
  function openLift(i) {
    if (i < 0 || i >= DAYS[cur].ex.length) return;
    idx = i; view = "lift"; hintText = ""; hintGood = false; commit(); render();
  }
  function navigateLift(delta) {
    var n = idx + delta;
    if (n < 0 || n >= DAYS[cur].ex.length) return;
    idx = n; hintText = ""; hintGood = false; commit(); render();
  }
  document.getElementById("backBtn").onclick = showDay;
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
      var list = DAYS[cur].ex;
      for (var i = 0; i < list.length; i++) { if (st(cur, i).done < list[i].s) { idx = i; break; } }
      commit(); render();
    };
  });

  /* ── backup modal (export / import) ────────────────────────────────────── */
  function openModal() { modal.hidden = false; hideMsg(); updateFoot(); }
  function closeModal() { modal.hidden = true; }
  function hideMsg() { document.getElementById("modalMsg").textContent = ""; }
  function setMsg(t) { document.getElementById("modalMsg").textContent = t; }
  function historyCount() {
    var n = 0; for (var k in payload.liftHistory) { if (payload.liftHistory.hasOwnProperty(k)) n += payload.liftHistory[k].length; }
    return n;
  }
  function updateFoot() { document.getElementById("modalFoot").textContent = "v" + Gym.CURRENT + " · " + historyCount() + " sessions saved"; }
  menuBtn.onclick = openModal;
  document.getElementById("modalClose").onclick = closeModal;
  modal.addEventListener("click", function (ev) { if (ev.target === modal) closeModal(); });
  document.getElementById("exportCopy").onclick = function () {
    var json = Gym.exportPayload(payload);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function () { setMsg("Backup copied to clipboard ✓"); }, function () { setMsg("Copy blocked — use Download JSON"); });
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
    setMsg("Backup downloaded ✓");
  }
  document.getElementById("exportDownload").onclick = downloadBackup;
  document.getElementById("importFile").addEventListener("change", function (ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var migrated = Gym.importRaw(String(reader.result));
        payload = migrated; cur = payload.cur; idx = payload.idx;
        if (!DAYS[cur]) cur = "fri";
        if (idx >= DAYS[cur].ex.length) idx = 0;
        clearUndo(); view = "day";
        render(); commit(); updateFoot();
        setMsg("Backup imported ✓");
      } catch (e) { setMsg("Import failed — not a Gym backup"); }
    };
    reader.readAsText(f);
    ev.target.value = "";
  });

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
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }
  render();
  commit();
})();
