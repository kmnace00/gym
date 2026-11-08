# TASK — for OpenCode (planner: Muse)

Status: LIVE — repo is at github.com/kmnace00/gym-html-tool, first commit 098af47c. Muse pushes, OpenCode pulls.

## Current task — Fix the open items (Nov 8, Khang's pick)

DONE Nov 8 by Muse directly (not OpenCode — Khang asked Muse to just do the work). Do not redo:

1. `finishRest()` closes Adjust at natural expiry — `setAdjust(false)` added.
2. +15 mid-rest closes Adjust — `setAdjust(false)` added to the +15 handler.
3. Tall-phone empty band — `.sp2{max-height:96px}` in the min-height:820px block, slack goes to .sp1.
4. Tempo — switched to 2s down. Tempo line is now "explode up · 2s down · 1s hold", no "4s down" left in the file.

Verify on a real phone: Set Done → Show workout → Adjust → End rest lands clean; let a rest run to GO with Adjust open in peek; +15 mid-rest with Adjust open; tall-phone band visibly smaller. JS syntax checked with node --check.

## Open decisions (need Khang, not a loop edit)

- Tempo: "4s down" vs Smith squat "2s down" — saved method is 4s minimum eccentric, research said ~2s.
- Persistence: reload wipes session — not requested, not added.

## How to use this file

- Muse writes this file. OpenCode reads it, builds, tests, updates BUILD_LOG.md.
- Task-only prompt: no mini-team template. OpenCode's native framework handles Plan / Build / Review / Test.
- Stop when the task is done or the verification fails — report back in BUILD_LOG.md, do not keep looping.
