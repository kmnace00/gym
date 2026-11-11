# TASK — for OpenCode (planner: Muse)

Status: ACTIVE — BATCH 6 (decided). Batch 5 (B5-01…B5-20) is COMPLETE + VERIFIED by Muse at HEAD `68f319c` (194/194 unit, typecheck clean, 112/112 e2e, SW `gym-v87`, Pages live; review record in `LOOP_STATE.md`). B6-01 is BUILT + VERIFIED. B6-02 and B6-03 are BUILT and gated (198/198 unit, typecheck clean, 112/112 e2e, SW `gym-v91`; details in `BUILD_LOG.md`). The decision-gated items are no longer gated: on Nov 10 Khang delegated the decisions ("Do the gym improvement list, do whatever you think is best") and Muse decided all of them — rationale in `DECISIONS.md` — promoting them into `QUEUE.md` as B6-02…B6-10 in dependency order. Build them in order, one at a time, same batch rules as always.

## Next — B6-04: Progression: adopt the 2-for-2 rule [T1]

Full spec in `QUEUE.md` (Batch 6, decided). Summary: P6 decided ADOPT. `program.js` adds a pure qualifier — an entry qualifies when its last set (or, for legacy entries without `sets`, the entry's own reps/rir) has `reps >= e.top + 2` AND `rir >= e.rir`. `suggestLoad(e, prev, prev2)` adds `e.step` only when BOTH of the most recent two entries qualify, keeps the `{suggest, last, hitTop}` shape, and adds `qualified: 0|1|2`; `planFor` passes the last two entries and its action values stay unchanged. `app.js` `renderSuggest`: stall branch byte-identical; the up branch reads "(hit top twice) → try X" with Apply; when only the latest entry qualifies, show "one more top session to go up" with no Apply; otherwise the existing keep line. No schema change; `hitTop` and `stallLoad` untouched; stall still wins. Files: `program.js`, `app.js`, `test/program.test.js`, `e2e/*`. Verify: unit matrix (two qualify ⇒ +step; only latest/only older ⇒ keep; legacy entries; stall wins) + e2e seeded two vs one qualifying session; full gate green; SW bump. Note: the precache budget is at 255,980/256,000 bytes, so reclaim space before adding bytes.

## Queued after B6-04 (full specs in `QUEUE.md`)

B6-05 P8 finish a partial workout · B6-06 P11 alternates — data + swap marker + progression exclusion (carries the `alt`-strings approval for `program.js`, nothing else there) · B6-07 P11 swap UI · B6-08 P5 Bulgarian rest 120 → 150 (carries the one-number approval) · B6-09 P7 deload week mode (manual, 7 days, sets × 0.6, loads × 0.9) · B6-10 deload follow-through (progression exemption, stall-reset rename, 5-week nudge). Program data stays read-only outside the two approvals named here.

## WIP

(none)
