# BUILD_LOG

- 2026-11-08 Loop 14: `setAdjust(false)` in `timerIdle()` and `startRest()` — Adjust no longer leaks onto next lift. Verified in source, 390px no overflow, no console errors.
- 2026-11-08 Loops 15–35: 21 loops, all verified 390px / 0 overflow / no console errors. See PLAN.md for one-line list. Stopped at 79% free weekly limit + convergence.
- 2026-11-08 Fix open items (Muse, direct — not OpenCode): `setAdjust(false)` in `finishRest()` (natural expiry) and in the +15 handler (mid-rest); tempo 4s → 2s down (tempo line + comment, no other "4s down" left); tall-phone middle band capped with `.sp2{max-height:96px}` in the min-height:820px block, slack goes to .sp1 so the lift block centres. JS syntax checked with node --check, no other code/data changes.
