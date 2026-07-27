# REPORT-001 · R8 — Pre-activation Verification Pass

> Owner-directed **verification pass before R8-a** (engine activation). Staged R8
> approved: **R8-a** flips the flags default-ON (engine live, legacy retained as
> fallback) → **soak + monitoring** → regression + owner approval → **R8-b**
> removes legacy in a separate PR. *Verified before removed.* **This document and
> its harness change nothing — every flag stays default-OFF.**

## Method

1. **Engine coverage** — a consolidated harness renders **every** registry report
   through the engine and asserts each declared output is a real renderer, not a
   skeleton (`tests/report-r8-verification.test.cjs`).
2. **Data fidelity** — each report's pure builder is unit-tested to preserve the
   certified figures in the right slots (R1–R7g suites).
3. **Regression** — the full `tests/` sweep.
4. **Design/visual** — per-slice Playwright proofs (R6–R7g) confirm the unified
   look across screen/print/PDF/Excel.
5. **Flag inventory** — confirm every cut-over is behind a default-OFF flag.

## Findings

### ✅ Engine covers every report

All **15** registry reports render through the engine — **51 real outputs**
(screen/print/pdf/excel) verified, 0 skeletons among them:

| Report | screen | print | pdf | excel |
|---|:--:|:--:|:--:|:--:|
| MEMBER_STATEMENT | ✅ | ✅ | ✅ | ✅ |
| FUND_STATEMENT | ✅ | ✅ | ✅ | ✅ |
| ANNUAL_DEBT | ✅ | ✅ | ✅ | ✅ |
| DELINQUENT | ✅ | ✅ | ✅ | ✅ |
| DONATION_REPORT | ✅ | ✅ | ✅ | ✅ |
| MEMBERS_LIST | ✅ | ✅ | ✅ | ✅ |
| ANNUAL_LOG | ✅ | ✅ | ✅ | ✅ |
| USERS_LIST | ✅ | ✅ | ✅ | ✅ |
| AUDIT_LOG | ✅ | ✅ | ✅ | ✅ |
| TREASURY_POSITION | ✅ | ✅ | ✅ | — |
| DUES_SNAPSHOT | ✅ | ✅ | ✅ | — |
| CONSISTENCY | ✅ | ✅ | ✅ | — |
| RECEIPT_VOUCHER | — | ✅ | ✅ | — (hybrid) |
| PAYMENT_VOUCHER | — | ✅ | ✅ | — (hybrid) |
| TRANSFER_VOUCHER | — | ✅ | ✅ | — (hybrid) |

### ✅ Regression clean

**328** REPORT-001 assertions pass (R0 + R1–R7g + the R8 verification harness).
Full `tests/` sweep: the only non-clean suites are the **4 pre-existing**
legacy/flag-gated ones (`business-operations-slice1`, `constitutional-explicit-q5`,
`e2e-acceptance`, `q5-evidence`) — unchanged by REPORT-001.

### ✅ Every cut-over is behind a default-OFF flag

13 flags (3 vouchers share one), **all default-OFF** → the engine is **inert in
production today**; nothing changed for users until R8-a:

`MEMBER_STATEMENT · FUND_STATEMENT · ANNUAL_DEBT · DELINQUENT · DONATION_REPORT ·
MEMBERS_LIST · ANNUAL_LOG · USERS_LIST · AUDIT_LOG · TREASURY_POSITION ·
DUES_SNAPSHOT · CONSISTENCY · VOUCHERS`

### ✅ Data fidelity by construction

The builders are **pure** and map the certified reads (`FIN.*` / `DB.*`) through
**unchanged** — the R1 member-statement parity test and every R7 builder test
assert figures are preserved in the right slots. No accounting/`FIN`/DB/SQL was
touched anywhere in R0–R7g.

## Residual items to watch during the soak (not blockers)

- **CSV** — `MEMBER_STATEMENT` and `FUND_STATEMENT` still export CSV via the
  **legacy** `exportCSV` (the engine's `csv` renderer is intentionally not
  migrated). The toolbar CSV button stays functional; CSV is out of the
  screen/print/PDF/Excel parity gate.
- **Multi-page print trade-off (R4, documented)** — Chromium repeats *either* the
  fixed running brand band *or* a table's column-header row across pages, not both;
  per the owner's "running header/footer" choice the brand band repeats every page
  and column headers head page 1.
- **Out of scope (by design)** — the receipts/expenses **list** pages and the
  dashboard are not registry reports and are intentionally unchanged.

## Recommendation

**Verification PASS.** The engine renders every report, all figures are preserved,
regression is clean, and the whole surface is still gated OFF. This satisfies the
precondition for **R8-a** (flip the flags default-ON; keep legacy as fallback).

Suggested activation order for R8-a (lowest-risk first, each independently
revertible by turning its flag back off):

1. Lists (members / annual log / users) & Audit — simplest, read-only.
2. Fund statements, Donations, Debt/Delinquent, Treasury, Dues.
3. Member statement (the pilot, incl. the screen cut-over).
4. Vouchers (byte-identical hybrid — lowest visual risk, but the legal artifact, so last).

After a stable **soak** with no drift and owner sign-off → **R8-b** removes the
legacy builders + flags in a separate PR.

*Begins on the owner's explicit go for R8-a.*
