# LOOP-STATE — session state (Nov 16, continuing the loop)

Picked up from BACKLOG handoff (session end Nov 16). Gate last green: unit 245,
typecheck clean, e2e 208. Tree clean, `main` ahead 1 of `origin/main` (v152 +
backlog notes), nothing pushed.

## Queue (priority order, refill from survey when <3)
1. ~~#3 correctness: priorEntries() off-by-one~~ DONE (v153, critics GO).
2. **[NOW]** **#4 Tier 2 security:** `sanitizeRecord` missing `unsafeKey` guard for `swapLoads` (`store.js:189-198`). Partially investigated read-only: values coerced to finite numbers so `cleanLoads` proto-pollution via value is unlikely, but key names (`__proto__`, `constructor`) aren't screened. Needs a discriminating test + OFF-PEAK Pro critic (batch). Check `stripUnsafeKeys`/`unsafeKey` (store.js:110-128) precedent.
3. **#5 low:** `toCsv` legacy multi-set emits 1 row vs `entrySets` synthesizes `setsDone`.
4. **#topSetOf low:** `bankLift` calls `topSetOf(e,s.sets)` with no entry → swapped descending-load session banks wrong "top". (`app.js:124-127 + PR hint path`)
5. **deferred low:** hide `applyLoad`/`suggestLine` while swapped (display-consistency).
6. planBtn-into-dormant-load (out of scope unless Khang wants).

## Doing now
#4 sanitizeRecord swapLoads unsafeKey guard (Tier 2 security; will need off-peak Pro critic).

## Critic reviews waiting (batch Pro for Tier 2)
- none yet (first Pro batch will hold #4's review). critic-flash GO for #3 recorded above.

## Choices waiting for Khang
- NEEDS DECISION: partial-workout sets never reach history (product contract).
- bodyweight-alternate valuation decision.
- (from handoff) — do not decide myself.

## Baseline failing checks
- none (gate confirmed green in handoff).