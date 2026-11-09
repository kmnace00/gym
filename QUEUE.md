# QUEUE — Batch 1 (verified against Pass 4, Nov 8)

Base HEAD: `a18272b` (framework push, on Pass 4 `cbbf6a8`).
Status: QUEUED — approved by Khang Nov 8, 19:41 CT.
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
