# P-RECEIPT-ALLOCATION-002 — Receipt Allocation as the Financial Source of Truth

**Architectural study only. No code, no DB, no migration, no implementation, no PR.** This study stays **inside the financial transaction**. It does not discuss reports (except the Final Question, which you asked), read layers, or engine internals.

## The corrected premise (accepted)
Allocation is **not** a reporting feature and **not** a read layer. **Receipt Allocation is part of the financial transaction itself.** The receipt is the legal financial document; the allocation lines inside it are the **legal definition of where the money went**, decided once, at creation, and never inferred afterward.

The mental model: a receipt is not "an amount that will later be interpreted." A receipt is **an amount together with its distribution** — a self-contained financial fact, like an invoice whose line items must sum to its total. The distribution is as much a part of the document as the total is.

---

## 1. Why this changes the source of truth

Today the answer to *"where did this money go?"* is **not stored — it is produced on demand** by a distribution process. The destination is a *derivation*: a computed opinion that depends on an algorithm and can differ if inputs or ordering differ. A derivation can never be a source of truth, because it owns nothing — it re-answers the question every time it is asked.

Under this design the destination is **recorded as data, at the moment of the transaction, by the authority who created it** (the operator, backed by the legal receipt). The source of truth moves:

- **From** *"the destination is whatever the distribution computes"* (derived, owner-less, re-computable)
- **To** *"the destination is what the receipt says"* (recorded, authoritative, immutable).

The receipt becomes **the** owner of the truth about its own money. Nothing downstream is entitled to decide where a shekel went — that decision already happened and is written in the document. That is what "source of truth" means: a single, authoritative, recorded fact that everything else defers to.

## 2. Why this removes all future ambiguity

Ambiguity exists **only where destination is inferred**. Inference is required only when the fact is missing. Here the fact is never missing:

- Every shekel's destination is **captured at source**, by a person with authority, at the instant the money is recorded.
- It is **validated to completeness** — `Σ allocation lines = receipt amount` — so **no shekel is left un-attributed**. There is no residue for anything to guess about.
- It is **frozen** as part of the legal document.

Because the answer is already written down for **every** shekel of **every** transaction, there is nothing left to interpret. Ambiguity can only re-enter if something chooses to *re-derive* a fact that is already recorded — and this design makes that both unnecessary and illegitimate. **A recorded, complete, authoritative fact cannot be ambiguous.**

## 3. The complete Receipt lifecycle

```
[ Create Receipt ]                     the operator opens a new financial document (draft)
        ↓
[ Enter Amount + Currency ]            the CONTROL TOTAL of the document is fixed
        ↓
[ Enter Member / Payer ]               defines the universe of obligations the money MAY target
        ↓
[ Choose Allocation ]                  the operator distributes the total into LINES:
                                         2025 → 200 · 2026 → 200 · Historical → 300 · Donation → 100
        ↓
[ Validate ]  ── fails ──►  stays a draft; cannot become a transaction
   Σ lines == amount ? no duplicates ? no negatives ? destinations legal ?
        ↓  (all pass)
[ Save = POST ]  ← ATOMIC: header + all allocation lines commit as ONE transaction,
                    or nothing commits. There is never a receipt without its allocation.
        ↓
[ Financial Transaction Complete ]     the document is now OFFICIAL, IMMUTABLE, and
                                        FULLY ATTRIBUTED. Every shekel's destination is a
                                        recorded fact. No later step allocates or guesses.
```

Two properties make this a *transaction*, not a form:
- **The validation gate:** a document that is not fully and legally allocated **cannot be posted**. Completeness is a precondition of existence, not a later cleanup.
- **Atomicity of posting:** the header and its allocation lines are a single indivisible commit. A half-allocated or unallocated posted receipt is **unrepresentable**.

## 4. What data belongs inside the Receipt (the legal document)

The receipt is a **composite** legal document with two inseparable parts:

**Header (the money):** voucher number · date · payer (member or external) · amount · currency · exchange rate · settled amount · payment method · reference · who created it · when.

**Allocation lines (the distribution — equally legal):** for each line — the **destination** (a specific subscription year, the historical deficit, or a donation) and the **amount** to that destination; and the standing invariant **`Σ line amounts = header amount`**.

Both parts are the legal document. The allocation lines are **not metadata about the receipt** — they are the receipt's statement of where its money went, carrying the same legal weight as the total. Remove them and the document is incomplete; change them and it is a different document.

## 5. Should allocation be editable?

**No — not after posting. Yes — only while it is still a draft.**

- **Before posting (draft):** freely editable, because it is not yet a transaction — no financial fact exists yet.
- **After posting:** the allocation is **frozen, exactly as the amount is frozen.** You would never silently rewrite the *amount* of a posted receipt; the allocation has identical legal standing, so it is equally immutable.

**Why immutable:** the whole value of "the receipt is the truth" comes from it being a **fixed record of what was decided at a moment in time**. Editing a posted allocation in place would rewrite history, destroy the certainty that makes it authoritative, and re-open the very ambiguity this design closes. A posted allocation is **history**; history is corrected by new events, not by silent overwrite (Section 7).

## 6. Cancellation

Because the receipt is **one atomic document**, cancellation reverses the **entire** document — header and every allocation line **together**. There is no separate "un-allocate" step, because the allocation was never separate.

- Cancellation creates an **immutable reversing entry**; the original is **never deleted** (history is preserved).
- The reversal is **as precise as the original**: each line is reversed to its exact destination — 2025 gets its 200 back, historical its 300, the donation its 100. Because the destinations were recorded, **the reversal never guesses either.**
- After cancellation the net effect of the pair (original + reversal) is zero, and the audit trail shows both.

Precision on the way in guarantees precision on the way out.

## 7. Correction — edit, or reverse + recreate?

**Reverse + recreate. Always. Never edit a posted document.**

- **Reverse** the erroneous receipt in full (Section 6), then **create** a new, correct receipt with the intended allocation.
- **Why:** (a) **immutability** — a legal financial document is a fixed record of what happened; (b) **audit integrity** — the mistake and its fix appear as two distinct, linked events, so the story is legible forever; (c) **atomicity** — a correction is itself a transaction with its own authority and timestamp. Editing in place would collapse three truths (what was recorded, that it was wrong, what is now right) into one overwritten value, erasing the first two.

The reverse+recreate pair is not overhead — it **is** the correct financial narrative.

## 8. Refunds

A refund is a **new outflow transaction that references the original receipt and its recorded allocation.** Because the original distribution is written down, the refund can be attributed **exactly**:

- The operator states which line(s) the refund unwinds (e.g. return the 2026 portion, or a partial amount of the historical line).
- The refund carries its **own** allocation (a signed/negative distribution) summing to the refunded amount.
- The **original stays immutable**; money returns **from the exact destination it went to**. No inference about "which year is being refunded" — it is chosen and recorded, like everything else.

A refund is therefore just another fully-attributed transaction, obeying the same `Σ = total` and immutability rules.

## 9. Fiscal year closing

Closing a fiscal year freezes the facts dated/attributed to it. Because **each allocation line names its target year explicitly**, the close operates on **facts, not inferences**:

- **At creation:** a receipt is validated against the lock — **no allocation line may target a closed year.** (A receipt may legally span open years; it can never post money into a closed one.)
- **After close:** every allocation line already attributed to that year is **immutable**; the year's allocated total is a **settled historical fact**, not a figure that could shift because some later distribution "reached back."
- Corrections touching a closed year are impossible by the same rule — they require the year to be reopened by authority, then reversed+recreated.

Explicit per-line years make the close **exact and enforceable**, with nothing to re-decide.

## 10. Audit trail

**Yes — an auditor can see exactly why every shekel went to every year, by reading, never by reconstructing.** The chain is fully recorded:

```
Legal receipt (voucher no, payer, amount, date, created_by, timestamp)
        └─ allocation line → 2025 : 200        who decided · when · which document
        └─ allocation line → 2026 : 200
        └─ allocation line → Historical : 300
        └─ allocation line → Donation : 100     Σ = 800  (proven complete)
Linked reversal / refund documents (if any), each with their own recorded lines
```

For any shekel the auditor asks *"why here?"* and the answer is a **stored line** in a **legal document** with an **author and a timestamp**. Cancellations, corrections, and refunds are **separate linked documents**, so the history is a chain of discrete, immutable facts. The auditor **reads the truth; they never re-derive it.** This is the strongest possible audit posture: the explanation and the transaction are the same object.

## 11. Why this removes the need for future allocation guessing

Guessing is an algorithm that exists **only to supply a missing fact** — "the destination wasn't recorded, so infer it." This design makes the fact **always present**:

- Recorded **at source**, by authority, at transaction time.
- **Complete** by validation (`Σ = total` — no unattributed residue).
- **Immutable** thereafter.

When the fact is always present, the algorithm that supplies it has **no input and no purpose** — there is no unknown for it to resolve. Guessing does not need to be "turned off"; it becomes **structurally unnecessary**, because the question it answered is already answered in the document. **You cannot need to infer what is already written down.**

---

## Final Question — can every future reader simply read the financial result, without ever interpreting the payment again?

**YES. Proof:**

1. **The destination of every shekel is stored as immutable data at transaction time** (the allocation lines), for every transaction created under this model.
2. **The stored distribution is complete** — the `Σ lines = amount` gate guarantees no shekel is unattributed; there is no gap that would force inference.
3. **Reading a recorded fact is not interpretation.** Interpretation is required *only* when a fact is absent and must be inferred. Here no fact is absent.
4. Therefore any future reader needs only to **read the lines and sum them along whichever dimension it cares about** (by year, by destination, by member). Summation of recorded facts is arithmetic on data — not re-decision of where money went.
5. **No reader needs to run an allocation algorithm, because the algorithm's only input — an unknown destination — does not exist.** Every destination is known.

∴ Every future reader reads the financial result and **never interprets the payment again.** ∎

**One honest boundary (stated, not a report discussion):** this proof holds for transactions **created under this model**. Any transaction recorded *before* it carries no stored distribution, so that historical set — and only that set — would still lack a recorded answer. Every transaction **from adoption forward** is fully self-describing and never needs interpreting again.

---
**Study only — no code, no database, no migration, no implementation, no PR. Confined to the financial transaction. STOP and await approval.**
