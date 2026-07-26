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
- **Spacing** — compact but comfortable (≈37 px rows, ~10 px group gaps); real click
  targets; no wasted vertical space, so the whole list fits one screen.

**Philosophy:** *"I don't notice it when I don't need it, but it is always exactly
where I expect it."* Elegant because restrained, not because decorated.

## Navigation order — workflow-first (not alphabetical, not history, not frequency alone)

The order follows the **treasurer's natural workflow**: top→bottom is the sequence
they actually move through during the day. Groups are separated by **gaps only** — no
titles — and each group has **room to grow** so new modules don't crowd the layout.
Reference model (generic): *Dashboard → Members → Registrations → Receipts/Payments →
Treasury → [Teachers] → Reports → Settings*. Diwan has no "Teachers"; its operational
modules are the two funds, donations, and reservations, mapped below.

**1 · Start & people**
1. لوحة التحكم · Dashboard
2. أعضاء العائلة · Members

**2 · Register & collect dues**
3. الاشتراكات السنوية · Registrations / Dues
4. التحصيل · Collection

**3 · Money in / out (receipts & payments)**
5. إيصالات الغداء · Lunch Receipts
6. مصاريف الغداء · Lunch Payments
7. إيصالات الديوان · Diwan Receipts
8. مصاريف الديوان · Diwan Payments

**4 · Position & other activity**
9. الخزينة والمركز المالي · Treasury
10. التبرعات · Donations
11. الحجوزات · Reservations

**5 · Reports (after the work)**
12. تقرير المديونية · Debt Report
13. الأعضاء المتأخرون · Delinquent
14. كشوف الحساب · Statements

**6 · Administration & settings (bottom, rare)**
15. المستخدمون · Users
16. الإعدادات · Settings
17. النسخ الاحتياطي · Backup

### Why this order
- **Follows the day, not the file system** — the user opens the dashboard, works with
  members, records subscriptions and collects, issues receipts and pays expenses,
  then checks the treasury. The sidebar mirrors that path top-to-bottom.
- **Operational pages stay above the fold** — the primary daily work (steps 1–4) sits
  at the top and is always visible without scrolling on a standard desktop.
- **Reports after operations, admin last** — consulted after the work; configuration
  is touched rarely and migrates to the bottom, out of the way.
- **Muscle memory** — because the order matches the workflow and never changes, after
  a few days the hand learns it; the user stops asking *"where is this page?"* and the
  sidebar disappears mentally.

## Future-proof & compact

- **Room to grow** — each group is a logical bucket with expansion space: a new fund
  page slots into *Money in/out*, a new report into *Reports*, a new admin page into
  *Administration* — the top-to-bottom workflow logic and the above-the-fold
  operational block stay intact as the system grows.
- **Compact, one screen** — reduced vertical padding (≈37 px rows, ~10 px group gaps),
  comfortable click targets, no wasted space; all 17 primary pages fit within a
  standard desktop sidebar height **without scrolling** (verified: content height =
  visible height). The collapsed rail exposes the **same order** as icons with
  tooltips.

## Production notes

Ready to ship as-is: it is presentation only (icon + label + route), reuses the
existing `window.nav` routes and role-based visibility, and changes no business
logic. The frequency order is a re-sequencing of the existing nav items — no page is
added or removed. It can replace the current sidebar chrome directly, or ship behind
a preference if both the current and minimal bars should coexist during rollout.
