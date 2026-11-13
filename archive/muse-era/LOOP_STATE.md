# LOOP_STATE — checkpoint

Status: EXPERT CRITIQUE COMPLETE, CRITIC DRY (Nov 12 ~19:00 CT, local tree) — Khang's "critique until you have no objections, then rotate aspects" run. Every screen/state screenshotted and reviewed in both themes (day, lift, suggestion, rest full/peek/paused/GO, set-edit, swap, progress data/empty, menu, summary, deload), plus landscape, 320/430px widths, forced-colors, print, reduced-motion, corrupt-storage and big-history probes. Round 1: 5 fixes (landscape breakage — rows crushed to 21px, Set Done off-screen, rest card overflowing; GO elapsed/message lines unreadable; day summary mid-word truncation; "1 sets"; edit-mode double highlight) at gym-v128/v129. Round 2: 4 fixes (in-progress day title crushed by Continue+Finish; FC rest-bar fill invisible on a specificity loss; print sheet printing app chrome; deload-nudge copy clipping its own CTA) at gym-v130. Two probe-driven fixes needed mechanism corrections (44px row floor + whole-view lift scroll + rest min-height:0), and two suspected defects were probed and cleared (FC GO text, storage recovery). Final gate: sw-cache OK, 216/216 unit, typecheck clean, **147/147 e2e** (incl. new guards `e2e/shortheight.spec.js` + `e2e/dayheader.spec.js`); every fix visually re-verified (shots in `review-shots/critique/`). SW `gym-v130`, local tree only — origin still `7425852a` / gym-v127. Publishing v128–v130 = one snapshot push whenever Khang says so. Supervisor PAUSED; queue empty.

Status: BATCHES 11–15 BUILT (Nov 12 ~13:15 CT, local tree) — the 50-cycle UI run Khang ordered at 12:53. Five batches of ten cycles, each logged in BUILD_LOG.md: Batch 11 head + mobile shell (stale pre-Bear theme-color corrected to #17100b with a light pair, text-size-adjust, overscroll, selection, the app's only sub-16px input fixed, view/modal entrances, header press states); Batch 12 motion (GO pulse, rest entrance, set-row state transitions, themed scrollbars, focus-radius fix, backdrop dim-in); Batch 13 light-theme contrast computed and fixed at the token level (faint 3.71→4.94 on bg, accent 4.33→5.37, good 4.00→5.28; dark re-verified ≥5.6 everywhere) + label-tracking harmonisation; Batch 14 states & surfaces (banner rails + press states, caret/placeholder theming, hover states under `@media (hover:hover)`); Batch 15 sweep (opacity-washed text replaced with full-strength tokens — three rest lines + missed week days — bar-fill depth, day-track border, warm light overlay shadows). Per-batch gates: sw-cache OK, 216/216 unit, typecheck clean. DEFERRED: the full e2e + screenshot verification — the sandbox write fault active since ~12:23 CT blocks Playwright's transform-cache and Chromium profile writes (EPERM), so no browser run has been possible since Batch 10; re-run both before any push. SW `gym-v115`. Local tree only; origin still `9f3ff2f1` / gym-v104. Queue empty.

Status: PUBLISHED (Nov 12 ~15:50 CT) — Khang ordered the wide-screen/desktop styling deleted (done in v126→v127: all five wide media blocks + both hover blocks removed, grep-verified zero left) and the result pushed. The sandbox write fault cleared ~15:42 CT; the deferred full e2e ran 143/143 green alongside 216/216 unit + typecheck + sw-cache, and the whole local delta (B7-05 → v127) went to origin in one snapshot push. SW `gym-v127` live on Pages. Queue empty; supervisor PAUSED.

Status: BATCHES 16–25 BUILT (Nov 12 ~14:05 CT, local tree) — the 100-cycle UI run Khang ordered at 13:03 (cycles 51–150; the 50-cycle Batches 11–15 entry is below). Ten batches of ten, each cycle logged in BUILD_LOG.md: Batch 16 wide/desktop stage + status-bar meta + theme crossfade; Batch 17 forced-colors support + a print stylesheet (day sheet); Batch 18 tap targets (both inputs now ≥36/44px) + stat-numeral clamps; Batch 19 a ≤560px compaction tier + landscape width; Batch 20 overflow robustness (swap-pill cap, tempo nowrap, narrow ≤340px tier); Batches 21–25 deep passes over progress, rest, menu/modal, day, and lift views (alignment, dividers, hovers, press states, crossfade completion, opacity-wash removal). Per-batch gates: sw-cache OK, 216/216 unit, typecheck clean. DEFERRED (unchanged): full e2e + screenshot verification — the sandbox write fault is still active at run end; re-run before any push. SW `gym-v125`. Local tree only; origin still `9f3ff2f1` / gym-v104. Queue empty.

Status: BATCH 10 BUILT + VERIFIED (Nov 12 ~12:30 CT, local tree) — Khang's catch: the first set box looked like it was hitting the pills above it. Measured: border-box gap 6 (B6-11's guard, green) but PAINTED gap 1 — the `.resetlift` pills' 5px downward bleed ate the gap. B10-01 rebalanced the bleed to `-11px 0 -3px` with `.sethead` margin-bottom 9: painted gap 6 = the row gap, ~5px of air above the pills, pill clearance 1→6; `e2e/liftgeom.spec.js` now asserts the painted gap (DECISIONS.md records the amendment: rhythms are specified on painted boxes). B10-02: press feedback on editable done rows. Gates at v109 and v110 in the working tree: 216/216 unit, typecheck clean, 143/143 e2e; pristine-copy unit + typecheck passed, its e2e rerun blocked by sandbox EPERM on bulk copy. SW `gym-v110`. Local tree only; origin still `9f3ff2f1` / gym-v104. Queue empty.

Status: BATCH 9 BUILT + VERIFIED (Nov 12 ~12:25 CT, local tree) — audit round 2 covered the states Batch 7/8 never opened (menu both themes, swap mode, set-edit, value editor, peek at 844/667, short-screen rest, stall state; screenshots in `review-shots/batch9/`). One real defect found and fixed as B9-01: in the swapped state the long "Using <alt> — undo" pill pushed Restart off-screen and crushed the set label; `:has`-scoped wrap rules give the pills their own row in swap states only, locked in by new `e2e/swapfit.spec.js`. Everything else audited clean (no `:hover` rules exist, so no sticky-hover risk). Gate from a pristine copy: 216/216 unit, typecheck clean, 143/143 e2e, SW `gym-v107`. Local tree only; origin still `9f3ff2f1` / gym-v104. The local delta (v105–v107) publishes as one snapshot push whenever Khang says so. Queue empty.

Status: BATCH 8 BUILT + VERIFIED (Nov 12 ~10:15 CT, local tree) — one polish cycle (B8-01) driven by a seeded-state audit: the Planner/Reviewer loaded realistic history and screenshotted the states Batch 7 never saw (progress with data in both themes, lift view with suggestion, GO screen, finish summary, plus 440×956 light shots — all in `review-shots/batch8/`). The design held up; the only fixes were week-strip text legibility, a border on the summary tiles, and fatter sparkline strokes. Gate from a pristine copy of the local tree: 216/216 unit, typecheck clean, 141/141 e2e, SW `gym-v106`. Local tree only — origin remains at `9f3ff2f1` / gym-v104. Publishing the local delta (v105 + v106: style.css, version.js, sw.js, BUILD_LOG.md, TASK.md, LOOP_STATE.md) is one snapshot push whenever Khang says so. Queue empty; audit dry — the UI phase is at a natural stop.

Status: BATCH 7 COMPLETE + VERIFIED (Nov 12 ~07:15 CT) — UI-only phase closed. All five items built + gated in-session: B7-01 tokens/contrast/elevation (`87c95578`, gym-v101), B7-02 day-view hierarchy + dayfit guard (`5f8ee759`, gym-v102), B7-03 set-stack hero type (`1aac8a69`, gym-v103), B7-04 rest-screen presence (`9f3ff2f1`, gym-v104) — those four are on origin and live. B7-05 progress + menu finish (gym-v105) was built after Khang's Nov 12 06:35 direction to work continuously without pushing: it lives only in the Planner/Reviewer's local tree (`~/workspace/gym-loop-work/`) and is NOT on origin. Final verification ran from a pristine copy of that local tree: 216/216 unit, typecheck clean, 141/141 e2e at 390×667/844, `program.js` untouched; before/after screenshots in `review-shots/batch7/` (local tree). Publishing v105 = one snapshot push of style.css/version.js/sw.js/BUILD_LOG.md whenever Khang says so. Supervisor remains PAUSED; the queue is empty.

Status: B6-11 BUILT (Nov 12 ~06:05 CT, in-session) — Batch 6 is fully built. The v2 spec landed exactly as scratch-verified: 216/216 unit, typecheck clean, 139/139 e2e, SW `gym-v100`. Next: the Planner/Reviewer's independent verification from a fresh clone, then Batch 7 — a UI-only improvement phase Khang opened Nov 12 (the Planner/Reviewer as UI expert, drastic visual changes authorized; no program data, no features, usability contracts hold). Supervisor stays PAUSED.

Status: B6-11 RE-SPECIFIED (Nov 11 ~06:25 CT) — the NEEDS_DESIGN below is resolved: v2 spec in `QUEUE.md` (asymmetric `.resetlift` bleed −9/−5 keeps pill clearance at 1 with `.sethead` margin-bottom 6; short-screen layout unchanged by design). The Planner/Reviewer scratch-verified the exact diff in a throwaway clone before re-queueing: 216/216 unit, typecheck clean, 139/139 e2e (137 + 2 new rhythm tests), and at 440×956 gaps 6/8/8, clear 1, topStack 169. Straight T1 build; when it lands, the queue is empty and Batch 6 is complete. Supervisor note: the supervisor spawned 111 builders overnight on the flagged item (every one exited correctly; no junk commits) and it was re-paused Nov 11 ~05:36 CT (PAUSED file in place) — it stays paused outside the Thu Gate 3 / v2 plan.

Status: STOPPED at B6-11 (OpenCode, Nov 11 ~00:15 CT, supervisor-spawned run — a second run on the same item; the ~22:05 entry below is the first record). Independent re-run, same verdict. Working tree clean at `4825991` == `origin/main` (SW `gym-v99`, `CACHE-HASH` ec4083b07efdd1f5): gate at HEAD `npm run check` 216/216 (exit 0), `npm run typecheck` clean (exit 0), `npm run e2e` 137/137 (exit 0). With the spec's five values applied: check 216/216 green, typecheck clean, e2e **137 passed / 2 failed** (exit 1) — both red assertions in `e2e/smoke.spec.js:43`. The diff was reverted; nothing was pushed, no asset reached Pages. Run exits; the loop does not retry B6-11 until the Planner/Reviewer re-specs it.

NEEDS_DESIGN (B6-11, for the Planner/Reviewer — measured at 390×844 / 390×667, fresh profile, lift 1, Chrome via Playwright):
- The spec's own targets are met with the local diff: `.sethead`→first row 6 / 4, row gap 6 / 4, `.liftnav`→`#exName` 8, `#exName`→`#exPres` 8, `.rirrow` margin-top 8px. The new B6-11 assertions pass.
- But `.sethead` margin-bottom 8 → 6 collides with `e2e/smoke.spec.js:43`: the Undo/Restart pills are 44 px tall with `margin:-7px 0`, so they overhang the 30 px header box by 7 px. At 8 px the clearance is exactly 1 px (the assertion `clear >= 1`); at 6 px it is −1 px — the pill edge lands 1 px inside the first set row.
- The same item also tips `e2e/smoke.spec.js:67` at 390×667: rows are 74.5 px (round to 75), so `sum(rounded)+8 = 233` while the log measures 231.5 → 232. The log still fills its region exactly (rows + 2 gaps = 231.53); the assertion fails only on rounding, at HEAD it passed by 0.
- Tried and rejected (scratch clone, not the repo): `.resetlift{margin:-5px 0}` clears the pill overlap but grows the header box 4 px and breaks the B5-01 "top stack ≥20% under baseline" assertion at both viewports. Any fix that keeps a 6 px rhythm and a 44 px pill needs a decision on which contract gives: the pill clearance, the top-stack budget, or the log-fill rounding tolerance.
- Options for the Planner/Reviewer: (a) keep the 6 px rhythm and relax the pill-clearance assertion to `>= 0` (accept the 1 px overlap); (b) re-baseline `.sethead` margin-bottom to 7 px and re-check the pill math; (c) move the pills out of the header row (markup — outside B6-11's "no markup changes" line).

Status: STOPPED at B6-11 (OpenCode, Nov 10 ~22:05 CT) — B6-09 and B6-10 BUILT, gated and pushed (`8e4c038`, `4825991`): deload week mode (SW `gym-v98`) and deload follow-through (SW `gym-v99`, `CACHE-HASH` ec4083b07efdd1f5); gate 216/216 unit, typecheck clean, 137/137 e2e at 390×667/844. **B6-11 is flagged `NEEDS_DESIGN` and was reverted** — the spec's five spacing values break the B5-01 geometry contract it says must still hold (measured: 390×844 pill→first-row `clear` = −1 vs required ≥ 1; 390×667 `.setlog` 232 vs required 233). Tree is green at `4825991`. Nothing else is queued; the loop waits for the Planner/Reviewer. `~/.gym-sync-pause` is still in place, so pushes were manual.

NEEDS_DESIGN — B6-11 (lift-view spacing rhythm): the five values are self-consistent with each other but not with `.resetlift`'s `margin:-7px 0` pill bleed or the 667 px log rounding. The Planner/Reviewer picks one: (a) `.resetlift` margin −7 → −5 px (clear = 1, top stack +2 px, still inside the B5-01 20% ceiling by ~1.3 px at 844); (b) keep the 844 head→row gap at 8 px and remove the pill bleed; (c) relax the 667 assertion to `+ 2*3`. Once decided, the item is a straight T1 build.

NEEDS_DESIGN (for the Planner/Reviewer, from B6-09/B6-10 — deliberately not changed): (a) the day-row prescription text still prints the programme `3×6` while a deload is active, so the row label and the reduced set target disagree; (b) `dayMins`/`dayMinsLeft` estimate the session from `e.s`, so the time-under-bars figure is high during a deload week; (c) `Stats.personalRecords` (stats.js) still counts deload-week entries — B6-10's spec named only the three `app.js` progression sites, so whether a deload set can set a PR is a product decision, not a mechanical one.

NEEDS_DESIGN (for the Planner/Reviewer, from B6-09 — not changed, spec did not authorise it): (a) the day-row prescription text still prints the programme `3×6` while a deload is active, so the row label and the reduced set target disagree; (b) `dayMins`/`dayMinsLeft` estimate the session from `e.s`, so the time-under-bars figure is high during a deload week. Both are display surfaces only; progression and completion math use `deloadSets`.

Status: BATCH 6 STOPPED (OpenCode, Nov 10 ~21:25 CT, interactive run) — B6-02…B6-08 built and gated; the loop ended at the stated stopping condition: the OpenCode free usage limit is reached (two dispatch attempts returned "Free usage limit reached"), so no further build/test hops can run on the free tier. B6-08: `program.js` `fri-bulgarian` `rest: 120` → `150` (one number only), Friday estimate 74 → 75 min, rest-screen e2e at 2:30; SW `gym-v97` (`CACHE-HASH` c7186c371647bbfc, precache 237,077 bytes); gate 210/210 unit, typecheck clean, 122/122 e2e. HEAD `268fdb5` == `origin/main`, tree clean. Remaining queue: B6-09 (deload mode, T2) and B6-10 (deload follow-through, T1) — unstarted, specs intact in `QUEUE.md`. `~/.gym-sync-pause` is still in place (repo sync paused by Khang).

Previous checkpoint (OpenCode, Nov 10 ~20:40 CT, interactive run) — B6-02…B6-06 built and gated. B6-06: alternates data + logic (`alt` on all 24 lifts, `swapAlt`/`swap` with a 120-char store boundary, `bankLift` stamps `swap`, `Stats.countsForProgression` excludes swapped entries from suggestions/Plan today/sparkline/PRs while volume keeps counting); SW `gym-v95` (`CACHE-HASH` 56394a96136f84c5); gate 208/208 unit, typecheck clean, 117/117 e2e. Next: B6-07 (swap UI), then B6-08…B6-10 in order.

Previous checkpoint (OpenCode, Nov 10 ~20:20 CT, interactive run) — B6-02…B6-05 built and gated. B6-05: partial-finish (`app.js` `#finishBtn` shows on any logged data with "Finish workout"/"Finish partial workout" labels, `showSummary` titles partials "<Day> — partial, N of M lifts"); SW `gym-v94` (`CACHE-HASH` 614a58be8b43cfe2); gate 204/204 unit, typecheck clean, 115/115 e2e. Next: B6-06 (alternates data + swap marker + progression exclusion), then B6-07…B6-10 in order.

Previous checkpoint (OpenCode, Nov 10 ~20:05 CT, interactive run) — B6-02…B6-04 built and gated. B6-04: 2-for-2 progression (`program.js` `qualifies` + `suggestLoad(e, prev, prev2)` with `qualified: 0|1|2`, `planFor` passes the last two entries; `app.js` "(hit top twice) → try X" / "one more top session to go up" copy); SW `gym-v93` (`CACHE-HASH` da49d29516855e29); gate 204/204 unit, typecheck clean, 113/113 e2e. Also this run: precache headroom reclaimed via 1-bit indexed icons (precache 227,202 / 256,000 bytes, SW `gym-v92` at commit `6e82ffa`). Next: B6-05 (finish a partial workout), then B6-06…B6-10 in order.

Previous checkpoint (OpenCode, Nov 10 ~19:45 CT, interactive run) — B6-02 and B6-03 built and gated; precache headroom reclaimed ahead of B6-04: `tools/make-icons.js` now emits 1-bit indexed PNGs (same pixels), icons 29.0 KB → 345 B, precache 227,202 / 256,000 bytes, SW `gym-v92` (`CACHE-HASH` 4a9fb40fe23f7721), gate 198/198 unit, typecheck clean, 112/112 e2e. Next: B6-04 (2-for-2 progression), then B6-05…B6-10 in order.

Previous checkpoint (OpenCode, Nov 10 ~19:55 CT, interactive run) — B6-02 and B6-03 built and gated. B6-02: `stats.js` attributes a completed off-day session to its recorded training day in the Mon–Sun week of its date (week strip + heatmap, no double count) and `app.js` day summary says "Off day — this logs as Friday."; SW `gym-v90`. B6-03: schema v4 → v5 with `bodyweightSet`, derived on migration and used by the merge instead of the 165 heuristic (`store.js`, `app.js`); SW `gym-v91` (`CACHE-HASH` cb9d043437e18eb9). Gate at HEAD: `npm run check` exit 0 — 198/198 unit, `check-assets` 13 refs/14 assets/2 manifest icons, `check-ids` 110 refs/118 ids/9 scripts/3 day tabs, `check-sw-cache` digest `cb9d043437e18eb9`; `npm run typecheck` clean (exit 0); `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0, no overflow, no console errors); `git diff 68f319c HEAD -- program.js` = 0 lines. Precache 255,980 / 256,000 bytes — next asset change must reclaim space. WIP cleared; next is B6-04 (2-for-2 progression) in `TASK.md`.

Previous checkpoint (OpenCode, Nov 10 ~12:59 CT, supervisor-spawned run) — same verdict, gate green at HEAD `35209a9` (196/196 unit, typecheck clean, 112/112 e2e).

Previous checkpoint (OpenCode, Nov 10 ~12:55 CT, supervisor-spawned run) — same verdict, gate green at HEAD `b7cd061` (196/196 unit, typecheck clean, 112/112 e2e).

Previous checkpoint (OpenCode, Nov 10 ~12:52 CT, supervisor-spawned run) — same verdict. Gate re-run at HEAD `fceb1ec`: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0; `check-assets` 13 refs/14 assets/2 manifest icons, `check-ids` 110 refs/118 ids/9 scripts typechecked/3 day tabs, `check-sw-cache` digest `6d3b391c5f60a828`), `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0, 15.3 s), no overflow, no console errors; Node v26.13.0; SW `gym-v88`; `git diff 68f319c HEAD -- program.js` = 0 lines; sync-first clean (HEAD == `origin/main` at `fceb1ec`, tree clean, authors Khang only). Docs-only checkpoint, no WIP claimed, no SW bump. Run exits — the Planner/Reviewer promotes the gated items.

Review (Nov 10, ~07:55 CT) — Batch 5 VERIFIED, PASS (all 20 items, B5-01…B5-20). Independent re-run from a fresh clone at HEAD `68f319c`: `npm run check` 194/194 unit (incl. asset/id/SW-cache guards), typecheck clean, `npm run e2e` 112/112 (Playwright's bundled chromium in the Planner/Reviewer's VM — same specs and counts as the builder's Mac runs), `program.js` diff vs Batch 5 base `0d4ed1a` = 0 lines, all 68 batch commits authored by Khang (auto-sync), Pages live `gym-v87` (fetched `version.js` from the live site). Every builder number reproduced exactly. Per-item diffs checked against `QUEUE.md`: B5-01 geometry recorded in `BUILD_LOG.md` meets the design acceptance (top stack 217.8 → 173.0 px = −20.6%, setlog→adjust gap 141.9 → 0 px, no-scroll at both viewports); the other 19 items match their specs (salvage fallback in `importRaw`/`importMerge` with `salvaged` marker, distinct `__future` import error, PR baseline maxed with today's banked sets, `ACC_SEC_MAX` clamp on the live clock path, `twoTap` armed-button label restore, save-failure outranking the salvaged bar, `.modalbtn[hidden]`, `.bbact` 44 px, `validDate` round-trip, per-set clamps in `sanitizeSets`, bad-date sessionLog drop, week-strip `role="img"`, per-theme `--danger`, CSV journey e2e, stepper light-render path) — each with the builder's mutation check recorded; no `test.fail()` remnants. One process note, self-disclosed by the builder in `BUILD_LOG.md`: B5-05's mutation-check swap briefly reached `origin/main` as `5720817` before the restored order landed as `51c5006`; HEAD content is correct and the full gate at HEAD is green — noted, not a failure. The Planner/Reviewer also ran a fresh 390×667 sweep at HEAD: zero sub-44 px visible controls on the day and lift views, zero page errors, and confirmed the B5-12 `[hidden]` class is closed (remaining `hidden`-toggled elements all carry a `[hidden]` CSS guard or set no `display`). No new defects found. The T1 queue is now exhausted by design: Batch 6 (prepared, in `QUEUE.md` / `TASK.md`, awaiting Khang's one-tap approval) holds one small T1 (B6-01) plus the decision-gated items — everything else left in `BACKLOG.md` waits on a Khang decision (P9 off-day, `bodyweightSet` flag, P6, P8, P11/L6, P5, P7). Still Khang-only and unchanged: the Pass 3/4 phone checklists above and the Loop 14 Adjust live tap-through (needs him at the phone).
Status: BATCH 5 IN PROGRESS (OpenCode, Nov 9 ~23:25 CT) — B5-01 built and gated (commits `b16700f`…`af4e41c`, SW `gym-v69`, 177/177 unit, typecheck clean, 97/97 e2e); B5-02 built and gated (commits `c8a0969`…`077d6ac`, SW `gym-v70`, 179/179 unit, typecheck clean, 98/98 e2e); B5-03 built and gated (SW `gym-v71`, 179/179 unit, typecheck clean, 99/99 e2e); B5-04 built and gated (SW `gym-v72`, 179/179 unit, typecheck clean, 99/99 e2e); B5-05 built and gated (SW `gym-v73`, 179/179 unit, typecheck clean, 100/100 e2e); B5-06 built and gated (SW `gym-v74`, `CACHE-HASH` 5eb23a291555600b, 182/182 unit, typecheck clean, 101/101 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-07 built and gated (SW `gym-v75`, `CACHE-HASH` d4f9fbe4c4cebdba, 185/185 unit, typecheck clean, 102/102 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-08 built and gated (SW `gym-v76`, `CACHE-HASH` 6199e88c4b5debae, 185/185 unit, typecheck clean, 103/103 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-09 built and gated (SW `gym-v77`, `CACHE-HASH` 9ae3815272ca8981, 187/187 unit, typecheck clean, 103/103 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-10 built and gated (SW `gym-v78`, `CACHE-HASH` d11d3c3e923653c1, 187/187 unit, typecheck clean, 104/104 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-11 built and gated (SW `gym-v79`, `CACHE-HASH` 4e99afc7be24cb04, 187/187 unit, typecheck clean, 106/106 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-12 built and gated (SW `gym-v80`, `CACHE-HASH` cc6a2681cab181ed, 187/187 unit, typecheck clean, 107/107 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-13 built and gated (SW `gym-v81`, `CACHE-HASH` 0bd584082ab107d7, 187/187 unit, typecheck clean, 109/109 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-14 built and gated (SW `gym-v82`, `CACHE-HASH` c802e73c3badbe6b, 189/189 unit, typecheck clean, 109/109 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-15 built and gated (SW `gym-v83`, `CACHE-HASH` 502193684b564d6f, 191/191 unit, typecheck clean, 109/109 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-16 built and gated (SW `gym-v84`, `CACHE-HASH` 514730d868d1c60f, 194/194 unit, typecheck clean, 109/109 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-17 built and gated (SW `gym-v85`, `CACHE-HASH` 33318e098fbf4248, 194/194 unit, typecheck clean, 109/109 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-18 built and gated (SW `gym-v86`, `CACHE-HASH` e465decc1d2c1833, 194/194 unit, typecheck clean, 110/110 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-19 built and gated (e2e only, no SW bump — SW stays `gym-v86` / `e465decc1d2c1833`; 194/194 unit, typecheck clean, 111/111 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). B5-20 built and gated (SW `gym-v87`, `CACHE-HASH` 688daaa93b8c16cd, 194/194 unit, typecheck clean, 112/112 e2e at 390×667/844, no overflow, no console errors, `program.js` untouched). Batch 5 (B5-01…B5-20) is COMPLETE — `QUEUE.md` has no remaining items; loop idle, waiting for the Planner/Reviewer.

Previous checkpoint (OpenCode, Nov 10 ~12:42 CT, supervisor-spawned run) — no unstarted builder item. `TASK.md`'s only buildable item, B6-01, is already shipped (`6c0f084`, on `origin/main`; the round-trip is in `stats.js:220-225` and both tests are in `test/stats.test.js`); the rest of Batch 6 is decision-gated (P9, `bodyweightSet`, P6, P8, P11/L6, P5, P7) and `QUEUE.md` ends at "End of prepared Batch 6". Gate re-run at HEAD `b5cbea5`: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0; `check-assets` 13 refs/14 assets/2 manifest icons, `check-ids` 110 refs/118 ids/9 scripts typechecked/3 day tabs, `check-sw-cache` digest `6d3b391c5f60a828`), `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0, 15.5 s), no overflow, no console errors; Node v26.13.0; SW `gym-v88`; `git diff 68f319c HEAD -- program.js` = 0 lines; sync-first clean (HEAD == `origin/main` at `b5cbea5`, tree clean, authors Khang only). No files changed, no SW bump. Run exits — the Planner/Reviewer promotes the gated items.

Previous checkpoint (OpenCode, Nov 10 ~12:37 CT, supervisor-spawned run) — no unstarted builder item. `TASK.md`'s only buildable item, B6-01, is already shipped (`6c0f084`, on `origin/main`; the round-trip is in `stats.js:220-225` and both tests are in `test/stats.test.js`); the rest of Batch 6 is decision-gated (P9, `bodyweightSet`, P6, P8, P11/L6, P5, P7) and `QUEUE.md` ends at "End of prepared Batch 6". Gate re-run at HEAD `3d3a94a`: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0; `check-assets` 13 refs/14 assets, `check-ids` 110 refs/118 ids, `check-sw-cache` digest `6d3b391c5f60a828`), `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0, 15.5 s), no overflow, no console errors; SW `gym-v88`; `git diff 68f319c HEAD -- program.js` = 0 lines; sync-first clean (HEAD == `origin/main` at `3d3a94a`, tree clean, authors Khang only). No files changed, no SW bump. Run exits — the Planner/Reviewer promotes the gated items.

Previous checkpoint (Nov 10 ~12:33 CT, supervisor-spawned run): no unstarted builder item. `TASK.md`'s only buildable item, B6-01, is already shipped (`6c0f084`, on `origin/main`); the rest of Batch 6 is decision-gated (P9, `bodyweightSet`, P6, P8, P11/L6, P5, P7). Gate re-run at HEAD `c5e190e`: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0), `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0), no overflow, no console errors; SW `gym-v88` (`CACHE-HASH` 6d3b391c5f60a828); `git diff 68f319c HEAD -- program.js` = 0 lines; sync-first clean (HEAD == `origin/main`, tree clean, authors Khang only). No files changed, no SW bump. Run exits — the Planner/Reviewer promotes the gated items.

Previous checkpoint (Nov 10 ~12:28 CT): no unstarted builder item. `TASK.md`'s only buildable item, B6-01, is already shipped (`6c0f084`, on `origin/main`); the rest of Batch 6 is decision-gated (P9, `bodyweightSet`, P6, P8, P11/L6, P5, P7). Gate re-run at HEAD `a948c84` for the record: `npm run check` 196/196 unit + asset/id/SW guards OK (exit 0), `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844, no overflow, no console errors; SW `gym-v88` (`CACHE-HASH` 6d3b391c5f60a828); `git diff 68f319c HEAD -- program.js` = 0 lines; sync-first clean (HEAD == `origin/main`, tree clean, authors Khang only). No files changed, no SW bump. Run exits — the Planner/Reviewer promotes the gated items.

Queue header (Nov 9 ~20:15 CT): 20 items (B5-01…B5-20) in `QUEUE.md`; B5-01 is the lift-page redesign [T2, designed in `DESIGN.md`], the rest are T1 workflow / data-safety / a11y fixes from three Planner/Reviewer audits (code correctness, UX/user-workflows, tests/data-safety) re-scoped to Khang's Nov 9 direction (user workflows first). Base HEAD `0d4ed1a`, SW `gym-v68`, 177/177 unit, 93/93 e2e.

Review (Nov 9, ~19:15 CT) — Batch 4 VERIFIED, PASS. Independent re-run from a fresh clone at HEAD `1267995`: 177/177 unit, typecheck clean, 93/93 e2e (Playwright's bundled chromium — the `channel: "chrome"` run stalls in the Planner/Reviewer's VM, same as prior reviews), `program.js` diff 0 vs Batch 3 base `85d2cd4`, Pages live `gym-v68`, commit authors Khang only. Every builder number reproduced exactly. Findings: (1) the `sanitizeSession` null-guard concern is safe — no change; (3) the salvaged save bar can mask a later `saveFailed` warning — real but low impact, no data-loss path (the warning surfaces on the Keep tap; the original bytes stay quarantined) — queued as B5-11; (5) `DESIGN.md`'s salvage Case B bullet listed `state` as salvaged while the next bullet excludes it — the code follows `QUEUE.md` and the excluding bullet; the wording is fixed by the Planner/Reviewer in the Batch 5 queue push.

Status: BATCH 4 COMPLETE (OpenCode, Nov 9 ~19:05 CT) — B4-01 and B4-02 built and gated; `QUEUE.md` is empty, so the loop is idle and waiting for the Planner/Reviewer. Latest gate: 177/177 unit, typecheck clean, 93/93 e2e at 390×667/844, SW `gym-v68`, `program.js` untouched. Batch 3 (B3-01…B3-35) remains COMPLETE + VERIFIED by the Planner/Reviewer.

Loop watch (WAKE-UP, OpenCode, Nov 9 18:47 CT): schedule `sch_1c2eb52d3001DJiXW9ipS5cDzS` ("gym-loop-queue-watch") — trigger: `git fetch origin && git rev-parse origin/main:QUEUE.md` checked every 5 minutes, wakes a session when that blob hash changes; prompt is the loop prompt itself. Confirmed active in `schedule_list` (status active, next run 2026-11-09 18:51:04 CT, created from this session). **VERIFIED.** The old watch `sch_1c22d75f8001brE544zgavnnP9` is gone (not in the schedule list) and is not reused.

Review (Nov 9, ~16:45 CT) — B3-11…B3-35 VERIFIED, all PASS. Independent re-run from a fresh clone at HEAD `85d2cd4`: `npm run check` 169/169 unit, typecheck clean, `npm run e2e` 91/91 (re-run on Playwright's bundled chromium — the `channel: "chrome"` download stalled in this VM; same specs, same count as OpenCode's Mac run), `program.js` diff 0 lines, all 44 commits by Khang (auto-sync), Pages live `gym-v66`. Diffs checked per item against `QUEUE.md`: session-date PR filter, +15 keeps the rest label, Resume pill, `aria-pressed`, focus placement, rest elapsed, 5 MB import guard (app + store), load/reps clamps in all four paths, merge counts, named undo snapshot, corrupt-bar copy, `twoTap()` replace, SW update check on visible (10-min throttle), week-strip/heatmap screen-reader labels, plan line clears on first set, tempo on every lift, `restctl.js` in typecheck + cross-check, tooling guards, null-prototype stats maps, store test coverage, SW CACHE-HASH guard, first-run hint, `version.js` single-source deploy tag, `nextLift` wrap, `resolveBodyweight` helper — all as specified; no `test.fail()` remnants. Two nits, both docs-only: the 17:58 CT timestamp above (corrected here) and a stale 13:25 status line mid-`TASK.md`. No new defects found. Batch 4 drafted (B4-01 null-prototype follow-up, B4-02 corrupt-payload salvage with design in `DESIGN.md`) — queued only on Khang's go-ahead. Still open for Khang only: T3 proposals P5–P11, the P9 off-day decision, the `bodyweightSet` flag.

Built this run (OpenCode, Nov 9, each item: `npm run check` + typecheck + `npm run e2e` at 390×667/844, no overflow, no console errors, program.js untouched):

- B5-01 lift-page redesign — 177/177 unit, typecheck clean, 97/97 e2e, SW `gym-v69`. Commits `b16700f`, `9a0491a`, `74d2061`, `af4e41c`.
- B5-04 banner "Backup" button downloads directly (banner spec rewritten) — 179/179 unit, typecheck clean, 99/99 e2e, SW `gym-v72`.
- B5-05 day-tab handler resets the edit before switching days (1 new e2e) — 179/179 unit, typecheck clean, 100/100 e2e, SW `gym-v73`.
- B5-06 Restore/Merge salvage damaged backups (`salvage` fallback in `importRaw`/`importMerge`, `salvaged` marker, 3 unit + 1 e2e) — 182/182 unit, typecheck clean, 101/101 e2e, SW `gym-v74`.
- B5-07 newer-version backups get their own error and message (3 unit + 1 e2e) — 185/185 unit, typecheck clean, 102/102 e2e, SW `gym-v75`.
- B5-09 overnight sessions clamp to `ACC_SEC_MAX` on the live clock path (2 new unit tests) — 187/187 unit, typecheck clean, 103/103 e2e, SW `gym-v77`.
- B5-08 extra sets no longer announce a false "New PR" (`doneBtn` PR baseline maxed with today's banked sets; 1 new e2e) — 185/185 unit, typecheck clean, 103/103 e2e, SW `gym-v76`.
- B5-03 RIR explainer retires on the first logged set (1 new e2e) — 179/179 unit, typecheck clean, 99/99 e2e, SW `gym-v71`.
- B5-02 rest prep targets the next lift between lifts (`prepTarget`, `prepIdx`, targeted steppers; 2 new unit tests net, 1 new e2e) — 179/179 unit, typecheck clean, 98/98 e2e, SW `gym-v70`.
- B5-13 data-at-risk buttons meet the 44 px touch floor (`.bbact{height:44px;margin:-8px 0}`; 1 new e2e in `e2e/a11y.spec.js`) — 187/187 unit, typecheck clean, 109/109 e2e, SW `gym-v81`.
- B5-14 `validDate` round-trips so impossible dates are dropped by migrate (2 new unit tests) — 189/189 unit, typecheck clean, 109/109 e2e, SW `gym-v82`.
- B5-15 `sanitizeSets` clamps set load/reps/rir at the store boundary (2 new unit tests) — 191/191 unit, typecheck clean, 109/109 e2e, SW `gym-v83`.
- B5-16 sessionLog entries with a present-but-invalid date are dropped, not re-dated to today (3 new unit tests) — 194/194 unit, typecheck clean, 109/109 e2e, SW `gym-v84`.
- B5-17 week-strip cells get `role="img"` so their state labels reach screen readers (extended existing e2e) — 194/194 unit, typecheck clean, 109/109 e2e, SW `gym-v85`.
- B5-18 per-theme `--danger` token fixes contrast on "Restore (replace)" / "Clear all data" (1 new e2e) — 194/194 unit, typecheck clean, 110/110 e2e, SW `gym-v86`.
- B5-19 Export CSV journey covered by e2e (download event, filename, contents) — 194/194 unit, typecheck clean, 111/111 e2e, SW unchanged (`gym-v86`).
- B5-20 stepper holds use a light readout update path; full render only on release (1 new e2e) — 194/194 unit, typecheck clean, 112/112 e2e, SW `gym-v87`.
- B6-01 `Stats.parseKey` round-trips impossible dates (2 new unit tests) — 196/196 unit, typecheck clean, 112/112 e2e, SW `gym-v88` (`CACHE-HASH` 6d3b391c5f60a828).
- B4-01 `workoutDates`/`trainingDays` are `Object.create(null)` — 170/170 unit, typecheck clean, 91/91 e2e, SW `gym-v67`. Commits `a5c881c`, `bae10f6`.
- B4-02 corrupt-payload salvage (`store.js` `salvage()`, salvaged save-bar state + `#saveBarDownload`, 7 unit + 1 e2e) — 177/177 unit, typecheck clean, 93/93 e2e, SW `gym-v68`. Commits `e4d5550`, `e810dc9` (docs follow in the next auto-sync tick). Reviewer PASS; flagged that DESIGN.md's "state (re-normalized)" is not salvaged — QUEUE.md's B4-02 spec lists only liftHistory/sessionLog and `normalize()` re-derives state, so the implementation matches the queue item.

- B3-11 summary PRs use the session date — 157/157 unit, 73/73 e2e, SW `gym-v47`. Commits `68c78b8`, `58d710a`, `20a20da`.
- B3-12 +15 at GO keeps the rest label — 157/157 unit, 73/73 e2e, SW `gym-v48`. Commit `e2ec96b`.
- B3-13 paused session pill reads "Resume" — 157/157 unit, 73/73 e2e, SW `gym-v49`. Commit `aad34f6`.
- B3-14 RIR buttons carry `aria-pressed` — 157/157 unit, 74/74 e2e, SW `gym-v50`.
- B3-15 focus lands in the lift view on open, back on the row on Back, on the Progress title on Progress — 157/157 unit, 75/75 e2e, SW `gym-v51`.
- B3-16 rest screen shows the session elapsed time — 158/158 unit, 76/76 e2e, SW `gym-v52`.
- B3-17 import/restore reject files over 5 MB (app + store guards) — 159/159 unit, 77/77 e2e, SW `gym-v53`.
- B3-18 load/reps clamped to 0–2000 / 1–999 in all four input paths — 159/159 unit, 78/78 e2e, SW `gym-v54`.
- B3-19 import-merge reports "+N new sessions, M same-date kept the fuller copy" — 160/160 unit, 79/79 e2e, SW `gym-v55`.
- B3-20 undo button names its snapshot ("Undo Reset day (Nov 9)") — 160/160 unit, 80/80 e2e, SW `gym-v56`.
- B3-21 corrupt bar copy names the empty log and the download-first step — 160/160 unit, 80/80 e2e, SW `gym-v57`.
- B3-22 `replaceBtn` uses the shared `twoTap()` arm (ad-hoc timer deleted) — 160/160 unit, 81/81 e2e, SW `gym-v58`.
- B3-23 SW update check on visibilitychange (throttled 10 min) — 160/160 unit, 82/82 e2e, SW `gym-v59`.
- B3-24 week strip cells and the heat card now name their states for screen readers — 160/160 unit, 83/83 e2e, SW `gym-v60`.
- B3-25 the "Planned …" line clears on the first logged set — 160/160 unit, 84/84 e2e, SW `gym-v61`.
- B3-26 the tempo cue now shows on every lift — 160/160 unit, 85/85 e2e, SW `gym-v62`.
- B3-27 `restctl.js` typechecked + script/include cross-check in `check-ids.js` — 160/160 unit, typecheck clean, 85/85 e2e.
- B3-28 tooling guards: tool syntax checks, single-quoted ids, `data-day` vs `DAYS`, manifest icons — all verified against broken fixtures. 160/160 unit, typecheck clean, 85/85 e2e.
- B3-29 `weekLiftIndex`/`sessionVolumes` are `Object.create(null)` — 161/161 unit, typecheck clean, 85/85 e2e.
- B3-30 tests for `reconcile` collisions, `rollSession` complete+hasData, `mergePayload` bodyweight, and 24 unique `exId`s — 167/167 unit, typecheck clean, 85/85 e2e.
- B3-31 `tools/check-sw-cache.js` fails the check when ASSETS contents change without a `CACHE-HASH`/`CACHE` bump — 167/167 unit, typecheck clean, 85/85 e2e.
- B3-32 first-run guidance line, cleared by the first logged set (`Gym.hasData`) — SW `gym-v63`, 167/167 unit, 88/88 e2e.
- B3-33 deploy tag in the menu footer from a single `version.js` the SW imports — SW `gym-v64`, 167/167 unit, 90/90 e2e.
- B3-34 `nextLift` forward-then-wrap, -1 only when the day is done — SW `gym-v65`, 167/167 unit, 91/91 e2e, reviewer PASS.
- B3-35 `Stats.resolveBodyweight(entry, fallback)` single-sources the bodyweight rule (`bwFor`, `entryVolume`, `personalRecords`, `topMovers`) — SW `gym-v66`, 169/169 unit, 91/91 e2e, reviewer PASS.

Note: gym-sync batches whatever is dirty at its ~3-minute tick, so two items can share one commit; every item was gated before the next started.

Review (Nov 9, ~13:10 CT) — B3-01…B3-10 VERIFIED, all PASS. Independent re-run from a fresh clone at HEAD `b4d5e8f`: `npm run check` 157/157 unit, typecheck clean, `npm run e2e` 73/73 (Chrome 157), `program.js` diff 0 lines, all 13 commits by Khang (auto-sync), Pages live `gym-v46`. Diffs checked per item against `QUEUE.md`: `finishReset` clears `finishUntil` + `frozen` in every phase and the arm timer repaints unconditionally; `futureRaw()` exported and boot skips `commit()` while any load warning is active; SW caches the shell only on `res.ok` and returns the cached hit on non-ok revalidation; `finalizeSession` guard, undo re-bank, restart snapshot, merge cursor, import button and rest hint all as specified; no `test.fail()` remnants. No new defects found — no Batch 4 items seeded by this review; B3-11…B3-35 (25 items) remain queued and are the plan. Next: Khang pastes the loop prompt into a fresh OpenCode session to resume at B3-11.

Previous: B3-10 BUILT (OpenCode, Nov 9 11:54 CT) — the PR/top-reps hint now survives on the rest screen: `restCtl.start` takes the hint, `restMsg` shows it in place of the stretch line (partials cue still wins; +30 s prefix applies), `extend15` carries it; advance still clears it. 2 unit tests + 1 e2e ("New PR", no "Stretch", no overflow). 157/157 unit, typecheck clean, 73/73 e2e, SW `gym-v46`. Commit: `b3aba7b` (auto-sync, on origin/main).

Previous: B3-01 BUILT (OpenCode, Nov 9 11:27 CT) — mid-rest finish-arm freeze fixed: `restctl.js` `finishReset()` clears `finishUntil` + `ctx.frozen` in every phase (it used to return early unless phase was `go`), and `app.js` repaints the rest view unconditionally when the 2,600 ms arm timer fires. After "End rest" on the final lift, a >2.6 s hesitation no longer strands a frozen clock / "Tap again to finish": the countdown resumes and the button reads "End rest" (second tap inside the window still finishes). Unit test updated to the new contract + 1 `page.clock` e2e. 154/154 unit, typecheck clean, 66/66 e2e at 390×667/844, no overflow, no console errors, SW `gym-v38`. Commit: `b3476d7` (auto-sync, on origin/main).

Previous: SET-LOG SIZING FIX (OpenCode, Nov 9 11:34 CT) — Khang flagged the set section as still oversized after `gym-v31`; rows are now a fixed 44 px (tap-target floor, no 56/64 px growth), gap 6 px, `.setlog` hugs its rows (144 px for 3 sets vs 180/208), and the 44 px Undo/Restart pills clear the first row by 9/7 px (they were 1 px into it). 154/154 unit, typecheck clean, 65/65 e2e at 390×667/844, SW `gym-v37`.

Previous: PIPELINE PASS 2 DONE (OpenCode, Nov 9 09:12 CT) — 154/154 unit, typecheck clean, 63/63 e2e at 390×667/844, SW `gym-v35`, CI green. P1 units on the lift screen (`a15af57`) + menu/summary reachability on short phones (`1b66b46`); P2 `Stats.progressSnapshot` (`976615d`); P3 shared session aggregate 4.6 → 3.4 ms (`4cf6e7a`); P4 midnight / off-day / summary journeys (`3815cbe`); P5 corrupt-date drop + dead-code cleanup (`4c8a977`). Batch 3 still awaits Khang (L8/L7 NEEDS_RESEARCH, L6 alternate list).
Loop: Batch 1 (L1–L5) and Batch 2 (B1–B3) complete and verified; L9 rest controller built. B3-01…B3-10 are done and verified; B3-11 is next. `QUEUE.md` holds Batch 3 (B3-01–B3-35, in order). OpenCode prompt is live in the repo (`OPENCODE_LOOP_PROMPT.md`) — Khang pastes it into a fresh OpenCode session and it works the queue. The queue is long by Khang's explicit ask — if the session gets long, finish the current item, checkpoint here, and stop; Khang restarts with the same prompt and work resumes from the checkpoint.

## Last verified

- B2 build (OpenCode, Nov 8 21:25 CT): nested unsafe keys. `store.js`
  `sanitizeRecord`, `sanitizeEntry` and `sanitizeSession` now call
  `stripUnsafeKeys` first, and `sanitizeSets` strips each set element, so
  `__proto__` / `constructor` / `prototype` inside a record, history entry,
  session or set cannot survive the store boundary. A record left with only
  unsafe keys is still a valid record (`getLift` fills defaults) — the lift
  is not dropped. 3 new unit tests (JSON-string payloads); merge winner rule
  unchanged. SW `gym-v13`. `npm run check` **106/106 unit**,
  `npm run typecheck` clean, `npm run e2e` **41/41** at 390×667/844.
- B1 build (OpenCode, Nov 8 21:18 CT): null / non-object records.
  `store.js` `sanitizePayload` drops null / non-object `state` records,
  history entries, `sessionLog` entries and session `lifts` values at the
  boundary; dropped state records fall back to `getLift()` defaults (no new
  defaults added). `normalize` / `mergePayload` / `migrateV2` / `reconcile`
  use an `isObj` check, and `mergePayload` skips a null incoming record,
  `migrateV2` treats it as not-done, `resetDay` skips it, `hasData` guards
  it. 7 new unit tests (JSON-string payloads). SW `gym-v12` because
  `store.js` changed. `npm run check` **103/103 unit**, `npm run typecheck`
  clean, `npm run e2e` **41/41** at 390×667/844. Commits: `37a4034` +
  `8c71719` + `8bdd583` (auto-sync, on origin/main).
- L5 build (OpenCode, Nov 8 20:42 CT): security audit probe. Added
  hostile payload tests for `__proto__` / `constructor` keys, `1e999`
  numbers, non-array `sets`, hostile session `lifts`, and oversized
  history/session caps. `store.js` now strips unsafe keys before
  sanitize/merge, uses null prototype objects in merge maps, rejects
  unsafe session ids, normalizes non-array `sets`, and keeps
  `Object.prototype` unpolluted. SW `gym-v11` because `store.js`
  changed. Threat model added to `PLAN.md`. `npm run check` **96/96
  unit**, `npm run typecheck` clean, `npm run e2e` **41/41** at
  390×667/844. Commits: `4258570` + `07d0d9b` + `c5dea85` (on
  origin/main).
- L4 build (OpenCode, Nov 8 20:21 CT): accessibility pass. Requested
  sub-44px controls now measure ≥44 px at 390×667/844: `.mini`,
  `.resetlift`, `.applybtn`, `.bbdismiss`, short-phone `.stepbtn`,
  `.setrow`, peek `.tbtns button`, peek `.detailsbtn`. Negative
  margins preserve the no-scroll layout; no requested control had to
  be left open. Keyboard rest order verified as +15 / Pause / End
  rest / Show workout / Undo / prep steppers; `restPrep` moved after
  the rest footer in DOM while CSS keeps it visually above the footer.
  Rest arrows remain unreachable. WCAG: dark ink 17.18/15.52, muted
  7.81/7.06, faint 5.23/4.73 on bg/surface; light ink 17.25/18.69,
  muted 5.48/5.93, faint 4.80/5.20. SW `gym-v10`. `npm run check`
  **93/93 unit**, `npm run typecheck` clean, `npm run e2e` **41/41**
  at 390×667/844. Commits: `d9cc70f` + `abcf5bd` (both on origin/main,
  Pages live).
- L3 build (OpenCode, Nov 8 20:10 CT): pure `Stats.sessionDrift`
  added + 5 unit tests; fixture-only audit (model 74/69/72 min for
  Fri/Sat/Sun), real-data verdict pending — no sessions recorded
  yet and this session cannot read the phone's localStorage. No
  constants or UI change. SW `gym-v9` (stats.js changed).
  `npm run check` **93/93 unit**, `npm run typecheck` clean,
  `npm run e2e` **38/38** at 390×667/844. Commits: `09798ca` +
  `36489b3` (both on origin/main, Pages live).
- L2 build (OpenCode, Nov 8 19:58 CT): partials-prompt timing
  confirmed by 3 new e2e cases (last set only, RIR ≤1 only, never on
  an unflagged lift) — no `app.js` change needed. Flag audit: 10
  `partial: 1` lifts, 9 match `RESEARCH.md`, Sun overhead cable
  extension is the outlier (flag untouched, T3). `npm run check`
  **88/88 unit**, `npm run typecheck` clean, `npm run e2e`
  **38/38** at 390×667/844, no overflow, no console errors. SW
  unchanged (`gym-v8`, no asset change). Commits: `b6645ea` +
  `78f319a` (both on origin/main, Pages live).
- L1 build (OpenCode, Nov 8 19:50 CT): `restMsg` / `goLabel` /
  `prepVisible` live in `rest.js`, `app.js` wired to them, no
  behaviour change. `npm run check` **88/88 unit** (3 new),
  `npm run typecheck` clean, `npm run e2e` **35/35** at
  390×667/844, no overflow, no console errors. SW `gym-v8`.
  Commit: `28b0c7b` (auto-sync, on origin/main, Pages live).
- Base: `7705a46` (Batch 1 queued) on Pass 4 `cbbf6a8`.
- Pass 4 verified: 85 unit / 35 e2e green, typecheck clean,
  SW `gym-v7`, schema v3 (key still `gym-tool-v2`), 24 lifts
  intact. Pages: https://kmnace00.github.io/gym/

## Batch 2 self-review verdict (one-time, per Khang's 21:10 CT instruction)

Reviewed by OpenCode against the `QUEUE.md` specs, HEAD `9556a73`:

- **B1 — PASS.** Every spec point present: `sanitizePayload` drops null /
  non-object `state` records, history entries, `sessionLog` entries and
  session `lifts` values before any consumer reads them; dropped state
  records are absent, so `getLift()` supplies the normal defaults (the test
  asserts the default record, nothing invented); `mergePayload` skips a null
  incoming record, `migrateV2` treats it as not-done, `resetDay` skips it.
  7 tests, all JSON-string payloads. Merge winner rule, history union,
  session log, schema and program data unchanged.
- **B2 — PASS.** `stripUnsafeKeys` runs at the top of `sanitizeRecord`,
  `sanitizeEntry` and `sanitizeSession`; session `lifts` values are verified
  to be covered (they go through `sanitizeRecord`), not assumed. A record
  that is only unsafe keys stays a valid record. No new key list — only
  `__proto__`, `constructor`, `prototype`. Deliberate extra: sets inside
  records/entries also get stripped (`sanitizeSets`), since a set is part of
  the same record boundary. Merge winner rule unchanged.
- **B3 — PASS.** `test` and the unit step of `check` now use
  `node --test test/*.test.js`. Finding recorded: `npm run check` does not
  call `npm test` — it runs the unit step inline — so both strings were
  changed to keep the gate identical. Glob expands under npm's sh on macOS
  (Node 26 here) and CI remains Node 20 with no change needed. No code
  change, no SW bump; asset guard green.
- **Suite re-run at HEAD:** `npm run check` 106/106 unit + asset guard OK,
  `npm run typecheck` clean, `npm run e2e` 41/41 at 390×667 and 390×844,
  no overflow, no console errors.
- **Program data:** `git diff b7d61f0 HEAD -- program.js` = 0 lines.
  `app.js`, `style.css`, `index.html`, `machine.js`, `stats.js`, `rest.js`,
  `timer.js` also untouched (0 lines).
- **Pages:** live at the new HEAD — `sw.js` serves `CACHE gym-v13` and the
  deployed `store.js` contains the B1/B2 guards.
- **Safety checks:** every commit author is Khang (auto-sync) or the Planner/Reviewer; no
  force-push, no merge, no rebase; only `origin/main` pulled.
- **Open items for the Planner/Reviewer:** (1) the null-record class is now closed at the
  store boundary; `app.js` consumers still assume records are objects, which
  is safe because sanitize is the only entry point; (2) L9 (rest controller,
  `DESIGN.md`) is the next T2 build, not queued; (3) no phone check needed
  for B1–B3 — no UI change.

**Verdict: Batch 2 shipped and clean. OpenCode stops here and waits for
the Planner/Reviewer.**

## Current / next

- Current item: none — B6-01 done (196/196 unit, typecheck clean, 112/112 e2e at 390×667/844, no overflow, no console errors, SW `gym-v88`, `program.js` untouched). Batch 6 has no remaining builder items: the rest of `QUEUE.md` Batch 6 is decision-gated (P9, `bodyweightSet`, P6, P8, P11/L6, P5, P7) and stays gated until Khang decides and the Planner/Reviewer promotes. Queue empty for the loop — stop and wait for the Planner/Reviewer.
- Status: queue empty (OpenCode, Nov 10 ~12:02 CT). No WIP claimed. This run found no builder item to start — B6-01 is already built and pushed (`6c0f084`, on `origin/main`) — so it only re-ran the gate at HEAD as a checkpoint: `npm run check` 196/196 unit + asset/SW guards OK, `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844, no overflow, no console errors; SW `gym-v88` (`CACHE-HASH` 6d3b391c5f60a828); `git diff 68f319c HEAD -- program.js` = 0 lines; working tree clean, HEAD == `origin/main`. Stopping here — the Planner/Reviewer promotes the gated items.
- After the batch, the Planner/Reviewer reviews (ping "check the loop"). T3 proposals for Khang (Bulgarian rest, 2-for-2, deload week, partial finish, off-day decision, L6 alternates) are in `BACKLOG.md` P5–P11 — they do not block this queue.

## Last verified

- HEAD: `cbbf6a8` — "Build all: sessions, per-set truth, bodyweight
  metrics, data safety, week status" (Nov 8, 19:35 CT, Khang).
- Verified: 85 unit / 35 e2e green, typecheck clean, SW `gym-v7`,
  schema v3 (key still `gym-tool-v2`), 24 lifts intact.
  Pages: https://kmnace00.github.io/gym/
- The Planner/Reviewer's local copy synced to this HEAD Nov 8 (was at Pass 3
  `f39f19f`). No conflicts: Khang's push did not touch `PLAN.md`
  or `AGENTS.md`; his `README.md` changes were kept and the loop
  paragraph was re-applied on top; `TASK.md` was not touched by
  this framework push.

## Current / next

- Current item: none.
- Next proposed batch: BACKLOG L1–L5 (T1). Not queued until Khang
  says go.
- Blocked on: Khang's go-ahead to create `QUEUE.md` with L1–L5 and
  issue L1 as the active `TASK.md`.

## Phone check (Khang, async — not blocking unless rest-critical)

Pass 3 build, on the phone in Safari / Home Screen app:
- [ ] Per-set log rows fill the lift view, no dead space (390×667/844)
- [ ] Prev line + real date on the suggestion; Plan today pre-fills
- [ ] Heatmap (8 weeks × Fri/Sat/Sun) + top PR in Progress
- [ ] Export CSV / Share summary work; Restore (replace) two-tap arm
- [ ] Per-lift Undo visible next to the set count; rest Undo same path
- [ ] Pause/Resume pill consistent; paused clock full-opacity
- [ ] Adjusters (load/reps/RIR) always visible; no Adjust leak onto
      the next lift (Loop 14 re-check after the revamp)

Pass 4 build, same phone check:
- [ ] Session clock + Finish workout summary; leaving sets open
      overnight banks the old day and starts today fresh
- [ ] Tap a logged set to edit it in place; extra sets upsert
- [ ] Week strip (Fri/Sat/Sun done/partial/missed/today) in day header
- [ ] Rest-screen next-set prep steppers; two-tap Restart

## Flags

- `NEEDS_RESEARCH`: none.
- `NEEDS_DESIGN`: none.
- `NEEDS_FIX`: none.
- REVIEW NOTE (B6-02): on Mon–Thu the week strip projects the *previous* Fri–Sun block (`mostRecentFriday`), while a Mon–Thu session covers the *next* Friday (its Mon–Sun week). So the covered day appears when that week is projected — Friday onward — and the e2e advances the clock to Friday to assert the strip/heat. Making the strip show the upcoming block on Mon–Thu would change the adherence view and break the existing Monday-after tests; if that was the intent, it is a separate design call. Observed while building, not changed.
- NOTE (size budget): precache is 255,980 / 256,000 bytes. B6-04 must reclaim space before adding any asset bytes; the alternative is a deliberate ceiling change.
- `PAUSED`: no — resumed Nov 8, 21:09 CT. Finish Batch 2 (B1–B3) before 4:00 AM Mon, then stop and wait for review. The Planner/Reviewer is review-only after Batch 2.

## Log

- 2026-11-10 13:05 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first clean:
  `git fetch origin` + `git status -sb` show local `main` == `origin/main` at `545772c`, tree
  clean, `git log --format='%h %an' -5` authors Khang only; `~/.gym-sync-pause` present, so this
  run commits and pushes itself. No builder item to start — `TASK.md` lists only B6-01 (shipped at
  `6c0f084`; round-trip confirmed in `stats.js:220-224`, tests at `test/stats.test.js:399-425`)
  plus the decision-gated Batch 6 entries, and `QUEUE.md` ends at "End of prepared Batch 6".
  Gate re-run at HEAD: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0),
  `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0, 15.4 s),
  no overflow, no console errors; Node v26.13.0, npm 11.20.0. SW `gym-v88` (`CACHE-HASH`
  6d3b391c5f60a828); `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only checkpoint, no WIP
  claimed, no SW bump. Note for Khang: ten consecutive supervisor runs since 12:02 CT have found
  an empty queue — the loop is idle until the Planner/Reviewer promotes a gated item (P9, `bodyweightSet`, P6, P8,
  P11/L6, P5, P7). Run exits; the supervisor wakes the next run.
- 2026-11-10 12:59 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first clean:
  `git fetch origin` + `git status -sb` show local `main` == `origin/main` at `35209a9`, tree
  clean, `git log --format='%h %an' -5` authors Khang only; `~/.gym-sync-pause` present, so this
  run commits and pushes itself. No builder item to start — `TASK.md` lists only B6-01 (shipped at
  `6c0f084`; round-trip confirmed in `stats.js:220-225`, tests at `test/stats.test.js:402-425`)
  plus the decision-gated Batch 6 entries, and `QUEUE.md` ends at "End of prepared Batch 6".
  Gate re-run at HEAD: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0),
  `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0, 15.4 s),
  no overflow, no console errors; Node v26.13.0, npm 11.20.0. SW `gym-v88` (`CACHE-HASH`
  6d3b391c5f60a828); `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only checkpoint, no WIP
  claimed, no SW bump. Note for Khang: seven consecutive supervisor runs since 12:02 CT have found
  an empty queue — the loop is idle until the Planner/Reviewer promotes a gated item. Run exits; the supervisor wakes
  the next run.
- 2026-11-10 12:55 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first clean:
  `git fetch origin` + `git status -sb` show local `main` == `origin/main` at `b7cd061`, tree
  clean, `git log --format='%h %an' -5` authors Khang only; `~/.gym-sync-pause` present, so this
  run commits and pushes itself. No builder item to start — `TASK.md` lists only B6-01 (shipped at
  `6c0f084`; round-trip confirmed in `stats.js:220-225`, tests at `test/stats.test.js:399-429`)
  plus the decision-gated Batch 6 entries, and `QUEUE.md` ends at "End of prepared Batch 6".
  Gate re-run at HEAD: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0),
  `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0, 17.4 s),
  no overflow, no console errors; Node v26.13.0, npm 11.20.0. SW `gym-v88` (`CACHE-HASH`
  6d3b391c5f60a828); `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only checkpoint, no WIP
  claimed, no SW bump. Note for Khang: six consecutive supervisor runs since 12:02 CT have all
  found an empty queue — the loop is idle until the Planner/Reviewer promotes a gated item. Run exits.
- 2026-11-10 12:52 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first clean:
  `git fetch origin` + `git status -sb` show local `main` == `origin/main` at `fceb1ec`, tree
  clean, `git log --format='%h %an' -8` authors Khang only; `~/.gym-sync-pause` present, so this
  run commits and pushes itself. No builder item to start — `TASK.md` lists only B6-01 (shipped at
  `6c0f084`; `parseKey` round-trip verified in `stats.js:220-225`, tests in `test/stats.test.js:403-429`)
  plus the decision-gated Batch 6 entries, and `QUEUE.md` ends at "End of prepared Batch 6".
  Gate re-run at HEAD: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0),
  `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0, 15.3 s),
  no overflow, no console errors; Node v26.13.0. SW `gym-v88` (`CACHE-HASH` 6d3b391c5f60a828);
  `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only checkpoint, no WIP claimed, no SW bump.
  Note for Khang: the supervisor has spawned five consecutive runs since 12:02 CT and every one finds
  an empty queue — the loop is idle until the Planner/Reviewer promotes a gated item. Run exits.
- 2026-11-10 12:48 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first clean:
  `git fetch origin` + `git status -sb` show local `main` == `origin/main` at `ca41f2a`, tree
  clean, `git log --format='%h %an' -8` authors Khang only; `~/.gym-sync-pause` present, so this
  run commits and pushes itself. No builder item to start — `TASK.md` lists only B6-01 (shipped at
  `6c0f084`; `parseKey` round-trip verified in `stats.js:220-225`, tests in `test/stats.test.js:403-429`)
  plus the decision-gated Batch 6 entries, and `QUEUE.md` ends at "End of prepared Batch 6".
  Gate re-run at HEAD: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0),
  `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0, 17.4 s),
  no overflow, no console errors; Node v26.13.0. SW `gym-v88` (`CACHE-HASH` 6d3b391c5f60a828);
  `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only checkpoint, no WIP claimed, no SW bump.
  Run exits — the supervisor wakes the next run.
- 2026-11-10 12:42 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first clean:
  `git fetch origin` + `git status -sb` show local `main` == `origin/main` at `b5cbea5`, tree
  clean, `git log --oneline -5` authors Khang only; `~/.gym-sync-pause` present, so this run
  commits and pushes itself. No builder item to start — `TASK.md` lists only B6-01 (shipped at
  `6c0f084`; the `parseKey` round-trip is in `stats.js:220-225`, tests in `test/stats.test.js`)
  plus the decision-gated Batch 6 entries, and `QUEUE.md` ends at "End of prepared Batch 6".
  Gate re-run at HEAD: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0),
  `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0, 15.5 s),
  no overflow, no console errors; Node v26.13.0. SW `gym-v88` (`CACHE-HASH` 6d3b391c5f60a828);
  `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only checkpoint, no WIP claimed, no SW
  bump. Run exits — the supervisor wakes the next run.
- 2026-11-10 12:37 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first clean:
  `git fetch origin` + `git status -sb` show local `main` == `origin/main` at `3d3a94a`, tree
  clean, `git log --oneline -5` authors Khang only. No builder item to start — `TASK.md` lists
  only B6-01 (shipped at `6c0f084`; `parseKey` round-trip verified in `stats.js:220-225`, tests
  in `test/stats.test.js`) plus the decision-gated Batch 6 entries, and `QUEUE.md` ends at
  "End of prepared Batch 6". Gate re-run at HEAD: `npm run check` 196/196 unit +
  syntax/asset/id/SW-cache guards OK (exit 0), `npm run typecheck` clean (exit 0), `npm run e2e`
  112/112 at 390×667 and 390×844 (exit 0), no overflow, no console errors. SW `gym-v88`
  (`CACHE-HASH` 6d3b391c5f60a828); `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only
  checkpoint, no WIP claimed, no SW bump. Run exits — the supervisor wakes the next run.
- 2026-11-10 12:33 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first clean:
  `git fetch origin` + `git status -sb` show local `main` == `origin/main` at `c5e190e`, tree
  clean, `git log --oneline -5` authors Khang only. No builder item to start — `TASK.md`
  lists only B6-01 (shipped at `6c0f084`, on `origin/main`; the `parseKey` round-trip is in
  `stats.js:220-225` and both B6-01 unit tests are in `test/stats.test.js`) plus the
  decision-gated Batch 6 entries, and `QUEUE.md` ends at "End of prepared Batch 6". Gate re-run
  at HEAD: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0),
  `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0), no
  overflow, no console errors. SW `gym-v88` (`CACHE-HASH` 6d3b391c5f60a828);
  `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only checkpoint, no WIP claimed, no SW
  bump. Run exits — the Planner/Reviewer promotes the gated items.
- 2026-11-10 12:28 CT: CHECKPOINT (OpenCode, supervisor-spawned run). `git fetch origin` +
  `git status -sb`: local `main` == `origin/main` at `a948c84`, tree clean, `git log --oneline -5`
  authors Khang only. No builder item to start — `TASK.md` lists only B6-01 (shipped at
  `6c0f084`) and the decision-gated Batch 6 entries; `QUEUE.md` ends at "End of prepared Batch 6".
  Gate re-run at HEAD: `npm run check` 196/196 unit + syntax/asset/id/SW-cache guards OK (exit 0),
  `npm run typecheck` clean (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844 (exit 0), no
  overflow, no console errors. SW `gym-v88` (`CACHE-HASH` 6d3b391c5f60a828);
  `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only checkpoint, no WIP claimed, no SW bump.
  Run exits — the Planner/Reviewer promotes the gated items.
- 2026-11-10 12:21 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first clean:
  `git fetch origin` + `git status -sb` show local `main` == `origin/main` at `5df496a`, tree
  clean, recent authors Khang only. No builder item to start — `TASK.md` still lists only
  B6-01 (shipped at `6c0f084`, on `origin/main`) plus the decision-gated Batch 6 entries, and
  `QUEUE.md` ends at "End of prepared Batch 6". Gate re-run at HEAD: `npm run check` 196/196 unit
  + syntax/asset/id/SW-cache guards OK (exit 0), `npm run typecheck` clean (exit 0), `npm run e2e`
  112/112 at 390×667 and 390×844 (exit 0), no overflow, no console errors. SW `gym-v88`
  (`CACHE-HASH` 6d3b391c5f60a828); `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only
  checkpoint, no WIP claimed, no SW bump. Run exits — the Planner/Reviewer promotes the gated items.
- 2026-11-08: framework drafted (LOOP.md, BACKLOG.md, RESEARCH.md,
  LOOP_STATE.md). Local copy synced to remote HEAD `f39f19f`.
  Awaiting Khang's go-ahead for Batch 1 (L1–L5).
- 2026-11-08 19:28 CT: HOLD — Khang still editing on OpenCode, will
  push after. Do not push the framework until he says pushed.
  Paste-ready OpenCode prompt saved as `OPENCODE_LOOP_PROMPT.md`.
- 2026-11-08 19:35 CT: Khang pushed Pass 4 (`cbbf6a8`, 85/85 unit,
  35/35 e2e, schema v3, SW `gym-v7`). The Planner/Reviewer synced, rebased the
  framework onto it, and pushed the framework files (LOOP.md,
  BACKLOG.md, RESEARCH.md, LOOP_STATE.md, OPENCODE_LOOP_PROMPT.md,
  PLAN.md, AGENTS.md, README.md). Batch 1 still awaiting approval;
  `QUEUE.md` not created, `TASK.md` still DONE/idle.
- 2026-11-08 19:41 CT: Khang approved Batch 1 with a Pass 4
  re-check. The Planner/Reviewer re-read Pass 4 source and queued L1–L5 in
  `QUEUE.md` (L1 revised to the pure slice, full controller →
  backlog L9 [T2]; L2/L3/L4/L5 revised with Pass 4 findings).
  `TASK.md` now has L1 active. Awaiting Khang pasting the loop
  prompt into OpenCode.
- 2026-11-08 19:50 CT: OpenCode built L1 (rest decisions into
  `rest.js`). 88/88 unit, typecheck clean, 35/35 e2e at
  390×667/844, no overflow, no console errors. SW `gym-v8`.
  Waiting for gym-sync to commit/push before starting L2.
- 2026-11-08 19:53 CT: L1 pushed by gym-sync as `28b0c7b`, Pages
  live. Note: `~/.gym-sync-pause` was blocking the service since
  17:39 — Khang cleared it so the loop can push.
- 2026-11-08 20:05 CT: L2 pushed (`b6645ea` e2e cases, `78f319a`
  log/state), Pages live. L3 built (`Stats.sessionDrift` + 5 tests):
  93/93 unit, typecheck clean, 38/38 e2e, SW `gym-v9`.
- 2026-11-08 20:50 CT: reviewed Batch 1 at HEAD `b7d61f0`.
  L5 verified independently: unit 96/96 (explicit glob), typecheck
  clean, syntax + assets clean, program.js/app.js untouched,
  Pages live at `gym-v11`. Prototype-pollution fix verified.
  Follow-up found by probing beyond L5 spec: null state
  record crashes mergePayload (`theirs.done` on null), and nested
  `__proto__` inside a record survives sanitizeRecord (inert now,
  no Object.assign/spread on records). File as Batch 2 hardening,
  not a Batch 1 reopen. Also: `npm run check` still fails on
  Node 24 (`node --test test/` quirk) — CI uses Node 20, so CI
  should pass; fix test script to `node --test test/*.test.js`.
  Next batch is all T2 (L6–L9) — needs the Planner/Reviewer design + Khang call.
- 2026-11-08 20:53 CT: Khang said "Do all recommended". The Planner/Reviewer queued
  Batch 2 (B1 null-record hardening, B2 nested-proto strip, B3 test
  script glob — all T1, specs in `QUEUE.md`, B1 active in `TASK.md`)
  and designed L9 in `DESIGN.md` (new `restctl.js`, `{state, view,
  effects}` contract, 7 invariants, test plan, rollback = one revert).
  L9 build is proposed Batch 3, not queued. L6/L7/L8 designs follow in
  later sessions (L6 needs Khang's alternate list; L7/L8 are proposals).
  Phone check is async, not blocking. OpenCode stopped — Khang pastes
  the loop prompt again to start Batch 2.
- 2026-11-09 11:08–11:12 CT: set-log sizing fix (OpenCode, Khang:
  "Not quite fixed") — `.setrow` fixed 44 px, `.setlog` hugs its rows,
  Undo/Restart pills clear the first row. Commits `5db9414` + `6b3ffd6`
  (SW `gym-v36` → `gym-v37`, 65/65 e2e). HEAD moved to `6b3ffd6`.
- 2026-11-09 ~11:30 CT: the Planner/Reviewer queued Batch 3 (B3-01–B3-35, 33 T1 + 2 T2)
  from three read-only audits, at Khang's "plan new improvements… very
  long list" ask. B3-01 is the mid-rest finish-arm freeze (verified in source; the L9 "fixed in review" note was wrong — the bug is
  still in the code at HEAD). L7/L8 unblocked by the research pass
  (citations in `RESEARCH.md`; Singer 2024 + Goto 2019 re-verified). T3 proposals P5–P11 in `BACKLOG.md` for Khang. **Push:** held
  while the set-log session was committing at 11:12 CT; pushed ~11:24
  CT after the head check showed no new commits since 11:12. Queue is
  live — Khang can paste the loop prompt.
- 2026-11-09 11:27 CT: B3-01 built (OpenCode). `finishReset()` now
  clears the arm + freeze in every phase; the 2,600 ms timeout repaints
  the rest view unconditionally. Old parity unit test replaced with
  the new contract; new `page.clock` e2e covers arm-mid-rest → expired
  window → ticking clock + "End rest". 154/154 unit, typecheck clean,
  66/66 e2e at 390×667/844, no overflow, no console errors, SW
  `gym-v38`. BUILD_LOG line written; waiting for auto-sync to publish
  before starting B3-02.
- 2026-11-09 11:31 CT: B3-02 built (OpenCode). `futureRaw()` accessor +
  "future" save-bar branch (download-only, no auto-restore) and boot keeps
  the store bytes when any load warning is active. Unit test extended; new
  e2e asserts the bar copy, intact boot bytes and a download equal to the
  original JSON. 154/154 unit, typecheck clean, 67/67 e2e at 390×667/844,
  no overflow, no console errors, SW `gym-v39`. Waiting for auto-sync to
  publish before starting B3-03.
- 2026-11-09 11:35 CT: B3-03 built (OpenCode). New HTTP e2e harness
  (`e2e/sw.spec.js`) with its own static server: registration + offline
  shell green; the 500-on-`app.js` and 500-navigation assertions are
  `test.fail()` expected failures (verified red with the marker removed)
  until B3-04. 154/154 unit, typecheck clean, 69/69 e2e (68 pass + 1
  expected failure), no console errors. No asset change, SW `gym-v39`.
  Waiting for auto-sync to publish before starting B3-04.
- 2026-11-09 11:38 CT: B3-04 built (OpenCode). Navigation caches the shell
  only when `res.ok`; asset revalidation returns the cached copy on a
  non-ok response. B3-03 harness fully green; `test.fail()` marker
  removed. 154/154 unit, typecheck clean, 69/69 e2e, SW `gym-v40`.
  Waiting for auto-sync to publish before starting B3-05.
- 2026-11-09 11:40 CT: B3-05 built (OpenCode). `finalizeSession` drops the
  `!startedAt` exemption, so a clock-started session with no logged sets
  banks nothing (finalize and next-day roll covered); an existing entry
  still updates. 1 new unit test. 155/155 unit, typecheck clean, 69/69
  e2e, SW `gym-v41`. Waiting for auto-sync to publish before starting
  B3-06.
- 2026-11-09 11:43 CT: B3-06 built (OpenCode). `undoSet` re-banks when the
  lift is still complete after the undo, so 4→3 leaves 3 sets in history.
  Extended the extra-set e2e. 155/155 unit, typecheck clean, 69/69 e2e,
  SW `gym-v42`. Waiting for auto-sync to publish before starting B3-07.
- 2026-11-09 11:46 CT: B3-07 built (OpenCode). `doRestartLift` snapshots
  `pre-restart-lift` before `resetLift`; 1 new e2e restores the lift via
  "Undo last reset / restore". 155/155 unit, typecheck clean, 70/70 e2e,
  SW `gym-v43`. Waiting for auto-sync to publish before starting B3-08.
- 2026-11-09 11:48 CT: B3-08 built (OpenCode). `mergePayload` keeps the base
  cursor (incoming `cur`/`idx` no longer copied); unit + e2e lock fri/idx 2
  across an import of sun/idx 5. 156/156 unit, typecheck clean, 71/71 e2e,
  SW `gym-v44`. Waiting for auto-sync to publish before starting B3-09.
- 2026-11-09 11:51 CT: B3-09 built (OpenCode). Import is now a real button
  clicking `#importFile`; Tab reaches it and Enter opens the picker. 1 new
  e2e. 156/156 unit, typecheck clean, 72/72 e2e, SW `gym-v45`. Waiting for
  auto-sync to publish before starting B3-10.
- 2026-11-09 11:54 CT: B3-10 built (OpenCode). The PR/top-reps hint shows
  on the rest message line (partials cue wins; +30 s prefix still applies;
  `extend15` carries it); advance still clears it. 2 unit tests + 1 e2e.
  157/157 unit, typecheck clean, 73/73 e2e, SW `gym-v46`.
- 2026-11-09 11:57 CT: CHECKPOINT. B3-01…B3-10 are built and pushed
  (last code commit before this docs pass; B3-10 auto-sync). Session stops
  for length; next is B3-11 (summary PR count uses the session date). No
  WIP claimed, no failing gate, program data untouched.
- 2026-11-10 12:02 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first
  clean: `origin/main` == local HEAD `6c0f084`, nothing to pull, all recent authors
  Khang. `QUEUE.md` has no unstarted builder item — B6-01 is the only Batch 6
  build and it is already shipped; the remaining Batch 6 entries are decision-gated
  (P9, `bodyweightSet`, P6, P8, P11/L6, P5, P7). Gate re-run at HEAD for the record:
  196/196 unit, typecheck clean, 112/112 e2e at 390×667/844, no overflow, no console
  errors. No files changed, no commit, no SW bump, `program.js` untouched. Run exits;
  the supervisor wakes the next one.
- 2026-11-10 12:16 CT: CHECKPOINT (OpenCode, supervisor-spawned run). No builder item: `TASK.md`
  still lists only B6-01 (shipped at `6c0f084`) and the decision-gated Batch 6 entries; `QUEUE.md`
  ends at "End of prepared Batch 6". Sync-first clean (HEAD == `origin/main` at `f0cf476`, tree
  clean, authors Khang only). Gate re-run at HEAD: `npm run check` 196/196 unit + guards OK
  (check-ids OK, check-sw-cache OK, digest `6d3b391c5f60a828`, exit 0), `npm run typecheck` clean
  (exit 0), `npm run e2e` 112/112 at 390×667 and 390×844, exit 0, no overflow, no console errors.
  SW `gym-v88`; `git diff 68f319c HEAD -- program.js` = 0 lines. Docs-only checkpoint, no SW bump.
  Run exits — the Planner/Reviewer promotes the gated items.
- 2026-11-10 12:12 CT: CHECKPOINT (OpenCode, supervisor-spawned run). Sync-first clean:
  `origin/main` == local HEAD `4d93c2a`, nothing to pull, authors Khang only. Still no
  builder item to start — B6-01 is shipped and `TASK.md` lists only decision-gated work.
  Gate re-run at HEAD for the record: 196/196 unit (exit 0), typecheck clean (exit 0),
  112/112 e2e at 390×667/844, no overflow, no console errors, SW `gym-v88`
  (`CACHE-HASH` 6d3b391c5f60a828), `program.js` diff vs `68f319c` = 0 lines. Only this
  checkpoint written; no app asset changed, so no SW bump. Run exits; the supervisor wakes
  the next one.
- 2026-11-10 19:55 CT: B6-02 + B6-03 built and gated (interactive run).
  B6-02: week strip + heatmap attribute a completed off-day session to its
  recorded day in the Mon–Sun week of its date; day summary says "Off day —
  this logs as Friday."; 2 unit tests + the extended off-day journey e2e
  (Wednesday clock → Friday strip `done`, `1/24` heat). B6-03: schema v5
  `bodyweightSet` (migration derives it from 165, merge uses the flag,
  bodyweight input stamps it); merge matrix + v5 expectations in the tests.
  Gate: 198/198 unit (exit 0), typecheck clean (exit 0), 112/112 e2e at
  390×667/844 (exit 0, no overflow, no console errors); SW `gym-v91`,
  `CACHE-HASH` cb9d043437e18eb9; `program.js` diff vs `68f319c` = 0 lines.
  Precache 255,980/256,000 bytes — flagged for the next item. No WIP.
