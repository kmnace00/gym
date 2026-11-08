# TASK — for OpenCode (planner: Muse)

Status: LIVE — repo is at github.com/kmnace00/gym-html-tool, first commit 098af47c. Muse pushes, OpenCode pulls.

## Current task

None active. The UI/UX loop stopped at 79% of Muse's free weekly limit (resets Nov 9 at 9:29 PM CST) after Loops 15–35.

Next task when loop resumes, or when Khang picks it:
- Verify on a real phone: Set Done → Show workout → Adjust → End rest lands clean, with no steppers / RIR picker leaking onto the next lift.
- Verify: open on Sat/Sun opens on that day; hold a load stepper repeats; finishing freezes session time and releases wake lock.

## Open decisions (need Khang, not a loop edit)

- Tempo: "4s down" vs Smith squat "2s down" — saved method is 4s minimum eccentric, research said ~2s.
- Persistence: reload wipes session — not requested, not added.
- Large empty band on tall phones — intentional spacer, most visible remaining polish item.
- `finishRest()` doesn't close Adjust at natural expiry — self-healing, deprioritised.
- +15 mid-rest doesn't close an open Adjust panel — closes when rest ends.

## How to use this file

- Muse writes this file. OpenCode reads it, builds, tests, updates BUILD_LOG.md.
- Task-only prompt: no mini-team template. OpenCode's native framework handles Plan / Build / Review / Test.
- Stop when the task is done or the verification fails — report back in BUILD_LOG.md, do not keep looping.
