# Final Business‑Rule Snapshot — v1.0.0

The certified business behavior frozen at V1. Every rule below is verified by the
Constitutional Laboratory (chapter in parentheses) unless marked deferred.

## Money in — receipts
- **Member subscription payment** → Food treasury; allocated **oldest‑first** across the
  member's obligations (2025 → 2026 → historical), derived, not stored (FOC‑001/002/023).
- **Overpayment / excess collection** → the member's outstanding is **closed to 0 first**,
  then the remainder becomes a **preserved member credit** (`credit = received − outstanding`);
  the excess never disappears and is not an error (FOC‑003/022, per the owner's Q4 clarification).
- **Food cash donation** (non‑debtor) → Food treasury, enters the cash‑donation register (FOC‑004).
- **Member food donation with debt** → debt‑priority: settles the member's own dues first
  (internal Food→Deficit transfer), remainder is a donation (Item‑9 / ق5) (FOC‑005).
- **Deficit‑directed donation / ق4 collection** → Historical‑Deficit treasury; reduces the
  communal deficit and the member's own historical balance (FOC‑006/007).
- **Overflow rule (read‑time):** deficit‑directed money beyond the remaining deficit
  **automatically overflows to Food** once the deficit reaches 0 (FOC‑022).
- **Diwan operational income / cash donation** → Diwan treasury (FOC‑008).
- **In‑kind donation** → in‑kind register only; touches **no** cash treasury (FOC‑009).

## Money out — payments
- **Food / Diwan expense** → leaves only the treasury it belongs to (custody, Law 8)
  (FOC‑010/011).

## Voucher lifecycle (Business Operations)
- **Create** (BO‑01), **Edit** (BO‑02, prior version preserved), **Cancel** (BO‑03, voided
  not deleted), **Reclassify** (BO‑04, value‑preserving), **Split** (BO‑05, linked child,
  value conserved) (FOC‑018/019/020/021).

## Membership & dues
- **Create member** (BO‑07, atomic with schedule), **Edit member** (BO‑08, identity only),
  **Deactivate** (BO‑09, history preserved), **Apply annual dues** (BO‑10, obligation only)
  (FOC‑014/015/016/017).

## Carry‑forward & model
- **Carry‑forward (Phase 15):** prior‑year closings become this year's openings; the carried
  year is **locked** — a voucher dated in it is rejected (Law 11) (FOC‑024).
- **MODEL2 role:** governs classification and treasury identity; its allocation order is
  **declared but not executed** — runtime nets oldest‑first (FOC‑025).

## Deferred / reserved (NOT active at V1)
- **BO‑06 historical‑deficit settlement** — deferred; no live path (FOC‑012, owner‑excluded).
- **Refund** — reserved; cancellation covers today's need (FOC‑013, owner‑excluded).
