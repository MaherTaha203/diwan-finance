# REL-001 — User Acceptance Test (UAT) Plan

> Full acceptance flow for GA sign-off. **Automation cannot drive the live
> authenticated app** (production Supabase auth is not available to the audit harness),
> so this plan is authored for the **owner/operator to execute** against a real
> (staging or production) environment. The automated evidence that *was* collected
> (below) reduces — but does not replace — the manual flow.

## Automated evidence already collected (commit `4767dee`)

| Layer | Result | Source |
|---|---|---|
| Node accounting/business/report suites | **109 pass / 2 pre-existing fail** | `tests/` sweep (2 fixture-missing legacy suites documented) |
| Constitutional lab — all financial-operation cases | **90/90 checks · 23/23 certified · exit 0** | `node lab/run.cjs` (FOC-001…FOC-025: create/edit/cancel member, apply dues, edit/cancel/reclassify/split voucher, donations, expenses, allocation, Phase-15 carry, MODEL2) |
| Report engine render (screen/print/pdf/excel) | 15 reports served, parity | `REPORT-001_R8_VERIFICATION` + SYS-001 render harness |
| Startup / performance baseline | measured | `SYS-001_METRICS_BASELINE` |
| Accessibility baseline | measured | `UX-001_FORENSIC_AUDIT` |

The lab already exercises the **business operations** end-to-end at the engine level.
The manual UAT below confirms the same flows **through the real UI, print, and export
surfaces** that a user actually touches.

## Environment & pre-conditions
- Target: staging (preferred) or production with a disposable test member.
- Roles to test: **admin**, **accountant**, **reservation** (per the role model).
- Browsers: Chromium + one of Safari/Firefox; test **both themes** and **RTL**.
- Record for each step: actual result, pass/fail, screenshot, and the **figure shown vs
  expected** (accounting figures must match the engine).

## Acceptance scenarios

> Mark each **PASS/FAIL**; any accounting-figure mismatch is an automatic FAIL.

| # | Scenario | Steps | Expected result | P/F |
|---|---|---|---|---|
| UAT-01 | **Authentication** | Sign in (valid), sign in (invalid), lockout, sign out | Valid → dashboard; invalid → error; lockout after threshold; session cleared on sign-out | ☐ |
| UAT-02 | **Create member** (BO-07) | Members → add member → save | Member appears; audit log entry created | ☐ |
| UAT-03 | **Register subscription / apply annual dues** (BO-10) | Dues workspace → apply year → confirm | Dues applied to eligible members; totals update; audit entry | ☐ |
| UAT-04 | **Record donation** (cash + in-kind) | Receipts → donation → food/diwan/deficit + in-kind | Correct fund direction + settlement label; cash vs documentary separated; balances update | ☐ |
| UAT-05 | **Create receipt voucher** | Collection/receipt → new → save → print | Voucher saved; QR + verification token; printed artifact byte-faithful | ☐ |
| UAT-06 | **Create payment voucher** | Payment workspace → new expense → save | Payment saved; fund debited; audit entry | ☐ |
| UAT-07 | **Print documents** | Member statement, fund statement, vouchers | Unified paper identity; figures == screen; running header/footer | ☐ |
| UAT-08 | **Export PDF** | Member + fund statements, a report | PDF downloads; content == print; landscape/portrait correct | ☐ |
| UAT-09 | **Export Excel** | Member statement, members list, debt report | XLSX downloads; RTL + ₪ format; figures == screen | ☐ |
| UAT-10 | **Reports review** | Annual debt, delinquent, donations, dues snapshot, treasury position, consistency | Each renders; filters work; totals reconcile; consistency report = all-match | ☐ |
| UAT-11 | **Audit log** | Open audit page after the above | Every mutation above is recorded with actor/role/time | ☐ |
| UAT-12 | **User management** (admin) | Users → create user, change role, change password | Routed through Edge Functions; role enforced; non-admin blocked | ☐ |
| UAT-13 | **Permissions** | Repeat key actions as accountant & reservation | Each role sees/does only what its policy allows | ☐ |
| UAT-14 | **RTL + i18n** | Toggle AR/EN across pages | Layout mirrors correctly; numbers stay LTR; no clipping | ☐ |
| UAT-15 | **Reconciliation** | Run consistency report; compare a member's screen vs print vs Excel | All surfaces agree to the shekel | ☐ |

## Regression gate
UAT passes only if: every scenario PASS, **no accounting figure differs across
surfaces**, the audit log is complete, and role permissions hold. Record results in a
dated UAT run appended to `docs/release/` before GA sign-off.

## Accessibility spot-checks (from UX-001, optional but recommended)
- Keyboard-only pass of UAT-02/05/12 (tab reach every control) — expect gaps at the
  `.lnk-*` elements (UX-001 S2-1) until fixed.
- Contrast of muted labels in a light theme (UX-001 S2-2).
