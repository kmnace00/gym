# TASK — for OpenCode (planner: Muse)

Status: ACTIVE — BATCH 6 (decided). Batch 5 (B5-01…B5-20) is COMPLETE + VERIFIED by Muse at HEAD `68f319c` (194/194 unit, typecheck clean, 112/112 e2e, SW `gym-v87`, Pages live; review record in `LOOP_STATE.md`). B6-01 is BUILT + VERIFIED. B6-02 and B6-03 are BUILT and gated (198/198 unit, typecheck clean, 112/112 e2e, SW `gym-v91`; details in `BUILD_LOG.md`). The decision-gated items are no longer gated: on Nov 10 Khang delegated the decisions ("Do the gym improvement list, do whatever you think is best") and Muse decided all of them — rationale in `DECISIONS.md` — promoting them into `QUEUE.md` as B6-02…B6-10 in dependency order. Build them in order, one at a time, same batch rules as always.

## Next — B6-06: Alternates: data, swap marker, progression exclusion [T1, logic only]

B6-05 is BUILT and gated (204/204 unit, typecheck clean, 115/115 e2e, SW `gym-v94`, `CACHE-HASH` 614a58be8b43cfe2; details in `BUILD_LOG.md`). Full spec in `QUEUE.md`: alternate lifts with an `alt` id on the primary, a swap marker in the UI (no UI control yet — that's B6-07), and progression/PR exclusion keyed on the swapped id. Then B6-07 (swap UI), B6-08 (Bulgarian rest 150), B6-09 (deload mode), B6-10 (deload follow-through).

## Queued after B6-04 (full specs in `QUEUE.md`)

B6-05 P8 finish a partial workout · B6-06 P11 alternates — data + swap marker + progression exclusion (carries the `alt`-strings approval for `program.js`, nothing else there) · B6-07 P11 swap UI · B6-08 P5 Bulgarian rest 120 → 150 (carries the one-number approval) · B6-09 P7 deload week mode (manual, 7 days, sets × 0.6, loads × 0.9) · B6-10 deload follow-through (progression exemption, stall-reset rename, 5-week nudge). Program data stays read-only outside the two approvals named here.

## WIP

(none)
