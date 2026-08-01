# P-RECEIPT-ALLOCATION · PR-4 — Wire Settlement Editor → Atomic Posting RPC

**First behavioural PR. Fully isolated behind `RECEIPT_ALLOCATION_ENABLED` (default OFF). With the flag OFF the system is byte-identical to current `main`.**

## 1. Implementation Summary
- **`receipt-settlement.js`** upgraded from PR-1 stubs to the real, flag-gated posting path:
  - `post(p_receipt, p_lines)` → **`SB.rpc('create_receipt_with_settlement', …)` only** (the single settlement writer). Never calls `BusinessOps.createVoucher`; never writes `allocation_records` from the client; never writes `paid_amount_ils`.
  - `postFromForm(ctx)` assembles the payload from the form + the mounted editor's validated state and posts via `post()`; on success closes the modal + reloads.
  - `mountInReceiptForm()` mounts the Settlement Editor (destinations from FIN, read-only reads) — only when the flag is ON.
  - `cancel()` / `refund()` remain disabled stubs (later PRs).
- **`crud.js` `saveRec`** — the **single posting-path gate**: right after the year-lock guard, `if (ReceiptSettlement.enabled()) return ReceiptSettlement.postFromForm(...)`. When ON, the legacy body never executes (no dual write); when OFF, it falls straight through to the unchanged legacy flow.
- **`forms.js` `openRec`** — mounts the editor only when the flag is ON (guarded; no-op when OFF).
- **`index.html`** — an empty, hidden `#rec-settlement` mount slot.

## 2. Verification Report
`tests/pralloc-pr4-wiring.test.cjs` — **20/20**:
- Flag OFF → `post()` disabled, **RPC never called**.
- Flag ON → `post()` calls **`create_receipt_with_settlement` exactly once** with `{p_receipt, p_lines}`, returns ok, and **`BusinessOps.createVoucher` is NEVER called** (no dual write).
- `buildDestinations` reads FIN (subscription years + historical + donation + credit).
- `postFromForm` maps editor rows → `p_lines`, posts via the RPC only, and on success closes + reloads.
- Static: `saveRec`'s gate **precedes** and early-returns before the legacy `createVoucher`; `openRec` mounts only when enabled; the RLS migration scopes settlement writes to the RPC and grants execute.

Full suite: **74 green / 2 red** — the 2 red are the pre-existing `business-operations-slice1` and `constitutional-explicit-q5`, unchanged from `main`. (PR-1/2/3 tests were updated where PR-4 legitimately superseded their "nothing is wired yet" assertions — now asserting the wiring exists **and is flag-gated**.)

## 3. Security Verification
Migration `20260801150000_pralloc_pr4_settlement_rls.sql`:
- **INSERT** policy forbids clients from writing `source_kind='receipt_settlement'` rows; **UPDATE/DELETE** policies make settlement rows immutable to clients. The **SECURITY DEFINER RPC bypasses RLS** and is therefore the **only** settlement writer.
- **Scoped by `source_kind`** so the dormant MODEL2 audit recorder (`'allocation'`/`'credit_consumption'`) and non-settlement admin operations are **unaffected**.
- `GRANT EXECUTE` on the RPC to `authenticated` (anon stays blocked) — activation.
- Behavioural RLS self-test `tests/pralloc-pr4-rls.sql` (dev/branch DB): a direct client insert of a settlement row is **rejected**; the RPC path succeeds. *(Runs on a dev DB; prod is read-only and this PR does not apply the migration.)*

## 4. Feature Flag Verification
`RECEIPT_ALLOCATION_ENABLED` defaults **OFF** (`typeof … === 'undefined' → false`). OFF: `saveRec` gate is false → legacy path; `openRec` mount skipped; `post()` returns disabled and calls no RPC. Proven by the PR-1 behavioural OFF-inertness check and the PR-4 OFF assertions.

## 5. Golden Reference Comparison
With the flag OFF, **every report, balance, treasury value, ledger value, statement, and historical value is byte-identical**: no balance-computing code changed; the new branches are flag-gated (false ⇒ unchanged legacy flow); the migration alters no existing data and is `source_kind`-scoped. The unchanged full-suite result (same 2 pre-existing reds) confirms it.

## 6. Files Changed
| File | Change |
|---|---|
| `public/js/receipt-settlement.js` | posting path (RPC only), `postFromForm`, `mountInReceiptForm`, `buildDestinations` — all flag-gated |
| `public/js/crud.js` | `saveRec`: single-path gate (early-return to RPC when ON; falls through when OFF) |
| `public/js/forms.js` | `openRec`: guarded editor mount (ON only) |
| `public/index.html` | empty hidden `#rec-settlement` slot |
| `supabase/migrations/20260801150000_pralloc_pr4_settlement_rls.sql` | **new** — settlement-scoped RLS + RPC grant |
| `tests/pralloc-pr4-wiring.test.cjs` | **new** — 20 assertions |
| `tests/pralloc-pr4-rls.sql` | **new** — RLS bypass self-test |
| `tests/pralloc-pr1/2/3-*.test.cjs` | superseded "not-wired-yet" assertions updated to "wired but flag-gated" |

**Not touched:** `fin.js`, `reports.js`, `report-model.js`, `dues-workspace.js`, `app.js`, `data.js`, `operations.js`, the RPC body (PR-2), `paid_amount_ils`.

## 7. Test Results
- `pralloc-pr4-wiring` **20/20**; `pralloc-pr1` / `pralloc-pr2` / `pralloc-pr3` green (updated); full suite **74 green / 2 known-red**.

## 8. Rollback Verification
Flag stays OFF ⇒ instant behavioural revert (already the default). Full revert: restore the PR-1 stub `receipt-settlement.js`, drop the `saveRec`/`openRec` guards + the `#rec-settlement` slot, and migration `down` (restore the prior `allocation_records` policies + revoke the grant). No data to unwind.

## 9. Explicit statement
**There is exactly one active posting path.** When `RECEIPT_ALLOCATION_ENABLED` is ON, the only posting path is the atomic RPC (`saveRec` early-returns to `ReceiptSettlement.postFromForm` → `SB.rpc('create_receipt_with_settlement')`); the legacy `BusinessOps.createVoucher` never executes. When OFF, the only posting path is the legacy flow; the RPC is never called. Never both — verified by test.

---
**PR-4 — behavioural, flag-gated. OFF = byte-identical to `main`. Next (on approval): PR-5 (consumer seam — reports read settlement attribution).**
