# PLAN — Muse as planner agent

Goal: personal one-screen gym tool, free, no scroll, rest-focused. Abandoned clothes picker to focus here only.

## Current state (Nov 8, Loops 15–35 done, stopped at 79%)

- One screen, 100dvh, Fri/Sat/Sun, 8 lifts/day, 24 lifts total.
- Loop 14 fix: `setAdjust(false)` in `timerIdle()` and `startRest()` — Adjust panel no longer leaks onto next lift.
- Loops 15–35: short-phone overflow guard, rest auto-advance tied to lift/day, top spacer removed, tempo only on Lift 1, Pause demoted, jump segments display-only, card void split, session pill "▶ Start", legibility bump, Set Done clears stale advance, rest "what's next" + load + ‹ ›, Undo disarms on manual nav, wake-lock fix, press-and-hold steppers, RIR label shows adjusted RIR, focus drops, finish banks session time + releases wake lock, opens on today's training day, Adjust close blurs focus, rest timer accessible name clears.

## Non-negotiables

- Very simple, bare-bones but essential. Less distracting / easier to use.
- One screen + timer, no scrolling. When resting, only rest shows, with option to see more details.
- Defaults optimal, not adjustable on main screen.
- 75–90 min/day target. Fri ~74 min, Sat ~69 min, Sun ~72 min in last audit.

## Integration

- Private GitHub repo: `gym-html-tool` (to be created after GitHub connect).
- Branch: `main`. Muse pushes, OpenCode pulls.
- Muse writes TASK.md / PLAN.md. OpenCode builds, updates BUILD_LOG.md.
- No paste loop. No direct Muse → OpenCode server call until Tailscale + `opencode serve` is fixed on the Max (currently impaired: session contents don't load, Providers shows no connected providers).
