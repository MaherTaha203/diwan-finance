# Constitutional Decision Session — Decision Register

Tracks the owner's rulings on the V2.0‑DIS Open Decisions (OD‑01…OD‑07) under the Constitutional
Decision Session Protocol. One decision at a time; each **FROZEN** on owner approval + Agent B PASS +
Agent C integration. Frozen decisions reopen only by explicit owner constitutional amendment.

| OD | Title | Status | Ruling (summary) | Artifacts |
|---|---|---|---|---|
| **OD‑01** | MODEL2 allocation activation & order | **FROZEN (2026‑07‑23)** | **Policy C** — activate MODEL2; explicit **stored** allocation; order **Current‑Year → Historical Debt → Future‑Year → Credit**; **forward‑only** (no historical reallocation); **non‑configurable** | ADR‑003 · CA‑001 |
| **OD‑02** | Credit consumption order & trigger | **FROZEN (2026‑07‑23)** | **Policy A** — credit consumed **automatically, only at creation of a new obligation**, in the CA‑001 order; remainder stays credit; every consumption a permanent payment‑grade allocation record; no manual step | CA‑002 |
| **OD‑03** | Intra‑step tie‑break, ordering & current‑year definition | **FROZEN (2026‑07‑23)** | **Policy A** — Future‑Year = earliest‑year‑first; deterministic same‑year tie‑break by creation timestamp → immutable unique id (never DB order); historical forward‑only (OD‑01); "Current‑Year" = org's designated operating year, independent of period‑lock | CA‑003 |
| **OD‑04** | BO‑06 historical‑deficit settlement policy | **FROZEN (2026‑07‑23)** | **Policy A** — deficit is an aggregate opening obligation (no per‑creditor reconstruction); settlement funded from the Historical Deficit Treasury; reduces the deficit, never a surplus (Law 9); system records the financial effect (recipient docs external) | ADR‑004 · CA‑004 |
| **OD‑05** | Refund policy | **FROZEN (2026‑07‑23)** | Eligibility: reversible receipts, no irreversible consequences · full/partial · funded from **Origin Treasury** · **prohibited after period close** (corrections go forward in an open period) · **Refund is first‑class, NOT a cancellation** (new rule) | ADR‑005 · CA‑005 |
| **OD‑06** | Credit lifecycle · running balance · credit ownership | **FROZEN (2026‑07‑23)** | Continuous lifetime running balance (never reset by year); credit = future purchasing power, **never expires**, member‑only (non‑transferable/shareable/mergeable); annual subscription increases running balance, prior credit offsets; **cross‑program credit Not Applicable** (single Food‑Fund program; reserved for future) | CA‑006 |
| OD‑07 | Edge‑case ratifications | **OPEN** (auto‑resolves once OD‑04/05/06 set) | — | (pending) |

**Readiness gate:** the MODEL2 Constitutional Readiness Certificate and MODEL2 Engineering Readiness
Certificate issue only after **all** OD‑01…OD‑07 are FROZEN and Agent B's global constitutional review
passes. **6 of 7 frozen** (OD‑01…OD‑06). Remaining: OD‑07 (edge‑case ratifications + member departure/death write‑off).
