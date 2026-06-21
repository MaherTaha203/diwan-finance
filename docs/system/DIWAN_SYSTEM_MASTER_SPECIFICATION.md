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

Current Income
− Current Expenses

Historical Deficit must never be included.

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

Reduces member debt.

Increases Food Fund.

Not considered a donation.

---

## Donation Receipt

Registers donations.

---

# 11. DONATIONS

## General Rule

If a member has debt:

Debt is reduced automatically until it reaches zero.

This affects the member account only.

The donation itself remains a donation.

---

## Donation Types

### Support Current Balance

Effects:

* Food Donations Fund
* Current Food Balance

Does not affect Historical Deficit.

---

### Historical Deficit Settlement

Effects:

* Food Donations Fund
* Historical Deficit

Does not affect Current Food Balance while deficit remains.

Example:

Deficit = -8639

Donation = 300

Result:

Deficit = -8339

Current Balance unchanged.

---

### Custom Distribution

Allows allocation between:

* Current Food Balance
* Historical Deficit

Total allocation must equal donation amount.

---

# 12. DEFICIT OVERFLOW RULE

Example:

Deficit = -500

Donation = 3000

Result:

500 → Historical Deficit

2500 → Current Food Balance

Final:

Deficit = 0

Current Balance += 2500

Overflow happens automatically.

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

Dashboard must display separately:

* Current Food Balance
* Historical Deficit
* Total Food Donations
* Total Diwan Donations
* Outstanding Debts
* Credit Balances
* Total Members
* Active Members
* Total Receipts
* Total Payments

Historical Deficit and Current Balance must never be merged.

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

---

## Dashboard Requirements

The dashboard must display separately:

* Current Food Balance
* Remaining Historical Deficit
* Historical Deficit Settlement Reserve
* Net Food Fund Position

Formula:

Net Food Fund Position =
Current Food Balance

* Remaining Historical Deficit

---

## Reversal Rule

If a Historical Deficit Settlement Donation is edited, deleted, or reversed:

* Historical Deficit must be recalculated.
* Historical Deficit Settlement Reserve must be recalculated.
* All affected reports and dashboard values must be rebuilt from source transactions.

No manual balance adjustments are permitted.
