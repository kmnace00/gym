# QUEUE — Batch 1 (verified against Pass 4, Nov 8) + Batch 2 (Nov 8)

Base HEAD: `b7d61f0` (Batch 1 complete, verified by Muse Nov 8, 20:50 CT).
Status: BATCH 2 QUEUED — approved by Khang Nov 8, 20:53 CT ("Do all recommended"). Batch 1 (L1–L5) is complete and verified; its specs below are history, do not re-run them.
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

## Batch 3 — PROPOSED Nov 9, 05:55 CT (awaiting Khang's approval)

Source: one sparse DeepSeek Pro planning review against the post-pipeline
backlog. L9 is in flight (approved); nothing below is approved to build yet.
Order is the Pro pick — Khang may reorder or drop items.

### B4 — Check gate: syntax-check `rest.js` [T1] — DELIVERED with L9
Finding: at base `719c200`, `package.json` `check` ran `node --check` on
program/store/timer/machine/stats/app/sw but **not** `rest.js`, which
`index.html` loads and `sw.js` caches. The L9 build added `node --check
rest.js` and `node --check restctl.js`; the gate now covers every loaded
module (confirmed by the independent tester, 12 page refs / 13 cached assets).
No further work.

### L8 — Rest-interval audit → T3 proposal [T2, NEEDS_RESEARCH]
App rests are 90/120/150/180 s (`program.js`). Map every one of the 24 lifts
against the settled rest rule and produce a per-lift change list for Khang.
Blocked: `RESEARCH.md` states the rule but the citations are one-liners, not
verifiable sources — flag NEEDS_RESEARCH rather than invent evidence.
Output: `RESEARCH.md` citations + a T3 table in `BACKLOG.md`. No code.

### L7 — Progression-model review → T3 proposal [T2, NEEDS_RESEARCH]
Double progression (top reps at target RIR → +step) + 3-missed-top ~10 %
deload, reviewed against 2-for-2 / RIR-accuracy / deload literature.
Blocked: same research gap as L8. Output: `RESEARCH.md` + T3 proposal.

### L6 — Exercise-swap: DESIGN skeleton only [T2, blocked]
The curated alternate map needs Khang's list before any design can be
concrete; a skeleton is the most the loop can do unasked. **Do not start**
until Khang supplies the alternates.
