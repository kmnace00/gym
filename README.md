# Gym HTML Tool

Personal one-screen workout tool for Khang — Fri–Sun 3-day hypertrophy plan.

- One screen, no scroll, 100dvh, free
- Current lift + big rest timer, Set Done auto-starts rest (+30s after 0–1 RIR set)
- Rest is the whole screen; Show details restores the workout
- Optimal defaults on main screen as plain text; load / reps / RIR steppers live behind Show details only
- 24 lifts, Fri/Sat/Sun, 8 per day, with loads, rests, cues

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

- One screen, no scroll. Rest focus. Optimal defaults hidden behind details.
- No persistence added unless explicitly requested — session-only for now.
- No new features / fluff without Khang's explicit ask.
- Tempo conflict open: tempo line says "4s down", Smith squat cue says "2s down". Needs Khang's call.
