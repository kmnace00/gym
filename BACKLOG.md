# BACKLOG — ranked improvement ideas

Not instructions. An item becomes work only when Muse promotes it into
`QUEUE.md` / `TASK.md`. Order is value ÷ risk, highest first.
`[T1]` buildable now · `[T2]` needs a Muse design first ·
`[T3]` Khang-only proposal — the loop never builds it.

## Proposed first batch (L1–L5, all T1)

### L1 — Extract the rest controller [T1]
Why: `app.js` (1,107 lines) still owns rest orchestration. Pass 2
deferred the dedicated controller; Pass 3 added pure helpers in
`rest.js` as the low-risk slice. Finish the slice: move the
advance/finish/arm decisions out of the controller into `rest.js` /
`machine.js`, keep the DOM in `app.js`, no behaviour change.
Files: `rest.js`, `machine.js`, `app.js`, `test/rest.test.js`,
`test/machine.test.js`. Verify: `npm run check`, typecheck, e2e
(rest pause / advance / GO paths).

### L2 — Audit the lengthened-partials prompt [T1]
Why: research (Nov 8) says lengthened partials only after full-ROM
failure, on the last set, for calves, leg extensions, curls,
laterals, flys. The app flags `partial: 1` on 10 lifts. Check when
the prompt actually fires — every set or last set only? — and fix it
to match the rule. No program-data change; prompt timing only.
Files: `app.js`, `program.js` (read-only), `e2e/features.spec.js`.
Verify: e2e for a partial lift (last set prompts, earlier sets do
not) + a non-partial lift (never prompts).

### L3 — Audit the day-time model against real sessions [T1, audit]
Why: day length is estimated as 50 s/set + rest + 60 s transition
(`program.js` `dayMins`). The app now logs real history (`stats.js`,
`liftHistory`). Compare estimate vs actual session durations and
report the drift per day. Code change only if drift is >10% — and
then as a constants proposal in the report, not a silent edit.
Files: `stats.js` (read + report), `test/stats.test.js`. Verify:
unit tests on the comparison; report in `BUILD_LOG.md` + `RESEARCH.md`.

### L4 — Accessibility pass [T1]
Why: focus trap + GO assertive + Set Done pressed state shipped in
Pass 2. Unverified since: touch targets ≥44 px on rest + lift
controls, contrast in both themes, focus order on the rest screen.
Files: `index.html`, `style.css`, `app.js`, `e2e/*`. Verify: e2e
viewport checks at 390×667/844 + a manual checklist in `LOOP_STATE.md`
for Khang's phone tap-through.

### L5 — Security audit: import + service worker [T1]
Why: import sanitization shipped in Pass 2 (hostile strings → safe
numbers at the store boundary). Extend it: fuzz the import path with
hostile JSON (nested objects, huge numbers, prototype keys), confirm
the SW cache-version discipline (`gym-v6`, bump on asset change) and
the asset-drift guard still hold, and write the threat model down
(one paragraph in `PLAN.md`: what the loop trusts, what it does not).
Files: `test/store.test.js`, `test/size.test.js`, `PLAN.md`.
Verify: new hostile-payload tests green; no behaviour change.

## Next (T2 — Muse designs first)

### L6 — Exercise swap map [T2]
Curated alternates per lift (e.g. what replaces Smith squat if the
machine is taken). Needs a curated map in `program.js` and a
progression model for swapped lifts — and Khang's sign-off on the
alternate list, since it touches program data. DESIGN first.

### L7 — Progression model review [T2]
Double progression (top reps at target RIR → +step) + 3-missed-top
→ ~10% deload. Review against the literature in `RESEARCH.md`
(2-for-2 rule, RIR accuracy, deload size/frequency). Outcome is a
proposal to Khang, not a silent model change.

### L8 — Rest-interval audit [T2]
App rests are 90/120/150/180 s. Literature (to be cited in
`RESEARCH.md`) generally favours ~2–3 min for compounds, ~1–2 min
for isolations. Audit each lift's rest against that, propose
changes — T3 for the actual numbers.

## Proposals (T3 — Khang only, never auto-built)

### P1 — Rest / load / rep number changes in `program.js`
Any change to a lift's rest, load, reps, or sets. Comes from L7/L8
research as a concrete proposal with evidence. Khang approves per
lift or declines.

### P2 — Split / days change
E.g. a 4th day, or Wed/Fri/Sun instead of Fri/Sat/Sun. Proposal
only, with the time-budget math (75–90 min/day target).

### P3 — New features
Anything not in the current scope (e.g. new views, new tracking).
Khang decides; the loop does not add fluff.

## Deferred / non-goals (do not re-propose without new evidence)

- Cloud backend / accounts, Apple Watch / Health, full ESM migration,
  IndexedDB. Reasoning in `DESIGN.md`.
- Exercise swap was deferred in Pass 2 for exactly the reasons in L6
  — it is T2 now, not forgotten.
