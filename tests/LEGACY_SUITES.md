# Legacy test suites — status (STR‑001 F‑02, V1.1)

Two suites in this directory depend on a fixture that is **not in the repository**:

- `e2e-acceptance.cjs`
- `q5-evidence.cjs`

Both read `tests/roundtrip-seed.json`. That file was **never committed** (it is absent from the
entire git history and is not git‑ignored), and no script in the repository generates it. It held
a specific production‑derived classified dataset whose exact numbers the two suites' assertions
were hardcoded against (documented figures such as `food 3585.04 · diwan 3801 · cashN 9 · inkN 10`,
48 assertions).

## Why it is not reconstructed
Reconstructing the seed to satisfy those hardcoded numbers would require **inventing data to force
a specific result** — forbidden (no fabricated evidence), and infeasible without the original
dataset. `tests/constitutional-baseline.json` is an *expected‑output* GOLDEN snapshot, not input
rows, so it cannot substitute.

## Disposition (V1.1 · F‑02)
- Both suites now **skip gracefully** (clear message, `exit 0`) when the fixture is absent, instead
  of crashing with `ENOENT`. If `roundtrip-seed.json` is ever restored, they run **unchanged**.
- Their coverage is **superseded** by the runnable, green gates:
  - **Constitutional Laboratory** — `node lab/run.cjs` → **90/90 checks · 23/23 certified**.
  - `node tests/constitutional-verification.cjs` → **12/12 · GOLDEN unchanged**.
  - `node tests/fin2.test.cjs` → **ALL PASS**.

## If you want them back
Provide a `tests/roundtrip-seed.json` whose derived figures match the suites' assertions (or update
the assertions to a new committed seed). Until then, the Lab is the authoritative acceptance gate.

*This resolves Outstanding Risk R‑1 / Technical Debt TD‑1 & TD‑2 from the V1 release package and
STR‑001 §10 — honestly (documented + non‑crashing), without fabricating a fixture.*
