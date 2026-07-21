<!-- ═══════════════════════════════════════════════════════════════════════════
     P-DUES-000 — Annual Subscriptions / Dues Module Specification (SPEC ONLY)
     Specification phase only. No code, no UI, no new Business Operation, no new
     Read Model, and no Accounting Constitution / Accounting Core / Certified
     Business Operations / Runtime Guard change is made by this document. It
     specifies an Operational Business Module that ORCHESTRATES the already-
     certified surface (BO-10 + BO-07) under GOV-WS-01 v1.5.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P-DUES-000 · Annual Subscriptions / Dues — Operational Business Module Specification

**Document ID:** GOV‑PDUES‑SPEC‑01
**Phase:** P‑DUES · Task P‑DUES‑000 (module specification)
**Status:** DRAFT — for owner review, Architectural Review, approval & freeze (no implementation until then)
**Date:** 2026‑07‑21
**Baseline:** `main` @ `95dd5bb`
**Governs under:** **GOV‑WS‑01 v1.5** (Component Taxonomy + Rules 1–6).
**Predecessors (all frozen):** P0 · P1 · P2 · P3 · P4 · P5‑OBS · P6‑000 · GOV‑WS‑01 v1.5.

> **Classification (GOV‑WS‑01 v1.5 §2.5, §8).** This is an **Operational Business
> Module**. It owns the annual‑dues workflow and **executes exclusively through the
> already‑certified Business Operations BO‑10 and BO‑07** — it introduces **no new
> Business Operation, no new Read Model, and no accounting logic**. Per the v1.5
> Governance Decision Matrix (§7), a new Operational Business Module on an existing
> pattern with **no new BO and no new dependency edge requires no ADR, no
> Constitutional Review, and no Business‑Contract amendment** — only Architectural
> Review + Governance Review. The Architectural Discovery step (v1.5 §8.1) is recorded
> in §11 below.

---

## 1 · Objective

Provide an operational workspace for the **annual dues lifecycle**: apply the yearly
subscription obligation to eligible members and see, per year, who has been billed and
what remains outstanding — **orchestrating certified Business Operations only, with no
new accounting**. It makes the annual‑billing task first‑class (today it is a single
action on a list page), the way P3 made receipts and P4 made payments first‑class.

## 2 · Architectural Position (GOV‑WS‑01 v1.5)

```
Annual Dues Workspace        → orchestrates the annual-billing task (presentation)
        ▼ executes via
Certified Business Operations → BO-10 Apply Annual Dues · BO-07 Create Member (the only write path)
        ▼
Certified Accounting Core     → the sole executor (derived balance enforced at the single source)
        ▼ reads via
Certified Read Models         → subscriptionYears · memberDelinquency · annualDebtRows · DB.annual
```

An Operational Business Module (v1.5 §2.5): it reads only certified Read Models, writes
only through certified BOs, holds no accounting logic and no second source of truth,
and owns no Domain Entity beyond what the certified operations own.

## 3 · Business Scope (what this module OWNS — GOV‑WS‑01 Rule 5)

- A dedicated **Annual Dues Workspace** composed under GOV‑WS‑01 v1.5.
- **State — the current dues picture:** which years have been billed; the per‑year total
  obligation and eligible‑member count; the outstanding balance per year and in total
  (from the certified read model).
- **History — the schedule evolution:** the subscription‑year history — which years were
  applied, when, at what amount, and by whom.
- **Capability — the annual‑billing operations (legitimacy‑gated, admin):**
  - **Apply annual dues for a year → BO‑10** (obligation generation only — never a
    payment), via the certified caller `window.applyAnnualDue` (builds the eligible‑member
    rows and routes to `BusinessOps.applyAnnualDues`).
  - **Onboard a member into the schedule → BO‑07** (`createMember` + subscription schedule),
    where a member must be created into the dues schedule.

## 4 · Out‑of‑Scope (what this module explicitly DOES NOT OWN — GOV‑WS‑01 Rule 5)

- **Payments / collection of dues** — owned by **P3** (a dues payment is a receipt).
- **Member lifecycle** (edit/deactivate, statements) — owned by **P2**.
- **Disbursements** — owned by **P4**.
- **Per‑year payment→obligation allocation (GAP‑1, inflow side)** — deferred; no certified
  operation allocates a payment across specific dues years. Displayed as outstanding only.
- **Reversal of a year's dues (G‑A1)** — no certified "un‑apply a year" operation exists;
  corrections stay at the certified voucher/member level, not a bulk reversal here.
- **Approval workflow (GAP‑P1)**, **liquidity guard (GAP‑P2)**, **BO‑06** — all out of scope.
- **No new Business Operation, no new Read Model, no accounting logic, no second source of
  operational truth, no Constitution/Core/Runtime‑Guard change.**

## 5 · Primary Business Question (GOV‑WS‑01 Rule 2)

> *"For which year must dues be applied, and what dues operation may I legitimately
> perform next?"*

Supporting questions (Rule 3): **State** — which years are billed and what is outstanding?
**History** — how did the dues schedule evolve? **Capability** — may I apply this year's
dues (and to whom), and may I onboard a member into the schedule?

## 6 · State / History / Capability (GOV‑WS‑01 Rule 3)

| Layer | Responsibility | Certified source |
|---|---|---|
| **State** | Years billed; per‑year total obligation & eligible‑member count; outstanding per year & total | `FIN.subscriptionYears()` · `DB.annual` (year · amount · member_count · applied_by · applied_at) · `annualDebtRows()` (opening/dues/paid/current) · `FIN.memberDelinquency()` |
| **History** | The subscription‑year schedule: which years applied, when, by whom | `DB.annual` (applied_at / applied_by) · `FIN.subscriptionYears()` |
| **Capability** | Apply annual dues (BO‑10); onboard member into schedule (BO‑07) | `window.applyAnnualDue` → `BusinessOps.applyAnnualDues` (BO‑10) · certified member‑create flow → `BusinessOps.createMember` (BO‑07) |

State and History are read‑only projections and carry **no** execution controls
(execution lives only in the Capability section).

## 7 · Intent → Authorization → Execution → Result (GOV‑WS‑01 Rule 4 — Operational Workspace)

1. **Intent** — the admin chooses "apply dues for year Y" (or "onboard member M"). Presentation only.
2. **Authorization** — the workspace decides *whether* it is legitimate: `can.admin()`; the
   year is not already billed (duplicate‑year guard); there are eligible members. A gate — never a mutation.
3. **Execution** — **exclusively** via the certified flow: `window.applyAnnualDue` →
   `BusinessOps.applyAnnualDues` (**BO‑10**, obligation‑only — the contract rejects any
   non‑zero paid amount); or the certified member‑create flow → `BusinessOps.createMember`
   (**BO‑07**). The workspace calls no BO of its own and mutates no state.
4. **Result** — read back **exclusively** from the certified read models (the year appears
   in `DB.annual`; outstanding updates via `annualDebtRows`/`memberDelinquency`). No cached
   or independently‑computed outcome.

## 8 · Business Operations used (all certified — none new)

- **BO‑10 · Apply Annual Dues** (`applyAnnualDues`) — obligation generation only; records
  no payment; builds each eligible member's subscription row; the derived balance is
  enforced at the single certified source.
- **BO‑07 · Create Member (+ subscription schedule)** (`createMember`) — atomic member +
  schedule creation, where onboarding into a dues year is required.

No new Business Operation is created; the reserved **BO‑06** is **not** involved.

## 9 · Certified Read Models required (all frozen — none new)

- `FIN.subscriptionYears()` — the set of billed years.
- `DB.annual` — per‑year dues record (year · amount · member_count · applied_by · applied_at).
- `annualDebtRows()` — per‑member per‑year outstanding (opening · dues · paid · current).
- `FIN.memberDelinquency()` — per‑member per‑year remaining / settled status.

No Read Model is created, modified, or redesigned.

## 10 · Gap Analysis (documented, not implemented)

| # | Gap | Impact | Disposition |
|---|---|---|---|
| GAP‑1 | No certified payment→specific‑year allocation (inflow side) | Outstanding is shown per year, but a payment is not split across chosen dues years | Out of scope → future gated BO decision |
| G‑A1 | No certified "reverse / un‑apply a year's dues" operation | A wrongly‑applied year cannot be bulk‑reversed here | Out of scope → corrections stay at the certified voucher/member level |
| — | (Inherited) GAP‑P1, GAP‑P2, BO‑06 | Not applicable to obligation billing | Remain separate gated decisions |

No accounting gap blocks an orchestration‑only annual‑dues module.

## 11 · Dependencies & Architectural Discovery (GOV‑WS‑01 v1.5 §8.1)

- **Architectural Discovery (done).** The certified surface already exists: **BO‑10** and
  **BO‑07** are certified (P1); the annual read models (`subscriptionYears`,
  `memberDelinquency`, `annualDebtRows`, `DB.annual`) exist and are already consumed by the
  current annual page and the P5 reports; the certified caller `window.applyAnnualDue`
  already routes to BO‑10 with the obligation‑only contract. **Finding:** the module reuses
  the certified surface with **no new BO, no new Read Model, and no new dependency edge** —
  it is a presentation/orchestration layer over existing certified operations. This is why
  the classification is *Operational Business Module* and why no ADR / Constitutional
  Review / Contract amendment is triggered (v1.5 §6–§8).
- **Architectural:** GOV‑WS‑01 v1.5; the P2/P3/P4 workspace pattern (module file + page +
  nav + view‑registry entry + conformance test).
- **Frozen & untouched:** Constitution (P0), Business Contracts / P1‑000 Part A, FIN2,
  Runtime Guards, Business Operations, Read Models, Golden Baseline.

## 12 · GOV‑WS‑01 v1.5 conformance

| Rule / rule‑set | Held by |
|---|---|
| 1 · Layering | Workspace → certified BO (BO‑10/BO‑07) → Core → Read Models (§2) |
| 2 · One dominant Primary Business Question | the "which year / what may I do next" question in the hero (§5) |
| 3 · State / History / Capability | separate sections; State/History execution‑free (§6) |
| 4 · Intent → Authorization → Execution → Result | each capability routes to a certified BO; workspace decides *whether*, the BO decides *how* (§7) |
| 5 · Business Boundary | §3 (owns) / §4 (does not own) |
| 6 · One source of operational truth | State/History/hero figures are one projection of the certified annual read models |
| §2.5 Component type | Operational Business Module — no accounting logic, owns no state beyond the certified operations |
| §7 Decision Matrix | New module, existing pattern, no new BO/edge → **Architectural Review + Governance Review** only |

## 13 · Acceptance Criteria (for the eventual implementation phase)

1. One dominant Primary Business Question (Rule 2); other sections are supporting context.
2. **State / History / Capability separated** (Rule 3); State/History carry no execution controls.
3. **Every action routes only through BO‑10 / BO‑07** (Rule 4); the workspace executes no BO
   itself and holds no accounting logic (assert: no `BusinessOps.` call authored in the
   workspace beyond the certified wrappers; rendering mutates no store).
4. **BO‑10 obligation‑only** is honoured — the module never records a payment (that is P3);
   the duplicate‑year and admin gates decide legitimacy only.
5. Every displayed value originates from a certified Read Model (Rule 6); one source of truth.
6. Business Boundary (Rule 5) stated in the workspace: owns annual billing; does not own
   payments / lifecycle / disbursements / allocation.
7. **Golden constitutional baseline 12/12 unchanged**; P0–P5 guarantees valid; E2E green.
8. A dedicated conformance test proves 1–7.

## 14 · Implementation Roadmap (proposed future slices — none built under P‑DUES‑000)

> Each slice is a separate OWNER ENGINEERING ORDER; nothing is implemented here.

- **P‑DUES‑S1 · Read‑only State + History.** The dues picture (years billed, per‑year
  obligation & eligible count, outstanding) and the schedule history — visibility before capability.
- **P‑DUES‑S2 · Capability.** Apply annual dues (BO‑10) + onboard into schedule (BO‑07),
  legitimacy‑gated (admin, duplicate‑year guard) — orchestration only.

**Completion boundary:** the module is complete when State + History + the BO‑10/BO‑07
capability are delivered, orchestration‑only, GOV‑WS‑01 v1.5 respected, and the Golden
Baseline unchanged. GAP‑1 (payment allocation) and G‑A1 (year reversal) remain explicitly
outside; reaching the boundary closes P‑DUES, and anything beyond is a new decision.

---

*Specification only — no implementation begins until P‑DUES‑000 is reviewed (Architectural
Review), approved, and frozen, and a separate slice order is issued.*
