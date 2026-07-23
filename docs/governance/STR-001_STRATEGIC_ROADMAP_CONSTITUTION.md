<!-- ═══════════════════════════════════════════════════════════════════════════
     STR-001 — Strategic Roadmap Constitution (PLATFORM GOVERNANCE)
     A permanent governance record for owner review, approval & freeze. It introduces
     NO code, NO application-logic change, NO feature, NO runtime, and NO change to the
     Accounting Constitution / Accounting Core / Certified Business Operations / Read
     Models / Constitutional Laboratory. It is the governing roadmap for all post-V1
     engineering: it classifies every known candidate into exactly one release and sets
     the order in which the Autonomous Pipeline (GOV-013) executes them. Grounded in the
     frozen P6-000 Architectural Evolution Assessment and GOV-PROG-BR-01 §4.
     ═══════════════════════════════════════════════════════════════════════════ -->

# STR‑001 · Strategic Roadmap Constitution

**Document ID:** STR‑001
**Classification:** Permanent Governance Record (Governance Enhancement under GOV‑WS‑01 v1.5 §2.1)
**Status:** DRAFT — for Architectural Review, approval & freeze (defines a roadmap; implements nothing)
**Date:** 2026‑07‑22
**Baseline:** `main` @ `477a06d` (V1.0.0 certified baseline; tag `v1.0.0` pending owner application)
**Builds on (frozen):** P6‑000 Architectural Evolution Assessment · GOV‑PROG‑BR‑01 · GOV‑013 · GOV‑WS‑01 v1.5 · GOV‑WS‑02 · the V1 release package.
**Origin:** Owner Decision — "Insert New Mandatory Phase · STR‑001 · Strategic Roadmap Constitution" (2026‑07‑22).

> **Nature.** STR‑001 turns execution from *milestone‑driven* to *roadmap‑driven*. It **classifies
> every known future candidate into exactly one release**, records the priority, dependency,
> impact, risk, and debt structure behind those choices, and fixes the **order** in which the
> GOV‑013 pipeline runs them. It **implements no feature and changes no production code.** Upon
> freeze, ordinary roadmap phases run **without a per‑phase owner decision**; owner intervention
> is required only for constitutional amendments, business‑policy changes, emergency overrides,
> or new strategic initiatives outside this roadmap (§18).

---

## 1 · Source of candidates (no invention)

Every feature classified here is a **real, documented candidate** carried forward from the
frozen record — no candidate is invented:
- **P6‑000** Architectural Evolution Assessment (Candidates C1–C6 + Reservations).
- **GOV‑PROG‑BR‑01 §4** (carried‑forward candidates, none pre‑selected).
- **V1 Outstanding Risks Report** (technical debt R‑1) and the standing deferrals
  (BO‑06, Refund, MODEL2 activation, FOC‑012/013 re‑certification).

Nothing outside these sources is added. Where an item needs a business‑policy or constitutional
input the owner has not yet given, it is classified into a **gated** release (Deferred/Research/V2),
never into an auto‑executable slot.

---

## 2 · Feature Backlog (canonical IDs)

| ID | Feature | Origin |
|---|---|---|
| **F‑01** | Governance v1.6 — codify Observability Layer as a first‑class GOV‑WS‑01 artifact + ADR‑process note | P6‑000 C6 |
| **F‑02** | Technical‑debt: restore the legacy acceptance fixture (`roundtrip-seed.json`) / migrate `e2e-acceptance` + `q5-evidence` onto the Lab seed | V1 R‑1 |
| **F‑03** | Approval Workflow (GAP‑P1) — pre‑execution approval before a Business Operation commits | P6‑000 C1 |
| **F‑04** | Liquidity Guard (GAP‑P2) — treasury‑floor invariant blocking an operation that would breach a floor | P6‑000 C2 |
| **F‑05** | MODEL2 Activation — execute the declared `ALLOCATION_ORDER` (currently inert) | FOC‑025 / model2.js |
| **F‑06** | BO‑06 Historical‑Deficit Settlement — settle deficit creditors (needs a settlement policy) | P6‑000 C4 / FOC‑012 |
| **F‑07** | Refund — reverse a linked receipt as a first‑class movement | FOC‑013 / model2.js |
| **F‑08** | FOC‑012 / FOC‑013 re‑certification — certify BO‑06 & Refund once implemented | Owner ruling 2026‑07‑22 |
| **F‑09** | Cash Management / Reconciliation — cash‑location model + reconciliation | P6‑000 C5 |
| **F‑10** | Reservations standing — governance ruling on the existing non‑financial calendar | P6‑000 Additional |

---

## 3 · Version Planning (every feature in exactly one release — nothing unclassified)

| Release | Theme | Features | Gate to enter |
|---|---|---|---|
| **V1.1** | Governance & hygiene (no runtime risk) | F‑01, F‑02 | F‑02 fully autonomous · F‑01 **draftable autonomously, but the GOV‑WS‑01 v1.6 amendment is owner‑ratified via merge** (as v1.5 / GOV‑WS‑02 were) |
| **V1.2** | Pre‑Execution Control (paired capability) | F‑03, F‑04 | ADR + owner business‑policy (approval authority / floors) + Constitutional Review |
| **V2.0** | Deferred financial capabilities | F‑05, F‑06, F‑07, F‑08 | owner business‑policy (settlement/refund) + Constitutional amendment (MODEL2) |
| **Deferred** | Awaiting a new foundation | F‑09 | new cash‑location data model must exist first |
| **Research** | Study before commitment | R‑C1, R‑C2, R‑C3 (see §12) | research output → owner decision |
| **Rejected** | Formally declined | *(empty)* | — |
| **Governance ruling** | Not a build phase | F‑10 | owner governance ruling only |

*Rationale:* mirrors P6‑000 — build the paired control (GAP‑P1 + GAP‑P2) as the first real
execution‑governance capability; defer BO‑06 and Cash Management; treat Governance v1.6 as
low‑risk; treat Reservations as a ruling, not a build. V2.0 groups every capability that
depends on activating MODEL2 or on a new business policy.

---

## 4 · Feature Classification (all required fields)

Scale: Value/Cost/Risk = **L/M/H** (+ XL for cost). Impact = **None/Low/Med/High**.

| ID | Business Value | Eng. Cost | Risk | Dependencies | Constitutional | DB | UI | Testing | Regression Risk | Priority | Rec. Release |
|---|---|---|---|---|---|---|---|---|---|---|---|
| F‑01 | M | S | L | none | **Governance‑rule amendment (GOV‑WS‑01→v1.6; owner‑ratified)** | None | None | Docs/lint | **None** | P1 | **V1.1** |
| F‑02 | M | S | L | none | None | None | None | Restores 2 suites | Low | P1 | **V1.1** |
| F‑03 | H | L | M | GOV‑WS‑02; new BO; contract §A | **Review** (adds a gate, no law change) | Med (approval state) | Med (approve UI) | High | Med | P2 | **V1.2** |
| F‑04 | H | M | M | **pairs F‑03**; Law 9 territory | **Review** (invariant, no law change) | Low | Low | High | Med | P2 | **V1.2** |
| F‑05 | H | XL | H | model2.js; allocation engine | **Amendment** (changes runtime allocation) | Med | Med | Very High | **High** | P3 | **V2.0** |
| F‑06 | M | L | H | **F‑05**; settlement policy | **Amendment** (activates BO‑06) | Med (settlement rows) | Med | High | Med | P3 | **V2.0** |
| F‑07 | M | M | H | **F‑05**; refund policy | **Amendment** (activates refund) | Med (linked reversal) | Med | High | Med | P3 | **V2.0** |
| F‑08 | H (assurance) | S | L | F‑06, F‑07 | Certification only | None | None | Lab chapters | Low | P3 | **V2.0** |
| F‑09 | M | XL | H | new cash‑location model | **Review** (new foundation) | High (new tables) | High | Very High | High | P4 | **Deferred** |
| F‑10 | L | S | L | none | Governance ruling | None | None | None | None | P4 | **Ruling** |

---

## 5 · Priority Matrix (value × cost, lower‑risk first)

```
        LOW COST ───────────────► HIGH COST
  HIGH  │ F-01  F-02        │ F-03  F-04      │ F-05
 VALUE  │ (do first)        │ (control layer) │ (V2 anchor)
        │ F-08 (with V2)    │                 │ F-06 F-07 F-09
  LOW   │ F-10 (ruling)     │                 │
 VALUE  ▼
```
**Do‑first quadrant:** F‑01, F‑02 (high‑value / low‑cost / no runtime risk) → V1.1.
**Control layer:** F‑03 + F‑04 (paired) → V1.2. **V2 anchor:** F‑05 unlocks F‑06/F‑07/F‑08.

## 6 · Dependency Graph

```
 V1.1:  F-01 ─┐        (independent, no downstream deps)
        F-02 ─┘
 V1.2:  F-03 (Approval, GAP-P1) ◀────▶ F-04 (Liquidity, GAP-P2)   [paired control point]
 V2.0:  F-05 (MODEL2 activation) ──┬──► F-06 (BO-06 settlement) ──► F-08 (re-certify FOC-012)
                                   └──► F-07 (Refund)          ──► F-08 (re-certify FOC-013)
 Deferred: F-09 (Cash Mgmt) ── depends on ──► [new cash-location data model]  (Research R-C1)
 Ruling:   F-10 (Reservations) ── isolated, no edges
```
No cycles. Critical path to V2.0 = **F‑05 first**; F‑06/F‑07 cannot certify (F‑08) until F‑05 lands.

## 7 · Architectural Impact Matrix

| Layer | F‑01 | F‑02 | F‑03 | F‑04 | F‑05 | F‑06 | F‑07 | F‑08 | F‑09 | F‑10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Constitution / Laws | — | — | — | — | **●** | ○ | ○ | — | — | — |
| Accounting Core | — | — | — | ○ | **●** | ○ | ○ | — | ○ | — |
| Business Operations | — | — | **● new BO** | ○ | ○ | **● BO‑06** | **● refund** | — | ● | — |
| Read Models | — | — | ○ | ○ | ● | ○ | ○ | — | ● | — |
| Data plane (Supabase) | — | — | ● | ○ | ● | ● | ● | — | **● new tables** | — |
| UI / Workspaces | — | — | ● | ○ | ● | ● | ● | — | ● | — |
| Governance | **●** | — | ● | ● | ● | ○ | ○ | — | ● | **●** |
| Constitutional Lab | — | ○ | ● | ● | ● | ● | ● | **●** | ● | — |

● significant · ○ minor · — none.  *Note: F‑05/F‑06/F‑07 are the only items that touch the Constitution/Core — all V2.0, all owner‑gated.*

## 8 · Business Impact Matrix

| Feature | Beneficiary | Business problem solved | If not done |
|---|---|---|---|
| F‑01 | Engineering governance | Observability layer lacks a first‑class taxonomy slot | Vocabulary drift; unclassified surfaces |
| F‑02 | Engineering / QA | Two acceptance suites unrunnable from a clean checkout | Reduced test signal (Lab still covers) |
| F‑03 | Treasurer / oversight | No pre‑execution approval on money movements | Control gap on large/edge operations |
| F‑04 | Treasurer / oversight | No guard against breaching a treasury floor | Risk of an operation driving a fund negative unexpectedly |
| F‑05 | Accounting fidelity | Declared allocation order is not executed | Runtime ≠ declared model (documented, inert) |
| F‑06 | Deficit creditors | No way to settle historical‑deficit creditors | Settlement done outside the system |
| F‑07 | Members / treasury | No first‑class refund (cancellation covers today) | Refund modeled as cancellation |
| F‑08 | Constitutional assurance | FOC‑012/013 remain excluded | Coverage stays 23/25 |
| F‑09 | Cash operations | No cash‑location tracking / reconciliation | Manual reconciliation |
| F‑10 | Diwan operations | Reservations calendar lacks a governance standing | Ambiguous ownership of a live surface |

## 9 · Risk Matrix

| Feature | Top risk | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| F‑01 | Taxonomy inconsistency | Low | Low | Additive rule; review against v1.5 |
| F‑02 | Fixture mismatches real assertions | Low | Low | Regenerate from Lab seed; verify vs Lab |
| F‑03 | Approval bypass / partial state | Med | High | Route via a certified BO; atomicity (Law 7) |
| F‑04 | Over‑blocking legitimate ops | Med | Med | Read‑rule + explicit override policy (owner) |
| F‑05 | Runtime allocation regressions | Med | **High** | Full Lab re‑certification; staged; feature‑flag |
| F‑06 | Settling more than the deficit | Med | High | Law 9 bound enforced; policy‑capped |
| F‑07 | Double reversal / value leak | Med | High | Linked‑origin reversal; Law 1 conservation |
| F‑08 | False certification | Low | High | Evidence‑only, real Lab runs |
| F‑09 | New foundation destabilizes Core | Med | High | Isolated model; defer until designed |
| F‑10 | — | Low | Low | Ruling only |

## 10 · Technical Debt Register

| ID | Debt | Sev | Disposition |
|---|---|---|---|
| **TD‑1** | `tests/roundtrip-seed.json` uncommitted → `e2e-acceptance` + `q5-evidence` unrunnable | LOW | **F‑02 · V1.1** |
| **TD‑2** | Two acceptance suites overlap the Lab's coverage without sharing its seed | LOW | Fold into F‑02 (migrate onto Lab seed) |
| **TD‑3** | `api/_phase15-*.js` legacy engine files alongside active ones (see `api/DEPRECATED.md`) | LOW | Housekeeping; V1.1 optional cleanup (no runtime effect) |

*No HIGH technical debt is open against the V1 baseline.*

## 11 · Deferred Features Register

| Feature | Deferred because | Un‑defer trigger |
|---|---|---|
| F‑06 BO‑06 | No settlement policy (constitutional deferral) | Owner settlement policy + F‑05 |
| F‑07 Refund | Reserved; cancellation covers current need | Owner refund policy + F‑05 |
| F‑09 Cash Management | Requires a cash‑location model not in the current design | Approved cash‑location foundation (R‑C1) |

## 12 · Research Candidates Register

| ID | Question | Output feeds |
|---|---|---|
| **R‑C1** | Cash‑location data model & reconciliation approach | F‑09 |
| **R‑C2** | MODEL2 activation impact study (which read/write paths change; migration cost) | F‑05 |
| **R‑C3** | Refund vs cancellation semantics — does the domain need a distinct refund? | F‑07 |

## 13 · Rejected Features Register

**Empty.** No candidate has been formally rejected by the owner. Rejection criteria (for future
use): permanently contradicts a frozen Law; duplicates an existing certified capability with no
added value; or is explicitly declined by owner decision. Any rejection is recorded here with its
reason and date.

## 14 · Future ADR Candidates

| ADR | Decision to record | Tied to |
|---|---|---|
| **ADR‑001** | Pre‑execution approval model (authority, thresholds, state machine) | F‑03 |
| **ADR‑002** | Liquidity floor definition & override policy | F‑04 |
| **ADR‑003** | MODEL2 activation strategy (flagged, staged, reversible) | F‑05 |
| **ADR‑004** | Historical‑deficit settlement policy | F‑06 |
| **ADR‑005** | Refund semantics & linkage | F‑07 |
| **ADR‑006** | Cash‑location foundation | F‑09 |

## 15 · Engineering Capacity Estimate (relative — no fabricated velocity)

No empirical team‑velocity data exists, so capacity is expressed as **relative effort classes**,
not hours/sprints (fabricating absolute numbers is forbidden). Classes: **S** (single focused
phase) · **M** (a few phases) · **L** (multi‑phase with review) · **XL** (multi‑phase + new
foundation/constitutional work).

| Release | Aggregate size | Composition |
|---|---|---|
| V1.1 | **S** | F‑01 (S) + F‑02 (S) |
| V1.2 | **L** | F‑03 (L) + F‑04 (M), paired |
| V2.0 | **XL** | F‑05 (XL) → F‑06 (L) + F‑07 (M) + F‑08 (S) |
| Deferred | **XL** | F‑09 (XL) after R‑C1 |

Sequencing, not staffing, governs throughput: the pipeline runs one phase at a time to PASS.

## 16 · Release Planning (execution order)

1. **V1.1** — F‑01, then F‑02 (autonomous; no owner gate).
2. **V1.2** — F‑03 + F‑04 as one paired control capability (enter only after ADR‑001/002 +
   owner business‑policy + Constitutional Review).
3. **V2.0** — F‑05 first (after ADR‑003 + Constitutional amendment), then F‑06/F‑07, then F‑08
   re‑certification.
4. **Deferred** — F‑09 after R‑C1 research and an approved foundation.
5. **Ruling** — F‑10 handled as a governance ruling whenever the owner opens it.

Each phase still runs the full GOV‑013 loop (A→B→C→PASS) and appends a GOV‑PROG‑BR‑01 baseline entry.

## 17 · Migration Strategy

- **V1.1:** no data migration (governance + test fixture only).
- **V1.2:** additive schema for approval state; **backward‑compatible**, no rewrite of existing
  vouchers; feature‑flagged rollout; backup before enabling (per V1 checklists).
- **V2.0 (MODEL2 activation):** the highest‑risk migration. Mandatory: a Research study (R‑C2),
  a **reversible feature flag**, a full Lab re‑certification (including FOC‑012/013), a staged
  rollout, and a pre‑migration Supabase snapshot. Runtime allocation must not change silently —
  before/after reconciliation on real data is required.
- **Deferred (Cash Management):** new tables only; no change to existing financial rows; isolated
  until reconciled.
- **Universal rule:** every migration preserves value (Law 1), history (Law 5), and closed‑period
  immutability (Law 11); each is preceded by a backup and is reversible (V1 Restore Checklist).

---

## 18 · Post‑freeze execution rule

On freeze, the GOV‑013 pipeline executes this roadmap **in order (§16) without a per‑phase owner
decision** for ordinary phases (V1.1 first). Owner intervention remains **mandatory** only for:
1. **Constitutional amendments** (e.g., F‑05 MODEL2 activation, and any Law change).
2. **Business‑policy changes** (e.g., F‑03 approval authority, F‑06 settlement policy, F‑07 refund policy).
3. **Emergency overrides.**
4. **New strategic initiatives outside this roadmap.**

A distinction the pipeline must honor: **drafting** an artifact is autonomous, but **freezing a
governance‑rule amendment is an owner act**. Thus F‑01 (GOV‑WS‑01 → v1.6) is drafted autonomously
yet **ratified by the owner via merge** — as GOV‑WS‑01 v1.5 and GOV‑WS‑02 were — and is not a
silent auto‑amendment of a frozen rule. Accordingly, **V1.1 runs autonomously up to the PR, with
F‑01's governance amendment owner‑ratified at merge and F‑02 fully autonomous**; **V1.2/V2.0/
Deferred carry explicit owner gates** recorded in §3 and §14, consistent with GOV‑013 §9. This roadmap is the permanent execution reference for
the post‑V1 lifecycle; it is amended only by appending a dated revision (never by rewriting history).

---

*Governance record for owner review, approval & freeze. Implements no feature; changes no
production code; modifies no frozen artifact. Upon freeze it governs all post‑V1 engineering.*
