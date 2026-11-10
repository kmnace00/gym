# BACKLOG — ranked improvement ideas

## Batch 6 — ACTIVE Nov 10 (Muse), approved by Khang (one-tap)

One buildable T1 (B6-01, `Stats.parseKey` round-trip) plus the decision-gated items (P9 off-day, `bodyweightSet` flag, P6, P8, P11/L6, P5, P7) in dependency order — full text in `QUEUE.md`. Batch 5 (B5-01–B5-20) is COMPLETE + VERIFIED by Muse at `68f319c` (194/194 unit, typecheck clean, 112/112 e2e, Pages `gym-v87`).


Not instructions. An item becomes work only when Muse promotes it into
`QUEUE.md` / `TASK.md`. Order is value ÷ risk, highest first.
`[T1]` buildable now · `[T2]` needs a Muse design first ·
`[T3]` Khang-only proposal — the loop never builds it.

## Batch 5 — QUEUED Nov 9 (1 T2 + 19 T1, from three Muse audits + Khang's redesign direction)

Full specs in `QUEUE.md` (B5-01–B5-20); `TASK.md` has B5-01 active. Centerpiece: the lift-page redesign [T2, designed in `DESIGN.md`] answering Khang's Nov 9 screenshot critique (five stacked text layers at the top, ~150–190 px dead band at 390×844) and his user-workflows-first direction. Behind it: workflow fixes (inter-lift rest prep targeting the next lift, day-tab mid-edit backup corruption, false "New PR" on extra sets, stranded `twoTap` confirm label, overnight session-duration clamp, RIR explainer retirement, backup banner that backs up), data safety (salvage on Restore/Merge, newer-version import message, `validDate` round-trip, per-set clamps at the store boundary, sessionLog bad-date drop, salvaged-bar vs save-failure priority), a11y (44 px `.bbact`, week-strip `role`, danger-text contrast, dead menu button hidden), and the Export CSV e2e. Still blocked, not queued: off-day logging (needs Khang's P9 decision) and the `bodyweightSet` flag (schema change, Khang's call).

## Batch 4 — QUEUED Nov 9 (1 T1 + 1 T2, from Muse's Batch 3 review)

Full specs in `QUEUE.md` (B4-01–B4-02); `TASK.md` has B4-01 active. B4-01 is the B3-29 follow-up (`workoutDates` / `trainingDays` null-prototype maps). B4-02 is the corrupt-payload salvage, designed by Muse in `DESIGN.md`. Closed without queueing: the pro-review finding that `weekStatus` hardcodes 8 lifts — it already takes a `dayLens` parameter (pipeline, Nov 9 08:40) and `app.js` passes `DAY_LIFTS`; the 8 is only a fallback default. Still blocked, not queued: off-day logging (needs Khang's P9 decision) and the `bodyweightSet` flag (schema change, Khang's call per P4).

## Batch 3 — QUEUED Nov 9 (33 T1 + 2 T2, from three Muse audits)

Full specs in `QUEUE.md` (B3-01–B3-35); `TASK.md` has B3-01 active. Sources: code audit (20 items), UX audit (20 items), science research pass (L7/L8 unblocked, L6 list ready). Two findings merged (mid-rest freeze = UX #1 + code #12; pill "Start" = UX #8 + code #16). Muse spot-verified the top claims in source before queuing (future-version wipe, SW `res.ok` gaps, `jsconfig` gap, phantom sessions, merge cursor, undo-extra-set, summary PR date, restart snapshot, import size, SW register) and two key citations (Singer 2024, Goto 2019 — see `RESEARCH.md`).

Status corrections Nov 9: L9 is BUILT (verified 145/145 unit, 48/48 e2e, SW `gym-v20`) — the "proposed for Batch 3" line below is stale. Batch 2 (B1–B3) is COMPLETE + self-reviewed by OpenCode at `9556a73`. Pipeline Phases 1–5 + Pass 2 DONE (154/154 unit, 63/63 e2e, SW `gym-v35`, schema v4). The pipeline's "remaining work is Khang's" is answered by this batch (research done) and the T3 proposals below.

| # | Item | Triage |
|---|---|---|
| B3-01 | Mid-rest finish-arm freeze (rest clock strands after final lift) | T1 |
| B3-02 | Future-version payload silently wiped at boot | T1 |
| B3-03 | SW e2e harness (HTTP, not `file://`) — gates B3-04 | T1 |
| B3-04 | SW caches error pages as shell / serves errors over cache | T1 |
| B3-05 | `finalizeSession` logs phantom empty sessions | T1 |
| B3-06 | Undo of an extra set leaves a stale history entry | T1 |
| B3-07 | Restart-lift takes no snapshot | T1 |
| B3-08 | Import-merge silently adopts incoming cursor | T1 |
| B3-09 | "Import backup" unreachable by keyboard | T1 |
| B3-10 | PR / top-reps hint wiped before the lifter sees it | T1 |
| B3-11 | Summary PR count uses wall-clock date, not session date | T1 |
| B3-12 | +15 at GO blanks the rest label | T1 |
| B3-13 | Session pill says "Start" after a pause, not "Resume" | T1 |
| B3-14 | RIR buttons expose no selected state to a screen reader | T1 |
| B3-15 | No focus placement on day ↔ lift ↔ progress navigation | T1 |
| B3-16 | Rest screen hides the session elapsed time | T1 |
| B3-17 | Import has no file-size guard | T1 |
| B3-18 | No upper bound on typed/stepped load and reps | T1 |
| B3-19 | Import-merge reports no counts | T1 |
| B3-20 | "Undo last reset / restore" never says what it will undo | T1 |
| B3-21 | Corrupt-payload bar understates what happened (copy only) | T1 |
| B3-22 | Restore (replace) re-implements the two-tap arm | T1 |
| B3-23 | SW never checks for updates while the app stays open | T1 |
| B3-24 | Week strip / heatmap states invisible to screen readers | T1 |
| B3-25 | "Planned +2" stays in the day summary after the workout starts | T1 |
| B3-26 | Tempo line only exists on the first lift of the day | T1 |
| B3-27 | `typecheck` never checks `restctl.js` | T1 |
| B3-28 | Tooling-guard gaps (check script, check-ids, check-assets) | T1 |
| B3-29 | Stats maps use plain `{}` keyed by user-controlled dates | T1 |
| B3-30 | Untested pure-store paths + program-id uniqueness (tests) | T1 |
| B3-31 | No automated check that the SW `CACHE` version bumps | T1 |
| B3-32 | First run has no guidance at all | T1 |
| B3-33 | No deploy version anywhere in the UI | T1 |
| B3-34 | `nextLift` never wraps to an earlier open lift | T2 (designed) |
| B3-35 | Bodyweight-resolution rule duplicated in four places | T2 (designed) |

## Next (T2 — designs in `DESIGN.md`, not queued)

### Off-day logging is misattributed (UX audit #5) [T2, blocked on Khang's decision]
Logging on Mon–Thu banks sets under Friday's key with the wrong date (`store.js:49` maps Mon–Thu to `"fri"`); the sets count toward totals but are invisible in the week strip and heatmap. Needs a decision first — either block logging on off days with a one-line message, or attribute the session to the next training day. Design follows the decision; do not build either silently.

### Corrupt-payload salvage [T2] — BUILT (B4-02, Nov 9; extended to Restore/Merge by B5-06)
Closed: `store.js` `salvage()` ships in B4-02 and B5-06 wires the same fallback into `importRaw`/`importMerge`. Kept here as history; not an open item.

### `bodyweightSet` flag (code audit #19) [T2, schema change]
The merge bodyweight rule adopts the imported bodyweight only while the local one is the 165 default, so it cannot distinguish "never set" from "Khang genuinely weighs 165 lb". Fixing that needs a `bodyweightSet` flag, i.e. a schema change. Design in `DESIGN.md` first; Khang's call (see also P4).

## Proposals (T3 — Khang only, never auto-built)

### P5 — Bulgarian split squat rest 120 s → 150 s (L8, Nov 9)
The only per-lift rest change the audit found: Bulgarian sits exactly on the floor of the 2–3 min lower-compound range, and unilateral leg work carries high local fatigue. Medium-low confidence — no study compares 2 vs 2.5 min directly; this is the rule's own range, not a measured effect. Time cost +90 s on Friday (~73.5 → ~75 min). All other 23 lifts: keep (see `RESEARCH.md`).

### P6 — Progression trigger: adopt the 2-for-2 rule (L7, Nov 9)
Today one top-hit session adds a step (`suggestLoad` reads only the last entry). The NSCA standard is 2+ reps over the goal on the last set for 2 consecutive workouts before adding weight (Baechle & Earle, Ch. 18; ACSM 2009, 2–10% band — all app step sizes already inside it). Effect: slower, more conservative load increases; fewer grinds at RIR 0–1. Medium confidence (textbook/position-stand consensus, not an RCT). Needs a T2 design after approval (`suggestLoad`/`planFor` must read the last two entries).

### P7 — Planned program-wide deload week every ~5–6 weeks (L7, Nov 9)
The app has no deload concept; `stallLoad` is a per-lift reactive reset, not a deload (literature deload: planned, program-wide, ~7 days every 4–6 weeks, volume is the main lever — Bell 2023, Rogerson 2024). Adding a deload mode (fewer sets and/or lighter loads for one week) is a new feature: T3 decision + T2 design if approved. Not urgent — Coleman 2024: a week off costs a little strength but no muscle, so the cost of *not* deloading on a schedule is low while he's still progressing. Companion note: stop calling `stallLoad` a deload in docs; rename the concept to "stall reset".

### P8 — Finish a partial workout (UX audit #14)
"Finish workout" only appears when all 8 lifts are done. A lifter who runs out of time at lift 6 gets no summary and no clean session close. Proposal: show Finish whenever there is any logged data, with the summary titled to say it's partial (e.g. "Friday — partial, 6 of 8 lifts"). Changes what "finish" means — Khang's call.

### P9 — Off-day logging: block or attribute? (see T2 above)
The decision that unblocks the off-day design: block logging on Mon–Thu with a one-line message, or attribute the session to the next training day.

### P10 — Overhead cable extension `partial: 1` flag: KEEP (recommended, Nov 9)
The evidence for triceps lengthened partials is the strongest in the partials literature — Goto 2019 (partial-ROM triceps extensions at long muscle lengths grew CSA +48.7% vs +28.2% full ROM, trained men, 8 weeks) and Maeo 2023 (overhead cable extensions — the exact exercise — grew the long head +28.5% vs +19.6% neutral, 12 weeks). The Nov 8 list was incomplete, not the flag wrong. `RESEARCH.md` now lists triceps; the flag stays unless Khang says otherwise. Counterweight recorded: Wolf 2025 — in trained lifters, lengthened partials tie full ROM rather than beating it; the app's conservative use (only after full-ROM failure, last set only) is exactly the "extend the last set" application, so "tie" still supports keeping it.

### P11 — L6 exercise-swap alternates (PROPOSAL — approve/edit per lift, Nov 9)
One substitute per lift for "machine taken / no equipment". Same muscle, similar loading, standard coaching substitutions (medium confidence — coaching practice, not literature-derived; nothing here is decided). Progression model if approved: log the swap under the original lift's `id` (keeps `suggestLoad`/`stallLoad` working, no schema change), with a swap flag on the entry — Khang decides; the alternative (alternates get their own history) needs a design.

| Lift | Proposed alternate |
|---|---|
| Fri Smith squat | Barbell back squat (start conservative — no Smith rail) |
| Fri Smith incline | Barbell incline press |
| Fri Bulgarian | DB reverse lunge |
| Fri incline DB | Barbell incline press |
| Fri pec deck | Incline DB fly |
| Fri leg extension | Sissy squat (assisted, hold a rack) |
| Fri cable lateral | DB lateral raise |
| Fri weighted dip | Close-grip bench press |
| Sat front pulldown | Pull-ups (band-assisted if <5 reps) |
| Sat cable RDL | DB Romanian deadlift |
| Sat T-bar row | One-arm DB row (chest-supported if possible) |
| Sat leg curl | Nordic hamstring curl (eccentric-only, assisted; fallback: lying leg curl machine) |
| Sat Bayesian curl | Incline DB curl |
| Sat preacher curl | Spider curl (chest-supported on incline bench) |
| Sat rear delt | Bent-over DB reverse fly |
| Sat calf raise | Single-leg DB calf raise on a step |
| Sun leg press | Barbell back squat (if no rack: goblet squat, heels elevated) |
| Sun pull-ups | Lat pulldown |
| Sun machine OHP | Seated DB overhead press |
| Sun cable fly | Pec deck fly |
| Sun seated row | Barbell bent-over row |
| Sun lateral↔pec deck (superset) | DB lateral raise + bent-over DB reverse fly |
| Sun overhead extension | Single-arm DB overhead extension |
| Sun calf raise | Single-leg DB calf raise on a step |

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
BUILT Nov 9 (verified 145/145 unit, 48/48 e2e, SW `gym-v20`) — see `TASK.md`. Next T2 designs, in order: L6 (alternate list now proposed as P11, needs Khang's approval first), then L7/L8 (research done Nov 9; proposals P5–P7, program numbers are T3).

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
