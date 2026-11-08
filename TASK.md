# TASK — for OpenCode (planner: Muse)

Status: LIVE — repo is at github.com/kmnace00/gym-html-tool, first commit 098af47c. Muse pushes, OpenCode pulls.

## Current task — Fix the open items (Nov 8, Khang's pick)

Fix these four, nothing else:

1. `finishRest()` doesn't close Adjust at natural expiry — add `setAdjust(false)` on the natural-expiry path, same as `timerIdle()` (652) and `startRest()` (745) already do.
2. +15 mid-rest doesn't close Adjust — tapping +15 while the Adjust panel is open must close it (call `setAdjust(false)` in the +15 handler).
3. Tall-phone empty band — reduce the large empty band mid-card on tall phones. Keep one screen, no scrolling, rest focus intact. Do NOT break the short-phone guard (`@media (max-height:720px)` — spacers collapse, card scrolls internally if needed).
4. Tempo — Khang decided Nov 8: switch to 2s down. Change the tempo line (index.html:453) from "Tempo — explode up · 4s down · 1s hold" to "Tempo — explode up · 2s down · 1s hold", and the comment at index.html:271-273 from 4s to 2s. Search for any other "4s down" in the file and change those too. Smith squat cue already says 2s down, so this makes them match.

Verify:
- 390px, no overflow, no console errors, no clipped controls.
- All three Adjust exit paths land clean: End rest, natural expiry to GO, +15 mid-rest — next lift shows only prescription + quiet Adjust link.
- Short-phone layout still holds; tall-phone band visibly smaller.

Do NOT change in this task:
- No persistence, no loads / reps / rests / data changes, no new features.

After building: add one line per fix to BUILD_LOG.md, commit, push to `main`, and report what changed and what you verified.

## Open decisions (need Khang, not a loop edit)

- Tempo: "4s down" vs Smith squat "2s down" — saved method is 4s minimum eccentric, research said ~2s.
- Persistence: reload wipes session — not requested, not added.

## How to use this file

- Muse writes this file. OpenCode reads it, builds, tests, updates BUILD_LOG.md.
- Task-only prompt: no mini-team template. OpenCode's native framework handles Plan / Build / Review / Test.
- Stop when the task is done or the verification fails — report back in BUILD_LOG.md, do not keep looping.
