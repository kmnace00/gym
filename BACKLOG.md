# BACKLOG — ranked improvement ideas

Not instructions. An item becomes work only when Muse promotes it into
`QUEUE.md` / `TASK.md`. Order is value ÷ risk, highest first.
`[T1]` buildable now · `[T2]` needs a Muse design first ·
`[T3]` Khang-only proposal — the loop never builds it.

## Batch 2 — QUEUED Nov 8 (B1–B3, all T1, hardening from Muse's Batch 1 review)

`QUEUE.md` holds the full specs. `TASK.md` has B1 active. B1: null / non-object
records crash merge/migrate/resetDay (reproduced by Muse on `b7d61f0`).
B2: nested `__proto__` inside a record survives sanitize (inert today).
B3: `node --test test/` fails on Node 24 — fix the test script to the glob.

## Batch 1 — COMPLETE Nov 8 (L1–L5, all T1, verified by Muse at `b7d61f0`)

`QUEUE.md` holds the full specs (history — do not re-run). L1 rest pure slice,
L2 partials audit, L3 sessionDrift, L4 a11y pass, L5 security audit.
Verified: 96/96 unit, typecheck clean, 41/41 e2e, Pages live `gym-v11`.

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

### L9 — Full rest-controller extraction [T2] — DESIGNED Nov 8
Design is in `DESIGN.md` ("L9 design"): new `restctl.js`, controller owns
`rest` + `restCtx` + interval + finish-arming, returns `{state, view,
effects}`; `app.js` stays the DOM shell and performs effects (beep /
vibrate / notify / advance / finish). Pure `machine.js` / `rest.js` untouched.
Build is proposed for Batch 3 — not queued until Khang approves the design
+ the batch. Next T2 designs, in order: L6 (needs Khang's alternate list
first), then L7/L8 (research proposals, program numbers are T3). 

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

### P4 — Count caps in `store.js` (set Nov 9, Phase 5)
`DONE_MAX` / `SETS_MAX` = 12, `ACC_SEC_MAX` = 8 h, `BODYWEIGHT_MAX` = 300 kg,
and `getLift` now backfills legacy placeholder rows only up to the lift's
scheduled `e.s`. These are code constants, not program data, but they decide
what an imported backup is allowed to contain. If a lift ever goes above 12
scheduled sets, or a session is legitimately longer than 8 h, the cap has to
be raised — that is a Khang call, not a loop change.

## Deferred / non-goals (do not re-propose without new evidence)

- Cloud backend / accounts, Apple Watch / Health, full ESM migration,
  IndexedDB. Reasoning in `DESIGN.md`.
- Exercise swap was deferred in Pass 2 for exactly the reasons in L6
  — it is T2 now, not forgotten.

## Pro review findings — Nov 9, 05:55 CT (one sparse run; plan in `QUEUE.md` Batch 3)

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1 | MED | `package.json` `check` never runs `node --check rest.js` (loaded by `index.html:209`, cached in `sw.js:9`) — a syntax error there ships past the fast gate | queued as **B4** [T1] |
| 2 | LOW | `stats.js:48` `setsLogged` is exported and unit-tested but never called by the app (`app.js:393` uses `setsRecorded`) | leave — deliberate exported surface, do not delete |
| 3 | LOW | `app.js:9` + `timer.js:23` `sessionElapsed` alias/function unused in production (`Gym.sessionElapsedSec` is the real clock) | leave — same reason |
| 4 | LOW | `stats.js:296` `weekStatus` hardcodes `n >= 8` lifts as "done" — latent coupling to read-only program data | T1 candidate after L9 (pass the day's lift count in, default 8) |
| 5 | LOW | `sw.js` `CACHE` must be `gym-v20` + `restctl.js` in ASSETS or `check-assets` fails | enforced by the in-flight L9 build |

**Declined for now (Khang only):** raising `DONE_MAX`/`SETS_MAX`/`ACC_SEC_MAX`/
`BODYWEIGHT_MAX` (P4); deleting the exported-but-unread symbols above; any
`program.js` number change (P1/P2). The reviewer's top pick is L8, with B4 as
the only immediately buildable T1.
