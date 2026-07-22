# Deployment Checklist — v1.0.0

**Target:** Vercel (static `public/` + `api/verify.js` serverless) over Supabase.
**Principle:** deployment is configuration + promotion only — no build step, no code change.

> Secrets are **never** stored in the repository or in this document. Only environment
> variable **names** are listed; values live in the Vercel/Supabase dashboards.

## Pre‑deployment gate (must all be green)
- [ ] `git` is on the tagged commit `v1.0.0` (see `RELEASE_MANIFEST.md`).
- [ ] Constitutional Laboratory: `node lab/run.cjs` → **90/90 · 23/23 · 0 failures**.
- [ ] `node tests/constitutional-verification.cjs` → **12/12 · GOLDEN unchanged**.
- [ ] `node tests/fin2.test.cjs` → **ALL PASS**.
- [ ] `node --check` clean on every `public/js/*.js`.
- [ ] Outstanding Risks reviewed (`OUTSTANDING_RISKS_REPORT.md`) — no blocker open.

## Configuration (Vercel project)
- [ ] Framework preset: none; **Output Directory:** `public`; no build command (per `vercel.json`).
- [ ] Security headers present (from `vercel.json`): `X-Content-Type-Options`,
      `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`.
- [ ] Rewrite present: `/verify/:id` → `/verify.html`.
- [ ] Environment variables set (names only): `SUPABASE_URL`, `SUPABASE_KEY`
      (or `SUPABASE_ANON_KEY`). Server‑side only where applicable; never commit values.

## Supabase (data plane)
- [ ] Correct project selected (the configured production project).
- [ ] Row‑Level Security and constitutional runtime guards active
      (`tests/constitutional-runtime-guards.sql`, `tests/constitutional-schema-assertions.sql`).
- [ ] Atomic RPCs deployed and unchanged (the Accounting Core's sole executors).

## Promote
- [ ] Deploy the tagged commit to a **preview**; smoke‑test login, a receipt, a payment,
      a statement, and a print voucher.
- [ ] Verify no non‑localhost console errors; verify `/api/config` returns the expected keys.
- [ ] Promote preview → **production**.

## Post‑deployment verification
- [ ] Production loads; dashboard, treasury position, member statement render.
- [ ] Public verification route `/verify/:id` resolves a known voucher.
- [ ] Backups confirmed enabled (`BACKUP_CHECKLIST.md`).

## Rollback
- [ ] If any check fails, **re‑promote the previous production deployment** in Vercel
      (instant), and follow `RESTORE_CHECKLIST.md` if data was affected. Deployment is
      reversible; the tag `v1.0.0` is immutable.
