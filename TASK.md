# TASK — for OpenCode (planner: Muse)

Status: ACTIVE — BATCH 7 (UI-only improvement phase). Batch 6 is COMPLETE + VERIFIED by Muse at HEAD `b970b9ba` (216/216 unit, typecheck clean, 139/139 e2e, SW `gym-v100`, Pages live). Batch 7: Muse as UI expert (Khang, Nov 12 — drastic visual changes authorized), building in-session; specs in `QUEUE.md`, decision record in `DECISIONS.md`.

## Active — Batch 7: UI-only improvement phase
B7-01 tokens & contrast · B7-02 day-view hierarchy · B7-03 lift-view set stack · B7-04 rest-screen presence · B7-05 progress + menu finish. Presentation only — no behaviour, no program data; usability contracts hold. Muse builds + gates + verifies each item in-session.

## Completed — B6-11: Lift-view spacing rhythm [T1] (v2 spec)
- Built Nov 12 (Muse, in-session UI phase). Asymmetric `.resetlift` bleed (`-9px 0 -5px`) with `.sethead` margin-bottom 6 at tall sizes; title run 8/8/8; `.rirrow` margin-top 8; short screens unchanged. New rhythm test in `e2e/liftgeom.spec.js`. SW `gym-v100` (`CACHE-HASH` 0d1f072cf4c796bc). 216/216 unit, typecheck clean, 139/139 e2e at 390×667/844; `program.js` untouched.

## Completed — B6-10: Deload follow-through [T1]
- Built Nov 10 (OpenCode). One shared progression predicate (`progressionEntry`) excludes `swap` and `deload` entries at the three progression read sites; stall copy becomes "reset to" (`program.js` comment-only); the 35-day nudge line appears on the day summary when no deload is active, 35+ days since the last deload ended, and the Mon–Sun week is empty. New `e2e/deloadfollow.spec.js` (10 tests). SW `gym-v99` (`CACHE-HASH` ec4083b07efdd1f5). 216/216 unit, typecheck clean, 137/137 e2e at 390×667/844.

## Completed — B6-09: Deload week: the mode [T2, fully specified in `QUEUE.md`]
- Built Nov 10 (OpenCode). Manual-only deload: `store.js` gains `deloadSince` (additive, v5, validated by `validDate()`), an exported pure `deloadActive(p, now)` (7 days), and `rollSession` clears an expired flag; `program.js` gains pure `deloadSets`/`deloadLoad` and an optional target callback on `firstOpenLift`; one `effSets(e)` helper in `app.js` threads the reduced target through every completion path; the suggestion/Plan prefill applies `deloadLoad` with a "Deload week → " prefix; `bankLift` stamps `deload: true`; banner + Start/End buttons in the menu. SW `gym-v98` (`CACHE-HASH` c50d3ba1d5f370f5). 216/216 unit, typecheck clean, 124/124 e2e at 390×667/844. Flagged for Muse (see `LOOP_STATE.md`): the day-row prescription text still prints the programme `3×6` during a deload, and `dayMins`/`dayMinsLeft` still estimate from `e.s`.

## Queued after B6-04 (full specs in `QUEUE.md`)

B6-05 P8 finish a partial workout · B6-06 P11 alternates — data + swap marker + progression exclusion (carries the `alt`-strings approval for `program.js`, nothing else there) · B6-07 P11 swap UI · B6-08 P5 Bulgarian rest 120 → 150 (carries the one-number approval) · B6-09 P7 deload week mode (manual, 7 days, sets × 0.6, loads × 0.9) · B6-10 deload follow-through (progression exemption, stall-reset rename, 5-week nudge) · B6-11 lift-view spacing rhythm [T1, style.css only]. Program data stays read-only outside the two approvals named here.

## WIP

No files claimed.
