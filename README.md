# Gym

Personal one-screen workout tool for Khang — Fri–Sun 3-day hypertrophy plan.

- **Day → Lift** two views: an 8-lift overview for the day, and a focused lift view you drill into.
- One screen, no scroll, 100dvh, free.
- Dark-first theme with a light toggle (first load follows the system preference when no theme is saved yet).
- Lift view has a **per-set log** — one row per set with load × reps @ RIR, completed sets checked, and the next set highlighted — plus always-visible load / reps / RIR adjusters (tap a value to type it precisely), Undo / Restart, and Set Done (after the last set it becomes **Add extra set**).
- **Progression:** after a lift you hit top reps on, the next session shows `Last Nov 1: 60 × 6 @2 RIR → try 62.5` with a one-tap **Apply**, a **Prev** line with the previous session's per-set values, and a small e1RM sparkline of recent sessions (folded behind a **Trend** pill so it doesn't crowd short phones). **Plan today** pre-fills every not-yet-started lift's load from its history in one tap. Three sessions without hitting top reps triggers a **deload** suggestion instead of "keep"; beating your logged best shows a **New PR** hint.
- **Progress view:** `▤` in the header opens a one-screen dashboard — sessions, sets, training days, tonnage per day, an 8-week training-days heatmap, a recent-session tonnage trend, your biggest movers, and the top PR, with this week's session count and a week-over-week tonnage delta. Tonnage values bodyweight sets at 75 kg/rep so pull-ups and dips no longer read as zero.
- Set Done starts a rest (+30 s after a 0–1 RIR set). Rest takes over the whole screen with a big countdown, +15 / Pause / End rest, Undo, and a "Show workout" peek. Pausing freezes the countdown and turns the Pause pill into an accented Resume. At GO it beeps and vibrates; with **Rest notifications** enabled it also posts a notification while the tab is backgrounded. The full-screen rest hides the ‹ › lift arrows so a mid-rest tap can't silently jump you to another lift — use **Show workout** to navigate.
- **Backup:** an overdue-backup banner appears on the day view with a one-tap **Backup** button (dismissible for the session), so the log survives Safari data cleanup. The `⋯` menu exports the full state as JSON (copy or download), **Export CSV** (one row per set) and **Share summary**; its dot turns accent-coloured when a backup is overdue (7 days). **Import merges history by date** so two devices can be reconciled, and **Restore (replace)** swaps the whole payload after a two-tap arm.
- **Undo / Reset:** next to the sets, **`↺ Undo`** removes your last set (the count visibly goes from e.g. "Set 3 of 3" back to "Set 2 of 3"), and **`↺ Restart`** clears the whole lift (keeps your working weight). The `⋯` menu has **Reset day** and **Clear all data** (both two-tap confirm).
- **Navigation:** `‹ Back` returns to the day list and the lift header shows the day + lift number (`Sun · Lift 1 of 8`); the `‹ ›` arrows step between lifts.
- The `⋯` menu also holds the theme toggle, so the header stays down to Back/Menu/Session.
- Updates land automatically: the service worker is **network-first** (online gets the latest deploy, offline falls back to the cached copy).
- Adjusted load / reps / RIR and set progress persist in localStorage (`gym-tool-v2`; v1 data is migrated on first load), so a reload doesn't lose the session. Per-lift session history is kept for progression.
- Offline-capable: a service worker (`sw.js`) caches the app so it works with no signal; installable via `manifest.webmanifest`.
- 24 lifts, Fri/Sat/Sun, 8 per day, with loads, rests, cues — program data unchanged.

## Files

- `index.html` — markup only.
- `style.css` — all styling.
- `program.js` — program data (`DAYS`) + pure math (`fmt`, `dayMins`, `suggestLoad`, `firstOpenLift`, …). No DOM.
- `store.js` — persistence, schema migration, export/import + merge, per-lift history, backup age. No DOM.
- `timer.js` — pure timer math (rest duration, pause/resume, +15, session elapsed). No DOM.
- `machine.js` — pure rest state machine (`idle → active ⇄ paused → go`); re-derives the clock from a timestamp so it survives sleep. No DOM.
- `rest.js` — pure rest-orchestration decisions (advance vs stay, next lift, two-tap finish arming). No DOM.
- `stats.js` — pure progress analytics (sessions, sets, bodyweight-aware volume, day rollups, training-week heatmap, CSV). No DOM.
- `app.js` — DOM wiring, render, and event handlers (the controller).
- `globals.d.ts`, `jsconfig.json` — JSDoc type-checking layer (`npm run typecheck`); no build step.
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` — PWA install + offline.
- `tools/make-icons.js` — regenerates the icons (`npm run icons`).
- `test/` — `node:test` unit tests. `e2e/` — Playwright viewport + functional tests.

Open it on iPhone from the Pages URL, add to Home Screen.

## Develop / verify

- `npm test` — 73 unit tests (`node --test test/`), no dependencies needed.
- `npm run e2e` — 29 Playwright tests at 390×667 and 390×844; uses system Chrome (`channel: "chrome"`). Run `npm install` first.
- `npm run check` — syntax check + asset-manifest drift guard + unit tests.
- `npm run check:assets` — verify `sw.js` `ASSETS` matches the files `index.html` loads and that every cached file exists.
- `npm run typecheck` — `tsc --checkJs` over the JSDoc-annotated modules (needs `npm install`).
- `npm run icons` — regenerate the PNG icons.

CI (`.github/workflows/ci.yml`) runs `npm run check` and the Playwright suite on every push to `main` and every pull request.

## How Muse + OpenCode work here

Muse is the planner agent. OpenCode is the builder on the Mac.
Muse writes `TASK.md`. OpenCode pulls the branch, reads `TASK.md`, builds, tests, updates `BUILD_LOG.md`, pushes back.
No paste loop — the repo is the handoff.

## Rules (do not break)

- One screen, no scroll. Every view fits `100dvh` on a phone; keep the short-phone (`max-height:720px`) and tall-phone (`min-height:820px`) fallbacks intact. The `e2e/` smoke test asserts this.
- Program data is the source of truth — 24 lifts, loads, sets / reps / rests, cues (`program.js`). Do not change numbers without Khang's explicit ask.
- Rest is fullscreen while counting; "Show workout" peeks the workout behind it as a short strip.
- Persistence is localStorage only (`gym-tool-v2`, versioned); no backend. Bump `CURRENT` in `store.js` and add a migration branch to change the schema.
- No new features / fluff without Khang's explicit ask.
- Tempo: 2 s down. Tempo line is "explode up · 2s down · 1s hold".
- The service worker is network-first, so updates land on reload; bump `CACHE` in `sw.js` only to force a clean offline cache.
