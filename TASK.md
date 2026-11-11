# TASK — for OpenCode (planner: Muse)

Status: ACTIVE — BATCH 6 (decided). Batch 5 (B5-01…B5-20) is COMPLETE + VERIFIED by Muse at HEAD `68f319c` (194/194 unit, typecheck clean, 112/112 e2e, SW `gym-v87`, Pages live; review record in `LOOP_STATE.md`). B6-01 is BUILT + VERIFIED. B6-02…B6-10 are BUILT and gated (216/216 unit, typecheck clean, 137/137 e2e, SW `gym-v99`; details in `BUILD_LOG.md`). Remaining: B6-11 — BLOCKED, see below.

## Blocked — B6-11: Lift-view spacing rhythm [T1] — NEEDS_DESIGN

Triage: **T1** (five exact `style.css` values), but the spec contradicts itself: applying all five values makes the item's own "the existing B5-01 contract still holds" requirement fail. Two assertions in `e2e/smoke.spec.js:43` go red (measured, then reverted):
- 390×844: `clear` (Undo/Restart pills → first set row) = **-1**, required ≥ 1. The pills are 44 px with `margin:-7px 0`, so they bleed 7 px below `.sethead`; a 6 px head→row gap puts them 1 px inside the first row. With the `-7px` pill margins untouched, the contract needs `.sethead` margin-bottom ≥ 8 px — the exact value the spec removes.
- 390×667: `.setlog` = 232 px, required ≥ Σ(rounded row heights) + 2×4 = 233 px. At the new 4 px gap each row measures 74.51 → rounds to 75, so the rounded sum exceeds the log by 1 px (knife-edge rounding, not overflow).

Options for Muse (neither is in the spec, so none was applied): (a) `.resetlift` margin `-7px` → `-5px` (clear becomes 1; top stack grows 2 px, still inside the B5-01 20% ceiling by ~1.3 px at 844); (b) keep the 844 head gap at 8 px and remove the pill bleed; (c) relax the 667 assertion to `+ 2*3`. Reverted to HEAD `4825991` — tree green (216/216 unit, 137/137 e2e).

## Completed — B6-10: Deload follow-through [T1]
- Built Nov 10 (OpenCode). One shared progression predicate (`progressionEntry`) excludes `swap` and `deload` entries at the three progression read sites; stall copy becomes "reset to" (`program.js` comment-only); the 35-day nudge line appears on the day summary when no deload is active, 35+ days since the last deload ended, and the Mon–Sun week is empty. New `e2e/deloadfollow.spec.js` (10 tests). SW `gym-v99` (`CACHE-HASH` ec4083b07efdd1f5). 216/216 unit, typecheck clean, 137/137 e2e at 390×667/844.

## Completed — B6-09: Deload week: the mode [T2, fully specified in `QUEUE.md`]
- Built Nov 10 (OpenCode). Manual-only deload: `store.js` gains `deloadSince` (additive, v5, validated by `validDate()`), an exported pure `deloadActive(p, now)` (7 days), and `rollSession` clears an expired flag; `program.js` gains pure `deloadSets`/`deloadLoad` and an optional target callback on `firstOpenLift`; one `effSets(e)` helper in `app.js` threads the reduced target through every completion path; the suggestion/Plan prefill applies `deloadLoad` with a "Deload week → " prefix; `bankLift` stamps `deload: true`; banner + Start/End buttons in the menu. SW `gym-v98` (`CACHE-HASH` c50d3ba1d5f370f5). 216/216 unit, typecheck clean, 124/124 e2e at 390×667/844. Flagged for Muse (see `LOOP_STATE.md`): the day-row prescription text still prints the programme `3×6` during a deload, and `dayMins`/`dayMinsLeft` still estimate from `e.s`.

## Queued after B6-04 (full specs in `QUEUE.md`)

B6-05 P8 finish a partial workout · B6-06 P11 alternates — data + swap marker + progression exclusion (carries the `alt`-strings approval for `program.js`, nothing else there) · B6-07 P11 swap UI · B6-08 P5 Bulgarian rest 120 → 150 (carries the one-number approval) · B6-09 P7 deload week mode (manual, 7 days, sets × 0.6, loads × 0.9) · B6-10 deload follow-through (progression exemption, stall-reset rename, 5-week nudge) · B6-11 lift-view spacing rhythm [T1, style.css only]. Program data stays read-only outside the two approvals named here.

## WIP

No files claimed. The B6-11 claim (style.css, e2e/liftgeom.spec.js, version.js, sw.js, Nov 10 22:10 CT) is released: that run reverted its diff and pushed no code, so those files are free for Muse.
