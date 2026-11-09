# BACKLOG — ranked improvement ideas

Not instructions. An item becomes work only when Muse promotes it into
`QUEUE.md` / `TASK.md`. Order is value ÷ risk, highest first.
`[T1]` buildable now · `[T2]` needs a Muse design first ·
`[T3]` Khang-only proposal — the loop never builds it.

## Batch 1 — QUEUED Nov 8 (L1–L5, all T1, verified vs Pass 4)

`QUEUE.md` holds the full specs. `TASK.md` has L1 active.
Re-check notes from Muse's Pass 4 read are in `QUEUE.md`.

### L1 — Rest decisions into rest.js (pure slice) [T1] — ACTIVE
Revised in re-check: full controller extraction is T2 (new item
L9 below), so this batch takes the safe pure slice only — the
remaining pure decisions (`restMsg`, `goLabel`, `prepVisible`)
into `rest.js` + tests, `restCtx` stays in `app.js`.

### L2 — Audit the lengthened-partials prompt [T1]
Re-check: timing looks correct in source (`app.js:967` — fires
only on lift completion with last RIR ≤1); this item verifies it
with e2e. Open question found: Sun overhead cable extension is
flagged `partial: 1` but is NOT in the `RESEARCH.md` list —
report it, do not change the flag.

### L3 — Day-time model vs real sessions [T1, audit]
Re-check: Pass 4 `sessionLog` (`day` + `durationSec` +
`status`) makes this measurable at last — add pure
`Stats.sessionDrift`, test with fixtures, report. Expect
"insufficient data" (sessions are brand new; no phone data
reaches this session). No constants change, no UI change.

### L4 — Accessibility pass [T1]
Re-check: concrete sub-44px controls found in Pass 4 CSS —
`.mini` 44×36, `.resetlift` 30px, `.applybtn` 30px (28px
short-phone), `.bbdismiss` 26×26, short-phone steppers 40px,
peek-strip buttons 40px. Rest arrows already out of tab order
(`.rnav{display:none}` while resting) — verify.

### L5 — Security audit: import + service worker [T1]
Re-check: Pass 4 extended sanitization to sessions; existing
hostile coverage is one test. Probes: `__proto__` /
`constructor` keys via merge, `1e999` / `Infinity` numbers,
non-array sets, hostile session lifts. Plus SW discipline
(`gym-v7`) and the threat-model paragraph in `PLAN.md`.

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

### L9 — Full rest-controller extraction [T2]
Move `restCtx` + the `Machine` wiring + the DOM handlers out of
`app.js` into a `rest.js` controller, with the pure decisions
(L1) already extracted. Needs a Muse `DESIGN.md` section first:
the seam (what the controller owns vs what stays DOM in
`app.js`), the `renderRestPrep` ownership, and the test plan.
Rest is the most user-critical path; do not attempt without it.

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
