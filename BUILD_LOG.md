# BUILD_LOG

- 2026-11-08 Loop 14: `setAdjust(false)` in `timerIdle()` and `startRest()` — Adjust no longer leaks onto next lift. Verified in source, 390px no overflow, no console errors.
- 2026-11-08 Loops 15–35: 21 loops, all verified 390px / 0 overflow / no console errors. See PLAN.md for one-line list. Stopped at 79% free weekly limit + convergence.
- 2026-11-08 Fix: `finishRest()` now calls `setAdjust(false)` on natural expiry, so Adjust closes on the GO path like `timerIdle()`/`startRest()`. Verified 390×844: natural expiry → GO with `adjust-open` cleared, no hidden focus.
- 2026-11-08 Fix: `+15` handler calls `setAdjust(false)`, closing Adjust both mid-rest and after GO. Verified 390×844: 15s→30s mid-rest and GO→0:15 with `adjust-open` cleared.
- 2026-11-08 Fix: tall-phone band (`min-height:820px`) — spacers change from 2:3 to 4:1, moving the void above the lift block. At 390×844 the dots→Adjust gap drops 149px→50px; page stays 844px, card 687/687 (no internal scroll), Set Done still in the thumb zone.
- 2026-11-08 Fix: tempo switched to 2s down — `#tempoLine` and the tempo comment now read "explode up · 2s down · 1s hold"; no other "4s down" remains. No date/load/rest data touched. Verified 390×844 + 390×667: no overflow, no clipped controls, no console errors.
