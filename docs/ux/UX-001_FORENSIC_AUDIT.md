# UX-001 — Complete UX Architecture Forensic Audit

> **Type:** read-only forensic UX review. **No** production code, markup, CSS, or
> behavior was modified. Findings are evidence-based (static analysis + measured
> contrast + a live-rendered login page). This audit **evaluates the app against the
> design systems it already declares** — it does not invent a new one.
>
> **Anchoring documents (existing, authoritative):** `docs/design/DDL-01_DESIGN_PHILOSOPHY.md`
> (the six product laws), `docs/navigation/DIWAN_NAVIGATION_DESIGN_SYSTEM.md` (frozen
> nav architecture), `docs/governance/BUSINESS_WORKSPACE_DESIGN_RULES.md`
> (State/History/Capability), `docs/reporting/OUTPUT_FORENSIC_AUDIT.md`.

## Measurement boundary (read first)

The app is **auth-gated** (Supabase). The **login/Auth page was rendered live** in
Chromium and measured. Authenticated pages cannot be populated without production
credentials, so their findings derive from **static analysis of the markup/CSS that
generates them + conformance to the declared design systems**, not live inspection of
populated screens. Contrast is **computed from the CSS tokens** (exact, deterministic).
This boundary is stated wherever it applies; nothing here is estimated.

**Evidence base:** commit `4dbb761`, Chromium 141, 2026-07-27.

---

## Executive summary

Diwan Finance has an **unusually mature design foundation** for its size: a written
design philosophy (DDL-01) with six enforceable product laws, a frozen navigation
system with explicit RTL rules, workspace governance rules, and a unified report
engine (REPORT-001). The **RTL-first, Arabic-first foundation is correct at the root**
(`<html lang="ar" dir="rtl">`, measured), and the component vocabulary is largely
consolidated (`btn` used 137×; one dominant `card`).

The audit finds **two systemic accessibility gaps** that recur across pages and are the
priority of this phase, both traceable to the app's own **Law 4 "Keyboard-first"** and
standard WCAG AA:

1. **50 of 51 clickable `<span>`/`<div>` elements are not keyboard-operable** (no
   `role`+`tabindex`) — keyboard and screen-reader users cannot activate them.
2. **Muted caption text (`--tx3`/`--faint`) fails WCAG AA in the light themes**
   (2.9–3.3:1 vs 4.5 required), measured from the tokens.

Neither is a correctness or data issue; both are addressable in CSS/markup without
touching logic. There are **no S1 (blocking) UX defects**. The remainder are minor
consistency and semantic-landmark items.

---

## Page inventory (23 authenticated containers + Auth)

Mapped from `id="pg-*"` and `nav()` targets:

| Group | Pages (`pg-*`) |
|---|---|
| Dashboard | `dash` |
| Treasury | `treasury-workspace` |
| Members | `members`, `member-workspace`, `member-stmt` |
| Receipts | `food-rec`, `diwan-rec` |
| Payments | `food-pay`, `diwan-pay` |
| Donations | `don` |
| Reports | `food-stmt`, `diwan-stmt`, `annual-debt`, `delinquent`, `annual`, `audit` |
| Workspaces (ops) | `collection-workspace`, `payment-workspace`, `dues-workspace` |
| Reservations | `reservations` |
| Users / Settings / Backup | `users`, `settings`, `bk` |
| Authentication | login shell (pre-auth) |

---

## Cross-cutting findings (apply to most pages)

### 1 · Navigation (frozen system — conforms)
The navigation follows the declared system (primary rail + context panel, collapsed-rail
tooltips, 4/8 spacing grid, RTL rules). `nav()` routing is centralized. **Strength.**
Depth is shallow (most surfaces are 1–2 clicks from the rail). No dead nav targets found
(every `nav('x')` maps to a `pg-x`).

### 2 · Information Architecture
Operational workspaces conform to the **State / History / Capability** separation and
the "one Primary Business Question" rule (governance docs + the treasury/dues/member
workspaces). Reports route through one unified engine (REPORT-001), giving cross-medium
consistency (screen == print == PDF == Excel). **Strength.** Density is controlled by
DDL Law 3 ("Clarity over density"); the main density risk is large tables (see the
SYS-001 finding: a 2,000-row statement = 32 K DOM nodes — a UX *and* performance
concern, cross-referenced).

### 3 · Forms
110 `<label>`, 33 `for=` associations, 69 `placeholder`, 12 inline input handlers. The
**login form is fully accessible** (measured: 3/3 visible inputs labeled). Across the
app, labels are present but the **label-for association ratio (33 `for=` vs 110 labels +
69 placeholders)** suggests some inputs rely on visual proximity or placeholder-as-label
rather than a programmatic association — a per-form verification item (S3-4).

### 4 · Visual consistency
- Button vocabulary is consolidated: `btn` 137× dominant; a residual `as-btn` (2×) from
  the account-statement styling. **Minor** dual vocabulary.
- **Two table vocabularies** coexist: print/report `.dt` (12×) and screen `.as-table`
  (3×). Intentional (paper vs screen) but worth documenting as one system (S3-3).
- One dominant `card` (48×); `modal` (17×) is the single dialog pattern. Consistent.

### 5 · Accessibility (measured)

**a) Keyboard-first (DDL Law 4) — S2-1.**
259 inline `onclick`; **201 on real `<button>`** (keyboard-OK). But **51 on
`<span>`/`<div>`, of which only 1 carries `role`+`tabindex`** → 50 interactive elements
(e.g. `.lnk-nm`/`.lnk-no` "open statement / open voucher" links) are **not tab-focusable
and not announced as controls**. Directly conflicts with the app's own Keyboard-first
law and WCAG 2.1.1 (Keyboard) / 4.1.2 (Name, Role, Value).

**b) Contrast — S2-2 (measured from tokens).**

| Theme | `tx` on bg | `tx2` on bg | `tx3` on bg | `tx3` on card |
|---|---:|---:|---:|---:|
| Dark (A) | 14.5 AAA | 7.7 AAA | 5.1 AA | 4.8 AA |
| Dark (B) | 15.0 AAA | 8.4 AAA | 5.1 AA | 4.7 AA |
| **Light (A)** | 12.8 AAA | 6.0 AA | **2.9 FAIL** | 3.0 (AA-large only) |
| **Light (B)** | 13.1 AAA | 5.7 AA | **2.9 FAIL** | 3.3 (AA-large only) |
| **Nile (light)** | 14.5 AAA | 5.6 AA | **3.3 (AA-large)** | 3.8 (AA-large only) |

Primary and secondary text pass everywhere. **Muted caption text (`--tx3`/`--faint`)
— used for card labels (`.card .k`), sub-headers (`.as-sub`), period lines, and hints —
fails WCAG AA for normal text in every light theme.** Dark themes pass (AA).

**c) Icon-only controls — S3-1.** 43 icon-only buttons; **8 lack an inline accessible
name** (`aria-label`/`title`) → unlabeled to screen readers.

**d) Heading landmarks — S3-2.** The login page renders **no `h1`/`h2`** (title is a
styled `div`). Screen-reader users get no heading structure to navigate. Likely
app-wide (titles are styled containers, not headings) — medium confidence beyond login.

**e) RTL — Strength.** Root is `lang="ar" dir="rtl"` (measured); the nav system defines
explicit RTL mirroring; 17 `dir=` usages handle mixed-direction (LTR numerics/tokens
inside RTL). No RTL breakage observed at the shell level.

**f) Focus — Strength.** 42 `:focus-visible` + 80 `:focus` rules → keyboard focus is
styled (once elements are made focusable per S2-1).

---

## Top strengths (evidence-based)

1. A **written, enforceable design philosophy** (DDL-01, six laws) — rare and valuable.
2. **Frozen navigation system** with explicit RTL rules; no dead nav targets.
3. **RTL/Arabic-first correct at the root** (measured `lang=ar dir=rtl`).
4. **Unified report engine** → screen/print/PDF/Excel visual parity (REPORT-001).
5. **Workspace governance** (State/History/Capability; one Primary Question) applied consistently.
6. **Consolidated component vocabulary** (one dominant button/card; single modal pattern).
7. **Focus is styled** (42 `:focus-visible`) — keyboard affordance exists.
8. **Accessible login form** (measured: all inputs labeled, icon button named).
9. **Primary/secondary text contrast passes AA/AAA** in all themes.
10. **Shallow navigation depth** — most tasks 1–2 clicks from the rail.

## Findings by severity

| ID | Sev | Finding | Evidence | Affected | Conf. |
|---|---|---|---|---|---|
| S2-1 | S2 | 50 clickable `span`/`div` not keyboard-operable / not exposed as controls | 51 clickable, 1 with role+tabindex (static) | app-wide (`.lnk-*`, clickable cells) | High |
| S2-2 | S2 | Muted text `--tx3`/`--faint` fails WCAG AA in light themes | 2.9–3.3:1 vs 4.5 (computed) | card labels, sub-lines, hints | High |
| S3-1 | S3 | 8 icon-only buttons without accessible name | 43 total, 35 named (static) | toolbars/action buttons | High |
| S3-2 | S3 | No `h1`/`h2` heading landmarks | login measured (h1=h2=0) | login (+ likely app-wide) | Med |
| S3-3 | S3 | Dual table vocabulary (`.dt` vs `.as-table`) | 12 vs 3 (static) | reports vs screen tables | High |
| S3-4 | S3 | Some inputs may rely on placeholder/proximity, not `for=`/`aria-label` | 33 `for=` vs 110 labels + 69 placeholders | per-form (verify) | Med |
| S3-5 | S3 | Residual `as-btn` vocabulary alongside `btn` | 137 vs 2 (static) | account-statement | High |

**No S1 findings.** Nothing blocks task completion or corrupts meaning.

## Quick wins (documentation only — NOT implemented here)

- Add `role="button" tabindex="0"` + `keydown` (Enter/Space) to the `.lnk-*` clickable
  elements, or convert them to `<button class="linklike">` (S2-1).
- Darken `--tx3`/`--faint` in the light themes to ≥ 4.5:1 (S2-2) — CSS-token only.
- Add `aria-label` to the 8 unlabeled icon buttons (S3-1).
- Promote page/section titles to real `<h1>/<h2>` (S3-2).

**STOP — audit only.** No UX change implemented. Improvements are catalogued in
`UX-001_IMPROVEMENT_ROADMAP.md` and await explicit approval (UX-002).
