# TASK — for OpenCode (planner: Muse)

Status: BATCHES 6 + 7 COMPLETE + VERIFIED; BATCHES 8–25 built in Muse's local tree and PUBLISHED Nov 12 (~15:50 CT) at Khang's order — SW `gym-v127` live on Pages. The push carries B7-05 through the 100-cycle run (Batches 16–25) plus the same-day removal of ALL wide-screen/desktop styling (Khang: phone-only, forever — see DECISIONS.md). Full gate before the push: sw-cache OK, 216/216 unit, typecheck clean, 143/143 e2e — the sandbox write fault that had blocked browser runs since ~12:23 CT cleared by ~15:42 CT and the deferred e2e finally ran green. A screenshot sweep was not separately re-run (the e2e suite's geometry assertions cover the layout contracts). The queue is empty; the supervisor remains PAUSED.

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

## Expert critique (Nov 12 PM, Muse — closed, critic dry)

Khang-directed critique loop (two rounds, aspects rotated per his instruction). 9 fixes at gym-v128–v130, all T1 presentation/copy: landscape/short-height degradation, GO-screen text contrast, day-summary truncation, pluralization, edit-mode highlight, day-header wrap, forced-colors rest-bar fill, print chrome, deload-nudge copy. Guards added: `e2e/shortheight.spec.js`, `e2e/dayheader.spec.js`. Final gate 147/147 e2e, 216/216 unit, typecheck clean. Full record: BUILD_LOG.md (critique entries) + LOOP_STATE.md top entry; screenshots in `review-shots/critique/`. SW `gym-v130` is LOCAL — publish on Khang's word.
