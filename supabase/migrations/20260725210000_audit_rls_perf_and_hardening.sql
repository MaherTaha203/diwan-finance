-- Forensic audit remediation (evidence-based, mechanical, no behaviour change).
-- APPLIED to production 2026-07-25. Verified: Supabase performance advisor
-- auth_rls_initplan + multiple_permissive_policies warnings all cleared.

-- D/HIGH-2: is_admin() VOLATILE → STABLE. It gates every write policy on every
-- table; STABLE lets the planner evaluate it once per statement (initPlan) instead
-- of once per row. Body byte-identical to the live definition.
create or replace function public.is_admin()
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

-- D/HIGH-1 (advisor auth_rls_initplan): wrap bare auth.uid()/is_admin() in a scalar
-- subselect so they are evaluated once per statement, not per row.
alter policy user_roles_select_own on public.user_roles using (user_id = (select auth.uid()));
alter policy vouchers_admin_write   on public.vouchers using ((select public.is_admin())) with check ((select public.is_admin()));

-- D/HIGH-3 (advisor multiple_permissive_policies): drop the duplicate permissive
-- SELECT policies (identical is_provisioned_user() quals) on the hottest loadAll
-- tables. Postgres ORs permissive policies, so each pair doubled per-row cost.
drop policy if exists auth_read on public.receipts;
drop policy if exists auth_read on public.payments;
drop policy if exists auth_read on public.members;
drop policy if exists auth_read on public.settings;
drop policy if exists auth_read on public.annual_dues;

-- D/MEDIUM-3: allocation_records INSERT must match its stated admin-write posture
-- (every sibling MODEL2 table uses is_admin() for insert). Audit-integrity fix;
-- the table is metadata-only and never enters any balance.
alter policy allocation_records_insert on public.allocation_records with check (public.is_admin());

-- Security advisor / TD-05: pin search_path on the two period-guard trigger
-- functions (defence in depth; they read public.settings).
alter function public.fn_closed_period_guard() set search_path = public;
alter function public.fn_opening_freeze_guard() set search_path = public;
