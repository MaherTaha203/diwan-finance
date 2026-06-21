[DIWAN_SYSTEM_MASTER_SPECIFICATION.md.txt](https://github.com/user-attachments/files/29174965/DIWAN_SYSTEM_MASTER_SPECIFICATION.md.txt)
# DIWAN FINANCE SYSTEM

# MASTER BUSINESS, OPERATIONAL & ACCOUNTING SPECIFICATION

## Status

Official Source of Truth

## Purpose

This document defines the complete behavior of the Diwan Finance System.

No screen, report, dashboard, receipt, payment, ledger, workflow, or accounting calculation may contradict this document.

Any future development must comply with this specification.

---

# 1. SYSTEM VISION

The system is designed to manage:

* Family members
* Annual subscriptions
* Food Fund
* Diwan Fund
* Donations
* Historical balances
* Financial receipts
* Financial payments
* Member statements
* Treasury reports
* Dashboard monitoring

The system must provide complete financial transparency and full auditability.

---

# 2. USER ROLES

## Admin

Can:

* Add members
* Edit members
* Delete members
* Apply subscriptions
* Create receipts
* Create payments
* Manage settings
* View reports
* Export reports
* Print reports
* Access audit logs

---

## Viewer

Can:

* View members
* View reports
* View dashboard
* Print reports

Cannot:

* Create receipts
* Create payments
* Modify settings
* Modify members
* Apply subscriptions

---

# 3. MEMBER MANAGEMENT

Each member contains:

* Member Number
* Full Name
* Phone
* Notes
* Active Status
* Active From Year
* Opening Balance
* Credit Balance

---

## Active From Year

Defines the first year the member became financially active.

Used for:

* Historical balance calculation
* Subscription eligibility
* Financial reporting

---

## Historical Balance Calculation

Default formula:

Historical Balance =
(2024 - Active From Year + 1) × Annual Amount

May be overridden manually.

---

# 4. MEMBER DEBTS

All debts belong exclusively to the Food Fund.

There are no debts related to Diwan Fund.

Debt represents money owed by a member to the Food Fund.

---

# 5. MEMBER CREDIT BALANCE

Exists when payments exceed obligations.

Example:

Debt = 500

Payment = 800

Result:

Debt = 0

Credit Balance = 300

---

# 6. FUND STRUCTURE

The system contains four independent funds.

---

## Diwan Fund

Receives:

* Diwan payments
* Subscriptions

---

## Diwan Donations Fund

Receives:

* Donations directed to Diwan

---

## Food Fund

Receives:

* Food contributions
* Debt settlements
* Current-balance support allocations

Represents operational money available for spending.

---

## Food Donations Fund

Receives:

* Food donations
* Historical deficit donations

---

# 7. HISTORICAL DEFICIT

Historical Deficit represents accumulated Food Fund deficit before system implementation.

Example:

-8639 ILS

Historical Deficit is independent from Current Food Balance.

Historical Deficit must always be displayed separately.

---

# 8. CURRENT FOOD BALANCE

Formula:

Current Food Balance =
Operational Food Receipts
+ Debt Settlement movements
+ Current Support donations
− Current Expenses

Debt Settlement, Current Support, and Operational receipts are independent components. They are itemized separately in the Food Fund breakdown, reports, statements, and exports, and are never merged.

Historical Deficit must never be included.

The Historical Deficit Settlement Reserve must never be included in Current Food Balance.

---

# 9. ANNUAL SUBSCRIPTIONS

Applying a subscription:

* Creates debt
* Increases member obligations
* Does not create donations
* Does not affect Historical Deficit

---

# 10. RECEIPT TYPES

## Subscription Payment

Reduces member debt.

---

## Food Contribution

Reduces member debt.

Increases Food Fund.

---

## Debt Settlement

An independent accounting movement class. It is NOT a donation, NOT Current Support, and NOT Historical Deficit Settlement.

Reduces member debt.

Increases Food Fund (an internal component of the Current Food Balance; not a fund, reserve, liability, or standalone KPI).

Not considered a donation. Reports, statements, dashboard calculations, exports, and reconciliation logic must preserve Debt Settlement as a separate movement class.

---

## Donation Receipt

Registers donations.

---

# 11. DONATIONS

## General Rule — Member Debt Priority Allocation

When a member with an outstanding Food Fund debt makes a Food Fund donation, allocation occurs in this mandatory order:

Step 1 — Settle member debt first.

The debt portion becomes a Debt Settlement movement (see Section 10), capped at the outstanding debt:

Debt Settlement = min(payment, member debt)

This reduces member debt and increases the Food Fund. It is NOT a donation.

Step 2 — Allocate the remaining amount as a donation.

Donation = payment − Debt Settlement

Only this remaining amount is a donation. The donation destination rules (Current Support / Historical Deficit Settlement / Custom Distribution) apply to this remaining amount alone.

Example:

Debt = 1600

Payment = 3000

Destination = Historical Deficit Settlement

Generated movements:

Debt Settlement = 1600

Historical Deficit Donation = 1400

(Not: Historical Deficit Donation = 3000.)

The member statement must show these as separate movements, never as a single donation row.

This rule applies only when the payer is a member whose Food Fund debt is greater than zero. Non-member donors, and members without debt, skip Step 1.

---

## Donation Types

### Support Current Balance

Effects:

* Food Donations Fund
* Current Food Balance

Does not affect Historical Deficit.

---

### Historical Deficit Settlement

Reserve Model (approved). Effects:

* Food Donations Fund
* Historical Deficit (reduced)
* Historical Deficit Settlement Reserve (increased)

Does NOT increase Current Food Balance under any circumstance.

The donation is reserved for repayment of historical creditors and is not available for operational spending.

Example:

Deficit = -8639

Donation = 300

Result:

Deficit = -8339

Reserve += 300

Current Balance unchanged.

---

### Custom Distribution

Allows allocation of the donation (the amount remaining after any Debt Settlement) between:

* Current Food Balance (Current Support)
* Historical Deficit (Historical Deficit Settlement Reserve)

The Historical Deficit portion follows the Reserve Model and is capped at the remaining deficit; any surplus overflows to Current Support per Section 12.

Total allocation must equal the donation amount (the amount remaining after Debt Settlement).

---

# 12. OVER-SETTLEMENT RULE (RESERVE MODEL)

Historical Deficit Settlement Donations follow the Reserve Model. The portion that settles the deficit is reserved and never increases Current Food Balance. Deficit reduction and the Historical Deficit Settlement Reserve are capped at the remaining Historical Deficit.

When a Historical Deficit Settlement Donation exceeds the remaining Historical Deficit, the system automatically splits the donation so that the full amount is always allocated.

Example:

Remaining Historical Deficit = 500

Donation = 3000

The system shall automatically allocate:

500 → Historical Deficit Settlement (Reserve; does not increase Current Food Balance)

2500 → Current Food Fund Support (increases Current Food Balance)

Confirmation requirement:

* Before saving the receipt, the system must display a confirmation message showing the automatic allocation.
* The user must explicitly approve the allocation.
* If the user cancels, no receipt is created.

The full donation amount must always be allocated. No amount may remain unallocated.

This rule supersedes the previous automatic deficit-overflow behavior.

---

# 13. PAYMENTS

Payments:

* Reduce fund balances
* Create treasury records
* Appear in reports
* Appear in audit logs

Expense categories must remain configurable.

---

# 14. MEMBER STATEMENTS

Must distinguish between:

* Subscription
* Food Contribution
* Debt Settlement
* Diwan Payment
* Diwan Donation
* Food Donation
* Historical Deficit Donation
* Credit Balance

No categories may be merged.

---

# 15. REPORTS

System must provide:

* Member Reports
* Food Fund Reports
* Diwan Fund Reports
* Donation Reports
* Historical Deficit Reports
* Treasury Reports

All reports must match accounting rules.

---

# 16. DASHBOARD

## High-Level Financial Indicators

The dashboard displays only these high-level financial indicators:

* Current Food Fund Balance
* Remaining Historical Deficit
* Net Food Fund Position
* Diwan Fund Balance

## Components Shown Only in the Breakdown

The following are internal components, not standalone dashboard cards. They appear only within the Food Fund breakdown, reports, statements, exports, and reconciliation views:

* Debt Settlement (an internal component of the Food Fund balance; not a fund, reserve, liability, or standalone KPI)
* Historical Deficit Settlement Reserve
* Operational receipts and Current Support components

## Operational Monitoring

Operational monitoring figures may also be displayed:

* Total Food Donations
* Total Diwan Donations
* Outstanding Debts
* Credit Balances
* Total Members
* Active Members
* Total Receipts
* Total Payments

Current Food Balance, Remaining Historical Deficit, the Historical Deficit Settlement Reserve, and Debt Settlement must never be merged.

---

# 17. PRINTING RULES

Supported documents:

* Receipts
* Payments
* Member Statements
* Reports

Printed output must match system calculations exactly.

---

# 18. EXPORT RULES

Supported formats:

* Excel
* CSV
* PDF

Exported values must match on-screen values exactly.

---

# 19. LANGUAGE RULES

Supported languages:

* Arabic
* English

All labels must have translations.

No missing translation keys allowed.

---

# 20. UI / UX RULES

Requirements:

* RTL support
* Responsive layout
* Keyboard navigation
* Fast data entry
* Consistent forms
* Clear validation messages

---

# 21. AUDIT LOG RULES

The system must record:

* Create actions
* Edit actions
* Delete actions
* Financial transactions
* Subscription applications

Audit records must include:

* User
* Timestamp
* Entity
* Action
* Before value
* After value

---

# 22. ACCOUNTING COMPLIANCE RULE

Every future feature, report, dashboard card, receipt workflow, payment workflow, ledger calculation, and export must be validated against this specification before deployment.

This document is the official source of truth for the Diwan Finance System.

# Historical Deficit Accounting Model

## Definition

Historical Deficit represents historical obligations owed by the Food Fund from periods prior to the current operational balance.

The authoritative Historical Deficit constant is `food_opening_balance = -8639`. It is never mutated; deficit reduction is computed additively from settlement donations.

It is not part of the current operational balance.

It must always be displayed separately.

---

## Historical Deficit Settlement Donations

A donation may be directed toward Historical Deficit Settlement.

Such donations are intended to reduce historical obligations owed by the Food Fund.

---

## Accounting Treatment

When a Historical Deficit Settlement Donation is received:

1. The donation is recorded in the donation ledger.
2. The Historical Deficit is reduced by the donation amount.
3. The donation amount is reserved for paying historical creditors.
4. The Current Operational Food Balance must not increase.

The donation is therefore considered:

* Money received by the organization.
* Money simultaneously committed to historical obligations.

It is not available for current operational spending.

---

## Example

Current Food Balance = 10,000

Historical Deficit = -8,639

Historical Deficit Donation = 3,000

Result:

Current Food Balance = 10,000

Historical Deficit = -5,639

Reserved Historical Deficit Settlement Amount = 3,000

---

## Historical Deficit Settlement Reserve

The system shall maintain a separate tracked amount representing donations received for historical deficit settlement.

This amount represents money reserved for repayment of historical obligations.

It must not be treated as operational cash available for current spending.

The Reserve is capped at the magnitude of the Historical Deficit constant. It can never exceed the total historical obligation, and settlement donations never increase Current Food Balance (see Section 12).

---

## Dashboard Requirements

The dashboard displays only these high-level financial indicators:

* Current Food Fund Balance
* Remaining Historical Deficit
* Net Food Fund Position
* Diwan Fund Balance

The Historical Deficit Settlement Reserve is not a standalone dashboard card. It is displayed within the Food Fund breakdown, reports, and reconciliation views — shown separately there, never merged into Current Food Balance.

Formula:

Net Food Fund Position = Current Food Balance + Remaining Historical Deficit

Because Remaining Historical Deficit is stored as a negative number, it reduces the Net Food Fund Position.

Example: 10,000 + (−5,639) = 4,361.

---

## Reversal Rule

If a Food Fund donation — including any of its Debt Settlement, Current Support, or Historical Deficit Settlement components — is edited, deleted, or reversed:

* Member Food Fund debt must be recalculated.
* Debt Settlement movements must be recalculated.
* Historical Deficit must be recalculated.
* Historical Deficit Settlement Reserve must be recalculated.
* Current Food Balance and Net Food Fund Position must be recalculated.
* All affected reports, statements, dashboard, and export values must be rebuilt from source transactions.

No manual balance adjustments are permitted.
