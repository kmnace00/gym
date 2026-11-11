# TASK — for OpenCode (planner: Muse)

Status: ACTIVE — BATCH 6 (decided). Batch 5 (B5-01…B5-20) is COMPLETE + VERIFIED by Muse at HEAD `68f319c` (194/194 unit, typecheck clean, 112/112 e2e, SW `gym-v87`, Pages live; review record in `LOOP_STATE.md`). B6-01 is BUILT + VERIFIED. B6-02…B6-10 are BUILT and gated (216/216 unit, typecheck clean, 137/137 e2e, SW `gym-v99`; details in `BUILD_LOG.md`). Remaining: B6-11 — re-specified by Muse Nov 11 (v2, scratch-verified), see below.

## Active — B6-11: Lift-view spacing rhythm [T1] — RE-SPECIFIED Nov 11 (v2)

V1 was flagged NEEDS_DESIGN twice (Nov 10–11): the five values broke two `e2e/smoke.spec.js` assertions — pill clearance −1 at 390×844 (the 44 px `.resetlift` pills bleed 7 px below `.sethead`, so a 6 px gap needs the downward bleed ≤ 5) and a rounding tip at 390×667 (232 vs 233) once the short-screen gap shrank. Muse's resolution (decision record in `DECISIONS.md`, full spec in `QUEUE.md`): `.resetlift` margin becomes `-9px 0 -5px` at tall sizes — same total bleed, so the header box and the B5-01 top-stack budget are unchanged, and clearance stays exactly 1 — and short screens (≤720 px) keep the HEAD layout exactly. Muse scratch-verified the exact diff before re-queueing: 216/216 unit, typecheck clean, 139/139 e2e (137 + the 2 new rhythm tests); at 440×956: gaps 6/8/8, clear 1, topStack 169. Build it as a straight T1.

## Completed — B6-10: Deload follow-through [T1]
- Built Nov 10 (OpenCode). One shared progression predicate (`progressionEntry`) excludes `swap` and `deload` entries at the three progression read sites; stall copy becomes "reset to" (`program.js` comment-only); the 35-day nudge line appears on the day summary when no deload is active, 35+ days since the last deload ended, and the Mon–Sun week is empty. New `e2e/deloadfollow.spec.js` (10 tests). SW `gym-v99` (`CACHE-HASH` ec4083b07efdd1f5). 216/216 unit, typecheck clean, 137/137 e2e at 390×667/844.

## Completed — B6-09: Deload week: the mode [T2, fully specified in `QUEUE.md`]
- Built Nov 10 (OpenCode). Manual-only deload: `store.js` gains `deloadSince` (additive, v5, validated by `validDate()`), an exported pure `deloadActive(p, now)` (7 days), and `rollSession` clears an expired flag; `program.js` gains pure `deloadSets`/`deloadLoad` and an optional target callback on `firstOpenLift`; one `effSets(e)` helper in `app.js` threads the reduced target through every completion path; the suggestion/Plan prefill applies `deloadLoad` with a "Deload week → " prefix; `bankLift` stamps `deload: true`; banner + Start/End buttons in the menu. SW `gym-v98` (`CACHE-HASH` c50d3ba1d5f370f5). 216/216 unit, typecheck clean, 124/124 e2e at 390×667/844. Flagged for Muse (see `LOOP_STATE.md`): the day-row prescription text still prints the programme `3×6` during a deload, and `dayMins`/`dayMinsLeft` still estimate from `e.s`.

## Queued after B6-04 (full specs in `QUEUE.md`)

B6-05 P8 finish a partial workout · B6-06 P11 alternates — data + swap marker + progression exclusion (carries the `alt`-strings approval for `program.js`, nothing else there) · B6-07 P11 swap UI · B6-08 P5 Bulgarian rest 120 → 150 (carries the one-number approval) · B6-09 P7 deload week mode (manual, 7 days, sets × 0.6, loads × 0.9) · B6-10 deload follow-through (progression exemption, stall-reset rename, 5-week nudge) · B6-11 lift-view spacing rhythm [T1, style.css only]. Program data stays read-only outside the two approvals named here.

## WIP

No files claimed.
