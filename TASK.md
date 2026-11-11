# TASK — for OpenCode (planner: Muse)

Status: ACTIVE — BATCH 6 (decided). Batch 5 (B5-01…B5-20) is COMPLETE + VERIFIED by Muse at HEAD `68f319c` (194/194 unit, typecheck clean, 112/112 e2e, SW `gym-v87`, Pages live; review record in `LOOP_STATE.md`). B6-01 is BUILT + VERIFIED (196/196 unit, typecheck clean, 112/112 e2e). The decision-gated items are no longer gated: on Nov 10 Khang delegated the decisions ("Do the gym improvement list, do whatever you think is best") and Muse decided all of them — rationale in `DECISIONS.md` — promoting them into `QUEUE.md` as B6-02…B6-10 in dependency order. Build them in order, one at a time, same batch rules as always.

## Next — B6-02: Off-day sessions: attribute them where Khang can see them [T1]

Full spec in `QUEUE.md` (Batch 6, decided). Summary: P9 decided ATTRIBUTE — off-day (Mon–Thu) sessions keep banking under the next training day exactly as today; the fix is visibility. `stats.js`: a complete `sessionLog` entry covers its recorded `day` for the Mon–Sun week containing its `date` in the week strip + heatmap derivations (no double count when the day is also trained on its real date). `app.js`: on an off day the day summary gains one line, "Off day — this logs as Friday." Files: `stats.js`, `app.js`, `test/stats.test.js`, `e2e/*`. Verify: Wednesday-clock e2e — finish Friday's workout, strip shows Fri done, heat count includes it; full gate green; SW bump.

## Queued after B6-02 (full specs in `QUEUE.md`)

B6-03 `bodyweightSet` flag (schema v4 → v5, merge rule) · B6-04 P6 2-for-2 progression (read-time, from banked sets) · B6-05 P8 finish a partial workout · B6-06 P11 alternates — data + swap marker + progression exclusion (carries the `alt`-strings approval for `program.js`, nothing else there) · B6-07 P11 swap UI · B6-08 P5 Bulgarian rest 120 → 150 (carries the one-number approval) · B6-09 P7 deload week mode (manual, 7 days, sets × 0.6, loads × 0.9) · B6-10 deload follow-through (progression exemption, stall-reset rename, 5-week nudge). Program data stays read-only outside the two approvals named here.

## WIP

WIP: OpenCode editing stats.js, app.js, test/stats.test.js, e2e/journeys.spec.js since 2026-11-10 19:10
