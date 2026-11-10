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

Status: BUILT Nov 9, 06:12 CT (Khang approved at 05:45). The build contract
below is what shipped; the two parity drifts found in review are recorded in
`BUILD_LOG.md`. L6/L7/L8 remain proposals.

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
         ticking, showPrep, prepName, prepLoad, prepReps }
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
- Interval stays in `app.js`: the shell starts it only while `view.ticking`
  (phase `active`), and stops it otherwise; the controller never touches timers
  except the injected arm timer.
- `ticking` is false when the two-tap arm froze the clock (old `skipBtn`
  behaviour: `stopInterval()` before the last-lift arm), so "End rest"
  mid-rest on the final lift freezes the display until the workout is
  finished — no silent boost to the rest clock.
- `ctx.label` is never written (today it is always `""`); keep that to avoid a string change.

Files: new `restctl.js`; `app.js` (rest block only); `index.html` (script tag before
`app.js`); `sw.js` (ASSETS + `CACHE` `gym-v20`); new `test/restctl.test.js`; one new
e2e that jumps the clock with `page.clock` (simulated phone sleep) and asserts the
remaining time is re-derived, not accumulated.


## bwKg on history entries (Nov 9, continuous loop)

Bodyweight lifts were valued at the *current* `payload.bodyweight` across all
history, so editing the bodyweight scalar silently rewrote past tonnage, PRs,
movers and the sparkline (a lifter cutting 90→80 kg would see old PRs "drop"
with no new set logged). History entries for bodyweight lifts now carry
`bwKg` (the weight in force when the set was banked); `entryVolume`,
`personalRecords`, `topMovers` and the app's own PR check value each entry at
its own `bwKg`, falling back to `payload.bodyweight` and then 75 for legacy
entries. Nothing in `program.js` changes, and legacy payloads keep today's
numbers because the fallback is the same scalar.

## Imperial units (Nov 9, Khang's request)

The programme's load numbers were always pounds (the leg-press cue is
"45×4 plates" = 180 lb), but every label said kg and the one true metric
value — bodyweight — was stored in kg (default 75). Schema **v4** converts
that scalar and every banked `bwKg` from kg to lb exactly once
(×2.20462), sets the default to 165 lb and the bound to 700 lb, and every
surface that printed `kg` now prints `lb` (progress tonnage, PR, summary,
share text, bodyweight field). Load numbers, steps and programme data are
unchanged. Migration is one-way and idempotent: a v4 payload is never
converted twice; v1/v2 payloads chain through v3 → v4.
Two edges are accepted and documented: (a) an imported bodyweight is only
adopted while the local value is still the 165 default (a user whose real
weight is exactly 165 would have it overwritten by a merge, and a migrated
user at 165.3 never adopts one) — the alternative needs a "user set this"
flag; (b) the field and the store both cap at 700 lb, so an imported value
above that falls back to the default.

## Batch 3 T2: nextLift wrap (Nov 9, Muse)

Problem: `rest.js` `nextLift(idx, len, firstOpen)` falls back to the
literal next index when no open lift exists *after* the current one,
even if that lift is already done — and it never looks *before* the
current lift. Complete lifts out of order (finish lift 1 after 2–7
are done) and GO takes you to a completed lift instead of the one open
lift, or to Finish. The fallback is tested and deliberate, so this is
a contract change, not a silent fix.

Contract (new): search forward from the current lift for the first
open lift; if none, wrap and search from index 0 for the earliest open
lift; only when the whole day is done return −1 (two-tap Finish).
`firstOpen` keeps its current meaning (first open lift after the
current index, or −1); the wrap search is a second pass from 0, and
must not return the current lift itself when it is the only open one
(the current lift is done by construction on the GO path — if it is
somehow open, returning it is correct: the lifter is still on it).
*Clarification (OpenCode, Nov 9): the parenthetical is authoritative — the wrap
returns `idx` when `idx` is the only open lift; the case is unreachable on the
GO path, because `canAdvance` requires the current lift to be complete.*

Files: `rest.js` (the fallback), `restctl.js` (interface unchanged —
`skip()` already handles a −1 by arming Finish), `test/rest.test.js`
(update the existing fallback assertion
`assert.equal(R.nextLift(0, 8, -1), 1)` to the new contract and add
forward-open, wrap-around, and all-done cases), `e2e/rest.spec.js`
(out-of-order completion journey).

Invariants: the 400 ms GO guard and the 2,500/2,600 ms two-tap finish
are untouched; a fully-done day still reaches Finish, never an
infinite advance loop; no program-data change. Rollback: one revert.

## Batch 3 T2: bodyweight resolution helper (Nov 9, Muse)

Problem: "Banked `bwKg` wins, else current bodyweight, else 165" is
re-implemented in `app.js` `bwFor` and three separate inline ternaries
in `stats.js` (`entryVolume`, `personalRecords`, `topMovers`'
`optsFor`). A future change to the rule must be made in four places to
stay consistent.

Design: add one exported pure helper in `stats.js`,
`resolveBodyweight(entry, fallback)`, implementing the rule exactly as
it exists today — banked `bwKg` when it is a finite number in range,
else `fallback` (the payload bodyweight), else 165. `app.js` `bwFor`
and the three `stats.js` call sites call it instead of inlining the
ternary. No change to the rule itself, no change to any number: the
byte-identical-outputs requirement is verified by the existing suite
plus a before/after spot check on a bodyweight lift's tonnage.

Files: `stats.js` (helper + three call sites), `app.js` (`bwFor`),
`test/stats.test.js` (helper tests: banked wins, fallback, invalid
banked value), `test/enhancements.test.js` (only if it covers
`bwFor`). Rollback: one revert. Note: the 165-default merge ambiguity
(a real 165 lb bodyweight being clobbered by a merge) is NOT fixed
here — that needs a `bodyweightSet` schema flag (BACKLOG, Khang's
call); this item only de-duplicates the rule.

## Batch 4 T2: corrupt-payload salvage (Nov 9, Muse)

Problem: `store.js` `load()` treats any unparseable payload as a total
loss — `migrate()` returns null, the raw bytes are quarantined, and an
empty payload is returned. The history (the valuable part: months of
logged sets, the input to `suggestLoad`) is invisible until the user
downloads the quarantine file, repairs it by hand, and re-imports it.
B3-21 only fixed the bar copy. The deeper fix recovers what still
parses instead of dropping everything.

Contract: `load()` keeps its current behaviour when the bytes parse
cleanly. On failure it attempts salvage before returning empty:
- Case A (JSON.parse throws): scan the raw string for the
  `"liftHistory"` object and the `"sessionLog"` array and pull out
  each per-key array / each log entry whose brackets balance, then
  JSON.parse each piece separately. A piece that parses goes through
  the existing `sanitize` path (`normalize` / `sanitizeEntry`), so
  hostile keys are still stripped exactly as on a clean import.
- Case B (parses but is not a usable payload — non-object, unknown
  version): salvage any top-level `liftHistory` / `sessionLog`
  field that is itself an object, through the same sanitize
  path. (`state` is not salvaged even here — see the next bullet.)
- Only `liftHistory` and `sessionLog` are salvaged. Working-load
  `state` is not — it falls back to `getLift()` defaults, and
  suggestions derive from history anyway, so salvaged history
  restores them.
- Result: `load()` returns the salvaged payload with
  `loadError = { kind: "salvaged", recovered: N, dropped: M }`
  (N = entries recovered, M = pieces that failed to parse). The
  quarantine bytes stay intact. Boot must NOT call `commit()` while
  a load warning is active (the B3-02 rule, extended to this kind),
  so the salvaged payload lives in memory only until the user acts:
  the bar names the recovered count, offers the quarantine download,
  and offers "Keep recovered log", which explicitly saves.
- A payload that salvages to zero entries behaves exactly like today
  (empty log, corrupt bar).

Files: `store.js` (salvage in/around `migrate` + `load`, export the
salvage helper for tests), `app.js` (salvaged bar copy + "Keep
recovered log" action, boot no-commit rule), `test/store.test.js`
(fixtures: JSON truncated mid-array, garbage prefix, one corrupt
entry among good ones, unknown-version object with good history;
assert recovered counts, hostile keys stripped, quarantine bytes
intact, no auto-commit while the warning is active),
`e2e/pass3.spec.js` (seeded corrupt store → bar names the recovered
count → Keep → reload shows the recovered sets).
Invariants: quarantine bytes are never overwritten by salvage; a
clean payload takes the exact old path (no behaviour change); hostile
keys cannot survive salvage (same sanitize path as import); no
program-data change. Rollback: one revert.


## Batch 5 T2: lift-page redesign (Nov 9, Muse)

Khang's direction (Nov 9): the lift page "can be improved,
especially this page — empty space, lots of text together at the
top"; Batch 5's focus is user workflows; he asked to wake up to a
huge design change. This is that change. Scope: the lift view only.
The rest screen's layout is untouched (B5-02 changes only what the
rest prep steppers edit, not how the rest screen looks).

Evidence (UX audit, Nov 9, at `0d4ed1a`): five text layers stack
above the first set row — lift name; reps · load at display size
(`app.js:412-414`); RIR · rest line; cue clamped to 3 lines; tempo
line — and the set log hugs its rows (`style.css:128`
`.setlog{flex:0 1 auto}`) while `.adjust{margin-top:auto}`
(`style.css:139`) pins the controls to the bottom, leaving a
~150–190 px void at 390×844. The capped spacers from Nov 8 lived in
the pre-split single-file layout; the current split layout has no
spacer elements — the void is purely this flex behaviour.

Decisions:

1. **Three blocks at the top, not five layers.**
   (a) Lift name — display size, unchanged position, still the
   focus target on open.
   (b) ONE prescription meta line at secondary size: reps range ·
   load · RIR · rest — the same data the two stacked lines carry
   today. The meanings are NOT merged: this line stays the target,
   the steppers stay the working values, set rows stay the
   actuals. The fix is typographic — the reps · load half leaves
   display size — not semantic.
   (c) ONE guide block: cue and tempo in a single block — cue
   text, then the tempo as a muted continuation; combined clamp
   2 lines. **Tempo decision, explicit:** B3-26 deliberately made
   the tempo line show on every lift; that decision stands —
   tempo stays visible on every lift and simply stops costing a
   full stacked line of its own. `#cueLine` and `#tempoLine` both
   remain in the DOM, so B3-26's e2e keeps passing.
2. **The set log absorbs the slack.** `.setlog` becomes
   `flex:1 1 auto`; set rows grow to fill the log region
   (min-height 44 px, content vertically centred); `.adjust`
   loses `margin-top:auto`. The gap between the last set row and
   the adjust cluster is the normal section gap at every viewport
   height — the void is gone by construction, and set rows become
   bigger tap targets mid-workout. Row state styling (next set /
   done) unchanged.
3. **Absorbed fixes (same files, same item).** `.rir` returns to
   44 px in the `max-height:720px` block (`style.css:294` has
   40 px; reclaim the 4 px from row spacing there). Set Done's
   edit-state `aria-label` starts with its visible text
   ("Done editing — …", `app.js:425-426`).
4. **Preserved positions (muscle memory).** Set Done full-width
   ~60 px at the bottom, always visible (lift, peek, edit states);
   steppers directly above the RIR row; RIR row directly above
   Set Done; set rows tap-to-edit in place; Undo / Restart pills
   in the set-header row; header unchanged; opening a lift still
   moves focus to the lift name.
5. **Measure, don't eyeball.** Before changing CSS, record at
   390×844 the top-stack height (nav-row bottom → first set-row
   top) and the setlog → adjust gap, and record both pairs in
   `BUILD_LOG.md`. Acceptance (from the prototype numbers below):
   gap ≤8 px in the default state (suggestion / Prev / sparkline
   bars hidden — when one is visible it occupies that space by
   design), and the top stack ≥20% shorter than its recorded
   baseline on a short-cue lift. The two levers in decision 1
   alone land at −16% there, so this item also tightens the
   `.sethead` vertical margins by ~10 px total to close the gap.
   The meta line must show its full text on the longest
   prescription in the program (no ellipsis) — assert it in e2e.

**Prototype check (Muse, Nov 9, scratch clone at `d1e18e3`,
nothing pushed):** the design's core bet is proven. Gap
141.9 → 0 px at 390×844 (47.3 → 0 at 390×667); set rows grew
44 → 103 px (844) / 65 px (667); `scrollHeight` == viewport at
both sizes; zero console errors; the full lift-view e2e set
stays green except the old-contract sizing spec this item
updates. Measured stack: 217.8 → 182.6 px (−16.2%) before the
`.sethead` trim in decision 5 — the meta line does −37 px of
that; the guide block saves ~0 on 1-line cues and ~18–40 px on
2–3-line cues. Two care notes: the peek-mode cue clamp
(`.app.resting.show-details .cue`) goes inert once the cue sits
inline in `.guide` (the guide's 2-line clamp supersedes it) —
eyeball peek once at both viewports during the build; and the
hidden bars named in decision 5 sit between the log and
`.adjust`, so judge the gap in the default state.

Non-goals: no `program.js` change, no schema change, no
rest-screen layout change, no string changes (cue / tempo /
prescription strings verbatim — only size and arrangement move),
no new elements beyond a wrapper the guide block needs.

Invariants: one screen, no scroll at 390×667 and 390×844; no
overflow; no console errors; every interactive target ≥44 px at
both viewports (including `.rir` at 667). The existing set-log
sizing e2e asserts the old hug-the-rows contract — update its
geometry assertions to the new contract (rows ≥44 px, log fills
the region, gap ≤8 px); do not delete the spec. Full gate per
`AGENTS.md`.

Files: `style.css`, `app.js` (render / aria only), `index.html`
(guide wrapper only if needed), `e2e/*` (new geometry spec +
sizing-spec update), `sw.js` (bump). Rollback: one revert.
