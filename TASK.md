# TASK — for OpenCode (planner: Muse)

## WIP

Triage: T1 — fully specified security probe; local lead, no subagents.

WIP: OpenCode editing test/store.test.js, PLAN.md, store.js (only if
a probe fails), test/size.test.js (only if a size probe needs it)
since 20:31

Status: ACTIVE — Batch 1, L5 (security audit: import + service worker).
L1 shipped (`28b0c7b`), L2 shipped (`b6645ea` + `78f319a`), L3 shipped
(`09798ca` + `36489b3`), L4 shipped (`d9cc70f` + `abcf5bd`). Batch:
`QUEUE.md` L1–L5, in order. When L5 is done, stop and wait for Muse.
Base HEAD: `a18272b`.

## Completed — L4: accessibility pass [T1]

Delivered: 3 e2e cases prove the requested controls are ≥44px at
390×667/844 and the rest-screen keyboard order is +15 / Pause / End
rest / Show workout / Undo / prep steppers; hidden rest arrows remain
unreachable. Negative margins preserved no-scroll. `--faint` contrast
fixed in both themes. SW `gym-v10`. Verified 93/93 unit, typecheck
clean, 41/41 e2e.

## Completed — L3: day-time model vs real sessions [T1, audit]

Delivered: pure `Stats.sessionDrift(payload, day, estimate)` in
`stats.js`, five unit tests in `test/stats.test.js`, fixture-only
report in `BUILD_LOG.md`, SW `gym-v9`. Verified 93/93 unit, typecheck
clean, 38/38 e2e at 390×667/844. Commit: `09798ca` + `36489b3`.

## Completed — L2: audit the lengthened-partials prompt [T1]

Delivered: 3 new e2e cases prove the partials cue fires only on the
final set of a flagged lift at RIR ≤1 (never sets 1–2, never RIR 2,
never on an unflagged lift) — no `app.js` change was needed. Flag
audit: 10 `partial: 1` lifts, 9 match `RESEARCH.md`, Sun overhead
cable extension is the outlier (flag untouched, T3). Verified 88/88
unit, typecheck clean, 38/38 e2e at 390×667/844.

## Active task — L5: security audit: import + service worker [T1]

Why: Pass 4 extended sanitization to sessions
(`sanitizeSession`), but existing hostile coverage is a single test
(numeric strings → 0). The merge path assigns incoming keys into
plain objects (`store.js` `mergePayload`), so prototype keys are the
precise thing to probe — not assert.

Do (probe, then fix only what fails):
- Add tests in `test/store.test.js`: `__proto__` / `constructor` keys
  in `state`, `liftHistory`, and `sessionLog` via `importRaw` /
  `importMerge` — assert `Object.prototype` is unpolluted and the
  merged result is sane; numbers `1e999` / `Infinity` via JSON;
  non-array `sets`; hostile session `lifts` (non-object, hostile
  numbers); huge payload (size guard still holds).
- Fix failures in `store.js` sanitize/merge only. No schema change,
  no program-data change.
- Verify SW discipline: `CACHE` is now `gym-v10` (Pass 4 was `gym-v7`);
  `npm run check` includes the asset-drift guard — confirm green and
  note it in `BUILD_LOG.md`.
- Write the threat-model paragraph in `PLAN.md` (one paragraph: trusts
  = Khang's own backups + `origin main` commits by Khang/Muse; does not
  trust = imported JSON, any other commit author, SW cache contents;
  boundary = localStorage only, no network exfiltration).

Files: `store.js` (only if a probe fails), `test/store.test.js`,
`test/size.test.js`, `PLAN.md`.

Verify: new hostile-payload tests green, `npm run check` + typecheck +
e2e green, no behaviour change. One line in `BUILD_LOG.md`, update
`LOOP_STATE.md`. If verification fails, log it and STOP — do not move
on.

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
