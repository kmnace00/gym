# LOOP-STATE — session state (Nov 17, continuing the loop)

Gate last green (v159): unit 248, typecheck clean, e2e 215, sw-cache OK digest 07a298cb0d8af4db.

## Queue (priority order, refill from survey when <3)
1. ~~survey tile 2: switchDay mis-dating — block set-logging on a non-active day~~ DONE (v159, critic-flash GO + hoist hardening applied).
2. survey tile 3 (display polish, Tier 0): deload day-row meta shows `e.s×e.r` instead of the `deloadSets` cut (`app.js:448`), so a 3-set lift's row reads "3×6" mid-deload while the view counts "Set 1 of 2".
3. survey tile 4 (tidiness): `Stats.sessionDrift` is dead code — the finish screen re-implements a simpler estimate inline (`app.js:1679`); wire up or remove.
4. survey tile 5 (tidiness): dead exports `timer.js sessionElapsed` and `store.js daysUntil` (zero production callers) — delete or `/* keep in sync */`.
- **Khang request (from this session, NOT started):** spacing between the first set container and the Swap/Undo/Restart buttons is uneven (`.sethead` margin / `.setacts` arrangement, style.css ~178-208); user asked to even it out. Pending — was not started per the "stop cleanly" directive. Next session: screenshot 390×844 + 390×667 first.
- survey tile 6 (not queued, design-aware session UX): the session clock never auto-pauses on hide — an abandoned workout banks `durationSec` to the 8 h cap. Bounded already; needs a deliberate auto-pause design, not a drive-by.
- (queue below 3 → survey + refill to 10)

## Doing now
none (session stopping cleanly after v159).

## Critic reviews waiting (batch Pro for Tier 2)
- **PENDING (batch):** v154 `sanitizeRecord` swapLoads unsafeKey guard. Committed during peak.
- **PENDING (batch):** v158 `sanitizeRecord`/`sanitizeEntry`/`swapLoads` load bound at SET_LOAD_MAX. Committed during peak.
- v159 (switchDay guard) ran critic-flash GO → **no Pro needed** (Tier 1). Next off-peak Pro batch: v154 + v158 (3–5 per batch; 2 owed, accumulate more).

## Choices waiting for Khang
- NEEDS DECISION: partial-workout sets never reach history (product contract).
- NEEDS DECISION: off-day / missed-day logging (P9) — **v159 hard-blocks it**: a session only starts for today, so catching up a missed day is now impossible; the guard and the P9 decision interact. Khang decides.
- bodyweight-alternate valuation decision.
- (from handoff) — do not decide myself.

## Baseline failing checks
- none (gate green at v159).