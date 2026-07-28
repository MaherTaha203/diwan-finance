# OUTPUT-002-A · Implementation Roadmap & Final Migration Map

> The single reference that fixes scope **before** implementation: every output item is
> assigned to exactly one of **-B**, **-C**, or **deferred to OUTPUT-003**. Nothing outside
> this map enters OUTPUT-002. Grounded entirely in the measured `-A` evidence.

## Final Migration Map (the one table)

| # | Item | Evidence | Phase |
|---|---|---|:--:|
| 1 | Remove duplicate legacy toolbars on member + fund statements (keep engine bar) | member 5 btns / fund 7 btns | **-B** |
| 2 | Wire the unified output bar onto debt, delinquent, donation, members, annual | print-only / no-Excel | **-B** |
| 3 | Add output surface to **users, audit, treasury, dues** (models already exist) | 0 buttons, model-ready | **-B** |
| 4 | Migrate **internal-transfer voucher** to the engine | `prtTransfer` legacy `openPrintWin` | **-B** |
| 5 | Migrate **voucher-list Excel** (rec/pay) to an engine list model | `styleDiwanSheet` legacy | **-B** |
| 6 | **Excel header parity** — title + filters + ₪ currency in every sheet; fix `annual-log`/`users` stubs | F-2 (Excel drops chrome) | **-B** |
| 7 | Remove now-dead legacy fallbacks (`buildRecVoucher/Pay`, `exportDelinquentExcel`) — keep flags as kill-switches | dead post-R9 | **-B** |
| 8 | Screen=Print=PDF=Excel parity re-verified on every surface | -A method | **-B (gate)** |
| 9 | **Unified single-button bar** «الإخراج ▼» (print/PDF/Excel — copy-link/share — settings) | exists nowhere | **-C** |
| 10 | **Output/Organization Profile** — General + Per-Report + Organization identity | no profile store | **-C** |
| 11 | **Add QR + Signature to reports** (per-report toggles) | F-3 (absent on all reports) | **-C** |
| 12 | **Smart filenames** from `meta.title` + party («كشف حساب - أحمد آل طه — 2026-07-28») | F-5 (id-based today) | **-C** |
| 13 | **Deep Links** — hash router `#/page?params` + login-return bounce | nav() has no params | **-C** |
| 14 | **Web Share API** (with download fallback) | Share = 0 | **-C** |
| 15 | **Share PDF after generate** | Share = 0 | **-C** |
| 16 | Surface debt/delinquent filter state into readable controls (deep-link prerequisite) | state in JS closures | **-C** |
| 17 | Centralized output settings UI (replaces scattered print options) | pain #8 | **-C** |
| 18 | CSV: build an engine CSV renderer **or** keep the legacy CSV family as the one non-engine medium | 100% legacy CSV | **-C decision** |
| — | Public member report links (access tokens, expiry, permissions) | — | **OUTPUT-003** |
| — | Email / WhatsApp share, share permissions, temporary links, passwords | — | **OUTPUT-003** |

## ⚠️ OUTPUT-002-B accurate completion status (updated during -B)

Implementing -B revealed that most -B items were **already satisfied** — the R9 handoff fix
(`window.FIN`/`window.DB`) activated the engine cutovers across the board, and the app already
carried a consistent `تصدير ▼` export UI. Corrected item status:

| Item | Planned | Actual after measurement |
|---|---|---|
| 1 · de-dup statement toolbars | -B | ✅ **implemented** (removed page print/PDF/Excel; engine bar remains) |
| 2 · wire unified bar on 5 reports | -B | ⏹ **N/A** — those pages already have the `تصدير ▼` (Excel+PDF) dropdown + print |
| 3 · output for users/audit/treasury/dues | -B | ✅ **already present** — users/audit have dropdowns; treasury/dues print routes to engine post-R9 (guard passes) |
| 4 · transfer voucher → engine | -B | ✅ **already engine-routed** — `TRANSFER_VOUCHER` def registered; `prtTransfer` → `Report.render` post-R9 |
| 5 · voucher-list Excel → engine | -B | ✅ **implemented** — new `RECEIPTS_LIST`/`PAYMENTS_LIST` models; rec/pay screen/print/pdf/excel now share one model; legacy `styleDiwanSheet` + `openPrintWin` path removed for these surfaces (donation list Excel was already engine post-R9) |
| 6 · Excel header parity | -B | ✅ **implemented** (filter subtitle; title/₪ were never missing — audit artifact) |
| 7 · remove dead legacy | -B | ⏹ **mischaracterized** — `buildRec/Pay/TransferVoucher` are **reused** by the engine's hybrid voucher renderer (not dead); the `openPrintWin` fallbacks are the kept kill-switches |
| 8 · parity gate | -B | ✅ **verified** — screen==print==pdf on all reports; Excel filter parity; 0 boot errors; node 64/2 |

**Net:** genuine -B implementation = Items **1 + 6** (done) + the audit corrections; everything
else was already true post-R9 or was an audit artifact. **Item 5** is the only open migration —
its scope (new list report-models to match the current styled sheet) makes it a natural pair with
the **-C** list/CSV decision (Item 18), but it is logged here for the owner's call before -C.

## Phasing

### OUTPUT-002-B — Unification & legacy removal
Items **1–8**. Outcome: one output path (the engine) on **every** surface; the unified bar wired
everywhere (even if still multi-button); users/audit/treasury/dues gain output; transfer voucher
and voucher-list Excel on the engine; Excel reaches paper parity; dead legacy removed (flags kept
as kill-switches). **Gate:** Screen=Print=PDF=Excel re-verified + node suite + constitutional lab
green. **No FIN/accounting/DB change.**

### OUTPUT-002-C — Experience completion
Items **9–18**. Outcome: single «الإخراج ▼» button on every surface; Output/Organization Profile
(General + Per-Report) driving QR/signature/identity; smart human filenames; internal deep links
with login-return; light sharing (copy-link · Web Share · share-PDF). **Gate:** same regression
gate + a fresh evidence pass. **No public sharing** (deferred to OUTPUT-003, documented in-app).

### Explicitly deferred → OUTPUT-003
Public report links, access tokens, expiry, share permissions, email/WhatsApp, passwords.

## Guardrails (unchanged from the package charter)
- **Zero** change to FIN, accounting, SQL, Supabase schema, or business logic.
- Every phase: measured before/after on all four surfaces + regression gate + doc + draft PR.
- Feature flags retained as kill-switches; legacy removed only when the engine path is proven live.
- This map is the scope ceiling — anything discovered mid-flight that is not here is logged for
  OUTPUT-003, not absorbed.

## Suggested sequence to GA (owner's chain, confirmed)
OUTPUT-002-B → OUTPUT-002-C → Owner Live UAT → RC1 → minor-fixes → **V1.0 GA** → tag `v1.0.0`.
