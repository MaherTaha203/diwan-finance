# P-RECEIPT-ALLOCATION-009 — PR-0A: Proof of Single Write Path (read-only)

**Read-only. No code, no migration, no implementation.** Evidence from the current codebase only; no assumptions. PR-0 proved the single **read** path (`FIN.memberAllocation`). This proves the single **write** authority for the receipt + its settlement attribution.

---

## Current write inventory (proven)

### 1. Create a receipt
| Path | Location | Notes |
|---|---|---|
| `BusinessOps.createVoucher` → `SB.from('receipts').insert` | `operations.js:103,109` (`tableOf='receipts'` `:26`) | the certified create seam; UI routes here (`crud.js:174`) |

**One create path.**

### 2. Edit a receipt
| Path | Location | Scope |
|---|---|---|
| `BusinessOps.editVoucher` (update / void+replace) | `operations.js:171-208` (`:147,153,179,208`) | admin edit after review |
| `_amendOwnVoucher` → `SB.from(tbl).update(...).eq('version',oldVer)` | `crud.js:332-349` (`:341`) | **DRAFT own-voucher only, pre-posting** (optimistic concurrency; not a posted-receipt path) |

**Two edit paths today** — one admin (BusinessOps), one draft-amend (accountant, pre-posting).

### 3. Cancel a receipt
| Path | Location | Mechanism |
|---|---|---|
| `BusinessOps.cancelVoucher` → `SB.from(tbl).update({is_deleted:true,...})` | `operations.js:129+` | soft-delete + version history + audit |

**One cancel path.**

### 4. Refund a receipt
| Path | Location | Mechanism |
|---|---|---|
| `BusinessOps.refundReceipt` → `SB.from('refunds').insert` | `operations.js:346` | dedicated `refunds` table; receipts untouched |

**One refund path.** (Schema: no year/obligation — allocation-blind, per Phase 0 Q8.)

### 5. Create `allocation_records`
| Path | Location | Notes |
|---|---|---|
| MODEL2 metadata recorder → `SB.from('allocation_records').insert` | `allocation-integration.js:40,57` | **flag-gated audit** (`source_kind='allocation'` / `'credit_consumption'`); OD-01/OD-02 (`allocation-engine.js:27`) |

**One current writer — an audit recorder, NOT settlement attribution.** (This is the pre-existing writer the feature must fence by `source_kind`; see §14.)

### 6. Modify `allocation_records`
**No update path exists in the app.** No `SB.from('allocation_records').update` anywhere (grep: 0). RLS allows admin update; `immutable=true` marks rows append-only.

### 7. Delete `allocation_records`
**No delete path exists in the app** (grep: 0). RLS allows admin delete only.

### 8. Write `paid_amount_ils`
| Path | Location | Value |
|---|---|---|
| BO-10 `applyAnnualDues` → `member_subscriptions.insert` | `operations.js:305` | **0 only** — non-zero rejected at `operations.js:300` |
| `create_member_atomic` RPC | `operations.js:259`; `…p0_v2…sql:52` | 0 (caller passes 0; `COALESCE(...,0)`) |
| Phase-15 import (service_role) | `migrationService.js` | non-zero (migration only; write-once) |

**No ERP path writes non-zero `paid_amount_ils`.** The BO-10 guard (`operations.js:300`) is a hard `Detect→Reject`.

### 9. Could a path write BOTH `paid_amount_ils` and `allocation_records`?
**No current path writes both.** The only `allocation_records` writer (`allocation-integration.js`) writes no `paid_amount_ils`; the only non-zero `paid_amount_ils` writer (import) writes no `allocation_records`. The feature **must never** write `paid_amount_ils` — the BO-10 rejection + migration-only immutability already forbid it.

### 10. Complete WRITE graph (current)
```
                         UI (crud.js adapters)
                               │
              ┌────────────────┼───────────────────────────┐
              ▼                ▼                             ▼
   BusinessOps.createVoucher   BusinessOps.editVoucher /    _amendOwnVoucher
   (operations.js:109)         cancelVoucher / refundReceipt (crud.js:341, DRAFT only)
              │                (operations.js:147-346)            │
              ▼                        ▼                          ▼
          receipts insert        receipts update /           receipts update
                                 refunds insert              (version-guarded)

   allocation_records ◄── MODEL2 metadata recorder (allocation-integration.js:40,57, audit, flag-gated)
   member_subscriptions ◄── BO-10 insert (paid=0) · create_member_atomic RPC (paid=0) · Phase-15 import (non-zero)
```
Honest reading: **receipts have more than one writer today** (admin BusinessOps + draft-amend + ownership transitions `crud.js:356,654`), and **`allocation_records` already has one writer** (the audit recorder). Neither writes *settlement attribution* yet — that path does not exist.

---

## End-state proofs (after implementation)

### 11. Exactly ONE write authority
The feature introduces a **single atomic RPC** (Phase 8) as the **sole** writer of a receipt-with-settlement: it inserts the receipt **and** its settlement lines (`allocation_records`, `source_kind='receipt_settlement'`) in one transaction, enforcing `Σ lines = amount` server-side. The UI reaches it only through `BusinessOps.createVoucher`. **No other path creates settlement attribution.** Enforced by §15.

### 12. Cancellation uses the SAME authority
Cancellation is extended so the **same** BusinessOps/RPC transaction that soft-deletes the receipt also voids its settlement lines — one authority, one atomic act (Spec §Phase 5). No separate settlement-cancel path.

### 13. Refund uses the SAME authority
A refund records the money movement (`refunds`) **and** negative settlement lines (`allocation_records`, referencing the original) through the **same** BusinessOps/RPC authority, atomically (Spec §Phase 5). No separate settlement-refund path.

### 14. No other module can ever write settlement data
Proven by inventory + enforcement:
- **No report / FIN function / dashboard / dues / statement / treasury / print / helper writes any table today** — the bypass scan (§ANY direct SB write outside operations.js) shows only: attachments, audit_log, settings, contacts, vouchers (display cache), voucher_versions, and the two audit `allocation_records` inserts. **None writes settlement attribution.**
- **FIN is read-only** (it computes; it issues no `SB` write — grep of `fin*.js` for `.insert/.update` = 0).
- **The MODEL2 recorder** writes `source_kind='allocation'/'credit_consumption'` — **audit metadata, a different row class** from `source_kind='receipt_settlement'`. It is **not** a second source of *attribution*; it must be fenced so it can never emit a settlement-class row (§15).
- **The import** writes `paid_amount_ils` only, never settlement lines.

### 15. Where the guarantee is enforced (defense in depth)
| Layer | Enforcement |
|---|---|
| **UI** | settlement is submitted only via the receipt form → `BusinessOps.createVoucher`; no other screen posts settlement |
| **BusinessOps** | the only client function that calls the settlement RPC; posted receipts are **read-only** (edit = reverse+recreate), so no amend path mutates settled lines |
| **Atomic RPC** | `SECURITY DEFINER`; the **only** writer of `source_kind='receipt_settlement'` rows; enforces `Σ lines = amount`; never writes `paid_amount_ils` |
| **Database — RLS/grants** | **REVOKE** direct INSERT/UPDATE/DELETE on `allocation_records` from `authenticated`; grant settlement writes only to the RPC's definer role → **direct client writes fail** (this is what makes "no bypass" literally true) |
| **Constraints** | UNIQUE`(source_ref,obligation_kind,year)`, CHECK`amount>0`, `obligation_kind` enum incl. `receipt_settlement` class; `immutable=true` append-only |
| **Triggers** | closed-period guard blocks writes into locked years |
| **Permissions** | `paid_amount_ils` non-zero rejection (BO-10 `operations.js:300`) + migration-only immutability keep attribution single-sourced |

### 16. WRITE AUTHORITY DIAGRAM (end-state)
```
                         UI (receipt form)
                               │  (only entry for settlement)
                               ▼
                  BusinessOps.createVoucher / cancel / refund
                               │  (sole client caller of the RPC)
                               ▼
            ┌──────────  ATOMIC RPC (SECURITY DEFINER)  ──────────┐
            │      the ONE write authority for settlement          │
            │   Σ lines = amount · never writes paid_amount_ils    │
            └───────────────────────┬─────────────────────────────┘
                                     ▼   (one transaction)
                    receipt row  +  allocation_records
                                    (source_kind = 'receipt_settlement')
                                     ▲
              RLS: direct client INSERT/UPDATE/DELETE  ✗ DENIED
              (MODEL2 audit rows = different source_kind, never settlement)
```
Every other module — reports, FIN, dashboard, dues, statement, treasury, print, import, helpers, background — has **no write path** to settlement (RLS-denied + no code path).

---

## Acceptance

| Criterion | Status | Basis |
|---|---|---|
| Exactly **one write authority** | ✅ (end-state) | the atomic RPC is the sole settlement writer; enforced by RLS revoke + SECURITY DEFINER (§15) |
| Exactly **one read authority** | ✅ | `FIN.memberAllocation` (PR-0), sole reader of `allocation_records` |
| Exactly **one financial source of attribution** | ✅ | `allocation_records` `source_kind='receipt_settlement'`; `paid_amount_ils` never written by the feature |
| **No second source of truth** | ✅ | attribution only in settlement rows; MODEL2 rows are audit (distinct class); import writes only `paid_amount_ils` (frozen) |
| **No path can bypass the authority** | ✅ (once enforced) | RLS denies all direct client writes to `allocation_records`; only the definer RPC writes settlement — bypass becomes unrepresentable |

**Two mandatory fences carried into PR-1 (without them the guarantee leaks — they are part of the authority, not optional):**
1. **RLS revoke** on `allocation_records` direct client writes + settlement writes granted only to the RPC definer role.
2. **`source_kind` partition**: settlement rows are `receipt_settlement`; the MODEL2 audit recorder may never emit that class (and stays flag-gated/off).

---

## Verdict

# ✅ PASS

The single write authority is provable and bypass-proof in the end state: **one authority** (the atomic settlement RPC, reached only through BusinessOps), **one reader** (`FIN.memberAllocation`), **one attribution source** (`allocation_records` settlement rows), **no second source** (`paid_amount_ils` never written), and **no bypass** (RLS denies every direct client write once enforced). The two fences above are mandatory components of PR-1's write authority.

This is the final architectural gate. On your approval, implementation begins with **PR-1**; no further architectural documents.

---
**Read-only — nothing modified. `fin.js` @ baseline; Golden Reference intact. STOP.**
