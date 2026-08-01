# TRUTH-001 — Source Ownership Architecture (final architecture review · no code)

**Design only.** No implementation, no FIN / allocation / report / DB change, no implementation plan. This replaces the *Year Ownership* framing with **Source Ownership** and answers the seven questions.

---

## 1. The current problem
A single subscription year — **2026** — contains **two independent sources of truth**:
- **Historical Imported Truth** — the Excel snapshot of the member's subscription reality *before* ERP go-live, reviewed and adopted by the owner.
- **ERP Operational Truth** — receipts / collection / FD-002 allocation recorded *inside* ERP *after* go-live.

Any model that assigns a *year* to a single owner is therefore false to the data: 2026 is simultaneously "partly imported" and "partly ERP." The prior *Year Ownership* design (`closed → Historical`, `open → Live`) breaks precisely here.

## 2. Why Year Ownership is rejected
`if (year is closed)` keys authority on a **time** property. Time does not tell you **where a fact came from** — and a single open year holds both an imported opening *and* live ERP events. Keying on the year forces one source to win the whole year, which is factually wrong and re-creates the conflict we are trying to remove. **Authority must key on the fact's origin, not on the calendar.** (→ answers Q2: the correct predicate is `if (truth source == imported)`, not `if (year is closed)`.)

## 3. The new design — Source Ownership
Every atomic truth is owned by **the source that produced it**, over the **time window that source is authoritative for**:

| Source | Owns | Authoritative window | Mutability |
|---|---|---|---|
| **Historical Imported Truth** (Excel, adopted) | the member-year status **as of the import cutoff** | everything **≤ go-live / import date** | **frozen** (write-once at adoption; corrections are audited amendments, never silent) |
| **ERP Operational Truth** (receipts / allocation) | financial **events after go-live** | everything **> import cutoff** | live (the existing daily machinery) |

**Can one year hold two sources? Yes.** They **never conflict**, because their authority windows are **disjoint in time**: the import is authoritative for the *state at cutoff*; ERP is authoritative for *changes after cutoff*. The imported truth is the **anchor/opening**; ERP events are **forward transitions** from it. There is no fact both claim — so there is nothing to reconcile, only to **compose in order**. (→ answers Q1.)

## 4. Canonical Resolver Architecture
```
                         Canonical Resolver
             resolve(member, year) → { status, source, provenance }
                                │
             ┌──────────────────┴───────────────────┐
   Historical Imported Truth               ERP Operational Truth
        (Excel, adopted)                  (Receipts / FD-002 allocation)
   authoritative ≤ import cutoff            authoritative > import cutoff
```
- **One resolver is the *only* component that knows two sources exist.** Its contract: given `(member, year)` it returns the current `status`, the `source` that last determined it, and the `provenance` chain.
- **Resolution rule (deterministic, conflict-free):** start from the Historical Imported opening for the member-year; apply ERP events (chronological, FD-002) that occur after the import cutoff; the result is the current status. Imported anchors; ERP advances (settle) or reverses (refund/void), always as recorded events.
- **Reports know nothing.** Statement / Delinquent / Annual Debt / Dues / dashboard call the resolver's single front door (today: `memberDelinquency`) and read one status. No report contains `truth ? … : derived`, no report references either source. The scattered overlay you rejected is gone; the *one* resolver replaces it.
- The resolver's *internal* strategy (compute-on-read vs. a materialized resolved-status cache refreshed when a source changes) is an implementation detail **behind** the interface — it does not change this architecture and is decided at implementation time. Crucially, **the Historical Imported table is never part of that refresh** — only ERP Operational Truth is live (this preserves the write-cycle boundary from the prior note).

## 5. Provenance Model
Provenance lives in the **data**, never in the tools — so the tools are disposable and audit survives them. Normalized into two records:

**Import Batch registry** (one row per import run):
`import_batch_id` · `import_source` (file name + content hash) · `imported_at` · `imported_by` · `row_count` · `checksum` · `notes`.

**Historical Imported Truth record** (one row per member-year, FK → batch):
`member_id` · `year` · `status` · `reason` · `original_member_identifier` (identity *as written in Excel*, before mapping) · `original_excel_row` · `import_batch_id` · `approved_by` · `approved_at` · `version` / `superseded_by`.

**Are all fields necessary? Yes — each answers a distinct audit question** (batch-level fields normalized onto the batch, not duplicated per row):

| Field | Audit question it answers |
|---|---|
| `import_batch_id` → batch registry | which import run, from which file, when, by whom |
| `import_source` (name+hash) | the exact legal file of origin |
| `original_excel_row` | trace to the precise source line (dispute resolution) |
| `original_member_identifier` | catch mis-mappings between the Excel identity and `member_id` |
| `imported_at` | when the fact entered the system |
| `approved_by` / `approved_at` | the human authority and moment of the decision (governance) |
| `version` / `superseded_by` | immutable history across corrections |

None is redundant; batch-level fields (`import_source`, `imported_at`, `imported_by`) sit on the batch to avoid duplication while remaining reachable via the FK. (→ answers Q6.)

## 6. Lifecycle
```
Excel file ─► Import Batch (registered, hashed, archived)
                │
                ▼
     Historical Imported Truth rows (per member-year, provenance-tagged)
                │  ── owner Review + Adoption (approved_by/at) : one-time genesis ──
                ▼
        ┌───────────────► Canonical Resolver ◄───────────────┐
        │                                                     │
  (frozen anchor)                                    ERP events (receipts / FD-002)
                                                     advance / reverse status forward
                │
                ▼
          resolve(member, year) → status  ──►  every report (source-blind)
```
- **Genesis** of imported truth: register batch → create rows → owner adopts (approves). Once.
- **Go-forward:** an ERP payment is a normal ERP event; the resolver composes it onto the imported anchor. The **imported record is never rewritten** by daily activity; only corrections to the *import itself* create a new **version** (audited amendment).
- **Future years (2027+):** no imported source exists, so the resolver has only ERP Operational Truth for them — they are pure Domain B, born and advanced by ERP events, no adoption needed.

## 7. Impact of deleting the Truth tools (Review / Import Tool / UI)
**Excel does not become worthless — it remains the legal origin** (→ Q3). The adopted rows are the *operational* truth; the Excel file + its Import Batch record are the *source of record* for any dispute a year later.

**Delete Truth Review + Truth Import Tool + Truth UI entirely — an auditor three years later can still answer everything** (→ Q5), because provenance is in the **data**, not the tools:
- *Where did this truth come from?* → the Historical Imported Truth row (`source`, `reason`).
- *Which file created it?* → `import_batch_id` → Import Batch registry (`import_source` name + hash).
- *Which batch imported it?* → `import_batch_id`.
- *Who approved it?* → `approved_by` / `approved_at`.
- *Which exact line?* → `original_excel_row` + `original_member_identifier`.

The tools only ever **wrote** these rows once; nothing **reads** them at runtime. Excising them leaves the audit trail fully intact. (This is the strong severability you asked for.)

## 8. Final comparison — Model A (Fiscal-Year Ownership) vs Model B (Source Ownership)

| Axis | Model A — by Fiscal Year | Model B — by Truth Source |
|---|---|---|
| **Clarity** | false to the data (a year has two sources) | matches reality: authority follows origin |
| **Responsibilities** | blurred — one owner forced per year | clean — each source owns its window; resolver composes |
| **Maintainability** | reclassify on every close; edge cases pile up | add a source = register + one resolver rule |
| **Auditability** | year says nothing about origin | provenance native to each source record |
| **Future extensibility** | new sources don't fit the year axis | any new source (2nd import, API, adjustment) slots in |
| **Data-conflict likelihood** | **high** — two sources, one year, no rule | **none by construction** — disjoint time windows, defined precedence |

## 9. Final recommendation
**Adopt Model B — Source Ownership, behind a single Canonical Resolver.**

Engineering justification: it is the only model that is *true to the data* (a year legitimately has two sources), it makes conflict **structurally impossible** (disjoint temporal authority + a single deterministic resolver), it keeps **reports source-blind** (one front door, no overlay), it preserves the **Historical Imported Truth** as a frozen, fully-provenanced legal record (Excel stays the origin; tools stay disposable), and it extends to future sources and years without changing the axis. Model A fails at the first fact — 2026 — and cannot be repaired without becoming Model B.

**Direct answers to the seven questions:** Q1 — yes, and conflict is prevented by disjoint time windows + a single resolver (§3-4). Q2 — `truth source == imported`, not `year is closed`, because origin (not time) carries authority (§2). Q3 — Excel remains the legal origin, not worthless (§7). Q4 — full provenance via Import Batch + row-level fields (§5). Q5 — yes, an auditor can trace everything after the tools are deleted, because provenance is in the data (§7). Q6 — all fields are necessary, normalized batch-vs-row (§5). Q7 — Model B wins on every axis (§8).

---
**Final architecture review — design only. Nothing implemented; no prior design file changed; FIN / allocation / reports / DB untouched; #273 held.** Awaiting your decision on whether the architecture is ready for an implementation plan.
