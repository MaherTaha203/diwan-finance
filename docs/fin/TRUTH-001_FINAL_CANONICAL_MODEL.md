# TRUTH-001 — Final Canonical Model (architecture review · no code)

**Design only.** This is the final architectural review before any implementation is authorized. It answers the eight points you raised. No FIN / allocation / reports / DB changes are made here.

The through-line of your directives is a single shift: **abandon the read-time overlay (`truth ? truth : derived`) and make the adopted truth *materialized official data*** — a first-class Historical Truth that reports read directly, never a status computed-then-overridden at read.

---

## 1. The table stays *Historical Subscription Truth*, not a "Year Status Table"
The existing table already carries more than a status: its columns are `id, member_id, year, status, source, approved_by, approved_at`. It was **designed as a truth record**, with status as *one* field alongside provenance (source) and decision (approved_by / approved_at).

**Coherence — name ↔ content ↔ responsibility:**
- **Name:** *Historical Subscription Truth* — the authoritative record of what is true about a member's subscription for a year.
- **Content:** the *reality* of that member-year — its status **and why/who/when/whence** it is so.
- **Responsibility:** be the single record every surface trusts for that reality.

We keep that identity. We do **not** demote it to a status enum. We *enrich* it (below). The name remains exactly accurate.

## 2. Truth is a record, not a status
The canonical record for `(member, year)` is a **Historical Truth fact** with (design shape; extends the current columns, no column removed):

| Field | Meaning |
|---|---|
| `status` | مسدّد / جزئي / غير مسدّد — one facet |
| `reason` | why (e.g. "paid before ERP", "partial import", "settled by receipt REC-00047") |
| `source` | provenance: `import` · `owner_review` · `erp` · `system` |
| `import_type` | for imported facts: excel snapshot / carried arrears / … |
| `decided_by` / `decided_at` | the owner/actor and time of the decision |
| `event_ref` | for ERP-born facts: the receipt/voucher that produced it |
| `note` | free text from review |
| `version` / `superseded_by` | immutable history of the fact |

Status is what reports *show*; the rest is the *truth* the record is responsible for. The model is a **Historical Truth**, not a Year-Status Table.

## 3. No runtime overlay — the truth is materialized and read directly
The rejected pattern (`settled = truth ? truth==='paid' : derived`) is a **read-time overlay**. We remove it. Instead:

- **Every active member-year has a materialized Historical Truth record.** Reports read `status` **directly** from it. There is no `else derive`, no patch, no read-time exception — because there is never a "missing record" case at read.
- **Derivation moves to write-time, once.** FD-002 / ERP events compute a transition and **write** it into the record. Reads are pure lookups. The report layer does not know a "truth override" exists — it only knows *the* status.

This is the core of the final model: **truth is stored, not overlaid.**

## 4. ERP after adoption — the full lifecycle (the key study)
A Historical Truth record is a **state machine per (member, year)**, advanced only by recorded events. "Adoption" is just one genesis event; ERP payments are ordinary subsequent events.

**States:** `OPEN (غير مسدّد)` · `PARTIAL (جزئي)` · `PAID (مسدّد)` · `REOPENED` (after a reversal).

**Events and their effect on the record:**

| Event | Effect on the Historical Truth record | source |
|---|---|---|
| Dues generated for a year | **create** record `OPEN` | `system` |
| Import adopted (imported years) | **set** the owner-decided status as the record's authoritative initial state | `owner_review` |
| **ERP receipt settles the year (full)** | **new event recorded (receipt) + record transitions → `PAID`, new version**, `event_ref`=receipt | `erp` |
| ERP receipt (partial) | → `PARTIAL`, new version | `erp` |
| Refund / void of a settling receipt | → `REOPENED`/`PARTIAL`, new version, `event_ref`=reversal | `erp` |

**Your question — modify / create / update / new event? → all three, in one disciplined act:** an ERP payment **records a new financial event** (the receipt, unchanged) **and updates the year's Historical Truth by writing a new version** (the transition), with the receipt as `event_ref`, prior versions retained. It is **never** a silent re-derivation of imported truth — the imported adoption was only the *initial state*; a real ERP event *advances* the official state forward, as any ledger does.

**Constitutional consistency:** this honors your Domain rule — Domain A (imported) is never *re-derived* by an algorithm; it is only *superseded forward* by a real Domain-B event, with full provenance. And it honors "amounts untouched": the receipt carries the amount; the truth record carries the status transition.

## 5. "Adoption" does not exist at runtime
Adoption is **transitional genesis**. Once a truth record exists, runtime reads it and neither knows nor cares that some records were born by adoption, some by ERP, some by the system — `source` is *provenance metadata*, not a runtime branch. A year later there is no "adoption" concept in any read path; there is only **Historical Truth**. The runtime is designed as if adoption never happened.

## 6. Stronger severability proof — delete the entire authoring/import layer
**Claim:** delete **Truth Review** (the artifact) **and** Truth Import **and** the Truth UI, entirely — the system keeps working.

**Proof:**
- These three are **genesis machinery**: they only ever *write* Historical Truth records (once). None is *read* by any report, screen, or accessor.
- After genesis, the records are in the database. The runtime path is `Historical Truth table → read status → surfaces` — it contains **none** of {Truth Review, Truth Import, Truth UI}.
- Therefore removing all three changes **no status, no amount, no balance** on any surface. The system runs on the stored Historical Truth alone.
- Formally: the authoring/import layer are **source nodes with zero out-edges into any read path**; excising source nodes that nothing reads leaves the runtime graph intact.

**∴** the architecture succeeds by your strongest test: the truth authoring/import tooling is fully disposable post-genesis.

## 7. The future — 2027, 2028, 2029…
Two genesis regimes, one table:

| Years | How Historical Truth is born | Manager approval? |
|---|---|---|
| **2025–2026 (imported)** | one-time **adoption** of the owner's reviewed matrix | yes — a one-time human decision over ambiguous imported history |
| **2027+ (ERP-native)** | **auto-created** `OPEN` at dues generation, then **advanced by ERP events** (receipts) | **no adoption needed** — there is no ambiguous import to review; the ERP events *are* the evidence, recorded with provenance |

So the table does **not** stay limited to import years — it grows to hold every member-year, imported and ERP-native, each provenance-tagged. Imported years needed human truth because the source (Excel) was outside the system; ERP-native years are self-evidencing. Optionally, the owner may still *confirm* a year at close, but it is not required for correctness.

## 8. Implications for implementation (honest scope — not now)
This model is **deeper than a read reroute**. To have no overlay, the system must:
1. **Materialize** a Historical Truth record for every active member-year (at dues generation + a one-time backfill for existing years).
2. **Write status transitions from events** — ERP receipt creation (and refund/void) must, in the same transaction, advance the year's truth record.
3. **Reports read `status` directly** from the record — the one rogue surface (Annual Debt) included; amounts stay raw.
4. **Enforce status↔amount consistency** — since status is now stored (not derived), the event write-path is the guardrail; a reconciliation check verifies stored status agrees with the certified financial reality.

Trade-off to weigh openly: the read-time overlay was *smaller* to build; this materialized model is *larger* (it touches the ERP write path) but is what your directives require — **one stored truth, no read-time branching, provably tool-independent**. I present both facts so the choice is yours.

---
## Single-source restated for the materialized model
`Historical Truth table` (one record per member-year) → read directly by every surface. No overlay, no second table, no authoring-tool dependency at runtime. Amounts remain in `member_subscriptions` / `receipts`, untouched.

## Ratification requested (before any implementation)
1. The **materialized Historical Truth** model (no runtime overlay).
2. The **enriched record** (status + reason + source + decision + event_ref + version) keeping the table's *Historical Subscription Truth* identity.
3. The **ERP-after-adoption lifecycle** (event records a receipt **and** versions the truth record forward; never re-derives imported truth).
4. The **future regime** (imported = adopted once; ERP-native = auto-born + event-advanced).

No code, FIN, allocation, or report changes until you approve this model.

---
**Design only. Nothing implemented** — `fin.js` at baseline; #273 held.
