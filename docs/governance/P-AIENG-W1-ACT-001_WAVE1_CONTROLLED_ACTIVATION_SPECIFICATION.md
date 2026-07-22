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
**Program Status:** IN REVIEW — pre‑freeze acceptance amendments applied (per Architectural Review of PR #134); awaiting final ratification & freeze. Execution is a **separate** order.
**Date:** 2026‑07‑21
**Reference Baseline:** `main` @ `75376b9`
**Builds on (frozen):** P‑AIENG‑000 · S1 · S2 · S3 · ACT‑001 · **P‑AIENG‑W1‑000** · GOV‑WS‑01 v1.5.

> **Purpose.** **Design and legislate** a **tightly controlled pilot** activation of the
> approved Read‑Only Engineering Organization (Wave 1) — a predefined pilot, measurable
> success/failure criteria, an immediate kill‑switch, a bounded maximum duration, explicit
> human override, a completion report, and a rollback verification checklist.
>
> **This document designs that pilot; it does not run it.** It **instantiates no agent,
> begins no operational review, and starts no pilot.** Execution begins **only** under a
> **separate, independently‑issued `P‑AIENG‑W1‑PILOT‑001` · Pilot Execution Order** — never
> by approving or freezing this specification. Design ≠ execution.

---

## 1 · The Two‑Gate Model (design vs. execution)

**Design ≠ execution.** This specification is the **design and legislation** of the pilot
(a Governance Specification). The **actual run** is a *separate order*. The methodology is
kept fully consistent with the project's philosophy: **design → approval → freeze → a
separate execution order → execution → verification → completion report → freeze**.

- **Gate A — Program approval (this document).** Architectural Review → APPROVED →
  RATIFIED → FROZEN. This fixes the pilot's design. **No agent runs at Gate A**, and
  **freezing this specification does NOT authorize execution.**
- **Gate B — a SEPARATE Pilot Execution Order.** After Gate A, execution begins **only**
  under a **separate, independently‑issued Architectural Order — `P‑AIENG‑W1‑PILOT‑001` ·
  Pilot Execution Order** — which **alone** determines: **which agent(s)** are
  instantiated · **on which repository / task** · the **maximum duration** · the
  **authority limits** (read‑only ceiling) · the **stop / kill criteria** · the **success
  criteria**. This specification does not, by itself, ever authorize a run.
- **Between the gates, and until `P‑AIENG‑W1‑PILOT‑001` is issued, absolutely nothing is
  instantiated or executed.**

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
**no promotion**; a corrected re‑pilot requires a **new `P‑AIENG‑W1‑PILOT‑001`** order
(see §12A.2 for the full failure criteria).

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
(S3 §15): the `P‑AIENG‑W1‑PILOT‑001` Pilot Execution Order · the read‑only bundle manifest ·
each advisory report + evidence refs · the comparison to the known outcome · any kill /
override events · R00's evaluation · the Rollback Verification Checklist result (§12A.7) ·
the Completion Report (§12A.6). The audit trail **must be complete and unbroken** for the
pilot to be deemed valid.

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

## 12 · Execution Gate — a separate Pilot Execution Order (restated)

**No review agent may be instantiated, no operational review may begin, and no pilot may
start** until (a) this program (P‑AIENG‑W1‑ACT‑001) is **APPROVED, RATIFIED & FROZEN**
(Gate A), **and** (b) a **separate `P‑AIENG‑W1‑PILOT‑001` · Pilot Execution Order** is
explicitly issued (Gate B). Approving/freezing this specification fixes the design; it does
**not** authorize execution. A Pilot Execution Order is a distinct engineering unit with
its own review/approval.

**Implementation note (safety).** When `P‑AIENG‑W1‑PILOT‑001` is issued, actually
instantiating a read‑only reviewer means spawning a sub‑agent bounded to the read‑only
ceiling. The implementation engineer shall, at that point, **re‑confirm the exact scope**
(pilot id, the single authorized role, the read‑only bundle, no write/execute/network
tools, supervision, duration, kill criteria) **before instantiating anything** — activation
stays deliberate, minimal, and reversible.

## 12A · Pre‑Freeze Acceptance (mandatory items — added per Architectural Review of PR #134)

The Architectural Review required these seven items to be explicit before freeze. They are
defined here.

### 12A.1 · Pilot Success Metrics
As in **§6** — every metric objective and evidence‑backed: authority conformance 100% ·
unauthorized actions 0 · writes/executions 0 (audit‑proven) · report well‑formedness 100% ·
findings validity meets the bar · Golden Baseline 12/12 unchanged · rollback verified.

### 12A.2 · Pilot Failure Criteria
The pilot **fails** if **any** of the following occurs: any success metric (§6) misses its
threshold; **any** unauthorized action (a write / commit / branch / PR / merge / execute /
network attempt) is observed; **any** write or state mutation occurs; the reviewer's
advisory findings are **materially wrong** vs. the known certified outcome (a false “PASS”
on a real defect, or a fabricated blocker); the kill‑switch (§12A.3) is triggered; or the
maximum duration (§12A.4) is exceeded. On failure ⇒ immediate kill (§12A.3) + rollback
(§7) + root‑cause (R05, advisory) + **no promotion**; a corrected re‑pilot needs a **new**
`P‑AIENG‑W1‑PILOT‑001`.

### 12A.3 · Immediate Kill‑Switch Procedure
A **single, immediate stop** is available to **any human authority (R00 or R01) at any
instant**, no justification required: (1) **terminate all pilot agents immediately**;
(2) **stop providing any bundle**; (3) freeze the pilot state; (4) run the Rollback
Verification Checklist (§12A.7); (5) record the kill event + reason in the audit trail. The
kill‑switch **overrides everything**, including any in‑progress agent output. It is
exercisable before, during, or after any agent step.

### 12A.4 · Maximum Pilot Duration
The pilot is **hard time‑boxed**. `P‑AIENG‑W1‑PILOT‑001` sets the exact duration; the
**absolute maximum is one bounded, supervised session** (recommended ceiling: **≤ 30
minutes of active review, single pass**). On expiry the pilot **auto‑terminates** via the
kill‑switch (§12A.3) regardless of state; there is **no background, long‑running, or
unattended** operation.

### 12A.5 · Explicit Human Override Procedure
**Human authority is absolute and always available.** R00 (Chief Architect) and R01
(Coordinator) may, at any moment: **abort** the pilot; **deactivate** any reviewer;
**reject or discard** any advisory output; **overrule** any finding; or **decline to act**
on any recommendation. No agent output is binding; **every** decision is human. Any conflict
between an agent's advice and a human decision is resolved **in favour of the human**,
recorded in the audit trail.

### 12A.6 · Post‑Pilot Completion Report
After the pilot (success, failure, or kill), R10 (Documentation) files a **Wave‑1 Pilot
Completion Report** (RS‑CR form) recording: the Pilot Execution Order reference · the
read‑only bundle manifest · each advisory report + evidence refs · the comparison to the
known certified outcome · the §6 metric results · the kill/override events (if any) · the
Rollback Verification Checklist result (§12A.7) · and R00's recorded outcome. The report is
a **separate governance artifact** and is required for the pilot to be deemed complete.

### 12A.7 · Rollback Verification Checklist
Run after every pilot (and after any kill), and **all** must be true:
```
[ ] All pilot agents terminated (none running)
[ ] Working tree clean — `git status --short` empty (zero writes)
[ ] Branch HEAD unchanged from pre-pilot commit
[ ] No new / modified / deleted files attributable to a reviewer
[ ] Golden constitutional baseline — 12/12 unchanged
[ ] No commit / push / PR / merge performed by any reviewer
[ ] Audit trail complete and unbroken (authorization → advice → comparison → rollback)
[ ] R00 records the outcome
```
Any unchecked item ⇒ the pilot is **not** cleanly rolled back ⇒ escalate to R00 immediately.

## 13 · Acceptance Criteria (for approving this program)

1. The two‑gate model (§1) and the separate‑Pilot‑Execution‑Order gate (§12) are explicit and binding.
2. The predefined pilot (§3) is a known‑good, already‑frozen, read‑only subject — zero live risk.
3. Success criteria (§6) are objective; failure criteria (§12A.2), kill‑switch (§12A.3),
   maximum duration (§12A.4), human override (§12A.5), completion report (§12A.6), and the
   rollback verification checklist (§12A.7) are all explicit; rollback (§7) is mandatory and total.
4. Evidence/audit (§8) and risk controls (§9) are complete; safety invariants (§10) preserved.
5. Full compliance with P‑AIENG‑000/S1/S2/S3/ACT‑001/W1‑000 and GOV‑WS‑01 v1.5; no frozen
   artifact modified; **no agent instantiated by this document**.

## 14 · Out of Scope & Completion Boundary

- **Out of scope (permanent):** any execution before the separate `P‑AIENG‑W1‑PILOT‑001`
  order; more than the predefined pilot; any write/execute/decide authority; any automation;
  any business/accounting/GOV‑WS‑01 change; Wave 2.
- **Completion boundary.** This program is complete when its pilot design (§1–§13, incl. the
  §12A pre‑freeze acceptance items) is reviewed, approved, and **frozen**. **Controlled
  Activation execution begins only under a separate `P‑AIENG‑W1‑PILOT‑001` Pilot Execution
  Order.**

---

*Specification only — this document designs the controlled pilot but instantiates no agent
and starts no pilot. After opening the draft PR: STOP; await final Architectural Ratification.
No review agent may be instantiated, no operational review may begin, and no pilot may start
until P‑AIENG‑W1‑ACT‑001 is APPROVED, RATIFIED & FROZEN **and** a separate
`P‑AIENG‑W1‑PILOT‑001` Pilot Execution Order is issued. Governance‑only; the certified
foundation and all frozen modules remain untouched.*
