# ADR‑GOV‑01 · Adopt the Architecture Decision Record process

> **Feature:** STR‑001 F‑01 (Governance v1.6) · **Phase:** V1.1 · **Date:** 2026‑07‑22
> Schema: P‑AIENG‑S2 **RS‑ADR** (id · context · decision · alternatives · consequences · status).

**ID:** ADR‑GOV‑01
**Status:** **Accepted** (self‑bootstrapping; owner‑ratified at merge)
**Authored under:** GOV‑013 Autonomous Engineering Pipeline · owner‑ratified (governance‑rule change)

---

## Context
The STR‑001 roadmap (F‑01, from P6‑000 C6) calls for "Governance v1.6 — codify the Observability
Layer as a first‑class GOV‑WS‑01 artifact + an ADR‑process note." Agent A verification during
V1.1 found that **most of this already exists**:
- **Observability Layer is already first‑class** — GOV‑WS‑01 v1.5 **§2.6** fully defines it
  (purpose, responsibilities, allowed/forbidden dependencies, lifecycle, review; Rule 4 N/A),
  with §5.2 boundary rules, §4 dependency rules, and the §3 layer diagram. **No re‑codification
  is warranted** (re‑stating it would be redundant).
- **The ADR trigger already exists** — GOV‑WS‑01 v1.5 **§6** establishes *when* an ADR is
  mandatory (and when it is not); it authors none.
- **The ADR format already exists** — P‑AIENG‑S2 **RS‑ADR** defines the ADR document schema
  (id · context · decision · alternatives · consequences · status), owned by R10.

What is genuinely missing is a single act that **adopts** the process and gives ADRs a home: no
ADR register exists, and no ADR has been recorded. P6‑000 named exactly this gap — "ADR‑GOV‑01
(adopt the ADR process itself) — self‑bootstrapping."

## Decision
1. **Adopt the ADR process** as the platform's standing mechanism for architecture decisions,
   composed of its already‑ratified parts: **v1.5 §6** (when) + **RS‑ADR** (format/authorship).
   No new rule is invented; this record consolidates and activates them.
2. **Establish the ADR register** at `docs/governance/adr/` (`README.md` is the index). Every
   ADR is `ADR‑<scope>‑NN`, uses the RS‑ADR schema, and is owner‑ratified at merge.
3. **Record — do not duplicate — the Observability Layer's first‑class status:** it remains
   defined solely by GOV‑WS‑01 v1.5 §2.6. F‑01 therefore introduces **no taxonomy change**.
4. **Do not raise a GOV‑WS‑01 v1.6 document:** since §2.6 and §6 already carry the substance,
   a version bump would be ceremony without content. This ADR is the F‑01 deliverable.

## Alternatives considered
- **Write a full GOV‑WS‑01 v1.6 re‑codifying the Observability Layer.** Rejected — it would
  duplicate v1.5 §2.6 verbatim (redundant work; risks divergence between two copies of one rule).
- **Define a brand‑new ADR format.** Rejected — RS‑ADR already exists; inventing a second schema
  fragments the standard.
- **Do nothing.** Rejected — the process is referenced (GOV‑013, STR‑001 §14) but never formally
  adopted, and ADRs have no home.

## Consequences
- **Positive:** the ADR process is now active with a register; STR‑001's Future ADR Candidates
  (ADR‑001…006) have a defined home and schema; no redundant governance text is created.
- **Neutral:** GOV‑WS‑01 stays at v1.5 (no version bump); the "v1.6" label from the roadmap is
  satisfied by this ADR, not by a new spec document.
- **Follow‑ups:** future architecture decisions (e.g., STR‑001 F‑03/F‑04/F‑05 ADRs) are recorded
  here as `ADR‑001+` when those phases begin.
- **No runtime, no code, no frozen‑artifact change.**

## Scope clarification recorded for the roadmap
F‑01 is **complete** with this ADR. The Observability‑Layer codification sub‑item was already
satisfied by GOV‑WS‑01 v1.5 §2.6 (discovered during V1.1); F‑01's real, non‑redundant deliverable
is the adoption of the ADR process recorded here.
