# Gym

Personal one-screen workout tool for Khang — Fri–Sun 3-day hypertrophy plan.

- **Day → Lift** two views: an 8-lift overview for the day, and a focused lift view you drill into.
- One screen, no scroll, 100dvh, free.
- Dark-first theme with a light toggle (first load follows the system preference when no theme is saved yet).
- Lift view has always-visible load / reps / RIR adjusters (no hidden panel), Set Done, and set dots.
- **Progression:** after a lift you hit top reps on, the next session shows `Last Fri: 60 × 6 @2 RIR → try 62.5` with a one-tap **Apply**, plus a small e1RM sparkline of recent sessions.
- Set Done starts a rest (+30 s after a 0–1 RIR set). Rest takes over the whole screen with a big countdown, +15 / Pause / End rest, Undo, and a "Show workout" peek.
- **Backup:** the `⋯` menu exports/imports the full state as JSON (copy or download), so the log survives Safari data cleanup.
- Adjusted load / reps / RIR and set progress persist in localStorage (`gym-tool-v2`; v1 data is migrated on first load), so a reload doesn't lose the session. Per-lift session history is kept for progression.
- Offline-capable: a service worker (`sw.js`) caches the app so it works with no signal; installable via `manifest.webmanifest`.
- 24 lifts, Fri/Sat/Sun, 8 per day, with loads, rests, cues — program data unchanged.

## Files

- `index.html` — markup only.
- `style.css` — all styling.
- `program.js` — program data (`DAYS`) + pure math (`fmt`, `dayMins`, `suggestLoad`, …). No DOM.
- `store.js` — persistence, schema migration, export/import, per-lift history. No DOM.
- `timer.js` — pure timer math (rest duration, pause/resume, +15, session elapsed). No DOM.
- `app.js` — DOM wiring, render, and event handlers (the controller).
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` — PWA install + offline.
- `tools/make-icons.js` — regenerates the icons (`npm run icons`).
- `test/` — `node:test` unit tests. `e2e/` — Playwright viewport + functional tests.

Open it on iPhone from the Pages URL, add to Home Screen.

## Develop / verify

- `npm test` — 27 unit tests (`node --test test/`), no dependencies needed.
- `npm run e2e` — Playwright tests at 390×667 and 390×844; uses system Chrome (`channel: "chrome"`). Run `npm install` first.
- `npm run check` — syntax check + unit tests.
- `npm run icons` — regenerate the PNG icons.

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
- Bump `CACHE` in `sw.js` on any asset change so the offline copy refreshes.
