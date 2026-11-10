# QUEUE — Batches 1–3

Base HEAD: `6b3ffd6` (set-log sizing fix, Nov 9 11:12 CT; SW `gym-v37`, 154/154 unit, 65/65 e2e, CI green).
Status: BATCH 3 QUEUED — Nov 9, from three Muse audits (code, UX, science) against the post-pipeline repo. Batch 1 (L1–L5) complete and verified by Muse at `b7d61f0`; Batch 2 (B1–B3) complete and self-reviewed by OpenCode at `9556a73`; L9 rest controller built and verified (145/145 unit, 48/48 e2e, SW `gym-v20`); pipeline Phases 1–5 + Pass 2 done. Their specs below are history, do not re-run them.
Batch rules: one item at a time, in order. Finish an item (all
verification green + `BUILD_LOG.md` line + `LOOP_STATE.md` update),
then copy the next item's spec into `TASK.md` and start it. When the
queue is empty, stop and wait for Muse — do not invent the next
item. Every item: `npm run check`, `npm run typecheck`,
`npm run e2e` at 390×667 and 390×844, no overflow, no console
errors. Program data (`program.js` numbers) is read-only in every
item. If verification fails, log it and STOP — do not move on.

Re-check summary (Muse, Nov 8 — read against Pass 4 source):
- L1 revised: full rest-controller extraction is T2 (needs a Muse
  DESIGN first; rest is the most user-critical path and Pass 2
  deferred the controller for that reason). This batch takes the
  safe pure slice instead; the full extraction is new backlog item
  L9 [T2].
- L2: timing looks correct in source (`app.js:967` — prompt only
  when the lift finishes with last RIR ≤1); this item verifies it
  with e2e rather than assuming it. One flagged lift is outside
  the research list (see L2).
- L3 revised: Pass 4 `sessionLog` now carries `day` +
  `durationSec` + `status`, so the comparison is finally
  measurable — but OpenCode has no access to Khang's phone
  localStorage and sessions are brand new, so expect
  "insufficient data" and no constants change.
- L4: concrete sub-44px controls found in Pass 4 CSS (see L4).
- L5: Pass 4 extended sanitization to sessions; existing hostile
  coverage is one test. Precise probes listed in L5.

## L1 — Rest decisions into rest.js (pure slice) [T1] — ACTIVE

Why: `restCtx` still lives in `app.js` (1,397 lines, ~20 touch
points) and the pure rest decisions sit beside the DOM. `rest.js`
already holds `canAdvance` / `nextLift` / `armFinish` /
`finishArmed` / `advanceLabel`. Finish that slice.

Do:
- Add to `rest.js` (pure, unit-tested, same UMD pattern):
  `restMsg(note, sec, baseRest)` — "Add bottom-half partials to
  failure — then rest." when `note` is `"partials"`, else
  "Stretch — set up the next set.", prefixed with
  "+30s for 0–1 RIR · " when `sec > baseRest`. Strings move
  verbatim — no wording changes.
  `goLabel(adv, isLastLift)` — "Lift done — next up." /
  "Workout complete — nice work." / "Next set — go." (the three
  states in `finishRest`).
  `prepVisible(phase, editSet, done, sets)` — true only when the
  phase is neither IDLE nor GO, `editSet < 0`, and `done < sets`
  (the `renderRestPrep` show-condition).
- Wire `app.js` (`startRest`, `finishRest`, `renderRestPrep`) to
  call them. No behaviour change.
- Unit tests in `test/rest.test.js` for all three, including edges
  (+30s only when `sec > baseRest`; all three GO labels; prep
  hidden at GO / IDLE / while editing / when the lift is done).

Do not: move `restCtx` itself, rewire `Machine`, change any
user-visible string, touch `program.js`.
Files: `rest.js`, `app.js`, `test/rest.test.js`.
Verify: `npm run check`, typecheck, e2e (rest pause / advance /
GO + prep-visibility paths). `BUILD_LOG.md` one line.

## L2 — Audit the lengthened-partials prompt [T1]

Why: research says partials only after full-ROM failure, on the
last set, for calves, leg extensions, curls, laterals, flys.
Source (`app.js:967`) fires the prompt only when the lift
finishes (`finished`) with `partial: 1` and last RIR ≤1 — which
looks right. Verify it instead of assuming it.

Do:
- e2e (extend `e2e/features.spec.js`): on a partial lift (e.g.
  Fri leg extension) the partials message appears only after the
  final set with last RIR ≤1; it does not appear after set 1/2;
  it does not appear when the last set's RIR is ≥2; a non-partial
  lift never shows it.
- Audit the flagged set against `RESEARCH.md`: 9 of 10 flagged
  lifts match (flys, leg ext, laterals, curls, calves). The
  outlier is Sun overhead cable extension (triceps) — it is NOT
  in the research list. Record that as an open question in
  `BUILD_LOG.md` and `RESEARCH.md`. Do NOT change the flag —
  that is program data, Khang only.
- If the e2e finds a timing bug, fix the timing in `app.js`
  only (prompt timing, not the flag, not the message wording).

Files: `e2e/features.spec.js`, `app.js` (only if a timing bug is
found), `RESEARCH.md` (open-question note).
Verify: new e2e green at both viewports, no-scroll intact,
`npm run check` + typecheck green.

## L3 — Day-time model vs real sessions [T1, audit]

Why: day length is still estimated as 50 s/set + rest + 60 s
transition (`program.js` `dayMins`, `SET_SECS`/`TRANSITION_SECS`).
Pass 4 `sessionLog` entries now carry `day`, `durationSec`,
`status: "complete"`, so estimate vs actual is measurable with a
pure function — but real data lives only on Khang's phone, and
sessions are brand new.

Do:
- Add pure `Stats.sessionDrift(payload, day)` in `stats.js` (no
  DOM, no "now", deterministic): from completed `sessionLog`
  entries for that day with `durationSec > 0`, return
  `{ n, estimateMin, medianActualMin, driftPct }`; return
  `{ n, insufficient: true }` when n < 3. Export it.
- Unit tests in `test/stats.test.js` with fixtures: 0 sessions →
  insufficient; 1–2 → insufficient; ≥3 → median + drift math;
  non-complete / zero-duration entries ignored.
- Report in `BUILD_LOG.md`: per-day n and drift from fixtures
  only, plus the plain statement that the real-data verdict is
  pending (no phone data available to this session; sessions are
  brand new). No constants change, no UI change in this item.

Files: `stats.js`, `test/stats.test.js`.
Verify: `npm run check`, typecheck green. No behaviour change
to the app itself.

## L4 — Accessibility pass [T1]

Why: focus trap + GO assertive + Set Done pressed state shipped
in Pass 2. Measured against Pass 4 CSS, these controls are
below the 44 px target: `.mini` lift arrows 44×36,
`.resetlift` (Trend / Undo / Restart) 30 px tall, `.applybtn`
30 px (28 px short-phone), `.bbdismiss` 26×26, short-phone
`.stepbtn` 40×40 + `.setrow` 38 px min-height, peek-strip
`.tbtns button` 40 px, peek `.detailsbtn` 42 px. Rest arrows
are already out of the tab order (`.rnav{display:none}` while
resting) — verify, don't assume.

Do:
- e2e bounding-box assertions at 390×667/844 for each control
  above; fix the ones that fit without breaking the no-scroll
  invariant (hit area via padding/min-height, not layout
  redesign). Anything that does not fit stays as an open item
  in `BUILD_LOG.md` + `LOOP_STATE.md` phone-check list with
  its measured overflow cost — do not force it.
- Compute WCAG contrast ratios for `--ink` / `--muted` /
  `--faint` on `--bg` / `--surface` in both themes; report the
  numbers; fix any normal-text pair under 4.5:1 if fixable
  without a redesign.
- Keyboard Tab through the rest screen: verify the order is
  +15 / Pause / End rest / Show workout / Undo / prep steppers
  and that hidden controls (rest arrows, peek-hidden items)
  are not reachable; fix code-only tab-order issues.

Files: `style.css`, `index.html`, `app.js` (only if a focus fix
needs it), `e2e/*`.
Verify: e2e viewport checks at both sizes, no-overflow gate
green, `npm run check` + typecheck green.

## L5 — Security audit: import + service worker [T1]

Why: Pass 4 extended sanitization to sessions
(`sanitizeSession`), but existing hostile coverage is a single
test (numeric strings → 0). The merge path assigns incoming
keys into plain objects (`store.js` `mergePayload`), so
prototype keys are the precise thing to probe — not assert.

Do (probe, then fix only what fails):
- Add tests in `test/store.test.js`: `__proto__` /
  `constructor` keys in `state`, `liftHistory`, and
  `sessionLog` via `importRaw` / `importMerge` — assert
  `Object.prototype` is unpolluted and the merged result is
  sane; numbers `1e999` / `Infinity` via JSON; non-array
  `sets`; hostile session `lifts` (non-object, hostile
  numbers); huge payload (size guard still holds).
- Fix failures in `store.js` sanitize/merge only. No schema
  change, no program-data change.
- Verify SW discipline: `CACHE` is `gym-v7` (bumped in Pass 4);
  `npm run check` includes the asset-drift guard — confirm
  green and note it in `BUILD_LOG.md`.
- Write the threat-model paragraph in `PLAN.md` (one paragraph:
  trusts = Khang's own backups + `origin main` commits by
  Khang/Muse; does not trust = imported JSON, any other commit
  author, SW cache contents; boundary = localStorage only, no
  network exfiltration).

Files: `store.js` (only if a probe fails), `test/store.test.js`,
`test/size.test.js`, `PLAN.md`.
Verify: new hostile-payload tests green, `npm run check` +
typecheck + e2e green, no behaviour change.

---

# BATCH 2 — Hardening follow-ups from Muse's Batch 1 review (Nov 8, 20:50 CT)

Base HEAD: `b7d61f0`. Status: QUEUED — approved by Khang Nov 8, 20:53 CT.
Batch rules (same as Batch 1): one item at a time, in order. Finish an item
(all verification green + `BUILD_LOG.md` line + `LOOP_STATE.md` update),
then copy the next item's spec into `TASK.md` and start it. When the queue
is empty, stop and wait for Muse — do not invent the next item. Every item:
`npm run check`, `npm run typecheck`, `npm run e2e` at 390x667 and 390x844,
no overflow, no console errors. Program data (`program.js` numbers) is
read-only in every item. If verification fails, log it and STOP — do not
move on.

Review findings that seeded this batch (Muse, independent clone at `b7d61f0`,
unit 96/96 + typecheck clean verified):
- A null state record crashes `mergePayload` — reproduced: base with
  `state["fri:0"]` done 1, incoming `state["fri:0"]: null` via JSON →
  `Cannot read properties of null (reading 'done')` at `store.js:440-442`
  (`theirs.done`). Same class of crash at `migrateV2` (`store.js:206`,
  `out.state[k].done`) and `resetDay` (`store.js:571`, `p.state[k].done = 0`
  with no null guard, unlike `startSession` which has `if (!rec) continue`).
  Root cause: `sanitizeRecord` returns null/non-object records as-is, so
  null survives `normalize()` and reaches every consumer.
- Nested `__proto__` inside a single record survives `sanitizeRecord` —
  reproduced via JSON: `state["fri:0"].__proto__` is an own property after
  `importRaw`, `Object.prototype.evil` stays undefined (inert today: no
  `Object.assign` / spread on records in `app.js` / `store.js`), but it
  must not survive the store boundary.
- `npm run check` fails on Node 24 (`node --test test/` →
  `Cannot find module '/tmp/.../test'`), while `node --test test/*.test.js`
  and plain `node --test` both give 96/96 on Node 24. CI uses Node 20, so
  CI should pass — but the script is fragile. Fix the script, do not
  change the tests.

## B1 — Null / non-object records: sanitize at the boundary, guard every consumer [T1] — ACTIVE

Why: a corrupt or hostile backup with a null record must never crash the
app. Today it crashes merge, and can crash migrate/resetDay the same way.

Do:
- In `store.js`, make `sanitizePayload` / `normalize` drop or replace
  null / non-object values in `state`, `liftHistory` entries, `sessionLog`
  entries, and session `lifts` values, before any consumer reads them.
  A dropped state record must be re-created by `getLift()` defaults on
  next read (verify that path in a test — do not invent a new default).
  Prefer: drop the null record in sanitize, keep the key absent, so
  existing `getLift` / `curSt` defaults apply exactly as for a fresh lift.
- Guard the known crash sites even if sanitize drops nulls (defence in
  depth, cheap): `mergePayload` (`theirs` null/non-object → skip that key),
  `migrateV2` (`out.state[k]` null → treat as not-done), `resetDay`
  (`p.state[k]` null → skip, same guard as `startSession`).
- Do not change the merge winner rule, history union, session log, schema,
  or any program data. No UI change.

Tests (in `test/store.test.js`, follow the L5 HOSTILE_RAW pattern — build
the hostile payloads as JSON strings, not JS object literals, so
`__proto__` is an own key):
- `importMerge` with incoming `state["fri:0"]: null` over a base with
  `fri:0` done 1 → no crash, base record kept, `Object.prototype` clean.
- `importRaw` with `state["fri:0"]: null` → no crash, record absent or
  defaulted, app can read it via `getLift` / `curSt` without crashing.
- `migrateV2` path (v2 payload with a null state record) → no crash.
- `resetDay` with a null state record for that day → no crash.
- `mergePayload` with incoming `liftHistory["fri:0"]: [null, {...}]` and
  `sessionLog: [null]` → no crash, nulls dropped (already verified by
  Muse on `b7d61f0` — lock it in as a test, do not regress it).

Files: `store.js`, `test/store.test.js`.
Verify: `npm run check`, typecheck, e2e at both viewports, no-scroll
intact, `BUILD_LOG.md` one line. SW bump only if an asset changed
(`store.js` changed → bump `CACHE`, as in L1/L3/L5).

## B2 — Nested unsafe keys inside records / entries / sessions [T1]

Why: L5 stripped unsafe keys from the top-level maps (`state`,
`liftHistory`, session `lifts`), but not inside the record itself.
`state["fri:0"].__proto__` survives `importRaw` today.

Do:
- In `store.js`, call `stripUnsafeKeys` at the start of `sanitizeRecord`,
  `sanitizeEntry`, and `sanitizeSession` (and on session `lifts` values
  after `sanitizeRecord` — verify the lifts values are covered, do not
  assume). Reuse the existing `unsafeKey` / `stripUnsafeKeys` helpers;
  do not invent a new list — `__proto__`, `constructor`, `prototype` only.
- A record that is only unsafe keys after stripping must still be a valid
  record (numbers coerced to 0 / defaults by the existing coerce logic) —
  do not drop the whole lift.

Tests (in `test/store.test.js`, JSON-string payloads):
- `importRaw` with `state["fri:0"] = {"done":3, "__proto__":{"evil":1}}`
  → no own `__proto__` on the record, `Object.prototype.evil` undefined,
  `done` still 3.
- Same for a history entry (`liftHistory["fri:0"][0]`) and a session
  (`sessionLog[0].lifts["fri:0"]` and the session object itself).
- `importMerge` with a nested-`__proto__` record → same assertions, merge
  winner rule unchanged.

Files: `store.js`, `test/store.test.js`.
Verify: `npm run check`, typecheck, e2e at both viewports. SW bump only
if an asset changed.

## B3 — Fix the Node test script (`node --test test/` fails on Node 24) [T1]

Why: `npm run check` fails on Node 24 in Muse's VM because
`node --test test/` does not resolve the folder there. Both
`node --test test/*.test.js` and plain `node --test` give 96/96 on
Node 24 at `b7d61f0`. CI uses Node 20, so this is fragility, not a
CI failure — fix it before it bites the Mac or a Node upgrade.

Do:
- In `package.json`, change `"test": "node --test test/"` to
  `"test": "node --test test/*.test.js"` (explicit glob, the form Muse
  verified at 96/96). Do not use plain `node --test` — the glob is
  explicit about which files are unit tests and cannot pick up future
  non-test files by discovery.
- Verify the new script in `npm run check` (which runs the test script)
  on the Mac's Node, and confirm CI still uses Node 20 in
  `.github/workflows/ci.yml` (no change needed there unless the glob
  needs quoting on that shell — check, do not assume).
- If the glob does not expand on any shell in the loop (Mac sh / CI),
  stop and report it as a finding instead of trying a second form
  without Muse — the script is the gate for every future item.

Files: `package.json` only (plus `BUILD_LOG.md` line).
Verify: `npm run check` green end-to-end (not just the unit step),
typecheck, e2e at both viewports. No code change, no SW bump needed
(no asset changed — confirm the asset-drift guard agrees).

---

# BATCH 3 — Long build queue (Nov 9, Muse audits)

Source: three read-only audits Nov 9 (code, UX, science), read against HEAD `fccd85b`; base moved to `6b3ffd6` by two style-only commits (set-log sizing — `style.css` + `sw.js` CACHE only) that touch none of the audited logic. Every T1 below was checked against source by Muse before queuing (spot-verified file:line in the spec); the science items that unblock L7/L8 are T3 proposals in `BACKLOG.md`, not builds. Order is value ÷ risk, highest first. **This queue is long (33 T1 + 2 T2) by Khang's explicit ask — one go, no back-and-forth.** If the session gets long, finish the current item, checkpoint in `LOOP_STATE.md`, and stop; Khang restarts with the same loop prompt and work resumes from the checkpoint. Do not skip items, do not reorder, do not batch two items into one commit.

Batch rules (same as Batches 1–2): one item at a time, in order. Finish an item (all verification green + `BUILD_LOG.md` line + `LOOP_STATE.md` update), then copy the next item's spec into `TASK.md` and start it. When the queue is empty, stop and wait for Muse — do not invent the next item. Every item: `npm run check`, `npm run typecheck`, `npm run e2e` at 390×667 and 390×844, no overflow, no console errors. Program data (`program.js` numbers) is read-only in every item. Bump the SW `CACHE` whenever an asset changes. If verification fails, log it and STOP — do not move on.

## B3-01 — Mid-rest finish-arm freeze [T1] — ACTIVE

Why: the one genuine bug in the audits, rest-critical, verified by Muse in source. After the final lift, tapping "End rest" once and hesitating >2.6 s freezes the rest clock and strands the finish flow: each later tap just re-arms. (TASK.md's L9 note claims this was "found in review and fixed" — it was not; the code at HEAD still does it.)

Do:
- In `restctl.js`, make `finishReset()` clear `finishUntil` AND `ctx.frozen` in all phases, not only when phase is `"go"` (today `finishReset()` returns early unless phase is `"go"`, so on an active rest the arm and the freeze survive the 2,600 ms window; `skip()` sets `ctx.frozen = true` when arming mid-rest, and `view()` stops ticking while frozen).
- In `app.js`, repaint the rest view unconditionally when the 2,600 ms `scheduleFinishReset` timer fires (today it repaints only `if (o.view.phase === "go")`, so the stale "Tap again to finish" label is never repainted mid-rest).
- Update the existing unit test that documents this as parity ("End rest on the last lift arms and freezes the visible clock" in `test/restctl.test.js`) to the new behaviour; do not keep a test asserting the bug.

Do not: change the two-tap arm itself, the 2,600 ms window, the 400 ms GO guard, or any other rest behaviour.
Files: `restctl.js`, `app.js`, `test/restctl.test.js`.
Verify: unit test — arm mid-rest, advance the fake clock past the window, call `finishReset()` → `view.ticking` true again, skip label back to "End rest"; e2e with `page.clock` — complete all 8 lifts, tap "End rest" during the final rest, wait 3 s, assert the clock is ticking again and the button reads "End rest". Full gate green.

## B3-02 — Future-version payload is silently wiped at boot [T1]

Why: `load()` detects a newer-version payload, saves a copy to `gym-tool-v2-future`, and returns an empty payload — but the boot path never tells the user and immediately overwrites the store with the empty payload. The copy survives but there is no accessor and no UI to retrieve it, so the data is effectively lost. Reachable in practice: a stale cached SW serving an old `app.js` after a newer build wrote a newer schema. Verified by Muse: `store.js:319` (`p.v > CURRENT` → `{__future: p}`), `:336-341` (writes `-future`, returns empty), `app.js:1375` (only `kind === "corrupt"` sets `dataWarn`, `"future"` ignored), `app.js:1395` (`else commit()` overwrites STORE with the empty payload), `store.js:726` exports only `quarantineRaw`.

Do:
- In `store.js`, add a `futureRaw()` export (same shape as `quarantineRaw()`, reading `STORE + "-future"`).
- In `app.js`, add a `"future"` branch to `syncSaveBar` / `saveBarAction` offering download of the future copy, mirroring the corrupt branch (bar text must say the saved data is from a newer version and the log on screen is empty; do not auto-restore it, do not delete the `-future` copy).
- Do not change the load behaviour itself (empty payload + preserved copy stays).

Files: `store.js`, `app.js`.
Verify: unit test seeding `v: 99` → `load()` returns empty and preserves the bytes; e2e seeding a `v: 99` payload → bar visible, STORE bytes intact after boot, download returns the original JSON. Full gate green.

## B3-03 — SW e2e harness (HTTP, not `file://`) [T1]

Why: every e2e spec uses `file://…/index.html`, where service workers can't register. All SW behaviour (install, offline shell, SWR, B3-04's bugs) is unexercised, and CI can't catch an SW regression. This item gates B3-04's verification.

Do:
- Add `e2e/sw.spec.js` that starts a tiny `node:http` static server in `beforeAll` (self-contained, no `playwright.config.js` change), serves the repo root, and asserts: first load registers the SW; offline reload serves the shell; a 500 on `app.js` still loads from cache (this last assertion must FAIL before B3-04's fix and pass after it — write it now, leave it failing, and note that in `BUILD_LOG.md`; do not weaken it to pass early).

Files: `e2e/sw.spec.js` (new).
Verify: run the new spec; the first two assertions green, the 500 assertion failing as expected pre-B3-04. Full gate green otherwise.

## B3-04 — SW caches error pages as the shell and serves errors instead of cached assets [T1]

Why: two `res.ok` gaps in the offline path — the app's core promise is "works in the gym basement". (a) The navigation handler caches *any* response as `./index.html`, so one transient 500/404 from Pages permanently poisons the offline shell until the next successful online load. (b) The asset SWR handler returns a non-ok revalidation response to the page instead of the good cached copy, so a transient 500 on `app.js` breaks the app even though a valid copy is cached. Verified by Muse in `sw.js:30-41` (no `res.ok` check on the navigation `put`) and `:62-64` (a 404/500 falls through to `return res`).

Do:
- Guard both `put`s with `res.ok`; when revalidation is not ok, return the cached `hit` instead of the error response. Do not change the 304 path, the conditional-revalidation headers, or the cache-first/offline behaviour otherwise.

Files: `sw.js` only.
Verify: B3-03's spec now fully green (in-test server returns 500 for `app.js` after first load → app still loads from cache; navigation 500 → offline shell still serves). SW `CACHE` bump. Full gate green.

## B3-05 — `finalizeSession` logs phantom empty sessions [T1]

Why: the no-data guard requires `!a.startedAt`, so a session whose clock was started but in which nothing was ever logged still gets a `sessionLog` entry with empty `lifts`. Reachable via `rollSession`: tap Start on the session pill, do nothing, open the app the next day. Consequences: the Progress "Workouts" count inflates, and a phantom entry with `durationSec > 0` pollutes `sessionDrift`'s median (L3's audit), since that function only filters on `status === "complete"` and `durationSec > 0`. Verified by Muse: `store.js:466` (the guard) and `:507` (`rollSession` finalizes whenever status isn't complete or data exists).

Do:
- In `store.js`, drop the `!a.startedAt` condition — return null whenever there is no data and no existing entry for the id. Keep the existing-entry update path (a session that already has a `sessionLog` entry still updates it).

Files: `store.js`, `test/store.test.js`.
Verify: unit test — start clock, finalize/roll with no lifts → no `sessionLog` entry, `sessionCount` unchanged; existing-entry update still works. Full gate green.

## B3-06 — Undo of an extra set leaves a stale history entry [T1]

Why: `undoSet` pops today's history entry only when the lift drops *below* its scheduled sets. Undoing an extra set (4→3 on a 3-set lift) truncates the in-memory set array but leaves the banked entry showing 4 sets — so Prev, tonnage, PRs and CSV overstate by one set until the next bank. Verified by Muse in `app.js:670-685` (the pop is inside `if (wasComplete && s.done < ex().s)`; no re-bank when still complete).

Do:
- In `app.js` `undoSet`, when the lift is still complete after the undo, call `bankLift(cur, idx)` to re-bank the current set array (same function the set-done path uses at `app.js:785`).

Files: `app.js`.
Verify: e2e — complete a lift, add an extra set, undo once, read `localStorage` history entry → 3 sets, not 4. Full gate green.

## B3-07 — Restart-lift takes no snapshot [T1]

Why: every other destructive path snapshots first (reset day, clear all, restore, merge), but `doRestartLift` doesn't. `resetLift` pops today's history entry for that lift. Worse, the "Undo last reset / restore" button stays visible from an *older* snapshot, so after a lift restart a user tapping it expecting the lift back gets a snapshot that may predate hours of work, with no staleness warning. Verified by Muse in `app.js:986-991` (`doRestartLift` → `Gym.resetLift` → `commit`, no `Gym.snapshot`).

Do:
- In `app.js` `doRestartLift`, snapshot first with label `"pre-restart-lift"` (same `Gym.snapshot` shape the other destructive paths use), so "Undo last reset / restore" restores the pre-restart state.

Files: `app.js`.
Verify: e2e — complete a lift, restart it, tap "Undo last reset / restore" → the lift's history entry is back. Full gate green.

## B3-08 — Import-merge silently adopts the incoming backup's day/lift cursor [T1]

Why: merging a backup is for reconciling history across devices. Instead it can yank the lifter mid-workout to a different day and lift (whatever the other device was looking at), with no message saying so. Cursor position is device-local state, not history. Verified by Muse: `store.js:598-599` copies `incoming.cur` / `incoming.idx` into the merged payload; `app.js:1274` then sets `cur`/`idx` from it. (Full replace via `importRaw` correctly adopts the cursor — only the merge path is wrong.)

Do:
- Delete the two `cur`/`idx` lines from `mergePayload`; keep the base payload's cursor. Nothing else in the merge changes.

Files: `store.js`, `test/store.test.js`.
Verify: e2e — seed `cur: "fri", idx: 2`, import a backup with `cur: "sun", idx: 5`, assert the app is still on Fri lift 3. Full gate green.

## B3-09 — "Import backup" is unreachable by keyboard [T1]

Why: the one data-recovery path a keyboard/switch user needs is mouse-only. "Restore (replace)" next to it is a real button; Import is a `<label>` wrapping a hidden file input, and labels aren't focusable, so Tab never reaches it and Enter can't activate it. Evidence: `index.html:175` (label + hidden input); the modal's Tab trap lists `label.modalbtn` among focusables but it can never receive focus. Compare `index.html:176` / `app.js:1230-1241`, where Restore is a button that clicks its hidden input.

Do:
- Make Import a button that clicks `#importFile`, exactly like `replaceBtn` does. Keep the same styling and the same change handler.

Files: `index.html`, `app.js`.
Verify: e2e keyboard test — open the menu, Tab to Import, press Enter, assert the file picker opens (or the input receives a click). Full gate green.

## B3-10 — The PR / top-reps hint is set on the final set — and wiped before the lifter ever sees it [T1]

Why: the "New PR" / "top reps at target RIR — do it again next session" hint is the app's only in-workout feedback that progress happened, and it fires exactly on the final set (the top set). On the designed path the lifter is staring at the rest screen then, and GO-advance clears the hint. The only way to see it is to end rest early or peek — the celebration is invisible on the happy path. Verified by Muse: `app.js:925` and `:934` set `hintText` on completion; it renders only in the lift view (`#hint`), hidden while resting; the GO advance effect clears it (`app.js:539`, `advanceTo`: `hintText = ""`).

Do:
- Surface the hint on the rest screen itself (as the rest message line under the countdown, or a one-line banner above the prep steppers — pick the one that fits the no-scroll layout; do not add a new view). Wire it through the rest view model (`restctl.js` view / `rest.js` `restMsg`) so it survives the rest phase and clears on advance, same as today.

Do not: change when the hint is set, the hint wording, or any program data.
Files: `app.js`, `restctl.js` (view model), `rest.js` (`restMsg`).
Verify: e2e — seed a lift whose next set beats history, log it, assert the rest screen contains "New PR" while resting. Full gate green.

## B3-11 — Summary PR count uses the wall-clock date, not the session date [T1]

Why: the app anchors history to the session's start date across midnight (documented design), but `showSummary` filters PRs by today's wall-clock date. Finish a workout after midnight and the summary shows "—" PRs even when the user just set them. Verified by Muse in `app.js:1036-1037` (`var today = Gym.dateKey(); … filter(p => p.date === today)`), against `store.js` `sessionDate` ("a session that crosses midnight keeps banking into the day it started").

Do:
- In `app.js` `showSummary`, use `Gym.sessionDate(payload)` for the PR filter instead of `Gym.dateKey()`.

Files: `app.js`.
Verify: extend `e2e/journeys.spec.js`'s midnight journey to finish after midnight and assert `#sumPrs` counts the PRs. Full gate green.

## B3-12 — +15 at GO blanks the rest label [T1]

Why: `extend15` at GO restarts a 15 s rest with `ctx.label`, a field the controller never writes (always `""`), so the rest label line goes blank for the whole 15 s instead of showing the lift name. The existing test *enshrines* the blank label, so the test must change too. Evidence: `restctl.js` `extend15` (`if (rest.phase === "go") return start(15, ctx.label, …)`); the `ctx` comment ("`label` is never written… today that value is always `""`"); `test/restctl.test.js:183-186` (`assert.equal(out.view.label, "")`).

Do:
- In `restctl.js`, pass the rest's start label instead of `ctx.label` (use `ctx.startLabel` if that is the field that holds it — verify in source — or drop the dead `label` field and thread the start label through). Update the unit assertion to the lift label.

Files: `restctl.js`, `test/restctl.test.js`.
Verify: unit test — at GO, `extend15()` → `view.label` equals the rest's start label, phase `active`, 15 s. Full gate green.

## B3-13 — After pausing, the session pill says "Start", not "Resume" [T1]

Why: mid-workout the lifter pauses (interruption, spotter chat), then sees "▶ Start 12:34". "Start" reads as beginning a new session, so a careful user hesitates — or worse, assumes the old clock was discarded. It does resume (`startSessionClock` only stamps `startedAt` once), but the label lies about it. Evidence: `app.js:698-705` — `renderSessionPill()` renders `"▶ Start"` whenever the interval is off, regardless of `accSec > 0`; `aria-label` is likewise always "Start workout timer" when paused.

Do:
- In `app.js` `renderSessionPill`, when the clock is stopped and `sessionElapsedSec(payload) > 0`, render "Resume" (label and `aria-label`); keep "Start" only when nothing has elapsed yet.

Files: `app.js`.
Verify: e2e — start the session, pause it, assert the pill text contains "Resume". Full gate green.

## B3-14 — RIR buttons expose no selected state to a screen reader [T1]

Why: RIR is the one per-set judgment the lifter makes every set. Sighted users see the accent fill; a VoiceOver user hears five identical "RIR 0…4" buttons with no way to tell which is selected. Evidence: `app.js:761-762` creates the buttons with only `aria-label: "RIR " + rv`; `app.js:394` toggles the `.active` class but never sets `aria-pressed`. (Day tabs do this correctly — `app.js:179` sets `aria-pressed` — so the pattern exists in the same file.)

Do:
- Set `aria-pressed` on the RIR buttons in the same loop that toggles `.active` (true for the selected value, false for the rest).

Files: `app.js`.
Verify: e2e — tap RIR 2, assert that button has `aria-pressed="true"` and the others `"false"`. Full gate green.

## B3-15 — No focus placement when moving day ↔ lift ↔ progress [T1]

Why: opening a lift leaves focus on the day row that just disappeared; going Back leaves it on a hidden element. Keyboard users land on `<body>` and Tab restarts from the top of the document instead of from where they were. Evidence: `app.js:1107-1109` — `showDay()`, `showProgress()`, `openLift()` contain no `focus()` call, while the modal and summary in the same file both save/restore focus deliberately (`openModal`/`closeModal`, `showSummary`/`closeSummary`).

Do:
- On `openLift`, move focus to the lift heading (add `tabindex="-1"` to it) or to Set Done; on Back, return focus to the lift row just left. Follow the modal/summary save-restore pattern already in the file.

Files: `app.js`, `index.html`.
Verify: e2e keyboard test — open a lift via Enter, assert `document.activeElement` is inside `#liftView`; press Back, assert focus is on the corresponding `.liftrow`. Full gate green.

## B3-16 — The rest screen hides the session elapsed time [T1]

Why: the 75–90 min/day target is the app's own non-negotiable, and a rest is exactly when a lifter glances at the clock to judge pace. During rest the header (and the session pill) is hidden, so elapsed time is unreachable without peeking — for ~60% of the session. Evidence: `app.js:applyVisibility` — `header.style.display = (resting && !peek) ? "none" : "flex"`; the elapsed readout lives only in `#sessBtn` (`index.html:30`, `app.js:698`).

Do:
- Add a small elapsed line to the rest view model (the rest screen already ticks every 200 ms) — e.g. under the countdown, "Workout 42:10". Pass session seconds into the view model from `restctl.js`. This is status, not a control — rest still shows only rest.

Files: `app.js`, `restctl.js` (pass session seconds into the view model).
Verify: e2e — start a session, log a set, assert the rest screen shows an elapsed time that advances. Full gate green.

## B3-17 — Import has no file-size guard [T1]

Why: both file inputs accept any size; `FileReader.readAsText` + `JSON.parse` on a multi-MB file freezes the tab before any validation runs. The store caps history/session sizes (Phase 5), but the read/parse happens first. Verified by Muse: `app.js:1244-1277` — the `replaceFile` and `importFile` change handlers call `reader.readAsText(f)` with no `f.size` check.

Do:
- In `app.js`, reject `f.size > 5_000_000` in both handlers with a message before reading. In `store.js`, add the same length guard in `importRaw` / `importMerge` as defence in depth (throw on an over-long string).

Files: `app.js`, `store.js`, `test/store.test.js`.
Verify: unit test — `importRaw` on a >5 MB string throws; e2e — attach a generated 6 MB file, assert the "file too large" message and no freeze. Full gate green.

## B3-18 — No upper bound on user-typed / stepped load and reps [T1]

Why: import is bounded (Phase 5), but the direct UI path clamps only at the low end. A press-and-hold or typed value can reach absurd loads/reps, which then flow into the 1RM metric, tonnage, suggestions and CSV. Precedent exists in-app: the bodyweight input already clamps 66–700 lb. Evidence: `app.js` `stepLoad` / `stepReps` (`app.js:807` / `:813`) and `editLoad` / `editReps` clamp only the low end (`Math.max(0, …)` / `Math.max(1, …)`) — verify the exact clamp lines in source before editing.

Do:
- Add one clamp helper (load 0–2000 lb, reps 1–999) and apply it in all four paths (`stepLoad`, `stepReps`, `editLoad`, `editReps`), so a typed or held value stops at the cap.

Files: `app.js`.
Verify: e2e — type `99999` into the load field → value clamps; hold the load stepper → value stops at the cap. Full gate green.

## B3-19 — Import-merge reports no counts — did anything actually merge? [T1]

Why: after reconciling two devices the only feedback is "Backup imported — history merged ✓". The lifter can't tell whether 12 sessions arrived, 0 arrived, or a same-date collision silently kept the other copy. For a log that lives only on one phone, silent merge results are a trust problem. Evidence: `app.js:1274` — fixed string, no numbers; `store.js` `mergePayload` returns only the merged payload, discarding how many entries were added per lift or how many same-date collisions were resolved in favour of the fuller session.

Do:
- Have `mergePayload` return `{payload, added, collisions}` (or a stats side-channel — pick the smaller change, keep the existing callers working) and render "Merged: +N sessions, M kept as fuller" in `#modalMsg`.

Files: `store.js`, `app.js`, `test/store.test.js`.
Verify: e2e — import a backup with 2 new dates, assert `#modalMsg` contains "+2". Full gate green.

## B3-20 — "Undo last reset / restore" never says what it will undo [T1]

Why: the snapshot holds exactly one payload, but the button label is generic. After a Reset day on Friday and a Restore on Saturday, tapping it is a gamble — the lifter can't tell whether they're undoing Friday's reset or Saturday's restore, or how old the snapshot is. Evidence: `index.html:182` — static text "Undo last reset / restore"; `app.js:1179-1180` — `updateFoot()` only toggles `hidden` from `Gym.readSnapshot()`; the snapshot itself stores `{at, label}` (`store.js`, `snapshot()`), which is never displayed.

Do:
- Render the snapshot's label and date into the button, e.g. "Undo Reset day (Nov 8)". Use the stored `label` and `at` fields; fall back to the generic text when there is no snapshot.

Files: `app.js`.
Verify: e2e — reset the day, open the menu, assert the button text contains "Reset day". Full gate green.

## B3-21 — The corrupt-payload bar understates what happened [T1]

Why: on a corrupt load the app boots to an *empty* log — the lifter's history has vanished from view — while the bar only says "Couldn't read saved data — original copy kept" with a "Download copy" button. It never says the log on screen is empty, nor that the downloaded quarantine file can't just be re-imported as-is (it's the same unparseable bytes). Evidence: `app.js:80-93` (`syncSaveBar`, corrupt branch) and `store.js` `load()` — quarantine + `emptyPayload()` on parse failure.

Do (T1, copy only):
- Change the bar copy to: "Saved data couldn't be read — showing an empty log. Your original file is kept; download it before doing anything else." Keep the download action as-is. The deeper fix — salvage whatever history entries still parse instead of dropping the whole payload — is T2 (new recovery logic, see `BACKLOG.md`); do not build it here.

Files: `app.js`.
Verify: e2e — seed a corrupt payload, assert the bar text mentions the empty log and the download action. Full gate green.

## B3-22 — Restore (replace) re-implements the two-tap arm instead of using `twoTap()` [T1]

Why: same 2.5 s arm, own timer, own label reset, different timeout constant (2500 vs the 2600 ms reset in `twoTap`) — drift risk for the destructive-action guard. `twoTap(btn, confirmText, fn)` already supports exactly this shape (the second tap calls `fn`, which can click the file input). Evidence: `app.js:1230-1244` (`replaceArmedUntil`, ad-hoc `setTimeout`) vs `app.js:1308-1325` (`twoTap`).

Do:
- Route `replaceBtn` through `twoTap` (second tap clicks the file input); delete `replaceArmedUntil` and the ad-hoc timer. Behaviour identical: first tap arms with the confirm text, second tap within the window opens the picker, timeout restores the label.

Files: `app.js` only.
Verify: e2e — single tap arms, second tap opens the picker, timeout restores the label. Full gate green.

## B3-23 — The service worker never checks for updates while the app stays open [T1]

Why: the app is installed to the home screen and can sit open/backgrounded for days. Navigations are network-first, but a page that never reloads never revalidates — the lifter can train for weeks on a stale deploy with no indication. The SW does `skipWaiting` + `clients.claim()` on install, but nothing ever triggers an update check after first load. Verified by Muse: `app.js:1392` — bare `navigator.serviceWorker.register("./sw.js")` with no `registration.update()` anywhere; no update listener in `sw.js`.

Do:
- Call `registration.update()` when the page becomes visible (`visibilitychange` → visible, next to the existing `keepAwake` handler at `app.js:746`), so the next navigation picks up the new deploy. No new UI; the existing network-first navigation does the rest.

Files: `app.js`.
Verify: e2e/manual — register, bump `CACHE`, dispatch a visibilitychange to visible, assert `registration.update` was called (stub) / new SW installs on next load. Full gate green.

## B3-24 — Week strip and heatmap states are invisible to screen readers [T1]

Why: adherence is the day view's headline feature, but the week strip communicates done/partial/missed/today by symbol + colour alone, and the heatmap is `aria-hidden` with only a bare "18/24" count. A VoiceOver user hears "Fri, Sat, Sun" with no states. Evidence: `app.js:renderWeekStrip` — state is conveyed by class (`done`/`partial`/`missed`/`today`) and a `title` attribute (not reliably announced); the strip container has `aria-label="This training week"` (`index.html:93`) but the cells have no accessible name. `index.html:150` — `#heatmap` is `aria-hidden="true"`.

Do:
- Give each `.wk` cell an `aria-label` ("Friday, done", "Saturday, missed", …); add an `aria-label` or visually-hidden summary to the heat card ("18 of 24 training days in the last 8 weeks"). Add a visually-hidden helper in `style.css` only if one doesn't already exist.

Files: `app.js`, `index.html`, `style.css` (only if the helper is needed).
Verify: e2e — assert each `.wk` has an `aria-label` containing its state; assert the heat card exposes the count as text. Full gate green.

## B3-25 — "Planned +2" stays in the day summary after the workout starts [T1]

Why: a stale status line. After Plan today runs and the lifter starts logging sets, the day summary keeps reading "… · Planned +2" for the rest of the day, even though planning is long over and the numbers it refers to are no longer current. Evidence: `app.js:214` — `planMsg` is appended to the summary on every `renderDay`; it is only cleared on a day-tab switch (`app.js:1138`), never when sets are logged.

Do:
- Clear `planMsg` on the first Set Done of the day (or when `totalDone > 0` in `renderDay` — pick the smaller change).

Files: `app.js`.
Verify: e2e — tap Plan today, log one set, assert `#daySummary` no longer contains "Planned". Full gate green.

## B3-26 — The tempo line only exists on the first lift of the day [T1]

Why: tempo is the only technique cue on the lift screen, and it vanishes after lift 1 — exactly when fatigue builds and form cues matter most (lifts 5–8). Showing the same generic line everywhere costs one line of vertical space on short phones, which is presumably why it was scoped down. Evidence: `app.js:387` — `tempoLine.style.display = idx === 0 ? "" : "none"`. Note: per-lift tempo values (2 s compounds vs 2–3 s isolations) would be program data — that's a separate, now-closed research question (`RESEARCH.md`, Schoenfeld 2015: rep durations 0.5–8 s equivalent); this item is only about showing the existing generic line on every lift.

Do:
- Show the line on all lifts (short-phone CSS already clamps the cue to 2 lines; verify no overflow at 390×667 with suggestion + sparkline + RIR hint visible).

Files: `app.js`, `style.css` (only if spacing needs it).
Verify: e2e — open lift 5 at 390×667, assert `#tempoLine` is visible and the page still doesn't scroll. Full gate green.

## B3-27 — `typecheck` never checks `restctl.js` [T1]

Why: the newest, most user-critical module (rest orchestration) passes `node --check` (syntax only) but is invisible to `tsc --checkJs`, so a type error there ships past the gate. `package.json`'s `check` script *does* include it, which makes the gap easy to miss. Verified by Muse: `jsconfig.json` `include` lists `program.js, store.js, timer.js, machine.js, stats.js, rest.js, app.js` — no `restctl.js` (and no `sw.js`, which is fine given its `self`/`caches` globals).

Do:
- Add `restctl.js` to `jsconfig.json` `include`. Extend `tools/check-ids.js` (or `tools/check-assets.js` — pick the one that fits) with a cross-check that every local `.js` loaded by `index.html` appears in `jsconfig.json`'s include, so this can't regress silently. Do not add `sw.js` to typecheck (its globals are out of scope for `tsc` here).

Files: `jsconfig.json`, `tools/check-ids.js` (or `tools/check-assets.js`).
Verify: `npx tsc -p jsconfig.json --noEmit` stays clean and `tsc --listFiles` includes `restctl.js`; the cross-check fails if a script tag is added without a typecheck entry. Full gate green.

## B3-28 — Tooling-guard gaps (check script, check-ids, check-assets) [T1]

Why: three small holes in the fast gates: (a) `npm run check` never syntax-checks `tools/bench-stats.js` and `tools/make-icons.js` (the two tool files CI never executes); (b) `check-ids.js` only matches double-quoted `getElementById("…")` — a single-quoted call would be silently missed (none exist today, confirmed by grep), and it doesn't cover the `.day` buttons' `data-day` values against `program.js`'s `DAYS` keys; (c) `check-assets.js` never parses `manifest.webmanifest`, so a renamed icon referenced only there wouldn't be caught. Evidence: `package.json` `check` script; `tools/check-ids.js:10` (regex); `tools/check-assets.js` (no manifest parse); `index.html` `data-day="fri|sat|sun"`.

Do:
- (a) Add `node --check` for `tools/bench-stats.js` and `tools/make-icons.js` to the `check` script. (b) Extend `check-ids.js` to match single-quoted `getElementById('…')` too, and to verify the `.day` buttons' `data-day` values against the `DAYS` keys in `program.js`. (c) Extend `check-assets.js` to parse `manifest.webmanifest` and verify its icon paths exist.

Files: `package.json`, `tools/check-ids.js`, `tools/check-assets.js`.
Verify: each guard fails on a deliberately broken fixture (bad tool syntax, single-quoted id, wrong `data-day`, manifest pointing at a missing icon) and passes on the real tree. Full gate green.

## B3-29 — Stats maps use plain `{}` keyed by user-controlled dates [T1, defence in depth]

Why: `weekLiftIndex` and `sessionVolumes` build `{}` maps keyed by `e.date`. A `__proto__` date would assign to the object's prototype instead of creating a key (and a subsequent `[k] = 1` write would pollute `Object.prototype`). No production path reaches this today — every load/import goes through `sanitizeEntry`, which drops non-`YYYY-MM-DD` dates — but `Stats` is also callable with a hand-built payload, and the store already uses `Object.create(null)` for the same maps in `mergePayload`/`reconcile`. Evidence: `stats.js` `weekLiftIndex` (`var idx = {}`) and `sessionVolumes` (`byDate = {}`); contrast `store.js` merge maps (`Object.create(null)`).

Do:
- Switch both maps to `Object.create(null)`, matching the store's existing pattern. No behaviour change otherwise.

Files: `stats.js` only.
Verify: unit test passing a hostile payload (`{date: "__proto__"}` entry) directly to `weekStatus`/`sessionVolumes` → correct result, `Object.prototype` unpolluted. Full gate green.

## B3-30 — Untested pure-store paths + program-id uniqueness [T1, tests]

Why: three pure paths have no unit coverage: `reconcile` when two records collide onto the same target (the lower-`done` record is silently dropped — only reachable if two lifts share an `exId`, which nothing asserts); `rollSession` when the active session is already `complete` *and* has data (re-finalize path); and the `mergePayload` bodyweight rule. Evidence: `test/program.test.js:5-11` ("program data integrity" checks 3 days × 8 lifts but not id uniqueness); `test/store.test.js` (no reconcile-collision, no complete+hasData roll test); `store.js` merge bodyweight branch (`out.bodyweight === 165`).

Do:
- Add tests: assert 24 unique `exId`s in `test/program.test.js`; reconcile collision; roll complete+hasData; merge bodyweight when local is 165. Tests only — do not change the merge bodyweight rule itself (the 165 ambiguity is a T2 schema-flag design note in `BACKLOG.md` / `DESIGN.md`, Khang's call).

Files: `test/program.test.js`, `test/store.test.js`.
Verify: new tests green; full gate green.

## B3-31 — No automated check that the SW `CACHE` version bumps when assets change [T1, low]

Why: the bump is manual and reviewer-dependent. Mitigating factor (why this ranks low): stale-while-revalidate with conditional revalidation self-heals a missed bump on the next online load, so the failure mode is narrow (offline users on an old shell until they come back online). Still, a guard makes the constraint mechanical. Evidence: `sw.js:7` (`const CACHE = "gym-v35"`, hand-maintained); no tool compares it against asset contents.

Do:
- Add `tools/check-sw-cache.js`: hash the `ASSETS` contents, compare against a hash recorded in a comment in `sw.js`; fail CI on divergence. Wire it into `npm run check`. Keep the mechanism simple and deterministic (same hash, same inputs, no timestamps).

Files: `tools/check-sw-cache.js` (new), `sw.js` (hash comment), `package.json`.
Verify: touch an asset without updating the hash → check fails; bump `CACHE` + hash → passes. Full gate green.

## B3-32 — First run has no guidance at all [T1, low value, single-user tool]

Why: a brand-new install (or a fresh phone) opens on the day view with 8 tappable rows and zero explanation of the flow — tap a lift, do the set, tap Set Done, rest, repeat. For Khang this is near-zero value (he knows the app); for anyone else opening it, it's a blank tool. Included because the audit asked for first-run/empty-state coverage; honest ranking is low. Evidence: boot (`app.js`) renders the day view with no first-run branch; the only one-time hint is the RIR explainer (`app.js`, `showRirHintIfNew`). Progress view's empty states are good ("No workouts yet — open a lift to begin").

Do:
- A single dismissible line under the day summary, shown only until the first set is ever logged ("Tap a lift, do the set, tap Set Done — rest starts itself"). Persist the dismissal with the first logged set (no new storage key if the existing history can answer "has any set ever been logged" — prefer that).

Files: `app.js`, `index.html`, `style.css`.
Verify: e2e — fresh profile, assert the hint shows; log one set, reload, assert it's gone. Full gate green.

## B3-33 — No deploy version anywhere in the UI [T1, low value, helps debugging]

Why: when something looks wrong on the phone, there's no way to answer "which version are you on?" The menu footer shows the *schema* version (`app.js:1179` — `"v" + Gym.CURRENT`, i.e. v4), not the deploy. The SW cache tag (`gym-v35`, `sw.js`) is the real deploy marker and it's invisible. Evidence: `app.js:1179` (`updateFoot`).

Do:
- Append the SW cache tag (or a short build stamp) to the menu footer, e.g. "v4 · gym-v35 · 12 workouts · backed up 3d ago". Read the tag from the SW if reachable, otherwise from a single constant both `sw.js` and `app.js` share — do not hardcode the tag in two places (that recreates the B3-31 drift).

Files: `app.js`, `sw.js` (expose the tag if not already reachable).
Verify: e2e — open the menu, assert `#modalFoot` contains the current cache tag. Full gate green.

## B3-34 — `nextLift` never wraps to an earlier open lift [T2, designed]

Why: `nextLift` falls back to the literal next index when no open lift exists *after* the current one, even if that lift is already done — and it never looks *before* the current lift. Complete lifts out of order (e.g. finish lift 1 after 2–7 are done) and GO takes you to a completed lift instead of the one open lift, or to Finish. The fallback is tested and deliberate, so changing it is a contract decision, not a silent fix. Evidence: `rest.js:41-44` (`return firstOpen >= 0 ? firstOpen : idx + 1`); `test/rest.test.js` (`assert.equal(R.nextLift(0, 8, -1), 1)`); `restctl.js` `skip()` advance path. Design is in `DESIGN.md` ("Batch 3 T2: nextLift wrap") — read it before building.

Do (per the design): search forward from the current lift, then wrap to the earliest open lift from index 0, and return −1 (two-tap Finish) only when the whole day is done. Update the existing fallback test to the new contract; add unit tests for forward-open, wrap-around, and all-done; add an e2e out-of-order completion journey.

Files: `rest.js`, `restctl.js` (unchanged interface), `test/rest.test.js`, `e2e/rest.spec.js`.
Verify: new unit tests green; e2e journey green; full gate green.

## B3-35 — Bodyweight-resolution rule duplicated in four places [T2, designed]

Why: "Banked `bwKg` wins, else current bodyweight, else 165" is re-implemented in `app.js` `bwFor` and three separate inline ternaries in `stats.js` (`entryVolume`, `personalRecords`, `topMovers`' `optsFor`). A future change to the rule (e.g. a different default) must be made in four places to stay consistent. Evidence: `app.js:28-40`; `stats.js` `entryVolume`, `personalRecords`, `topMovers`. Design is in `DESIGN.md` ("Batch 3 T2: bodyweight resolution helper") — read it before building.

Do (per the design): add an exported `resolveBodyweight(entry, fallback)` in `stats.js`; use it in `app.js` (`bwFor`) and in the three `stats.js` call sites. Add unit tests for the helper (banked wins, fallback, invalid banked value). Existing suite must stay green with identical numbers (byte-identical outputs on the current fixtures).

Files: `stats.js`, `app.js`, `test/stats.test.js`, `test/enhancements.test.js` (only if it covers `bwFor`).
Verify: new helper tests green; full gate green; no number changes anywhere (verify via the existing tests + a before/after spot check on a bodyweight lift's tonnage).

---

End of Batch 3. When the queue is empty, stop and wait for Muse. The T2 items that still need designs, and all T3 proposals for Khang, are in `BACKLOG.md` — do not build them from this queue.

---

## BATCH 4 — QUEUED Nov 9 (Muse review of Batch 3; 2 items: 1 T1 + 1 T2)

Base HEAD: `85d2cd4` (Batch 3 complete, Nov 9 15:18 CT; SW `gym-v66`, 169/169 unit, 91/91 e2e, Pages live). Status: BATCH 4 QUEUED — from Muse's independent review of B3-11…B3-35, which found no new defects; these are the backlog's own follow-ups, not invented work. Same batch rules as above: one item at a time, in order; program data read-only; full gate per item (`npm run check`, `npm run typecheck`, `npm run e2e` at 390×667 and 390×844, no overflow, no console errors); stop on failure.

## B4-01 — `workoutDates` / `trainingDays` still use plain `{}` keyed by user-controlled dates [T1, defence in depth]

B3-29 fixed the same pattern in `weekLiftIndex` / `sessionVolumes` and flagged these two for a follow-up. `stats.js` `workoutDates` builds `seen = {}` keyed by `s[i].date` / `log[i].date`; `trainingDays` builds `have = {}` keyed by `s[i].date`. Both dates are user-controlled (imported history, sessionLog). A `"__proto__"` date is silently dropped from the count today (assigning a non-object to `__proto__` is a no-op) — a correctness edge, not a live hole, same class as B3-29. Change both maps to `Object.create(null)`. Unit test: feed a `"__proto__"` date through `workoutDates` and `trainingDays` and assert `Object.prototype` stays clean and the date is counted. No number changes (same dates counted). Files: `stats.js`, `test/stats.test.js`. Verify: full gate green; SW bump (`stats.js` changed).

## B4-02 — Corrupt-payload salvage [T2, designed]

Design in `DESIGN.md` ("Batch 4 T2: corrupt-payload salvage", Muse, Nov 9). `load()` salvages what still parses instead of dropping the whole payload: per-piece recovery of `liftHistory` arrays and `sessionLog` entries through the existing sanitize path, `loadError = { kind: "salvaged", recovered: N, dropped: M }`, quarantine bytes intact, boot never auto-commits while a load warning is active, bar names the recovered count and offers "Keep recovered log". Files: `store.js`, `app.js`, `test/store.test.js`, `e2e/pass3.spec.js`. Verify: full gate green; SW bump.

End of Batch 4. When the queue is empty, stop and wait for Muse.


---

## BATCH 5 — QUEUED Nov 9 (Muse; 20 items: 1 T2 + 19 T1)

Base HEAD: `0d4ed1a` (SW `gym-v68`, 177/177 unit, 93/93 e2e, Pages live). Status: BATCH 5 QUEUED — from three Muse audits (code correctness, UX/user-workflows, tests/data-safety) against `0d4ed1a`, re-scoped to Khang's Nov 9 direction: UI/UX user workflows first, and a major lift-page redesign as the centerpiece (B5-01, designed by Muse in `DESIGN.md`, "Batch 5 T2: lift-page redesign" — read it before building). Same batch rules as above: one item at a time, in order; full gate per item (`npm run check`, `npm run typecheck`, `npm run e2e` at 390×667 and 390×844, no overflow, no console errors); program data read-only; stop on failure, log it, do not move on. Housekeeping already done by Muse in the queue push (not items): `__pycache__/` added to `.gitignore`, the `DESIGN.md` salvage Case B wording fix, the Batch 4 VERIFIED record in `LOOP_STATE.md`, and the Gate 1 install note in `SUPERVISOR_DESIGN.md`.

Hands-on verification (Muse, Nov 9 ~20:12 CT, scratch clone at `d1e18e3` — nothing pushed): B5-05 CONFIRMED by source trace — the day-tab handler (`app.js:1220-1222`) reassigns `cur`/`idx` *before* `resetEdit()`, while `openLift`/`navigateLift` reset first; the handler is the only inverted path. B5-06 CONFIRMED by a failing test — `importRaw`/`importMerge` throw "Not a valid Gym backup" (`store.js:600` / `store.js:845`) on truncated bytes from which `salvage()` recovers entries and which `load()` accepts as `kind: "salvaged"`. Build both items as specified; the claims are proven, not audit opinion.

## B5-01 — Lift-page redesign: de-stack the top, kill the dead band [T2, designed]

Design in `DESIGN.md` ("Batch 5 T2: lift-page redesign", Muse, Nov 9) — read it first; it is the contract. Summary: five stacked text layers become three blocks (name / one prescription meta line / one cue+tempo guide block, tempo still on every lift per B3-26); `.setlog` flexes and set rows grow to fill it so the ~150–190 px void at 390×844 is gone by construction; `.rir` back to 44 px in the short-phone block; Set Done's edit-state `aria-label` starts with "Done editing". Measure the top-stack height and the setlog→adjust gap before and after and record both pairs in `BUILD_LOG.md`; acceptance numbers (gap ≤8 px default state, stack ≥20% shorter incl. the `.sethead` margin trim) are in the design, which also carries Muse's prototype results from a scratch clone (gap 141.9 → 0 px, stack 217.8 → 182.6 px before the trim, no-scroll held at both viewports) — the approach is proven, build it for real. Preserve every position the design lists (Set Done bottom full-width, steppers above RIR row, RIR row above Set Done, tap-to-edit rows, Undo/Restart pills, header, focus-to-name). Update the set-log sizing e2e geometry to the new contract — do not delete it. Files: `style.css`, `app.js` (render/aria only), `index.html` (wrapper only if needed), `e2e/*`, `sw.js` bump. Verify: full gate green; geometry assertions pass at both viewports; B3-26 tempo e2e still green.

## B5-02 — Rest-screen prep steppers target the next lift between lifts [T1]

Why: `Rest.prepVisible` (`rest.js:119-121`) requires `done < sets`, and the rest prep cluster is wired to the lift just finished (`restctl.js:86`, `app.js:542-560`) — so during every inter-lift rest (the longest rests of the workout) the prep steppers vanish, and the lifter must end the rest, land on the new lift, then adjust load/reps standing at the rack. Do: when the current lift is complete and `nextLift` (B3-34 contract) returns a next lift, prep targets that lift — prep visible during the inter-lift rest, name "Next — <lift>, Set 1", and the rest steppers edit `st(cur, nextIdx)`; same-lift prep (sets still open) unchanged. Extend the pure decision in `rest.js` (unit-tested) rather than open-coding it in `app.js`; `restctl.js` view carries the target as it does today. Files: `rest.js`, `restctl.js`, `app.js`, `test/rest.test.js` / `test/restctl.test.js`, `e2e/*`. Verify: e2e — complete a lift → rest shows prep named for the next lift → step load + twice → advance → next lift opens with the adjusted load; same-lift prep behaviour unchanged; full gate green; SW bump.

## B5-03 — RIR explainer retires on the first logged set [T1]

Why: `#rirHint` (`app.js:813-819`) hides only via the RIR-button handler (`app.js:826`); a lifter who accepts the programmed RIR — the normal case — never taps those buttons, so the "one-time" explainer sits on the lift page permanently (visible in Khang's Nov 9 screenshot, months in). Do: also set the same flag in the Set Done path, so the hint retires after the first logged set. Files: `app.js`, `e2e/*`. Verify: e2e — fresh profile → hint visible on lift 1 → log a set → hint hidden on the next lift and still hidden after reload (fails before); full gate green; SW bump.

## B5-04 — The backup banner's "Backup" button backs up [T1]

Why: `app.js:1284` wires the day-view banner's "Backup" button (`index.html:75`) to `openModal` — a two-trip action wearing a one-tap label, on the app's only data-safety nudge. Do: the banner button runs the existing backup download path directly (same code the menu's download uses) plus `noteBackup()`; menu export options untouched. Files: `app.js`, `e2e/*`. Verify: e2e — seed an overdue backup → banner visible → click `#backupBarSave` → a download fires, the modal never opens, the banner clears (fails before); full gate green; SW bump.

## B5-05 — Switching day tabs mid-edit writes the edit backup into the wrong lift [T1]

Why: the day-tab handler (`app.js:1219-1227`) sets `cur`/`idx` first, then calls `resetEdit()`, which restores `editBackup` into `curSt()` — now the *new* day's lift 0 — and the handler's `commit()` persists it. Every other navigation path (`openLift`, `navigateLift`, `showDay`) resets the edit *before* switching. Scenario: mid-edit of a logged Friday set, tap the Sat tab → Friday's pre-edit values land in Saturday lift 1's working record, silently. Do: move `resetEdit(); clearUndo();` above the `cur = …; idx = 0;` assignments in the day-tab handler, matching `openLift`. Files: `app.js`, `e2e/*`. Verify: e2e — seed a Friday lift with a logged set, start editing it, tap Sat, open Sat lift 1: its load/reps/RIR are its own, and Friday's working values equal the pre-edit values (fails before); full gate green; SW bump.

## B5-06 — Restore/Merge salvage a damaged backup instead of rejecting it [T1]

Why: `load()` salvages corrupt bytes at boot (`store.js:538-551`), but `importRaw` (`store.js:597-604`) and `importMerge` (`store.js:842-848`) throw the moment `migrate()` returns null — neither calls `salvage()`. The app itself tells the user to download the quarantined original (bar copy, `app.js:77`; download at `app.js:1473`/`:1481`), yet that file is a dead end: restore it on a new phone and the answer is "Restore failed — not a Gym backup" (`app.js:1359`) even though `salvage()` would recover most entries from those exact bytes. Do: in both functions, when `migrate()` returns null (not `__future`), run `salvage(raw)`; if `recovered > 0`, build the payload the way `load()` does (empty payload + recovered history/log, normalized) and return it with the recovered/dropped counts so the app can say "Recovered N entries from a damaged backup"; if 0, throw as today. Files: `store.js`, `app.js` (result copy), `test/store.test.js`, `e2e/*` if the flow is covered there. Verify: unit — `importRaw()` on a Batch-4-style truncated-JSON string returns a payload whose history holds the recoverable entries and `Object.prototype` stays clean; `importRaw("garbage")` still throws; mutation check (delete the fallback → first test fails); full gate green; SW bump.

## B5-07 — Restoring a newer-version backup says so [T1]

Why: `store.js:601` and `:845` lump parse failure and future version into one `throw new Error("Not a valid Gym backup")`, and the app flattens further (`app.js:1359` / `:1379`) — a backup exported from the updated app and restored into a stale cached build is reported as *not a backup at all*, inviting the user to delete a perfectly good file. The boot path already handles this case properly (B3-02). Do: give `__future` its own error in `importRaw`/`importMerge` and its own app message: "That backup is from a newer version of the app — reload the app, then try again." No behaviour change for genuinely invalid files. Files: `store.js`, `app.js`, `test/store.test.js`, `e2e/*`. Verify: unit — `importRaw` on a `{v: 99, …}` payload throws the newer-version error, distinct from the invalid-file error; e2e — Restore with a v99 fixture shows the newer-version message; full gate green; SW bump.

## B5-08 — Extra sets can announce a false "New PR" [T1]

Why: `doneBtn` (`app.js:971`) computes `prevBest` from `priorEntries()`, which deliberately excludes the newest history entry once the lift is complete (the suggestion logic must not compare against the just-finished session) — and the PR check reuses that baseline. Scenario: the final set logs a genuine PR → "New PR" fires; an extra set heavier than every *prior* session but lighter than today's final set announces "New PR" again, with a lower number than the PR set from minutes earlier. Do: in `doneBtn` only, compute the PR baseline over the un-skipped series (or max it with the best metric among today's banked sets); leave `priorEntries` untouched for suggestions. Files: `app.js`, `e2e/*`. Verify: e2e — complete a lift with a PR final set, add an extra set between the old-session best and today's PR → no "New PR" hint (fails before); full gate green; SW bump.

## B5-09 — A session left running overnight finalizes with a ~24-hour duration [T1]

Why: the 8-hour ceiling `ACC_SEC_MAX` (`store.js:30`) is enforced only at load time (`store.js:195/197`, inside `sanitizeSession`); the live path never clamps — `pauseSessionClock` (`store.js:672-679`) and `finalizeSession` (`store.js:689ff`) accumulate unbounded, and `finalizeSession` writes `durationSec` straight into `sessionLog`. Start a workout, get interrupted, phone sleeps → the next boot's summary and `Stats.sessionDrift` show a day-long session until the *next* reload corrects it. Do: clamp the accumulated total to `ACC_SEC_MAX` in `sessionElapsedSec` and in `finalizeSession`'s `durationSec`, matching the load-time rule. Files: `store.js`, `test/store.test.js`. Verify: unit — an active session with `runningSince` 30 h ago finalizes with `durationSec ≤ 28800` (fails before: ≈108000); full gate green; SW bump.

## B5-10 — `twoTap`'s shared arm state can strand a confirm label forever [T1]

Why: one global `armedFn`/`armedUntil` pair (`app.js:1408-1419`) serves all destructive buttons (Reset today, Reset week, Clear all). Arming button A schedules a label restore that only runs `if (armedFn === fn)`; arm button B inside the window and A's restore never fires — "Tap again to…" stays on A indefinitely, and the user can't tell whether A is armed. Do: track the armed button alongside `armedFn`; arming a new button restores the previously armed button's label immediately. Files: `app.js`, `e2e/*`. Verify: e2e — tap Reset today once, then Clear all once, wait >2.6 s → Reset's label is back to its `data-label` text (fails before); full gate green; SW bump.

## B5-11 — Salvaged save bar masks a later save failure [T1]

Why (from Muse's Batch 4 review): in `app.js`'s save-bar priority, the salvaged load-warning outranks a live `saveFailed` state — after a salvaged boot, if a save then fails (e.g. storage full), the bar keeps showing the salvage notice and the save-failure warning never surfaces. Low impact, no data-loss path (the original bytes stay quarantined and the warning does surface on the Keep tap), but the user should learn about a failed save when it happens. Do: a live save failure outranks the salvaged notice in `syncSaveBar` (the recovered counts stay reachable — fold them into the failure bar's copy or restore the salvaged bar once a save succeeds again; pick the simpler one and note it in `BUILD_LOG.md`). Files: `app.js`, `e2e/*` (extend the B4-02 salvaged-boot spec). Verify: e2e — salvaged boot → force a save failure via the existing save-failure harness → the failure warning is visible (fails before); Keep flow still works; full gate green; SW bump.

## B5-12 — Dead "Undo last reset / restore" button shows in the menu [T1]

Why: `app.js:1266-1268` sets `hidden = true` when no snapshot exists, but `style.css:317` `.modalbtn{display:flex}` overrides it and there is no `.modalbtn[hidden]` rule — fresh users see a dead button whose tap only says "No snapshot saved yet" (flagged in B3-20's build log, never fixed). Do: add `.modalbtn[hidden]{display:none}`. Files: `style.css`, `e2e/*`. Verify: e2e — fresh profile → menu → `#restoreSnapshot` not visible (fails before); after Reset day it appears with its named label; full gate green; SW bump.

## B5-13 — Save/backup bar action buttons are 28 px tall [T1]

Why: `.bbact{height:28px}` (`style.css:416-419`) styles "Keep recovered log" / "Download copy" (`index.html:33-34`) and "Backup" (`index.html:75`) — the buttons tapped when data is at risk — while the adjacent dismiss button was raised to 44 px in an earlier pass; `e2e/a11y.spec.js` never measures `.bbact`. Do: `.bbact{height:44px;margin:-8px 0}` — the established `.planbtn`/`.applybtn` pattern (negative margins preserve the no-scroll fit). Files: `style.css`, `e2e/a11y.spec.js`. Verify: box-size assertions ≥44 px on all three buttons in their visible states at both viewports (28 px before); `scrollHeight` still equals the viewport with the save bar shown; full gate green; SW bump.

## B5-14 — Impossible calendar dates pass `validDate` [T1, internal — silent data corruption]

Why: `validDate` (`store.js:61`) is regex-only; probes show `"2025-02-29"` and `"2026-02-30"` survive `Gym.migrate` in `liftHistory`. Downstream, `stats.js:217-220` `parseKey` builds `new Date(y, m-1, d)`, which silently rolls Feb 30 → Mar 2, so Progress/heatmap math attributes the entry to a day it never claimed, while the raw key sits permanently in the date maps and propagates via merge. Do: make `validDate` round-trip — parse the components, construct the date, require year/month/day to match; all callers inherit the strictness. Files: `store.js`, `test/store.test.js`. Verify: unit — entries dated `"2025-02-29"`, `"2026-04-31"`, `"2026-13-01"` are all dropped by migrate; `"2024-02-29"` is kept (fails before); full gate green; SW bump.

## B5-15 — Per-set load/reps/RIR are never clamped at the store boundary [T1, internal]

Why: `sanitizeSets` (`store.js:129`) coerces set values to numbers but applies no bounds; a restored entry with `sets:[{load:-50, reps:1000000000, rir:99}]` passes through unchanged → `Stats.entryVolume` = 1e11 and est-1RM ≈ 3.3 billion. The app input paths clamp (B3-18) and Phase 5 clamped the counts at this same boundary, but backups/imports never pass through the app inputs — one hand-edited or foreign backup permanently poisons tonnage and the PR baseline. Do: in `sanitizeSets`, clamp load to [0, 2000], reps to [0, 999], RIR to [0, 4] — the bounds the UI already enforces. Files: `store.js`, `test/store.test.js`. Verify: unit — migrate the probe payload; the set reads `{load:0, reps:999, rir:4}` and `entryVolume ≤ 2000×999` (fails before); full gate green; SW bump.

## B5-16 — Session-log entries with a malformed date are silently re-dated to today [T1, internal]

Why: `sanitizeSession` (`store.js:190`) replaces any date failing `validDate` with `dateKey()` (today) — right for the *active* session, but it is also applied to finished `sessionLog` entries (`store.js:226-231`; salvage paths `:489` and `:516`). A log entry dated `"11/09/2026"` comes out of `Gym.migrate` dated today, so the heatmap/streak counts a workout today that never happened. History entries with bad dates are dropped outright; sessions get a fabricated date instead. Do: in the sessionLog sanitization paths (and salvage), drop entries whose raw date fails `validDate` before calling `sanitizeSession`; keep the today-default only for `p.active`. Files: `store.js`, `test/store.test.js`. Verify: unit — migrate a payload whose `sessionLog` holds one bad-date and one valid entry → only the valid entry remains (fails before: two entries, the bad one dated today); full gate green; SW bump.

## B5-17 — Week-strip state never reaches a screen reader [T1]

Why: `app.js:215` renders week cells as `<span class="wk" aria-label="Friday, done">` with no `role` — generic elements can't be named, so the label is dropped and only "Fri/Sat/Sun" is read (the state marks are `aria-hidden`, `app.js:216`). B3-24's fix asserted attribute presence only; the heatmap in the same batch got a working `.sr-only` sentence, the strip didn't. Do: `role="img"` on each `.wk` (or an `.sr-only` strip summary like `#heatSummary` — pick one, note it in `BUILD_LOG.md`). Files: `app.js`, `e2e/*`. Verify: e2e asserts `.wk` carries `role="img"` plus its state label (no role before); full gate green; SW bump.

## B5-18 — Destructive-action text fails contrast in both themes [T1]

Why: `.modalbtn-danger{color:#ef4444}` (`style.css:338`) on `--surface-2` measures 4.16:1 (dark) and 3.32:1 (light) against the 4.5:1 required at 14 px bold — on "Restore (replace)" and "Clear all data", the two labels that most need reading correctly. Do: per-theme danger token — dark `#f87171` (5.66:1), light `#b91c1c` (5.71:1). Files: `style.css`, `e2e/*` (contrast assertion in the a11y spec style). Verify: e2e computes the ratio from computed styles in both themes and asserts ≥4.5 (fails before); full gate green; SW bump.

## B5-19 — The Export CSV journey has no automated test [T1, tests]

Why: `grep -i csv e2e/*.spec.js` = zero hits, while the journey is wired at `app.js:1308-1311` (`#exportCsv` → `Stats.toCsv` → `downloadText`). The pure function is unit-tested, so the math is safe — what's unprotected is the lifter-facing path (button → download → filename → contents), which `LOOP_STATE.md`'s Pass 3 phone-check still lists as a manual, unchecked item. A dead handler ships silently and is discovered mid-gym, phone in hand. Do: one e2e (in `e2e/pass4.spec.js` or `features.spec.js`): seed a completed lift, tap Export CSV, capture the Playwright download event, assert the filename is `gym-<date>.csv` and the contents contain the seeded lift's set row. No app change. Files: `e2e/*` only. Verify: the new spec passes; prove it can fail by renaming the download filename locally, confirm red, revert (note in `BUILD_LOG.md`); full gate green; no SW bump (no asset change).

## B5-20 — Press-and-hold steppers re-render the whole lift view every 70 ms [T1]

Why: hold-repeat fires every 70 ms (`app.js:897`) into `stepLoad`/`stepReps` (`app.js:874-886`), each calling full `render()` — set-log `innerHTML` rebuild plus suggestion and sparkline SVG redraw per step (~37 rebuilds in a 3-second hold). Load adjustment happens between nearly every set; this is where any jank is felt. Do: a light update path for steppers (the value readouts, the "now" row, the rest prep values), with the full render on release. **Re-check first:** B5-01 changed the lift view's render/geometry — if a light path already exists by the time this item starts, verify with the MutationObserver test below only and close the item with a note. Files: `app.js`, `e2e/*`. Verify: e2e MutationObserver counts `#setLog` replacements during a 1 s hold — ~14 before, ≤1 after; final value correct and persisted; full gate green; SW bump.

End of Batch 5. When the queue is empty, stop and wait for Muse.
