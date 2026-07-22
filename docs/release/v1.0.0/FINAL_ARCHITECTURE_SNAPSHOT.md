# Final Architecture Snapshot — v1.0.0

**Baseline:** `main` @ `b40ec03` (+ RLS‑001 packaging). Frozen as the V1 architecture.

## Shape
A vanilla‑JS single‑page application (`public/`), a thin serverless verification endpoint
(`api/verify.js`), and Supabase as the data plane. No client framework, no build step;
Vercel serves `public/` statically. Financial truth lives entirely in the Accounting Core
and the database's atomic RPCs — the UI never computes authoritative balances.

## Layers (top → bottom)

### 1 · UI / workspaces (presentation & orchestration only)
`app.js` (shell) · `member-lifecycle.js` (P2) · `collection-workspace.js` (P3) ·
`payment-workspace.js` (P4) · `dues-workspace.js` (P‑DUES) · `treasury-workspace.js`
(P5‑OBS, read‑only) · `reports.js` · `print.js` · `reservations.js`. Support: `ui-infra.js`,
`ui-nav.js`, `sidebar.js`, `forms.js`, `floating-labels.js`, `i18n.js`, `brand-assets.js`.
These **orchestrate** certified operations; they hold no financial law.

### 2 · Operation adapters
`crud.js` · `operations.js` — capture/validate input and route every state change through a
**Certified Business Operation**. Classification happens at capture (GOV‑WS‑01 Rule 4).

### 3 · Accounting Core (frozen — sole executor of financial logic)
`fin.js` (member statements, balances, credit) · `fin2.js` (treasury composition, registers,
overflow read‑rule) · `fin-contract.js` (invariants) · `foodDonationAllocation.js`
(Item‑9 debt‑priority) · `model2.js` (classification model — **inert**, `DEFINED_INERT_P2A`).
Balances are always **derived from source rows** on load (Universal Rebuild); no stored deltas.

### 4 · Data plane (Supabase)
Tables (members, subscriptions, receipts, payments, audit_log, voucher_versions, settings,
contacts) + **atomic RPCs** that are the only writers of financial state, guarded by RLS and
constitutional runtime guards. `data.js` binds settings → runtime globals
(`TREASURY_OPENINGS`, `LOCKED_THROUGH_YEAR`).

### 5 · Verification endpoint
`api/verify.js` (+ `server.js` for local dev) — public voucher verification via `/verify/:id`.

## Invariants held at the baseline
- **Value conservation** across every operation (Law 1).
- **Derivation, single source** — read models rebuild from rows (Laws 2, 3).
- **Explicit classification at capture** (Law 4); **custody** — money leaves only a treasury
  it entered (Law 8); **closed‑period immutability** (Law 11).
- UI/print/report changes never alter financial logic (design‑only surfaces).

## Dependency direction
UI → adapters → Accounting Core → data plane. No upward calls; the Observability layer reads
models and **executes nothing**.

## Frozen / inert / deferred
- **Frozen:** Constitution, Accounting Core, BO‑01…BO‑10 (BO‑06 deferred), Read Models,
  GOV‑WS‑01 v1.5, GOV‑WS‑02, P‑AIENG track, Constitutional Laboratory.
- **Inert:** MODEL2 (`DEFINED_INERT_P2A`) — governs classification, not runtime allocation.
- **Deferred/reserved:** BO‑06 settlement, Refund.
