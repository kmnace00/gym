# RESEARCH — science evidence ledger

A claim becomes an app change only through here: claim + source +
the exact app rule it would change + confidence. No source, no
change. OpenCode never invents science; if a task needs a fact not
listed here, it stops and flags `NEEDS_RESEARCH`.

Format per entry: **Claim** · **Source** (creator + video +
timestamp, or paper + link/DOI) · **App rule** · **Confidence** ·
**Status**.

## Settled rules (from the Nov 8 research session — re-cite before changing the app on their basis)

These drove the current program. They are recorded here as the
working rules, with their original sources to be re-attached with
full citations in the next Muse research pass — do not treat the
one-line source note as a verified citation yet.

- **3 days is sufficient while studying is the priority.**
  Source note: Nov 8 session, Jeff Nippard material among others.
  App rule: Fri/Sat/Sun, 8 lifts/day, 75–90 min/day target.
  Status: settled, in use. Re-cite: yes.
- **Tempo: ~2 s down on compounds, 2–3 s on isolations; explosive
  concentric; pause only in the stretch.**
  Source note: Nov 8 research revision (replaced the earlier 4 s
  eccentric). App rule: tempo line "explode up · 2s down · 1s hold".
  Status: settled, in use. Note the app line is generic — per-lift
  tempo (2 s vs 2–3 s) was an open question; **closed Nov 9** —
  Schoenfeld 2015 (cited below): rep durations 0.5–8 s produce
  similar hypertrophy, so the distinction is moot. Keep the generic
  line; the 1-s stretch hold has no direct evidence for or against
  it and is harmless.
- **Lengthened partials only after full-ROM failure, last set only,
  for calves, leg extensions, curls, laterals, flys, and triceps
  (overhead extension).**
  Source note: Nov 8 research revision, corrected Nov 9 (see below).
  App rule: `partial: 1` flag + partials prompt.
  Status: settled as a rule; **app timing verified (L2, Nov 8)** —
  e2e proves the cue fires only when the lift just finished and the
  last set's RIR is ≤1, never on sets 1–2, never at RIR 2, and never
  on an unflagged lift. **Overhead-extension question answered Nov 9:
  KEEP the flag** — the triceps evidence is the strongest in the
  partials literature (Goto 2019 + Maeo 2023, cited below); the Nov 8
  list was incomplete, not the flag wrong. The flag stays unless
  Khang says otherwise (T3); the loop does not change it.
- **Rest: ~90 s isolations, ~2 min upper compounds, ~2–3 min lower
  compounds.**
  Source note: Nov 8 research revision. App rule: app rests are
  90/120/150/180 s per lift in `program.js`.
  Status: rule settled; per-lift match to the rule unverified —
  BACKLOG L8. Any number change is T3 (Khang only).
- **RIR: 2 on most working sets, 0–1 on the last set of isolations
  only.**
  Source note: Nov 8 session. App rule: per-lift `rir` in
  `program.js`; RIR ≤1 → +30 s rest.
  Status: settled, in use. Re-cite: yes.
- **Progression: double progression (top reps at target RIR → add a
  step); 3 consecutive missed-top sessions → ~10% deload.**
  Source note: app model built Nov 8 (Pass 2/3), literature check
  pending. App rule: `program.js` suggestion / `stallLoad`.
  Status: in use; literature review pending — BACKLOG L7.
- **Antagonist supersets; last set to near failure.**
  Source note: Nov 8 session. App rule: superset lift Sun
  (lateral ↔ reverse pec deck, one rest after the pair); cues.
  Status: settled, in use. Re-cite: yes.
- **Inter-set stretching: optional habit, NOT a hypertrophy
  technique (downgraded Nov 9).**
  Source: Wadhi et al. 2022 (loaded inter-set stretch, trained men —
  verified via secondary summaries only, medium confidence) and
  Borsetti Businari et al. 2023/2024 (45-s stretch cut volume 32.8%
  with no hypertrophy benefit); positive studies are in untrained
  subjects. App rule: the `restMsg` cue "Stretch — set up the next
  set" stays — it is harmless as a habit — but the ledger no longer
  presents stretching between sets as a hypertrophy technique.

## How to add an entry (Muse research passes)

1. Watch / read the source. Record creator + video title + timestamp,
   or authors + paper title + link/DOI. A bare creator name is not a
   citation.
2. Write the claim in one sentence, in testable form ("X beats Y by
   …" / "rest of N minutes preserves …").
3. Name the exact app rule it would change (file + field + current
   value) and whether that change is T1 (UI/algorithm), T2 (design),
   or T3 (program data — Khang only).
4. Confidence: high (meta-analysis / replicated), medium (single
   study / expert consensus), low (single video / anecdote). Low
   confidence never changes program data.
5. If it contradicts a settled rule above, flag the conflict
   explicitly — do not silently overwrite.

## Sources to start from

- Jeff Nippard — already used in the Nov 8 session; the creator Khang
  has actually trained from. Prioritise his technique / hypertrophy
  videos for the next research pass, with timestamps.
- Peer-reviewed hypertrophy literature — rest intervals, proximity to
  failure, volume landmarks, tempo, partials. Cite the paper, not a
  summary of it.
- Other YouTubers only as Khang names them or Muse cites them fully
  (video + timestamp). Do not present a creator as "Khang's source"
  without evidence he uses them.

## Research pass Nov 9 (Muse + research subagent) — L7/L8 unblocked

Every paper below was checked against PubMed/publisher records by the
research pass; the two marked **Muse-verified** were re-checked by Muse
directly against the publisher page on Nov 9. The rest carry the DOI as
cited — treat them as reported, not Muse-verified, until someone opens
the paper. Claims the pass could NOT verify are listed at the end and
stay out of the plan.

### L8 — Rest-interval audit: the program is already compliant

- **Schoenfeld et al. 2016**, *J Strength Cond Res* 30(7):1805–1812.
  DOI 10.1519/JSC.0000000000001272, PMID 26605807. 3-min rests beat
  1-min rests for strength (squat + bench 1RM) and hypertrophy (thigh
  thickness) in 21 trained men over 8 weeks. Confidence: high.
- **Grgic et al. 2018**, *Sports Med* 48(1):137–151.
  DOI 10.1007/s40279-017-0788-x. Rest >2 min required to maximize
  strength gains in trained lifters; 60–120 s enough for untrained.
  Confidence: high.
- **Grgic et al. 2017**, *Eur J Sport Sci* 17(8):983–993. Hypertrophy:
  long rest 9.2% vs short rest 5.8% across 6 studies, heterogeneous
  and not significant — both viable. Confidence: medium.
- **Singer et al. 2024**, *Front Sports Act Living* 6:1429789.
  DOI 10.3389/fspor.2024.1429789. **Muse-verified Nov 9** (Frontiers
  + PMC). Bayesian meta-analysis, 9 studies: small hypertrophy benefit
  to resting >60 s, **no appreciable difference beyond >90 s**.
  Confidence: high.
- **Longo et al. 2022** — rest effect mediated by volume load (3-min
  leg grew ~13% vs ~7% for 1-min leg; equal when volume matched).
  Taken from secondary sources only, not verified against the paper.
  Confidence: medium.

Verdict: 23 of 24 lifts match the settled rule; no lift is
under-rested. The settled rule ("~2–3 min lower compounds") is really
a *strength* rule — for hypertrophy specifically, Singer 2024 says the
benefit plateaus past ~90 s, so the current rests are on the generous
side: good for strength and for preserving reps, costing time but not
gains. Days sit at ~73.5 / 69 / 72 min (Fri/Sat/Sun) — inside the
75–90 min target, so the generous rests are affordable. The only T3
change is Bulgarian split squat 120 s → 150 s (BACKLOG P5, medium-low
confidence — no study compares 2 vs 2.5 min directly). The Sun
superset (120 s for two isolation sets back-to-back) is a keep with
thin evidence: no literature on superset rest intervals exists; 120 s
is the conservative choice. The `+30 s when RIR ≤1` rule is consistent
with the volume-load mechanism — no direct citation, no change.

### L7 — Progression-model review: structure holds, two T3 proposals

- **Step sizes verified in-band:** every checkable step falls inside
  the ACSM 2–10% band (Smith squat 4.2%, Smith incline 5%, Bulgarian
  10%, incline DB 4.8%, pec deck 5%, cable lat 10%, pulldown 5.6%,
  cable RDL 4.2%, T-bar 6.7%, leg curl 3.8%, Bayesian 7.7%, preacher
  10%, rear delt 10%, leg press 2.8%, machine OHP 6.3%, seated row
  3.8%, lat↔pec deck 7.1%). No change.
- **Trigger is more aggressive than the standard (proposal P6):**
  Baechle & Earle (Eds.), *NSCA Essentials of Strength Training and
  Conditioning*, Ch. 18 ("2-for-2 rule": 2+ reps over goal on the last
  set for 2 consecutive workouts → add weight); ACSM position stand,
  *Med Sci Sports Exerc* 2009;41(3):687–708.
  DOI 10.1249/MSS.0b013e3181915670 (2–10% increase once the target is
  beaten by 1–2 reps on two consecutive sessions). The app adds a step
  after ONE top-hit session. Confidence: medium (textbook /
  position-stand consensus, not an RCT — no trial compares one-hit vs
  two-hit progression). Mitigating: step sizes are in-band, and Khang
  is an experienced lifter, so his RIR calls are good.
- **RIR accuracy (supports the RIR-based trigger):** Zourdos et al.
  2016, *J Strength Cond Res* 30(1):267–275, PMID 26049792 —
  experienced lifters estimate RIR accurately within ~1 rep at RPE
  8–10 (RIR 0–2); accuracy degrades further from failure. Helms et
  al. 2016, *Strength Cond J* 38(4):42–49.
  DOI 10.1519/SSC.0000000000000218. Confidence: high. The app's
  targets (RIR 2 most sets, 0–1 last set of isolations) sit exactly in
  the accurate zone. Caveat: RIR error is ~±1 rep, so a "hit" can
  occasionally be a false positive — which compounds the one-session
  trigger above. That interaction is the real argument for 2-for-2.
- **Proximity to failure (scheme is right, no change):** Refalo et
  al. 2023, *Sports Med* 53(3):649–665 — meta-analysis, 15 studies:
  trivial hypertrophy edge for training to failure (ES 0.19); Refalo
  et al. 2022, *J Strength Cond Res* — 15 RCTs, SMD 0.11, 95% CI
  crosses zero; Robinson et al. 2024, *Sports Med* — meta-regression,
  55 studies: closer to failure modestly helps hypertrophy, no benefit
  for strength; Refalo et al. 2024, *J Sports Sci* — 8-week RCT, 18
  trained adults: failure ≈ 1–2 RIR for quad growth. Confidence:
  high. RIR 2 on most sets + 0–1 on the last set of isolations
  captures essentially all the stimulus with less fatigue.
- **Deload: the app has a per-lift reset, not a deload (proposal
  P7):** Bell et al. 2023, *Sports Med Open* 9:87.
  DOI 10.1186/s40798-023-00633-0 (Delphi consensus: a deload is a
  planned period of reduced training stress, ~7 days every 4–6 weeks,
  volume should fall); Rogerson et al. 2024, *Sports Med Open* 10:26.
  DOI 10.1186/s40798-024-00691-y, PMID 38499934 (survey, n=246
  competitive athletes: 6.4 ± 1.7 days every 5.6 ± 2.3 weeks; they cut
  volume, dropped load ~10–15%, left more RIR, kept the same
  exercises and frequency); Bell et al. 2025, *Strength Cond J*
  ("A Practical Approach to Deloading": preplanned every 4–8 weeks);
  Coleman et al. 2024, *PeerJ* 12:e16777. DOI 10.7717/peerj.16777 (39
  trained adults, 9 weeks, one full week off at the midpoint: same
  hypertrophy and endurance as continuous training, slightly less
  lower-body strength). Confidence: medium (consensus + survey + one
  small RCT; the field itself calls deloading "under-researched").
  Assessment: the ~10% `stallLoad` size matches survey practice, but
  it is per-lift and reactive (3 missed sessions) while the
  literature's deload is program-wide and planned; it cuts load only,
  while the literature's main lever is volume; and there is no
  literature support for "3 missed sessions" as a trigger. Proposals:
  (1) keep `stallLoad` as the per-lift reset and stop calling it a
  deload in docs; (2) add a planned program-wide deload week every
  ~5–6 weeks (new feature — T3 decision + T2 design if approved).
  Not urgent: Coleman 2024 implies the cost of *not* deloading on a
  schedule is low while he's still progressing.

### Lengthened partials — the overhead-extension evidence

- **Goto et al. 2019**, *J Strength Cond Res* 33(5):1286–1294.
  DOI 10.1519/JSC.0000000000002051, PMID 31034463.
  **Muse-verified Nov 9** (PubMed). Partial-ROM triceps extensions at
  long muscle lengths (45–90° elbow flexion) grew triceps CSA +48.7%
  vs +28.2% for full ROM (0–120°) in trained men, 8 weeks.
  Confidence: high (directly on triceps partials; small n, single
  study).
- **Maeo et al. 2023**, *Eur J Sport Sci* 23(7):1240–1250.
  DOI 10.1080/17461391.2022.2100279. Overhead cable elbow extensions
  grew the triceps long head +28.5% vs +19.6% and whole triceps
  +19.9% vs +13.9% vs the same exercise in a neutral arm position,
  12 weeks, within-subject — the exact exercise Khang does.
  Confidence: medium-high (exact exercise, but untrained subjects,
  unreplicated).
- **Kassiano et al. 2023**, *J Strength Cond Res* 37(5):1135–1144,
  PMID 36662126. Mid-ROM partials beat full ROM for triceps
  specifically (between-group ES 1.21); full ROM and lengthened
  partials both beat shortened partials for quads, biceps, brachialis.
  Confidence: medium.
- **Wolf et al. 2023**, *Int J Strength Cond* 3(1).
  DOI 10.47206/ijsc.v3i1.182. Lengthened partials: pooled trend
  favoring partials at long muscle lengths (SMD −0.28, 95% CI −0.81
  to 0.16 — crosses zero, so a trend, not proof). Confidence: medium.
- **Wolf et al. 2025**, *PeerJ* 13:e18904. DOI 10.7717/peerj.18904,
  PMID 39959841. In trained lifters, lengthened partials produced
  **similar** (not superior) gains to full ROM — the hype check. Jeff
  Nippard is a co-author. Confidence: high. Counterweight: "tie"
  still supports keeping the flag, since the app uses partials
  conservatively (only after full-ROM failure, last set only).
- **Jeff Nippard**, "The World's Smartest Muscle Building Technique"
  (YouTube) — full transcript verified; **timestamps not verified**.
  "Long length partials clearly work better than short-length partials
  and at least work as well as full range of motion and maybe even
  better"; expects "maybe 5 or 10%" improvement; uses them as an
  intensity technique to extend the last set, but "still lean[s]
  toward full ROM most of the time". Confidence: medium.

### Other re-cites from this pass

- **Tempo (moot):** Schoenfeld, Ogborn & Krieger 2015, *Sports Med*
  45(4):577–585. DOI 10.1007/s40279-015-0304-0, PMID 25601394. Rep
  durations 0.5–8 s produce similar hypertrophy; only volitionally
  very slow (>10 s/rep) is inferior. The app's "~2 s down, explosive
  up, 1 s hold" ≈ 3–4 s/rep, well inside the supported range.
- **Volume (counted, no change):** Schoenfeld, Ogborn & Krieger 2017,
  *J Sports Sci* 35(11):1073–1082. DOI 10.1080/02640414.2016.1210197,
  PMID 27433992. Direct sets/week from `program.js`: quads 12, chest
  12, back 12, glutes 12, delts 12, hamstrings 6 direct (+RDL/squat
  assistance), biceps 6 direct, triceps 6 direct, calves 6. The 10+
  sets band trends highest for hypertrophy; arms sit at 6 direct but
  get substantial indirect work from all pressing/pulling, so
  effective volume is ~12. No set additions proposed.
- **Frequency (counted, no change):** Schoenfeld, Ogborn & Krieger
  2016, *Sports Med* 46(11):1689–1697. DOI 10.1007/s40279-016-0543-8;
  updated in Schoenfeld, Grgic & Krieger 2019, *J Sports Sci*
  37(11):1286–1295, PMID 30558493. Each muscle is hit directly
  1×/week, but indirect work brings most muscles to ~2×/week (chest
  Fri + Sun fly; back Sat + Sun pull-ups/row; quads Fri + Sun leg
  press; shoulders Fri + Sun). Training a muscle 2×/week beats 1×/week
  when volume is equated (ES 0.49 vs 0.30). The split already lands
  there via indirect work; "3 days is sufficient while studying is the
  priority" stands, now re-cited.
- **Seated leg curl (confirmed, no change):** Maeo et al. 2021, *Med
  Sci Sports Exerc* 53(4):825–837. Training hamstrings at long muscle
  lengths (seated) beats short lengths (lying). The program already
  uses seated leg curl — confirmed alignment, no action.

### Claims NOT verified (stay out of the plan)

- A Jeff Nippard video on rest intervals with a citable timestamp
  (searched; found only an Instagram collab and program PDFs). The
  rest audit above stands on papers alone.
- Timestamps for Nippard's "The World's Smartest Muscle Building
  Technique" (title and content verified via full transcript).
- Longo et al. 2022 rest/volume study — details from a blog summary,
  not verified against the paper; used only as supporting nuance.
- Wadhi et al. 2022 loaded inter-set stretch — design and result
  verified via secondary summaries, not the paper itself; the stretch
  downgrade is therefore medium, not high, confidence.
- Hackett et al. 2012 RIR prediction accuracy (r = 0.93–0.95) —
  cited second-hand; Zourdos 2016 (verified) carries the RIR claim.
- Antagonist-superset hypertrophy equivalence (the Sun lateral↔pec-deck
  superset) — not searched this pass; the settled rule stands
  unverified.
- Past-failure partials for calves (*Eur J Sport Sci* 2025,
  PMID 40850937) — seen in a reference list only; a lead for a future
  pass, not a citation.
- NSCA 2-for-2 wording in the book itself — verified via multiple
  secondary sources, not by opening *Essentials* directly. Cite as
  Baechle & Earle, Ch. 18.
