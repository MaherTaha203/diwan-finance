<!-- ═══════════════════════════════════════════════════════════════════════════
     P-AIENG-W1-ACT-001 — Wave 1 Controlled Activation (SPECIFICATION)
     Activation-Execution Program. DESIGNS a tightly-controlled read-only pilot
     activation of the approved Read-Only Engineering Organization (P-AIENG-W1-000).
     THIS DOCUMENT INSTANTIATES NO AGENT, BEGINS NO OPERATIONAL REVIEW, and STARTS
     NO PILOT. Execution requires a SEPARATE, explicit Execution Authorization after
     this program is APPROVED & RATIFIED. It changes NO Accounting Constitution /
     Accounting Core / Certified Business Operation / Read Model / GOV-WS-01 rule and
     no business functionality.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P-AIENG-W1-ACT-001 · Wave 1 Controlled Activation — Specification

**Document ID:** GOV‑AIENG‑W1‑ACT‑01
**Program:** P‑AIENG · Activation Wave 1 · Controlled‑Activation Task ACT‑001
**Program Classification:** Activation‑Execution Program (Governance under GOV‑WS‑01 v1.5 §2.1)
**Program Status:** DRAFT — for Architectural Review, approval & ratification (execution separately authorized)
**Date:** 2026‑07‑21
**Reference Baseline:** `main` @ `75376b9`
**Builds on (frozen):** P‑AIENG‑000 · S1 · S2 · S3 · ACT‑001 · **P‑AIENG‑W1‑000** · GOV‑WS‑01 v1.5.

> **Purpose.** Execute a **tightly controlled pilot** activation of the approved Read‑Only
> Engineering Organization (Wave 1), limited to a **predefined pilot**, under **explicit
> authorization**, with **measurable success criteria** and **mandatory rollback**.
>
> **This document designs that pilot; it does not run it.** It **instantiates no agent,
> begins no operational review, and starts no pilot.** Per the stop condition, execution
> begins **only** under a **separate, explicit Execution Authorization** issued by the
> Chief Architect after this program is APPROVED & RATIFIED.

---

## 1 · The Two‑Gate Model (design vs. execution)

- **Gate A — Program approval (this document).** Architectural Review → APPROVED →
  RATIFIED → FROZEN. This fixes the pilot's design. **No agent runs at Gate A.**
- **Gate B — Execution Authorization (separate).** After Gate A, the Chief Architect (R00)
  issues an explicit **Execution Authorization** naming the pilot, the exact role(s), the
  read‑only ceiling, the supervision, and the time‑box. **Only then** may the pilot run.
- **Between the gates, and until Gate B, absolutely nothing is instantiated or executed.**

## 2 · Scope

- **In scope:** the design of **one** tightly‑controlled read‑only pilot — its subject,
  the read‑only bundle, the exact activation procedure, success metrics, rollback, evidence
  capture, and the Execution‑Authorization gate.
- **Out of scope (permanent for this program):** activating more than the predefined pilot;
  granting any write/execute/decide authority; any automation; any business/accounting/BO/
  Read‑Model/Constitution/GOV‑WS‑01 change; preparing Wave 2. **No agent is instantiated by
  this document.**

## 3 · Predefined Pilot (the only permitted subject)

To make the pilot **maximally safe and measurable**, its subject is a **known‑good,
already‑completed artifact** — not new or live work:

- **Subject.** One **already‑merged, already‑verified engineering unit** (e.g. a completed
  slice such as `P‑DUES‑S1`), whose **diff, conformance test, and verification results are
  already frozen and known‑good** on `main`.
- **Task.** The activated read‑only reviewer(s) **analyze the provided read‑only bundle**
  and produce **advisory** review reports (RS‑T1 / RS‑T4, marked non‑binding).
- **Why this subject.** It is (a) **read‑only** (nothing is changed — the unit is already
  merged & frozen); (b) **zero‑risk** (no live/pending work is touched); (c) **measurable**
  — the reviewers' advisory output can be compared against the unit's **known certified
  outcome** (its conformance result and the human/architectural decision already on record).
- **Read‑only bundle (assembled by R01).** The unit's diff + its existing conformance‑test
  output + its verification summary + relevant frozen governance records. **No write access,
  no execution capability, no network** is included.

## 4 · Participating Roles (pilot)

Per P‑AIENG‑W1‑000 §3, limited and read‑only:

| ID | Role | Pilot function |
|---|---|---|
| **R00** | Chief Architect (human) | Issues the Execution Authorization; evaluates the pilot; sole decision authority; may abort at any time |
| **R01** | Coordinator (human‑supervised) | Assembles the read‑only bundle; instantiates only the authorized reviewer(s); consolidates advisory output; enforces the read‑only ceiling; triggers rollback |
| **R02 / R04 / R05 / R10** | Architecture / Quality / Investigation / Documentation | **Read‑only advisory review** of the bundle (as authorized — the pilot may start with a **single** role and expand only under further authorization) |

**Minimal start.** The Execution Authorization may restrict the first pilot to **one**
read‑only reviewer (recommended: R02 Architecture *or* R04 Quality) before any expansion —
least‑privilege applied even within Wave 1.

## 5 · Activation Procedure (executed ONLY after Gate B)

1. **R00 issues the Execution Authorization** (pilot id · role(s) · read‑only ceiling ·
   supervision · time‑box). *(Gate B.)*
2. **R01 assembles** the read‑only bundle (§3) for the predefined unit.
3. **R01 instantiates only the authorized read‑only reviewer(s)** with the read‑only
   ceiling — **no write tools, no execution tools, no network, no decision authority.**
4. Each reviewer **analyzes the bundle read‑only** and returns an **advisory** report
   (RS‑T1 / RS‑T4), stamped “ADVISORY — non‑binding (Wave 1 pilot)”, with evidence refs.
5. **R01 consolidates** (RS‑T2, advisory) and **compares** the advisory findings to the
   unit's **known certified outcome**.
6. **R00 evaluates** against the success criteria (§6).
7. **Mandatory rollback (§7)** is performed at pilot end, regardless of outcome.
8. **R10 records** the pilot Completion Report; the full audit trail (S3 §15) is filed.

At every step, humans (R00/R01) supervise; any anomaly triggers immediate rollback (§7).

## 6 · Measurable Success Criteria

The pilot **succeeds** only if **all** hold (evidence‑backed):

| Metric | Definition | Success threshold |
|---|---|---|
| Authority conformance | reviewer acted within the read‑only ceiling | **100%** |
| Unauthorized actions | write/commit/PR/execute/network attempts | **0** |
| Writes / executions observed | any mutation or run by a reviewer | **0** (audit‑proven) |
| Report well‑formedness | advisory reports match RS‑T1/RS‑T4 with evidence refs | **100%** |
| Findings validity | advisory findings that are correct vs. the known certified outcome (no false “PASS” on a known issue; no fabricated blocker) | meets the pre‑agreed bar (e.g. **no material false negative/positive**) |
| Golden Baseline | constitutional baseline after the pilot | **12/12 unchanged** |
| Rollback | deactivation clean and complete | **verified** |

Any threshold missed ⇒ **pilot not successful** ⇒ rollback + root‑cause (R05, advisory) +
**no promotion**; a corrected re‑pilot requires a new Execution Authorization.

## 7 · Mandatory Rollback

- **Always performed** at pilot end (success or failure), and **immediately** on any
  anomaly (suspected authority breach, ambiguous behaviour, suspected manipulation).
- **Procedure (P‑AIENG‑W1‑000 §13).** (1) R00/R01 deactivate all pilot reviewer(s);
  (2) stop providing the bundle; (3) discard pending advisory outputs (retain as records);
  (4) **confirm via the audit trail that zero writes / zero executions occurred**;
  (5) record the rollback. Because the pilot is read‑only + advisory over an already‑frozen
  artifact, rollback is **total and leaves no residue**.
- **Freeze remains R00‑only** — no reviewer can land anything on `main`; the ultimate stop.

## 8 · Evidence & Audit

Every pilot element is captured as governance records on an append‑only audit trail
(S3 §15): the Execution Authorization · the read‑only bundle manifest · each advisory
report + evidence refs · the comparison to the known outcome · R00's evaluation · the
rollback confirmation · the Completion Report. The audit trail **must be complete and
unbroken** for the pilot to be deemed valid.

## 9 · Risk Controls (from P‑AIENG‑W1‑000 §14, applied to execution)

Zero‑trust, least‑privilege, human‑authority‑first throughout: **no write/execute/network
capability is granted**; reviewed content is treated as **untrusted data** (prompt‑
injection has no action surface because reviewers cannot act); advisory findings are
**non‑binding** and human‑verified; a single‑role, single‑artifact, time‑boxed pilot
bounds blast radius to **zero** (read‑only over an already‑frozen unit).

## 10 · Reversibility & Safety Invariants (unchanged)

Activation grants **no new authority**; the pilot changes nothing; every safety CANNOT of
P‑AIENG‑W1‑000 §17 holds by construction; the certified foundation and all frozen modules
remain untouched; **R00 retains sole approval & freeze**.

## 11 · Completion & Promotion

- **Completion.** The pilot is complete when the Completion Report (result vs. §6 metrics +
  audit trail) is filed and R00 records the outcome.
- **Promotion (toward Wave 2).** A **successful** pilot contributes to the P‑AIENG‑W1‑000
  §15 promotion evidence; Wave 2 remains a **separate** program (P‑AIENG‑W2‑000) and is not
  begun here. A **failed** pilot ⇒ rollback + root cause + **no promotion**.

## 12 · Execution‑Authorization Gate (restated)

**No review agent may be instantiated, no operational review may begin, and no pilot may
start** until this program (P‑AIENG‑W1‑ACT‑001) is **APPROVED, RATIFIED, and explicitly
AUTHORIZED for execution** by the Chief Architect (Gate B). Approving this specification
(Gate A) fixes the design; it does **not** authorize execution.

**Implementation note (safety).** When Gate B is issued, actually instantiating a read‑only
reviewer means spawning a sub‑agent bounded to the read‑only ceiling. The implementation
engineer shall, at that point, **re‑confirm the exact scope** (pilot id, the single
authorized role, the read‑only bundle, no write/execute/network tools, supervision,
time‑box) **before instantiating anything** — activation stays deliberate, minimal, and
reversible.

## 13 · Acceptance Criteria (for approving this program)

1. The two‑gate model (§1) and the Execution‑Authorization gate (§12) are explicit and binding.
2. The predefined pilot (§3) is a known‑good, already‑frozen, read‑only subject — zero live risk.
3. Success criteria (§6) are objective and measurable; rollback (§7) is mandatory and total.
4. Evidence/audit (§8) and risk controls (§9) are complete; safety invariants (§10) preserved.
5. Full compliance with P‑AIENG‑000/S1/S2/S3/ACT‑001/W1‑000 and GOV‑WS‑01 v1.5; no frozen
   artifact modified; **no agent instantiated by this document**.

## 14 · Out of Scope & Completion Boundary

- **Out of scope (permanent):** any execution before Gate B; more than the predefined pilot;
  any write/execute/decide authority; any automation; any business/accounting/GOV‑WS‑01
  change; Wave 2.
- **Completion boundary.** This program is complete when its pilot design (§1–§13) is
  reviewed, approved, and ratified. **Controlled Activation execution begins only under a
  separate, explicit Execution Authorization.**

---

*Specification only — this document designs the controlled pilot but instantiates no agent
and starts no pilot. After opening the draft PR: STOP; await Architectural Review. No review
agent may be instantiated, no operational review may begin, and no pilot may start until
P‑AIENG‑W1‑ACT‑001 is APPROVED, RATIFIED, and explicitly AUTHORIZED for execution.
Governance‑only; the certified foundation and all frozen modules remain untouched.*
