# LOOP-STATE — session state (Nov 16, continuing the loop)

Picked up from BACKLOG handoff (session end Nov 16). Gate last green: unit 245,
typecheck clean, e2e 208. Tree clean, `main` ahead 1 of `origin/main` (v152 +
backlog notes), nothing pushed.

## Queue (priority order, refill from survey when <3)
1. ~~#3 correctness: priorEntries() off-by-one~~ DONE (v153, critic-flash GO).
2. ~~#4 Tier 2 security: sanitizeRecord swapLoads unsafeKey guard~~ DONE (v154, discriminating test). CRITIQUE_PENDING.
3. ~~#5 toCsv legacy multi-set single-row~~ DONE (v155, critic-flash GO).
4. ~~#topSetOf low~~ DONE (v156, critic-flash GO).
5. ~~deferred low: hide applyLoad/suggestLine while swapped~~ DONE (v157, critic-flash GO).
6. ~~survey: record/entry load + swapLoad + swapLoads not capped at SET_LOAD_MAX~~ DONE (v158, Tier 2 security/data-integrity, discriminating test). CRITIQUE_PENDING.
7. **[NEXT]** survey tile 2: **switchDay mis-dating** — `bankLift` keys history by `cur` but dates by `active.date`; `switchDay` (`app.js:1794`) changes `cur` without touching `active`, so a lift logged on a switched day banks under the wrong date (misgrouped in weekStatus + mis-dated in PR/CSV). Fix intent needs a small product call (what date should a switched-day log carry?). Investigate to confirm/decide before building.
8. survey tile 3 (display polish, Tier 0): deload day-row meta shows `e.s×e.r` instead of the `deloadSets` cut (`app.js:448`), so a 3-set lift's row reads "3×6" mid-deload while the view counts "Set 1 of 2".
9. survey tile 4 (tidiness): `Stats.sessionDrift` is dead code — the finish screen re-implements a simpler estimate inline (`app.js:1679`); wire up or remove.
10. survey tile 5 (tidiness): dead exports `timer.js sessionElapsed` and `store.js daysUntil` (zero production callers) — delete or `/* keep in sync */`.
- survey tile 6 (not queued, design-aware session UX): the session clock never auto-pauses on hide — an abandoned workout banks `durationSec` to the 8 h cap. Bounded already; needs a deliberate auto-pause design, not a drive-by.
- (queue below 3 → survey + refill to 10)

## Doing now
survey tile 2: switchDay mis-dating — confirm intended semantics before building.

## Critic reviews waiting (batch Pro for Tier 2)
- **PENDING (batch):** v154 `sanitizeRecord` swapLoads unsafeKey guard. Committed during peak.
- **PENDING (batch):** v158 `sanitizeRecord`/`sanitizeEntry`/`swapLoads` load bound at SET_LOAD_MAX. Committed during peak.
- Ran **critic-flash** on both diffs? v154 was Pro-deferred (security). v158 is also security → defer Pro; the change is a mechanical mirror of the existing set clamp, but batch it with v154 off-peak. (3–5 per batch.)

## Choices waiting for Khang
- NEEDS DECISION: partial-workout sets never reach history (product contract).
- bodyweight-alternate valuation decision.
- (from handoff) — do not decide myself.

## Baseline failing checks
- none (gate confirmed green in handoff).