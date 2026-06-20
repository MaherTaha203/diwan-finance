# Phase 15 — Repository-Specific Deployment Map (diwan-finance) — FINAL LOCK

Mapped to the actual repo. Existing folders only: root, `.github/`, `api/`, `docs/`,
`public/`, `public/css/`, `public/js/`. Reflects the Final Implementation Lock:
Historical Balance is **derived** from Active Year (D-1); food-fund deficit **excess
auto-routes** to current balance (§13); credit is explicit; exceptions verbatim.

**Type**: `Supabase SQL` / `GitHub` / `Docs`.  **Action**: `NEW` / `MODIFY`.

---

## 4. Supabase SQL execution order

| # | Source file | Destination | Action |
|---|---|---|---|
| 1 | phase15_0001_additive_schema.sql | docs/ (run in Supabase) | NEW |
| 2 | phase15_0002_backup_snapshot.sql | docs/ (run in Supabase) | NEW |
| 3 | phase15_0003_food_donation_allocation.sql | docs/ (run in Supabase) | NEW |
| 4 | phase15_migration_import.sql | docs/ (run in Supabase) | NEW |
| - | phase15_rollback.sql | docs/ (run only to revert) | NEW |

## 3. GitHub file map - backend (api/)

Helper modules are **underscore-prefixed** so Vercel does NOT route them as public
endpoints; the rebuild endpoint is the only new public route.

| Source file | Destination path | Type | Action | Purpose |
|---|---|---|---|---|
| _phase15-allocationEngine.js | api/_phase15-allocationEngine.js | GitHub | NEW | Allocation engine (live payments + rebuild) |
| _phase15-auditService.js | api/_phase15-auditService.js | GitHub | NEW | Writes to audit_log |
| _phase15-foodFundDonationService.js | api/_phase15-foodFundDonationService.js | GitHub | NEW | Food-donation validation + §13 buckets |
| rebuild endpoint (to add) | api/rebuild.js | GitHub | NEW | Rebuild: regenerate non-overridden subs + derived HB, replay live payments |
| manage-account endpoints (to add) | api/member-account.js (or routes in server.js) | GitHub | NEW/MODIFY | GET/preview/PUT; PUT recomputes derived Historical Balance + audits |

> If server.js is a custom Express server that Vercel runs (confirm in vercel.json),
> the endpoints may instead be routes inside server.js that require() the _-prefixed helpers.

## GitHub file map - frontend (public/js/, public/css/)

| Source file | Destination path | Type | Action | Purpose |
|---|---|---|---|---|
| phase15-manageAccount.js | public/js/phase15-manageAccount.js | GitHub | NEW | Manage Account; **D-1 preview recalculates Historical Balance** |
| phase15-rebuildAccount.js | public/js/phase15-rebuildAccount.js | GitHub | NEW | Rebuild screen + bilingual allocation rules |
| phase15-donationAllocation.js | public/js/phase15-donationAllocation.js | GitHub | NEW | Conditional food-donation field |
| phase15-i18n.en.json / .ar.json | merge into existing public/js/i18n.js | GitHub | **MODIFY** | New AR/EN keys |
| phase15.css | public/css/phase15.css | GitHub | NEW | Screen styles (RTL-aware) |

## GitHub file map - HTML (public/)

| Item | Destination | Action | Note |
|---|---|---|---|
| Manage Account page host | public/manage-account.html | NEW | wrap in app header/nav/auth |
| Rebuild Account page host | public/rebuild-account.html | NEW | wrap in app header/nav/auth |
| Donation-allocation field | existing receipt-form .html (filename TBC) | **MODIFY** | insert snippet phase15-donationAllocation.snippet.html |

> The two new pages and the exact receipt-form file still need your public/ listing +
> i18n.js to finalize MODIFY targets (the only remaining unknowns).

## Docs (docs/)

DEPLOYMENT_MAP.md, FINAL_DEPLOYMENT_CHECKLIST.md, DATABASE_CHANGES.md,
DEPLOYMENT_GUIDE.md, ACTIVATION_GUIDE.md, MIGRATION_REPORT.md,
VALIDATION_REPORT.md, COMPARISON_REPORT.md, phase15_migration_reports.xlsx,
and _devtools_*.js (dev-time only, not deployed). All NEW, type Docs.

---

## Final map (SOURCE -> DESTINATION -> PURPOSE)

```
phase15_0001_additive_schema.sql          -> docs/ (Supabase SQL #1)  schema + switch (legacy)
phase15_0002_backup_snapshot.sql          -> docs/ (Supabase SQL #2)  members snapshot
phase15_0003_food_donation_allocation.sql -> docs/ (Supabase SQL #3)  food donation column (§13)
phase15_migration_import.sql              -> docs/ (Supabase SQL #4)  import + subs + audit
phase15_rollback.sql                      -> docs/ (Supabase SQL)     rollback only
_phase15-allocationEngine.js              -> api/        (GitHub)      allocation engine
_phase15-auditService.js                  -> api/        (GitHub)      audit writes
_phase15-foodFundDonationService.js       -> api/        (GitHub)      food donation logic (§13)
api/rebuild.js (+ member-account)         -> api/        (GitHub NEW)  rebuild + manage-account endpoints
phase15-manageAccount.js                  -> public/js/  (GitHub)      Manage Account (D-1 preview)
phase15-rebuildAccount.js                 -> public/js/  (GitHub)      Rebuild screen
phase15-donationAllocation.js             -> public/js/  (GitHub)      donation field
phase15.css                               -> public/css/ (GitHub)      styles
phase15-i18n.{en,ar}.json                 -> MERGE into public/js/i18n.js (GitHub MODIFY)
manage-account.html / rebuild-account.html-> public/     (GitHub NEW)  screen hosts
donation snippet                          -> existing receipt-form .html (GitHub MODIFY)
docs/*.md, *.xlsx, _devtools_*.js         -> docs/       (Docs)        guides, reports, dev tools
```
