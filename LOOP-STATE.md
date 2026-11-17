# LOOP-STATE — session state (Nov 16, continuing the loop)

Picked up from BACKLOG handoff (session end Nov 16). Gate last green: unit 245,
typecheck clean, e2e 208. Tree clean, `main` ahead 1 of `origin/main` (v152 +
backlog notes), nothing pushed.

## Queue (priority order, refill from survey when <3)
1. ~~#3 correctness: priorEntries() off-by-one~~ DONE (v153, critic-flash GO).
2. ~~#4 Tier 2 security: sanitizeRecord swapLoads unsafeKey guard~~ DONE (v154, discriminating test). CRITIQUE_PENDING for off-peak Pro batch (see below).
3. ~~#5 toCsv legacy multi-set single-row~~ DONE (v155, discriminating tests; critic-flash running). Awaiting critic before commit.
4. **[NOW]** **#topSetOf low:** `bankLift` calls `topSetOf(e, s.sets)` with no entry → swapped descending-load session banks wrong "top". (`app.js:124-127 + PR hint path`)
5. **deferred low:** hide `applyLoad`/`suggestLine` while swapped (display-consistency).
6. planBtn-into-dormant-load (out of scope unless Khang wants).
- (refill later if below 3)

## Doing now
#topSetOf: bankLift passes no entry to topSetOf; rank higher if survey refill.

## Critic reviews waiting (batch Pro for Tier 2)
- **PENDING (batch):** v154 `sanitizeRecord` swapLoads unsafeKey guard. Changed during peak (03:37 UTC Tue); need off-peak Pro review. (Also v155 toCsv committed pending critic-flash.)

## Choices waiting for Khang
- NEEDS DECISION: partial-workout sets never reach history (product contract).
- bodyweight-alternate valuation decision.
- (from handoff) — do not decide myself.

## Baseline failing checks
- none (gate confirmed green in handoff).