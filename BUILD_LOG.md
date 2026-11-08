# BUILD_LOG

- 2026-11-08 Loop 14: `setAdjust(false)` in `timerIdle()` and `startRest()` — Adjust no longer leaks onto next lift. Verified in source, 390px no overflow, no console errors.
- 2026-11-08 Loops 15–35: 21 loops, all verified 390px / 0 overflow / no console errors. See PLAN.md for one-line list. Stopped at 79% free weekly limit + convergence.
