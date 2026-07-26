# Diwan Sidebar — Minimal (Production)

> Back to simplicity. **One** clean, premium, minimal sidebar — not ten. It should
> *disappear into the application* instead of attracting attention: navigation
> first, everything else gone. Matte black, white text, soft-gray secondary, and the
> official Diwan **lime only on hover and active**. No cockpit, no glass, no cards,
> no widgets.
>
> **Live prototype:** `prototypes/sidebar-minimal.html` — expanded/collapsed, RTL/LTR,
> live hover, active, and the collapsed tooltip.

## The rules (as built)

- **Surface** — matte black `#0a0a0b`. No gradients, glass, textures, or decorative
  effects. White text `#e9e9ea`; secondary soft gray `#8a8a8f`.
- **Accent** — Diwan lime `#CBF000`, and **only** on hover and active. Nowhere else.
- **Rows** — each item is **icon + page name, nothing else**. No descriptions,
  counters, badges, cards, graphs, financial widgets, or status blocks.
- **No section titles** — groups are recognized by **small gaps alone**. No oversized
  headings, no decorative separators.
- **Hover** — background shifts slightly (`#141416`); icon and text turn lime; a
  subtle 150 ms fade. No glow, no neon, no motion beyond the fade.
- **Active** — obvious but understated: lime icon + text, a slightly darker
  background (`#161719`), medium radius, and a thin 2 px lime edge. No pills, no
  shadows, no exaggerated effects.
- **Collapse** — two states only. **Expanded:** icons + names. **Collapsed:** icons
  only; hovering an icon shows a **clean floating tooltip** with the page name — the
  whole sidebar does **not** expand on hover.
- **Icons** — one consistent outline style, uniform size (20 px) and spacing. No icon
  backgrounds, no colored containers.
- **Typography** — simple, readable, balanced; Arabic and English both excellent; no
  oversized fonts (14 px labels).
- **Spacing** — generous but efficient (42 px rows, 12–14 px group gaps); comfortable
  click targets; no wasted space.

**Philosophy:** *"I don't notice it when I don't need it, but it is always exactly
where I expect it."* Elegant because restrained, not because decorated.

## Navigation order — frequency-based (minimize scrolling)

The order does **not** preserve the old structure; it follows the **working day**, so
common pages sit under the cursor and become muscle memory. Groups are separated by
gaps only — no titles.

**Group 1 — daily operations (top, opened dozens of times/day)**
1. لوحة التحكم · Dashboard
2. إيصالات الغداء · Lunch Receipts
3. مصاريف الغداء · Lunch Expenses
4. إيصالات الديوان · Diwan Receipts
5. مصاريف الديوان · Diwan Expenses
6. الاشتراكات السنوية · Annual Dues

**Group 2 — frequent modules**
7. أعضاء العائلة · Members
8. التحصيل · Collection
9. التبرعات · Donations
10. الحجوزات · Reservations

**Group 3 — reports (after operational work)**
11. تقرير المديونية · Debt Report
12. الأعضاء المتأخرون · Delinquent
13. كشوف الحساب · Statements

**Group 4 — administration & configuration (bottom, rarely used)**
14. المستخدمون · Users
15. الإعدادات · Settings
16. النسخ الاحتياطي · Backup

### Why this order
- **Daily operational pages first** — receipts and dues are entered constantly; they
  never move from the top so the hand learns them.
- **Reports after operations** — consulted, not operated; they sit below the daily work.
- **Configuration & administration last** — touched occasionally; they migrate to the
  bottom and out of the way.
- **Fits a standard monitor** — 16 rows at 42 px + small gaps + brand/footer stay
  within a normal desktop height, so the important pages need **no scrolling**; the
  collapsed rail exposes the **same order** as icons.
- **Muscle memory** — after a few days the user should stop thinking *"where is this
  page?"*; navigation becomes automatic through consistent ordering and minimal
  movement.

## Production notes

Ready to ship as-is: it is presentation only (icon + label + route), reuses the
existing `window.nav` routes and role-based visibility, and changes no business
logic. The frequency order is a re-sequencing of the existing nav items — no page is
added or removed. It can replace the current sidebar chrome directly, or ship behind
a preference if both the current and minimal bars should coexist during rollout.
