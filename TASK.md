# TASK — for OpenCode (planner: Muse)

Status: ACTIVE — BATCH 6, approved by Khang Nov 10 (one-tap approval) and activated by Muse in this push. Batch 5 (B5-01…B5-20) is COMPLETE + VERIFIED by Muse at HEAD `68f319c` (194/194 unit, typecheck clean, 112/112 e2e, SW `gym-v87`, Pages live; review record in `LOOP_STATE.md`). One buildable item: B6-01 below. The decision-gated items stay gated — they become builder work only when their decision lands and Muse promotes them.

## Next — B6-01: `Stats.parseKey` rolls impossible dates [T1, low — defence in depth]

Full spec in `QUEUE.md` (Batch 6). Summary: `stats.js` `parseKey` is regex-only; `new Date(y, m-1, d)` silently rolls `"2026-02-30"` to Mar 2 for any hand-built payload. B5-14 closed this at the store boundary; this closes it in the pure module itself (B3-29 precedent). Round-trip inside `parseKey` (construct, compare components, null on mismatch). Files: `stats.js`, `test/stats.test.js`. Verify: unit — `weekStatus` / `sessionVolumes` with a `"2026-02-30"` entry do not attribute it to Mar 2; full gate green; SW bump.

## Decision-gated (not builder work — see `QUEUE.md` Batch 6 for the full list)

P9 off-day decision → off-day design; `bodyweightSet` flag (Khang's call); P6 2-for-2 (approval → design); P8 partial finish (approval → build); P11/L6 alternates (per-lift approval → design); P5 Bulgarian rest number; P7 deload week (feature). Each promotes into this file only when its decision lands and Muse writes the spec.

## WIP

(none)
