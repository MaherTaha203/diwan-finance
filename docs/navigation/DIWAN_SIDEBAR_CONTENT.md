# Sidebar Content Redesign — Financial Cockpit

> **Forget colors for a day.** The Diwan navy identity is unchanged; the exercise is
> the sidebar's **content**. The question isn't "how does it look" but **"what does
> a treasurer always need — and how does the sidebar become part of a financial
> system, not a list of links?"**
>
> **Live prototype:** `prototypes/sidebar-content.html` — density (rich/focused),
> state (expanded/collapsed), annotated/clean, RTL/LTR, light/dark. The collapsed
> state is the proof: it still shows the position, what needs action, and live
> badges — a cockpit even when narrow.

## The three questions, answered

**1 · What does the user always need?**
The **balance / financial position**, **which fiscal period is open**, and **what is
waiting for action**. An accountant checks these before every entry.

**2 · What is useful to show inside the sidebar?**
A **treasury snapshot** (total + per-fund + trend), **clickable alerts** (delinquent,
pending, unreconciled), the **FX rate**, and **data freshness** (last sync).

**3 · How does it become a professional financial system?**
By carrying **live information and state** — the links show *status* (4 overdue), not
just names; the position and alerts live *in* the chrome; even collapsed, the bar
stays informative. It reads as an operating console, not a menu.

## The content architecture (six modules)

The sidebar is composed top-to-bottom of purposeful modules, each earning its space:

| # | Module | What it shows | Why it's always needed |
|---|---|---|---|
| 1 | **Identity & period** | Brand + `FY 2026 · Open` status dot | Know which period is open **before any entry** |
| 2 | **Live position** | `48,250 ILS ▲3.2%` + Lunch/Diwan split + sparkline | The treasurer's #1 number, at a glance |
| 3 | **Action-needed alerts** | Delinquent · 4 · Pending · 2 · Unreconciled · 1 (clickable) | What awaits you surfaces before you search |
| 4 | **Primary action + ⌘K** | `+ New voucher` + command | The most frequent task always in reach |
| 5 | **Live-badged nav** | The domains, with counts (`Members · 4`, new-dot) | Links carry *state*, not just labels |
| 6 | **Identity · FX · freshness** | Admin + role · `USD 3.67 ▲` · `Synced · 2m` | Who you are, the rate, and data trust |

## Expanded vs collapsed (the key idea)

- **Expanded (rich):** all six modules, comfortably spaced — a full cockpit.
- **Expanded (focused):** identity + position + action + nav + footer (alerts hidden)
  for users who want less — the density toggle respects preference.
- **Collapsed:** content **compresses to glanceable indicators** — the position as a
  compact figure tile, alerts as **count-badged icons**, nav icons with badges, a
  green **sync dot**. Collapsing narrows the bar **without going blind**: it stays a
  financial instrument, which is exactly what makes it feel like a professional
  system rather than a shrunken menu.

## Principles

- **Every pixel earns its place** — no decoration; each module answers a real
  operator question (position / period / attention / action / navigation / trust).
- **State lives in the chrome** — counts and freshness are first-class, so the
  operator reacts from the sidebar instead of hunting through pages.
- **Actionable, not just informative** — alerts and badges are clickable routes to
  the exact view that needs work.
- **Graceful density** — rich → focused → collapsed, each a deliberate, useful state.
- **Identity untouched** — this is *content* design; the navy/gold/lime identity, the
  navigation structure, routing, and workflow are unchanged.

## Production notes (when implemented)

All figures map to data the app already computes: `FIN.*` fund balances (position +
split), the delinquency/debt engine (overdue count), pending vouchers, the open
period (`fiscal-close`), the live FX rate, and a `last-synced` timestamp. The module
is **presentation only** — it reads existing state; it does not change any business
logic. It can ship behind the same navy sidebar as a content upgrade, independent of
the visual-evolution work.
