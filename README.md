# Gym HTML Tool

Personal one-screen workout tool for Khang — Fri–Sun 3-day hypertrophy plan.

- **Day → Lift** two views: an 8-lift overview for the day, and a focused lift view you drill into.
- One screen, no scroll, 100dvh, free.
- Dark-first theme with a light toggle.
- Lift view has always-visible load / reps / RIR adjusters (no hidden panel), Set Done, and set dots.
- Set Done starts a rest (+30 s after a 0–1 RIR set). Rest takes over the whole screen with a big countdown, +15 / Pause / End rest, Undo, and a "Show workout" peek.
- Adjusted load / reps / RIR and set progress persist in localStorage (`gym-tool-v1`), so a reload doesn't lose the session.
- 24 lifts, Fri/Sat/Sun, 8 per day, with loads, rests, cues — program data unchanged.

## Files

- `index.html` — the whole app, single file. Open it on iPhone, add to Home Screen.
- `TASK.md` — current task for OpenCode / planner. This is the handoff file — Muse writes it, OpenCode reads it.
- `PLAN.md` — the plan Muse maintains as planner agent.
- `BUILD_LOG.md` — running log, one line per change.

## How Muse + OpenCode work here

Muse is the planner agent. OpenCode is the builder on the Mac.
Muse writes `TASK.md`. OpenCode pulls the branch, reads `TASK.md`, builds, tests, updates `BUILD_LOG.md`, pushes back.
No paste loop — the repo is the handoff.

## Rules (do not break)

- One screen, no scroll. Every view fits `100dvh` on a phone; keep the short-phone (`max-height:720px`) and tall-phone (`min-height:820px`) fallbacks intact.
- Program data is the source of truth — 24 lifts, loads, sets / reps / rests, cues. Do not change numbers without Khang's explicit ask.
- Rest is fullscreen while counting; "Show workout" peeks the workout behind it as a short strip.
- Persistence is localStorage only (`gym-tool-v1`, versioned); no backend. Bump the version to migrate the schema.
- No new features / fluff without Khang's explicit ask.
- Tempo: 2 s down. Tempo line is "explode up · 2s down · 1s hold".
