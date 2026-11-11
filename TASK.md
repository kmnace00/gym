# TASK — for OpenCode (planner: Muse)

Status: ACTIVE — BATCH 6 (decided). Batch 5 (B5-01…B5-20) is COMPLETE + VERIFIED by Muse at HEAD `68f319c` (194/194 unit, typecheck clean, 112/112 e2e, SW `gym-v87`, Pages live; review record in `LOOP_STATE.md`). B6-01 is BUILT + VERIFIED. B6-02…B6-08 are BUILT and gated (210/210 unit, typecheck clean, 122/122 e2e, SW `gym-v97`; details in `BUILD_LOG.md`). The OpenCode loop stopped at B6-09: the free usage limit is reached (see `HANDOFF.md`). Remaining in order: B6-09, B6-10.

## Active — B6-09: Deload week: the mode [T2, fully specified in `QUEUE.md`]

Triage: **T2** (payload state + a set-target threaded through every read path), but the spec is complete, so the run continues — builder then tester, pinned to the free DeepSeek Flash hop. Files: `store.js`, `program.js`, `app.js`, `index.html`, `style.css`, `test/store.test.js`, `test/program.test.js`, `e2e/features.spec.js`, `e2e/a11y.spec.js`, `version.js`, `sw.js`.

B6-08 is BUILT and gated (210/210 unit, typecheck clean, 122/122 e2e, SW `gym-v97`, `CACHE-HASH` c7186c371647bbfc; details in `BUILD_LOG.md`). Then B6-10 (deload follow-through), which empties the queue.

## Queued after B6-04 (full specs in `QUEUE.md`)

B6-05 P8 finish a partial workout · B6-06 P11 alternates — data + swap marker + progression exclusion (carries the `alt`-strings approval for `program.js`, nothing else there) · B6-07 P11 swap UI · B6-08 P5 Bulgarian rest 120 → 150 (carries the one-number approval) · B6-09 P7 deload week mode (manual, 7 days, sets × 0.6, loads × 0.9) · B6-10 deload follow-through (progression exemption, stall-reset rename, 5-week nudge). Program data stays read-only outside the two approvals named here.

## WIP

(none)
