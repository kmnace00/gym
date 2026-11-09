# TASK — for OpenCode (planner: Muse)

## WIP

WIP: OpenCode editing stats.js, test/stats.test.js since 20:10

Status: ACTIVE — Batch 1, L3 (day-time model vs real sessions).
L1 shipped (`28b0c7b`), L2 shipped (`b6645ea` + `78f319a`). Batch:
`QUEUE.md` L1–L5, in order. When L3 is done, copy L4 from `QUEUE.md`
into this file and start it. Base HEAD: `a18272b`.

## Completed — L2: audit the lengthened-partials prompt [T1]

Delivered: 3 new e2e cases prove the partials cue fires only on the
final set of a flagged lift at RIR ≤1 (never sets 1–2, never RIR 2,
never on an unflagged lift) — no `app.js` change was needed. Flag
audit: 10 `partial: 1` lifts, 9 match `RESEARCH.md`, Sun overhead
cable extension is the outlier (flag untouched, T3). Verified 88/88
unit, typecheck clean, 38/38 e2e at 390×667/844.

## Active task — L3: day-time model vs real sessions [T1, audit]

Why: day length is still estimated as 50 s/set + rest + 60 s
transition (`program.js` `dayMins`, `SET_SECS`/`TRANSITION_SECS`).
Pass 4 `sessionLog` entries carry `day`, `durationSec`,
`status: "complete"`, so estimate vs actual is measurable with a
pure function — but real data lives only on Khang's phone and the
sessions are brand new.

Do:
- Add pure `Stats.sessionDrift(...)` in `stats.js` (no DOM, no
  "now", deterministic): from completed `sessionLog` entries for
  that day with `durationSec > 0`, return
  `{ n, estimateMin, medianActualMin, driftPct }`; return
  `{ n, insufficient: true }` when n < 3. Export it.
- Unit tests in `test/stats.test.js` with fixtures: 0 sessions →
  insufficient; 1–2 → insufficient; ≥3 → median + drift math;
  non-complete / zero-duration entries ignored.
- Report in `BUILD_LOG.md`: per-day n and drift from fixtures only,
  plus the plain statement that the real-data verdict is pending.
  No constants change, no UI change in this item.

Files: `stats.js`, `test/stats.test.js`.
Verify: `npm run check`, typecheck green. No behaviour change to
the app itself. One line in `BUILD_LOG.md`, update `LOOP_STATE.md`.
If verification fails, log it and STOP — do not move on.

## Completed task — Pass 4 “Build all” (Nov 8, Khang's direct ask)

Delivered: session boundary + session log; per-set truth (extra sets, tap-to-edit); bodyweight metrics; corrupt quarantine + snapshots; week strip; Continue + Finish summary; rest-screen next-set prep; two-tap Restart; SW `gym-v7`.

## Completed task — UI/UX nav + reset

Delivered:
- Back button `‹ Lifts` → `‹ Back`; lift context shows the day ("Friday · Lift 3 of 8").
- `↺ Restart lift` (clears sets, keeps weight) on the set-dots row.
- `⋯` menu: Reset day, Clear all data (both two-tap confirm), Theme toggle moved in; header decluttered.
- Persistent `Undo` pill (day + lift views, not just rest).

---

## Previous task — holistic build (phases 1–5)

## Completed task — holistic build (phases 1–5)

Delivered:

1. **Data safety** — schema v2 (`gym-tool-v2`), real v1→v2 migration (no silent discard; unknown versions backed up, never overwritten), Export/Import via the `⋯` menu (copy / download / import JSON).
2. **Architecture** — `app.js` split into `program.js` (data + pure math), `store.js` (persistence/history), `timer.js` (timer math), `app.js` (controller). `save()` moved out of `render()`. UMD guards so the pure modules run under `node:test`. Unit tests (27) + Playwright viewport/functional e2e (6).
3. **Progression + history** — per-lift ring buffer (`liftHistory`), "Last <day>: … → try X" suggestion with one-tap Apply, inline e1RM sparkline.
4. **UX hardening** — single `navigateLift()`, undo survives navigation, GO double-tap guard, double-tap "Finish" confirm, one-time RIR explainer, `prefers-color-scheme` fallback on first load.
5. **PWA** — `manifest.webmanifest`, `sw.js` (cache-first offline), generated 192/512 icons.

Verified:

- `node --test test/` 27/27; `npx playwright test` 6/6 at 390×667 and 390×844 (no overflow).
- Program data `DAYS` unchanged (24 lifts). Details in `BUILD_LOG.md`.

---

## Previous task — full revamp

Rebuild the tool as a **Day → Lift** two-view app, dark-first, with persistence, keeping the program data byte-for-byte.

Delivered:

1. **Day view** — 8-lift overview with status, name, sets×reps, load, rest; day tabs, session pill, per-lift progress. Tap a row to drill in.
2. **Lift view** — big prescription, cue, tempo, set dots, and always-visible load / reps / RIR adjusters (no hidden "Adjust" panel). Set Done.
3. **Fullscreen rest** — big countdown, +15, Pause/Resume, End rest, Undo, Show-workout peek, GO beep + vibration, RIR ≤1 → +30 s, partials prompt, progression hint.
4. **Persistence** — localStorage `gym-tool-v1`: adjusted load/reps/RIR, done count, topHits, lastRir, day/index. Hydrates on load, saves on change.
5. **Theme** — dark-first with a light toggle (persisted as `gym-theme`).

Verified:

- 390×844 and 390×667: app 844/844 & 667/667, lift view 766/766 & 596/596, day rows fit, progress bar paints (6 px), rest goes fullscreen, peek strip 157 px with the lift name and Set Done still on-screen.
- No console errors (only benign `navigator.vibrate` blocks from synthetic clicks, not user taps).
- Program data identical to the previous commit (`DAYS` JSON 3383 → 3383).
- Persistence across reload, undo (and undo-cleared-on-back), day switch, theme toggle, set→rest→advance, and workout-complete session stop all pass.

## Open decisions (need Khang, not a loop edit)

- Any change to `program.js` numbers (loads, reps, rests, sets,
  exercises, split, days) or any new feature — T3 proposals in
  `BACKLOG.md`, never auto-built.
- Overhead cable extension is flagged `partial: 1` but is not in
  the `RESEARCH.md` partials list (L2 open question) — flag stays
  until Khang decides.

## How to use this file

- Muse writes this file. OpenCode reads it, builds, tests, updates BUILD_LOG.md.
- Stop when the task is done or verification fails — report back in BUILD_LOG.md, do not keep looping.
