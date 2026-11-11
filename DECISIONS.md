# DECISIONS — Batch 6 decision-gated items

Decided by Muse, Nov 10, under Khang's explicit delegation the same day:
"Do the gym improvement list, do whatever you think is best." Every gated
item below is decided; the buildable specs are in `QUEUE.md` as B6-02…B6-10
(B6-01 was already built and verified before this round). Guiding calls,
applied throughout: flexibility over rigidity (he trains Fri–Sun but
sometimes Mon–Thu), suggestions over automation (nothing auto-changes his
loads or starts/stops anything for him), the one-screen / no-scroll rule,
and consistency with his method (rest 90 s isolations / 2 min upper
compounds / 2–3 min lower compounds, partials after full-ROM failure on
the last set, 75–90 min days).

## P9 — Off-day logging → B6-02

**Decision: ATTRIBUTE — and fix the attribution, don't just keep it.**
Sessions logged Mon–Thu keep banking under the next training day (today's
behaviour: the app opens Friday, sets bank under Friday's key with the
true calendar date kept). What changes is visibility: the week strip and
the heatmap must count a completed session toward its recorded training
day in its calendar week, so off-day work stops being invisible, and the
day view says so in one line ("Off day — this logs as Friday").
**Why:** he genuinely trains Mon–Thu when the week shifts; the work is
real and already feeds progression — it was only the display that lied.
**Rejected:** block logging on off days (fights his flexibility and would
lose real sessions); re-dating the entries to Friday (falsifies the
record — the app's session-date honesty across midnight is a settled
design invariant).

## `bodyweightSet` flag → B6-03

**Decision: ADOPT the flag; schema v4 → v5.** The payload gains
`bodyweightSet`. Legacy payloads derive it on migration (bodyweight ≠ 165
⇒ it was set; = 165 ⇒ unknown, treated as unset, which preserves today's
merge behaviour exactly). Merge rule after the flag: an explicitly set
local bodyweight always wins; the incoming value is adopted only when the
local one was never set.
**Why:** the 165 heuristic permanently misfires the day he genuinely
weighs 165 — which, mid-bulk toward 176, is a when, not an if.
**Rejected:** keep the heuristic (a silent wrong-tonnage bug waiting for
one specific weigh-in); adopt the incoming value when both sides are set
(bodyweight is current device-local state, not history — same principle
as the B3-08 merge-cursor fix).

## P6 — 2-for-2 progression → B6-04

**Decision: ADOPT, exactly as proposed.** A load step is suggested only
when the last set hit top reps + 2 at target RIR in each of the last two
sessions. Evaluated at read time from the banked set arrays — no schema
change, no re-banking, `hitTop` keeps its current meaning, and the
3-session stall rule is untouched and still takes precedence.
**Why:** the NSCA textbook standard; one top-hit session adding load is
how RIR 0–1 grinds happen, and his method already lives near failure.
**Rejected:** the single-hit status quo; also rejected folding the new
rule into the stall check (changing both at once would muddy which one
helped).

## P8 — Finish a partial workout → B6-05

**Decision: APPROVE.** Finish appears whenever the day has any logged
sets; the summary is honestly titled ("Friday — partial, 6 of 8 lifts").
**Why:** his days are time-boxed at 75–90 min; today, running out of time
at lift 6 strands the session with no summary and no clean close — the
exact sessions most likely to happen on a work night.
**Rejected:** leaving it (the workaround — leaving the app to roll the
session overnight — already logs the data, just without the summary or
the deliberate close).

## P11 / L6 — Exercise-swap alternates → B6-06 (data/logic) + B6-07 (UI)

**Decision: APPROVE the proposed alternate list for all 24 lifts,
unchanged.** Progression model (the proposal left this to a decision):
a swap logs under the **original lift's id with a swap marker** on the
entry. Swapped entries count toward session volume and day/week
completion, but are **excluded from load suggestions, stall detection,
the sparkline and PRs** for the original lift; the Prev line shows the
swap honestly ("Prev (swap): DB reverse lunge …"). Swapped lifts get no
lengthened-partials prompt (the flag's evidence is exercise-specific)
and keep the original lift's rest time. A swap locks once a set is
logged that day.
**Why:** "machine taken" is a when, not an if, in a commercial gym;
the marker model needs no schema change and keeps one history per lift.
**Rejected:** alternates getting their own history/identity (schema and
reconcile churn for a fallback feature); feeding swapped loads into
`suggestLoad` (a DB reverse lunge load says nothing about next week's
Bulgarian load). **Flagged as assumed:** the staged proposal explicitly
left the progression model open ("Khang decides") — the marker model
above is my call under the delegation, chosen because it is the option
the proposal itself listed first and the only one needing no schema
change.

## P5 — Bulgarian split squat rest 120 s → 150 s → B6-08

**Decision: APPROVE.** One `program.js` number: 120 → 150.
**Why:** Bulgarian sits exactly on the floor of his own 2–3 min
lower-compound range and unilateral leg work carries the highest local
fatigue of any Friday lift; the audit found this to be the only per-lift
rest change worth making across all 24 lifts. Cost is +90 s on Friday
(~73.5 → ~75 min), still inside the 75–90 min target.
**Rejected:** leaving it at the range floor; any wider rest overhaul
(the audit explicitly cleared the other 23 lifts).

## P7 — Planned deload week → B6-09 (core) + B6-10 (follow-through)

**Decision: APPROVE as a manual mode, never an automatic one.** Khang
starts a deload week from the menu; it runs 7 days or until he ends it.
While active: set targets drop to ~60% (3 sets → 2), suggested loads are
× 0.9 snapped to the lift's step, a one-line banner carries the effort
guidance ("stop ~2 reps earlier"), and sessions banked in a deload are
marked and excluded from progression math (same treatment as swaps).
After 5+ weeks without a deload, a single line under the day summary —
shown only on the first training day of the week — points at the menu
item. Companion cleanup from the proposal: user-visible copy stops
calling the stall rule a "deload"; it becomes a "stall reset".
**Why:** the literature's deload is planned and program-wide with volume
as the main lever (Bell 2023, Rogerson 2024); a rigid calendar trigger
would fire during travel and study-crunch weeks when a deload is wrong,
so the app suggests and he decides — the same suggestions-over-automation
line as everything else here.
**Rejected:** automatic calendar deloads every 5–6 weeks; a load-only
deload (volume is the lever the evidence points at). **Flagged as
assumed:** the concrete parameters (× 0.6 sets, × 0.9 loads, 7-day
window, 35-day nudge) are my design choices inside the proposal's
"volume is the main lever, ~7 days, every 4–6 weeks" guidance — the
proposal named no numbers.

## Not decided here (unchanged, still Khang's)

- P4 store count caps (`DONE_MAX` / `SETS_MAX` / `ACC_SEC_MAX` /
  `BODYWEIGHT_MAX`) — untouched; they only bind on a >12-set lift or a
  >8 h session, neither of which exists in his program.
- P10 (overhead cable extension `partial: 1` = KEEP) was already decided
  Nov 9 and is not part of this batch.
- The Pass 3/4 phone checklists and the Loop 14 Adjust live tap-through
  still need Khang at the phone; no decision of mine changes that.

## B6-11 resolution (Muse, Nov 11) — the spacing spec's self-contradiction

The v1 spec's five values were individually right and jointly impossible: `.sethead` margin-bottom 6 leaves the 44 px `.resetlift` pills (margin −7 top/bottom, 7 px bleed below the header) 1 px inside the first set row, against the B5-01 clearance guard (≥ 1). Decided: keep the 6 px rhythm and move the pill bleed up — `.resetlift` margin −7/−7 → −9/−5 at tall sizes. The total bleed is unchanged, so the header box and the top-stack budget do not move; clearance stays exactly 1, the same as today. Short screens (≤ 720 px) keep the HEAD layout exactly: with the symmetric bleed, margin-bottom ≥ 8 is the clearance floor there, and Khang's phone is a tall screen.

Rejected: symmetric −5 bleed (a builder scratch test showed the header box grows 4 px and breaks the B5-01 top-stack budget at both viewports); keeping the tall gap at 8 (abandons the rhythm on the exact screen Khang flagged); relaxing the smoke assertions (weakens B5-01 guards for a 1 px cosmetic gain).

Verified by Muse in a scratch clone before re-queueing — the spec was not re-issued on arithmetic alone: 216/216 unit, typecheck clean, 139/139 e2e including the two new rhythm tests; at 440×956 the gaps measure 6/8/8 with clearance 1 and top stack 169.
