# DESIGN — holistic improvement pass (T2)

Date: 2026-11-08 · Lead: deepseek/deepseek-flash · Scope: UX friction, product evolution, tech debt.

## Triage

**T2.** The pass touches a concurrent state machine (rest timer), real persisted
user data (merge/backup), and cross-cutting architecture. The diff cannot be
fully specified inline without these decisions, so it is planned here before
any code changes.

## Decisions (and why)

1. **Keep the no-build UMD module pattern; add JSDoc + `jsconfig.json`.**
   Migrating to native ES modules was evaluated and rejected: the e2e suite
   loads the app over `file://`, where Chrome blocks `<script type="module">`
   via CORS, and the unit tests use CommonJS `require`. The migration would
   force a static server into the test harness plus a CJS/ESM split in the tool
   scripts — churn with zero user-facing benefit. Instead we keep the proven
   pattern and add a zero-dependency type-checking layer (`jsconfig.json` +
   JSDoc) that editors honour immediately and `npm run typecheck` can enforce
   once `typescript` is installed.

2. **Debounce only the stepper write path; no IndexedDB.**
   The real bottleneck is `JSON.stringify(payload)` + `localStorage.setItem`
   running every 70 ms during a press-and-hold stepper. We coalesce that path
   (250 ms trailing) and flush on pointer-up / `pagehide` / `visibilitychange`.
   Moving to IndexedDB would add async dual-read complexity to an offline PWA
   for no measurable gain at this payload size (a few KB).

3. **Schema stays v2; `lastBackup` is additive and optional.**
   `normalize()` defaults the new field, so no migration branch is needed and
   existing v1/v2 payloads keep working. Bumping the version would only add
   migration risk.

4. **Merge-on-import replaces overwrite-on-import.**
   A backup from another device should union history, not replace it. `state`
   keeps the record with more completed sets; `liftHistory` unions by date.
   `importRaw` (replace) stays available for restores into a wiped device.

## Work items

| # | Item | Files |
|---|------|-------|
| 1 | Pure rest state machine + unit tests | `machine.js`, `test/machine.test.js` |
| 2 | Pure progress analytics + unit tests | `stats.js`, `test/stats.test.js` |
| 3 | Deferred save + flush | `app.js` |
| 4 | Merge import + backup age/due | `store.js`, `test/store.test.js` |
| 5 | Rest desync fix (cancel auto-advance on manual nav) | `app.js` |
| 6 | Backup nudge (menu dot + last-backup line) | `app.js`, `index.html`, `style.css` |
| 7 | Progress dashboard view | `app.js`, `index.html`, `style.css`, `stats.js` |
| 8 | Collapsible trend sparkline | `app.js`, `index.html`, `style.css` |
| 9 | A11y: modal focus trap/restore, GO assertive, Set Done pressed | `app.js`, `index.html` |
| 10 | Rest-complete web notification (opt-in) | `app.js`, `index.html` |
| 11 | Docs + cache bump | `README.md`, `sw.js`, `BUILD_LOG.md`, `package.json`, `jsconfig.json` |

## Non-goals (explicit)

- Real cloud backend / accounts — violates the "free, static Pages, no backend"
  constraint. The durable-data story is solved with prompted backups + merge.
- Apple Watch / Wear companion — requires native packaging; out of scope.
- Full ESM migration / IndexedDB — see decisions 1 and 2.

## Verification

`npm test` (pure modules + store) and `npm run e2e` at 390×667 and 390×844,
keeping the no-scroll invariant. Manual: progress view fits, backup dot clears
after export, import merges, GO announces assertively.

## Pass 2 (2026-11-08) — UX / data / architecture hardening

Second T2 pass. Decisions:

1. **Sanitize at the store boundary, not in the renderer.** `normalize()`
   coerces every *present* numeric field on `state`, `state.sets` and
   `liftHistory` to a real number and never adds/removes keys. Missing fields
   stay missing so `getLift()` still injects program defaults. Cheaper and
   safer than auditing every `innerHTML` template, and it neutralises a
   hostile imported backup before any render.
2. **Rest orchestration consolidated, not extracted.** The ten loose flags
   (`pendingNext`, `pendingIdx`, `pendingDay`, `rNote`, `rNextText`, `rMsg`,
   `goAt`, `finishArmedUntil`, `skipResetId`, `rLabel`) became one `restCtx`
   object. This preserves behaviour (verified by the full e2e suite) and makes
   the implicit state machine auditable. A dedicated rest-controller module
   remains the longer-term goal but is deferred to avoid a no-value refactor
   of the most user-critical path in the same pass.
3. **Rest locks the lift context.** The full-screen timer no longer renders
   the ‹ › arrows; changing lift mid-rest requires Show workout (peek). This
   removes an ambiguous escape hatch next to the GO advance surface.
4. **Deload is part of progression, not a new engine.** `stallLoad` reuses the
   existing suggestion line + Apply button: three consecutive missed-top
   sessions surface a ~10% deload instead of "keep". No new screen or state.
5. **PRs are a hint, not a dashboard card.** A set whose e1RM beats logged
   history shows a one-line New PR hint on the lift view; this keeps the
   no-scroll Progress layout intact while adding the highest-value feedback.

### Deferred (with reason)

- **Exercise swap** — needs a curated alternate-exercise map in `program.js`;
  the repo rule reserves program-data changes for Khang's explicit sign-off,
  and per-exercise progression needs a model change. Dedicated T2 later.
- **Apple Watch / lockscreen live activity** — native packaging (non-goal).
- **Backend sync / IndexedDB** — violates the free-static-Web-Pages constraint;
  prompted backups + merge remain the durability story.
- **Full ESM / module namespacing** — `file://` e2e CORS + CJS harness, as in
  pass 1. Mitigated here with a duplicate-export warning in the UMD wrapper.

## Pass 3 (2026-11-08) — "Build all": UX, product, tech-debt pass

Third T2 pass, Khang's explicit "Build all now". Scope is the ranked list from
the PM/architect review. Constraint: every change stays **additive on schema v2**
(no version bump, no storage-key change) so existing v2 payloads and the e2e
seeds keep loading; new fields (`exId`, history `sets`) are optional and
normalized in, exactly like `lastBackup` was.

Decisions:

1. **Stable exercise identity without re-keying the store.** Add an `id` to
   every exercise in `program.js`, stamp `exId` on each state record and history
   entry, and add `store.reconcile(p, DAYS)` on load/import that re-homes a
   record to its current `day:index` when the program order changed. Keeps the
   proven `day:index` keys (and 60 tests) intact while removing the "reorder
   corrupts history" risk.
2. **Per-set history is additive.** History entries gain `sets: [{load,reps,rir}]`
   when a lift completes. Legacy entries fall back to `load×reps×setsDone`.
   Surfaced as a compact "Prev" line on the lift view (not a new screen).
3. **Bodyweight tonnage uses a named constant.** `entryVolume` now values a
   `load: 0` (bodyweight) set at `BODYWEIGHT_KG` (75) per rep, so pull-ups /
   dips / calf raises stop reading as zero volume. One knob, documented.
4. **Rest orchestration gets pure helpers, not a rewrite.** The DOM controller
   stays in `app.js`; the advance / finish / arm decisions move into `rest.js`
   (mirroring `machine.js`) with unit tests. This is the low-risk slice of the
   deferred "dedicated rest controller" that actually adds correctness tests.
5. **Heatmap = 8 Fri/Sat/Sun columns, not 84 cells.** The training week is a
   Fri–Sun block, so the consistency card renders 8 weeks × 3 days — compact
   enough to keep the progress view inside `100dvh`.
6. **Portability = CSV + Web Share, not Apple Health.** Apple Health needs
   native packaging (non-goal); CSV download and a `navigator.share` summary
   give the same "data leaves the silo" value inside a static PWA.
7. **Restore (replace) is exposed.** `importRaw` already existed but was
   unreachable; it becomes a two-tap "Restore (replace)" beside the merge import.

Work items (files): `program.js`, `store.js`, `stats.js`, `rest.js` (new),
`index.html`, `style.css`, `app.js`, `sw.js`, `globals.d.ts`, `jsconfig.json`,
`test/*`, `e2e/*`, `README.md`, `BUILD_LOG.md`, `TASK.md` (WIP only).

Verification: `npm run check`, `npm run typecheck`, `npm run e2e` at 390×667 and
390×844, keeping the no-scroll invariant and the 24-lift program numbers intact.


## Pass 4 (2026-11-08) — "Build all" (PM/architect review, release A+B)

Scope: the ranked review list, limited to changes that can be verified in one
run. Schema v3 is additive on top of the v2 payload; the v2 storage key is kept
so existing data and the e2e seeds keep loading (the key name is legacy, the
payload `v` is authoritative).

Decisions:

1. **A session is a first-class record, but history stays the per-lift index.**
   `active` carries `{id,date,day,startedAt,endedAt,status}`; `sessionLog`
   carries completed sessions with duration. On boot a session from an earlier
   date is finalised (partial sets are preserved in the log) and a new session
   starts for today's training day. Completed data is in `liftHistory`.
   "Sessions" means workouts (distinct dates), not completed lifts.
2. **The set is the unit of truth for aggregates.** History entries keep the
   full `sets[]`; `entrySets()` is the fallback for legacy scalars. Volume, PRs,
   CSV and tonnage read sets, not the last set. Extra sets upsert the same-day
   history entry instead of living only in `state`.
3. **Progression uses the top set, not the last set.** The representative
   `load/reps/rir` and `hitTop` come from the set with the best metric, so a
   strong first set is not erased by a fatigued last set.
4. **Bodyweight is total system weight.** Exercises tagged `bw` value volume at
   `bodyweight + added load`; `progressMetric` takes `{bw, bodyweight}`. A
   user-entered bodyweight replaces the 75 kg constant. This fixes the
   weighted-dip inversion (2.5 kg added used to collapse tonnage/e1RM).
5. **Data safety is a boundary, not a banner.** Corrupt payloads are copied to
   a quarantine key before returning empty and boot never overwrites them;
   every destructive action snapshots the current payload; `save()` failures
   surface; `HISTORY_MAX` rises to 520 (~10 years).
6. **Rest is the preparation surface.** The rest screen gets compact next-set
   load/reps steppers for the current lift; the full workout stays hidden.
7. **Deferred:** ESM migration, controller/store split, block coaching,
   calendar/Shortcuts, History API. Each needs its own T2; doing them here would
   make the data migration and the no-scroll invariant unverifiable in one pass.

Work items (files): `program.js`, `store.js`, `stats.js`, `app.js`,
`index.html`, `style.css`, `sw.js`, `test/*`, `e2e/*`, `README.md`,
`BUILD_LOG.md`, `TASK.md` (WIP only).

Verification: `npm run check`, `npm run typecheck`, `npm run e2e` at 390×667 and
390×844; v2→v3 migration, rollover, extra-set/edit round-trip, bodyweight
volume/metric, corruption quarantine, and no-scroll.

## L9 design (2026-11-08, Muse) — Full rest-controller extraction [T2]

Status: APPROVED by Khang Nov 9, 05:45 CT — building now (after the 5-phase
pipeline). The build contract below pins the exact API, view model and effect
list so the move is mechanical and reviewable. L6/L7/L8 remain proposals.

### Why now, why this seam

`app.js` is 1,394 lines. The rest timer is the most user-critical path
(60% of a session is spent on it, and a wrong advance can end a workout
or jump lifts), and it is currently split across three layers:
- Pure clock in `machine.js` (`idle/start/tick/pause/resume/extend/progress`,
  frozen-clock testable) — already extracted, do not touch.
- Pure decisions in `rest.js` (Batch 1 L1: `restMsg/goLabel/prepVisible`,
  plus `canAdvance/nextLift/armFinish/finishArmed/advanceLabel`) — already
  extracted, do not touch.
- Orchestration + DOM in `app.js` (~250 lines, `app.js:503-750`): `rest`
  (Machine state), `restCtx` (10 fields: `label, pending, pIdx, pDay, note,
  nextText, msg, goAtMs, finishUntil, skipTimer`), `rInt` interval,
  `timerIdle/renderRest/finishRest/tickRest/startRest/renderRestPrep`,
  `plus15` / `pauseBtn` / `timerBar` click / `skipBtn` handlers, and the
  `undoSet` rest-clearing path (`restCtx.pending = false` + `timerIdle`).
Pass 2 deferred the controller for exactly this reason ("no-value refactor
of the most user-critical path in the same pass"). Batch 1 L1 proved the
pure slice can move with byte-identical strings and a green e2e suite.
The remaining move is the controller, not the decisions.

### The seam — what moves, what stays

New file `restctl.js` (same UMD pattern as `machine.js` / `rest.js`,
registered on `window.Gym`, `module.exports` for tests). It owns:
- The orchestration state: `rest` (Machine state) + `restCtx` + `rInt`
  handle, as one opaque controller object created by `createRestController(deps)`.
- The transitions: `start(sec, label, lastSet, note, nextText)`,
  `tick(nowMs)`, `finish()`, `idle(label, msg)`, `pause()`, `resume()`,
  `extend15()`, `skip()` (advance / two-tap finish), `cancelPendingAdvance()`.
  Each transition returns a plain effect list (see below) instead of
  touching the DOM itself.
- The finish-arming timer: `skipTimer` lives in the controller, with a
  `setTimeout` injected via deps (`schedule` / `clearSchedule`) so tests
  can drive it with a fake clock. No real `setTimeout` in unit tests.
- Audio / vibration / notification triggers as effects, not direct calls:
  the controller emits `beep`, `vibrate`, `notify` effects; `app.js`
  performs them (it already owns `beepGo`, `notifyRestDone`, `navigator.vibrate`).

Stays in `app.js` (the DOM shell, unchanged in behaviour):
- All `document.getElementById` / classList / textContent writes
  (`renderRest`, `setRestLabel`, `setRestDetails`, `renderRestPrep` DOM
  writes, `skipBtn.textContent`, `rbarFill` width, `restTime` clock).
  The controller hands the shell a view model (`{phase, secs, progress,
  label, msg, nextText, skipLabel, showPrep, prepName, prepLoad, prepReps}`)
  and the shell renders it — one render function, no logic in the shell.
- The lift / session context the controller needs as deps, not globals:
  `cur`, `idx`, `DAYS[cur].ex.length`, `curSt().done`, `ex().s`,
  `ex().rest`, `firstOpenLift(...)`, `commit()`, `render()`, `timerIdle`
  callers (`undoSet`, `skipBtn` finish path), `pauseSession` / `sInt`.
  These stay in `app.js`; the controller receives them as a deps object
  with the same names, so a future split does not rewire the store.
- `Machine` and `Rest` (pure) stay as they are; the controller calls
  `Machine.start/tick/pause/resume/extend` and `Rest.canAdvance/nextLift/
  armFinish/finishArmed/advanceLabel/restMsg/goLabel/prepVisible`.
  No pure function is re-implemented in the controller.

### Effect list (the contract that makes it testable)

Every controller method returns `{ state, view, effects }` where:
- `state` is the new opaque controller state (for the next call only).
- `view` is the render model above (phase, secs, progress, labels, prep).
- `effects` is an ordered array of `{type, ...}`: `beep`, `vibrate(200)`,
  `notify`, `advanceTo(idx)`, `finishWorkout`, `commit`, `render`,
  `scheduleFinishReset(2600)`, `clearSchedule`.
`app.js` applies effects in order and renders `view`. No effect is
performed inside the controller, so unit tests can assert the exact
sequence (e.g. GO tap within 400 ms of `goAtMs` → no advance; second
tap within the 2,500 ms arm window → `finishWorkout`; manual nav →
`cancelPendingAdvance` clears `pending` so GO cannot jump lifts).

### Invariants that must survive (regression tests, not just e2e)

1. Timestamp-derived clock: rest stays honest across phone sleep — the
   controller never accumulates seconds from the interval; `tick(nowMs)`
   re-derives from `Machine` timestamps, interval stays 200 ms in `app.js`.
2. GO guard: a tap within 400 ms of `goAtMs` is ignored (same tap that
   finished the rest cannot advance).
3. Two-tap finish: last lift done → first tap arms (label "Tap again to
   finish", 2,500 ms window, reset timer at 2,600 ms), second tap inside
   the window finishes; a tap after the window re-arms instead of finishing.
4. Manual nav cancels pending advance: `cancelPendingAdvance` clears
   `pending` whenever the user navigates, so GO never jumps to a lift the
   user did not choose (Pass 2 rest-desync fix, preserved).
5. Pause is a normal pill, paused clock stays full-opacity, message is
   "Paused — tap Resume to continue." (Pass 2 pause fix, preserved).
6. Prep steppers show only when `prepVisible` is true (not idle, not GO,
   not editing, sets still open) — same condition, now computed in the
   controller and rendered by the shell.
7. No-scroll invariant at 390x667 and 390x844; no console errors; program
   numbers unchanged (24 lifts).

### Test plan (for the build batch, not this design)

- New `test/restctl.test.js`: frozen-clock unit tests for every transition
  above, including the 400 ms GO guard, the 2,500 ms finish arm, pause /
  resume / extend15, `cancelPendingAdvance`, and the effect sequences.
  Target: the controller is testable without DOM, timers, or `app.js`.
- Existing e2e suite must pass unchanged at both viewports (rest pause /
  advance / GO / prep-visibility / a11y keyboard order), plus one new e2e
  case: rest survives a simulated sleep (clock re-derived, not accumulated).
- `npm run check` (now 96+ unit, with the new tests), typecheck clean.
- SW bump only if an asset changed (`restctl.js` is a new asset → add it to
  `sw.js` ASSETS and bump `CACHE`, and add the page ref in `index.html`;
  the asset-drift guard in `npm run check` must agree).

### Risks and non-goals

- Risk: the controller is the most user-critical path; a behaviour drift
  here is worse than the tech debt it removes. Mitigation: byte-identical
  strings, same pure functions, effect-list tests, and the full e2e suite
  before/after with no other change in the same batch. If any e2e fails,
  stop and revert the controller move — do not fix forward in the same batch.
- Non-goals: no ESM migration (file:// e2e CORS + CJS harness), no
  IndexedDB, no change to the rest durations / program numbers (those are
  L7/L8 proposals to Khang), no change to the session clock, no UI redesign.
- Rollback: the move is one commit; reverting it restores `app.js` rest
  orchestration exactly (the pure `machine.js` / `rest.js` layers are
  untouched by the move, so a revert does not touch them). 

### L9 build contract (pinned Nov 9, after approval)

`restctl.js` is dependency-free like the other pure modules: `createRestController(deps)`
receives `Machine` and `Rest` as deps rather than requiring them, so it loads in the
browser (`window.Gym.createRestController`) and in Node tests with the same code.

```js
createRestController(deps) → {
  start(sec, label, lastSet, note, nextText) → out
  tick(nowMs)      → out      // interval-driven; re-derives from Machine timestamps
  finish()         → out      // active → GO (tick routes here at zero)
  idle(label, msg) → out
  pause()          → out
  resume()         → out
  extend15()       → out
  skip(fromTimerBar) → out    // advance / two-tap finish / next set
  finishReset()    → out      // the 2,600 ms arm window expired
  cancelPendingAdvance() → out
  view()           → view     // pure snapshot, no state change
}
out  = { state, view, effects }   // state is a read-only snapshot for tests
view = { phase, secs, progress, label, msg, nextText, skipLabel,
         showPrep, prepName, prepLoad, prepReps }
effects = [] | ordered array of
  {type:"beep"} · {type:"vibrate", ms:200} · {type:"notify"}
  {type:"advanceTo", idx} · {type:"finishWorkout"}
  {type:"commit"} · {type:"render"}
  {type:"scheduleFinishReset", ms:2600}
```

deps: `Machine`, `Rest`, `now()`, `cur()`, `idx()`, `dayLen()`, `done()`, `sets()`,
`exRest()`, `editSet()`, `firstOpen(from)`, `prep() → {name, load, reps}`.

Rules (each one is today's app.js behaviour, preserved byte for byte):
- `skipLabel` is `"End rest"` for active/paused, `Rest.advanceLabel(adv, lastLift)` at GO,
  and `"Tap again to finish"` while armed. `nextText` at GO is `ctx.nextText.replace("Up next —", "Up now —")`.
- `skip(true)` ignores a tap within 400 ms of `goAtMs` (the timer-surface shortcut);
  `skip(false)` is the button itself and is never guarded.
- Effect order at GO: `vibrate(200)`, `beep`, `notify`. At next-lift: `advanceTo`, `commit`, `render`.
- `cancelPendingAdvance()` never emits effects and its callers do not re-render.
- `extend15()` at GO restarts a 15 s rest with `ctx.label` (which stays `""`, as today).
- Interval stays in `app.js`: the shell starts it when `view.phase === "active"` and
  stops it otherwise; the controller never touches timers except the injected arm timer.
- `ctx.label` is never written (today it is always `""`); keep that to avoid a string change.

Files: new `restctl.js`; `app.js` (rest block only); `index.html` (script tag before
`app.js`); `sw.js` (ASSETS + `CACHE` `gym-v20`); new `test/restctl.test.js`; one new
e2e that jumps the clock with `page.clock` (simulated phone sleep) and asserts the
remaining time is re-derived, not accumulated.

