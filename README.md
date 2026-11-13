# Gym

Personal one-screen workout tool for Khang — Fri–Sun 3-day hypertrophy plan.

- **Day → Lift** two views: an 8-lift overview for the day, and a focused lift view you drill into.
- One screen, no scroll, 100dvh, free.
- Dark-first theme with a light toggle (first load follows the system preference when no theme is saved yet).
- Lift view has a **per-set log** — one row per set with load × reps @ RIR, completed sets checked, and the next set highlighted — plus always-visible load / reps / RIR adjusters (tap a value to type it precisely), Undo / Restart, and Set Done (after the last set it becomes **Add extra set**). **Tap a logged set to edit it in place** — the adjusters retarget that set and Done writes it back.
- **Sessions:** a workout is a first-class session with a start/stop clock. If you leave sets open overnight, the next open banks the old day and starts today fresh while keeping your working loads. **Finish workout** closes the session and shows a one-screen summary (time, sets, tonnage, PRs, next training day).
- **Progression:** after a lift you hit top reps on, the next session shows `Last Nov 1: 60 × 6 @2 RIR → try 62.5` with a one-tap **Apply**, a **Prev** line with the previous session's per-set values, and a small e1RM sparkline of recent sessions (folded behind a **Trend** pill so it doesn't crowd short phones). **Plan today** pre-fills every not-yet-started lift's load from its history in one tap. Three sessions without hitting top reps triggers a **deload** suggestion instead of "keep"; beating your logged best shows a **New PR** hint.
- **Progress view:** `▤` in the header opens a one-screen dashboard — workouts, sets, this week's sessions, tonnage per day, an 8-week training-days heatmap, a recent-session tonnage trend, your biggest movers, and the top PR, with a week-over-week tonnage delta. Tonnage values bodyweight sets at total system weight (bodyweight + added load, default 165 lb), so pull-ups and dips no longer read as zero and adding a plate always moves the number up.
- Set Done starts a rest (+30 s after a 0–1 RIR set). Rest takes over the whole screen with a big countdown, +15 / Pause / End rest, Undo, a **compact next-set prep** (load / reps steppers for the coming set, no need to leave rest), and a "Show workout" peek. Pausing freezes the countdown and turns the Pause pill into an accented Resume. At GO it beeps and vibrates; with **Rest notifications** enabled it also posts a notification while the tab is backgrounded. The full-screen rest hides the ‹ › lift arrows so a mid-rest tap can't silently jump you to another lift — use **Show workout** to navigate.
- **Week status:** the day header carries a Fri/Sat/Sun strip showing each day as done, partial, missed, or today, so adherence is visible without opening Progress.
- **Data safety:** a corrupt payload is quarantined as `gym-tool-v2-corrupt` and the original is never overwritten on boot (the day view offers a download of the bytes); a failed save surfaces a bar with a one-tap export. Reset day / Clear all / Restore / Merge write a snapshot first, recoverable from `⋯` → **Undo last reset / restore**. History is capped at 520 sessions per lift (~10 years) and session log at 520.
- **Backup:** an overdue-backup banner appears on the day view with a one-tap **Backup** button (dismissible for the session), so the log survives Safari data cleanup. The `⋯` menu exports the full state as JSON (copy or download), **Export CSV** (one row per set, formula-escaped) and **Share summary**; its dot turns accent-coloured when a backup is overdue (7 days). **Import merges history by date** so two devices can be reconciled, and **Restore (replace)** swaps the whole payload after a two-tap arm.
- **Undo / Reset:** next to the sets, **`↺ Undo`** removes your last set (the count visibly goes from e.g. "Set 3 of 3" back to "Set 2 of 3"), and **`↺ Restart`** clears the whole lift after a two-tap guard (keeps your working weight). The `⋯` menu has **Reset day** and **Clear all data** (both two-tap confirm).
- **Navigation:** `‹ Back` returns to the day list and the lift header shows the day + lift number (`Sun · Lift 1 of 8`); the `‹ ›` arrows step between lifts; **Continue** jumps to the first open lift.
- The `⋯` menu also holds the theme toggle and **Bodyweight (lb)**, so the header stays down to Back/Menu/Session.
- Updates land automatically: **navigations are network-first** (online gets the latest deploy, offline falls back to the app shell) and static assets use stale-while-revalidate; a failed script request never receives `index.html`.
- Adjusted load / reps / RIR, per-set logs and session progress persist in localStorage (`gym-tool-v2`; v1/v2 data is migrated on first load), so a reload doesn't lose the session. Per-lift history and the session log are kept for progression and stats.
- Offline-capable: a service worker (`sw.js`) caches the app so it works with no signal; installable via `manifest.webmanifest`.
- 24 lifts, Fri/Sat/Sun, 8 per day, with loads, rests, cues — program data unchanged.

## Files

- `index.html` — markup only.
- `style.css` — all styling.
- `program.js` — program data (`DAYS`) + pure math (`fmt`, `dayMins`, `suggestLoad`, `firstOpenLift`, …). No DOM.
- `store.js` — persistence, schema migration, sessions and the session clock, quarantine/snapshots, export/import + merge, per-lift history, backup age. No DOM.
- `timer.js` — pure timer math (rest duration, pause/resume, +15, session elapsed). No DOM.
- `machine.js` — pure rest state machine (`idle → active ⇄ paused → go`); re-derives the clock from a timestamp so it survives sleep. No DOM.
- `rest.js` — pure rest-orchestration decisions (advance vs stay, next lift, two-tap finish arming). No DOM.
- `stats.js` — pure progress analytics (workouts, sets, bodyweight-aware volume, per-set PRs, training-week heatmap + week status, CSV). No DOM.
- `app.js` — DOM wiring, render, and event handlers (the controller).
- `globals.d.ts`, `jsconfig.json` — JSDoc type-checking layer (`npm run typecheck`); no build step.
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` — PWA install + offline.
- `tools/make-icons.js` — regenerates the icons (`npm run icons`).
- `test/` — `node:test` unit tests. `e2e/` — Playwright viewport + functional tests.

Open it on iPhone from the Pages URL, add to Home Screen.

## Develop / verify

- `npm test` — 85 unit tests (`node --test test/`), no dependencies needed.
- `npm run e2e` — 35 Playwright tests at 390×667 and 390×844; uses system Chrome (`channel: "chrome"`). Run `npm install` first.
- `npm run check` — syntax check + asset-manifest drift guard + unit tests.
- `npm run check:assets` — verify `sw.js` `ASSETS` matches the files `index.html` loads and that every cached file exists.
- `npm run typecheck` — `tsc --checkJs` over the JSDoc-annotated modules (needs `npm install`).
- `npm run icons` — regenerate the PNG icons.

CI (`.github/workflows/ci.yml`) runs `npm run check` and the Playwright suite on every push to `main` and every pull request.

## How the Planner/Reviewer + OpenCode work here

The Planner/Reviewer is the planner agent. OpenCode is the builder on the Mac.
The Planner/Reviewer writes `TASK.md`. OpenCode pulls the branch, reads `TASK.md`, builds, tests, updates `BUILD_LOG.md`, pushes back.
No paste loop — the repo is the handoff.

Continuous improvement runs on the loop in `LOOP.md`: the Planner/Reviewer plans a
bounded batch into `QUEUE.md`, OpenCode works it one item at a time,
`BACKLOG.md` holds ranked ideas, `RESEARCH.md` holds the science,
`LOOP_STATE.md` is the checkpoint. Program-data changes and new
features always need Khang's explicit approval first.

## Rules (do not break)

- One screen, no scroll. Every view fits `100dvh` on a phone; keep the short-phone (`max-height:720px`) and tall-phone (`min-height:820px`) fallbacks intact. The `e2e/` smoke test asserts this.
- Program data is the source of truth — 24 lifts, loads, sets / reps / rests, cues (`program.js`). Do not change numbers without Khang's explicit ask.
- Rest is fullscreen while counting; "Show workout" peeks the workout behind it as a short strip.
- Persistence is localStorage only (`gym-tool-v2`, versioned); no backend. Bump `CURRENT` in `store.js` and add a migration branch to change the schema.
- No new features / fluff without Khang's explicit ask.
- Tempo: 2 s down. Tempo line is "explode up · 2s down · 1s hold".
- The service worker is network-first for navigations (assets use stale-while-revalidate), so updates land on reload; bump `CACHE` in `sw.js` only to force a clean offline cache.
