# TASK — for OpenCode (planner: Muse)

Status: DONE — UI/UX nav + reset + undo fix (Nov 8, Khang's direct ask). Unit + e2e green.

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

- Persistence schema is a single key `gym-tool-v1`; bump the version to migrate if the shape changes.
- Session history / auto-progression: not requested, not added.

## How to use this file

- Muse writes this file. OpenCode reads it, builds, tests, updates BUILD_LOG.md.
- Stop when the task is done or verification fails — report back in BUILD_LOG.md, do not keep looping.
