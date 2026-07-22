<!-- ═══════════════════════════════════════════════════════════════════════════
     P-AIENG-W1-LESSONS-001 — Operational Lessons Learned (KNOWLEDGE RECORD).
     This is NOT a governance document, NOT an execution document, and NOT a
     policy. It introduces NO requirements and modifies NO frozen artifact. It is
     descriptive only: it preserves operational knowledge gained during the first
     successful Wave 1 read-only pilot. It creates no rule and no governance.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P-AIENG-W1-LESSONS-001 · Operational Lessons Learned

**Document ID:** KR‑AIENG‑W1‑LESSONS‑01
**Classification:** **Knowledge Record** (institutional knowledge — not governance, not execution, not policy)
**Status:** Descriptive record
**Date:** 2026‑07‑22
**Context baseline:** `main` @ `cb2ed75` (Wave 1 Pilot completed · baseline frozen)
**Subject:** the first successful Wave 1 read‑only pilot under P‑AIENG‑W1‑PILOT‑001.

> **What this document is.** A descriptive record of what was learned during the first
> Wave 1 pilot, kept as institutional knowledge. **It sets no requirement, defines no rule,
> and changes no frozen artifact.** Where it says "recommend", it means *advice for future
> humans to consider*, never an obligation. The authoritative rules remain in GOV‑WS‑01 v1.5,
> GOV‑WS‑02, and the frozen P‑AIENG artifacts; nothing here overrides or extends them.

---

## 1 · Objectives of the pilot

The pilot set out to validate — under real execution, not assertion — that the **Wave 1
read‑only engineering activation** works exactly as specified: instantiate a single certified
engineering role, have it perform a genuine advisory review of an already‑frozen module,
produce evidence, and prove it changed nothing. In one sentence: *prove the activation
framework can advise without acting.*

## 2 · What the pilot demonstrated

- A certified role (R02 Architecture) was instantiated **read‑only** and produced a complete,
  evidence‑backed advisory review of the frozen P‑DUES module in a single ~3‑minute pass.
- The review reached a substantive conclusion (PASS with three informational watch‑items)
  citing exact `file:line` evidence — i.e. the output was *useful*, not merely safe.
- The pilot ended with **zero repository delta**: clean tree, unchanged HEAD, no branch,
  commit, PR, merge, or reviewer‑created file; **Golden Baseline 12/12 identical** before and
  after. Advise‑without‑acting held in practice.

## 3 · Why the governance model succeeded

The safety did not come from trusting the agent; it came from **construction**. The read‑only
role had no capability to write, commit, or execute — so the prohibited outcomes were not
merely forbidden, they were *impossible for it to perform*. The layered chain (Specification →
Execution Order → Execution Authorization → Execution → Completion Report → Freeze) meant every
transition was an explicit, recorded human decision, and the Chief Architect held sole binding
authority throughout. Correctness was judged on evidence (git state, Golden result, the report
itself), not on the agent's own claims.

## 4 · Effectiveness of Operational Separation (GOV‑WS‑02)

Very high. Splitting design (the Execution Order), authorization (the *AUTHORIZED FOR
EXECUTION* decision), and evidence (the Completion Report) into independent artifacts removed
the single most dangerous ambiguity: *does approval of a plan mean permission to run it?* With
separation, the answer is structurally "no". The refinement that made *AUTHORIZED FOR
EXECUTION* its **own** artifact/decision closed the last gap where an authorization could be
read into some other document. The observed lifecycle — spec, order, authorization, execution,
report, freeze — behaved exactly as the principle intends.

## 5 · Effectiveness of Human Supervision

The pilot ran under continuous human supervision with the Chief Architect as sole binding
authority. In practice this meant the human decided *when* execution began (a separate
decision), the envelope it ran inside (the frozen order), and *whether it was accepted*
(ratifying the Completion Report). The agent made no binding decision; its output was a
non‑binding recommendation. Supervision was not a bottleneck — the pass was short and its
scope was pre‑bounded — yet it retained full control at every step.

## 6 · Effectiveness of the Kill‑Switch model

The kill‑switch was defined as *any human, any instant, overrides everything → terminate +
rollback‑verify*. It was **not exercised** in this pilot (no anomaly arose), but its design was
validated indirectly: because the run was read‑only and short, an immediate termination would
have had nothing to unwind, and the rollback‑verification checklist would have confirmed the
null result. The lesson: for read‑only work the kill‑switch is a low‑cost, always‑available
guarantee; its real value will be tested in later, higher‑authority waves.

## 7 · Evidence‑integrity observations

- Capturing **pre‑ and post‑state** symmetrically (git status, HEAD, Golden result, plus
  duration) made "zero delta" a *demonstrated fact*, not a claim.
- Running the read‑only Golden verification as **orchestrator evidence collection** (not as the
  reviewer role) kept the reviewer strictly non‑executing while still producing the before/after
  proof the Completion Report required.
- The rollback‑verification checklist worked well as the single gate that turns raw evidence
  into an accepted outcome; its final item ("R00 records the outcome") correctly kept the loop
  open until the human ratified.

## 8 · Operational observations

- A **known‑good, already‑frozen target** (P‑DUES) was an excellent first pilot choice: it
  carried no operational risk and gave a clean reference for judging the framework itself
  rather than the module.
- "**Limited first**" (one role, not four) kept the pilot legible and the evidence small.
- The whole cycle — authorization to two ratified reports — completed quickly; the governance
  ceremony did not make a small, safe task heavy.

## 9 · Engineering observations

- Enforcing read‑only **by tool capability** (a reviewer with no write/commit tools) is far
  stronger than enforcing it by instruction alone; prefer capability‑level guarantees.
- Passing the reviewer a **bounded bundle** (the target module + named frozen references)
  focused the review and avoided scope drift.
- Delivering the two reports **in‑band to the human** rather than committing them to the repo
  preserved the "zero repository delta" property — the deliverables of a read‑only pilot need
  not themselves mutate the repository.

## 10 · Advisory observations

The advisory came back **PASS**, confirming the frozen P‑DUES module conforms to GOV‑WS‑01 and
GOV‑WS‑02: presentation‑only, reads certified read models, delegates to certified Business
Operations (BO‑10, BO‑07) via certified callers, holds no second source of truth, and separates
State / History / Capability with an authorization gate before execution. That a fully‑frozen,
already‑gated module still produced three *informational* watch‑items shows the review adds
value even on known‑good code — a useful signal for later waves.

## 11 · The three informational watch‑items

Recorded here as engineering notes only — **no corrective action is required or recommended as
mandatory**:

1. **Implicit shared‑DOM coupling in the apply path.** `dues-workspace.js` delegates by writing
   `#due-year` / `#due-amount` and calling `window.applyAnnualDue()`, which reads those same DOM
   nodes. Conformant (the certified caller re‑validates), but the contract passes via global DOM
   rather than explicit arguments — a robustness note, not a governance breach.
2. **Display‑only fallbacks in `yearState`.** When the `DB.annual` record lacks
   `amount` / `member_count`, headline figures fall back to `rows[0].due` / `rows.length` —
   presentation fallbacks over the certified surface, worth watching so they never diverge from
   the certified Annual‑Debt projection.
3. **`setApplyAmount` does not re‑render.** Intentional and benign; noted only for symmetry with
   `setApplyYear`.

## 12 · Recommendations for future pilot executions

*(Advice for humans to consider — not requirements.)*
- Keep the **pre/post symmetric evidence + rollback checklist** pattern; it is what makes
  "no side effect" provable.
- Keep **capability‑level read‑only enforcement** and a **bounded review bundle**.
- Keep **deliverables in‑band** for read‑only pilots to preserve zero delta.
- Continue **"limited first"** — add roles or scope only one increment at a time, each under its
  own authorization.
- Continue issuing the **Execution Authorization as its own decision**, distinct from the order.

## 13 · Recommendations for Wave 2 preparation

*(Documenting lessons only — this record opens no Wave 2 and authorizes nothing.)*
- Wave 2 introduces **assisted execution** (R03 preparing proposals) where, unlike Wave 1, there
  *is* prospective state to manage; the kill‑switch and rollback design will need to be
  exercised against real (un‑applied) proposals, not just a null result.
- The "advise‑only, human‑approves‑execution" boundary that Wave 1 validated should be the
  explicit hinge of Wave 2: proposals must remain non‑binding until a human authorizes
  application.
- Evidence expectations grow: Wave 2 reports should capture the *proposal + review + the
  human‑approved execution record*, mirroring Wave 1's rigor at higher authority.
- Any Wave 2 activation must follow the same six‑stage lifecycle and remain gated behind an
  explicit, separate authorization — Wave 1 showed the ceremony is affordable.

## 14 · Lessons that should remain institutional knowledge

- **Design ≠ authorization ≠ execution ≠ evidence.** Keep them as separate artifacts; never let
  one imply another. (This is the durable lesson behind GOV‑WS‑02 and the six‑stage lifecycle.)
- **Safety by construction beats safety by instruction.** Give a role only the power it needs.
- **Prove the null result.** For read‑only work, symmetric before/after evidence + a rollback
  checklist turn "we changed nothing" into a demonstrated fact.
- **The human authority is the permanent safety stop.** No change reaches `main` without the
  Chief Architect — that is what makes the whole program reversible.
- **A short, bounded, known‑good first pilot builds confidence cheaply** before any
  higher‑risk activation.

---

*Knowledge record — descriptive only. Preserves operational knowledge from the first successful
Wave 1 read‑only pilot. It creates no rule, no governance, and no policy, and modifies no frozen
artifact. The authoritative rules remain in GOV‑WS‑01 v1.5, GOV‑WS‑02, and the frozen P‑AIENG
artifacts.*
