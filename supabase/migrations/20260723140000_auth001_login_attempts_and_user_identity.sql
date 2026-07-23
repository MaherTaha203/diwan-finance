-- AUTH-001 · PR-1 — Authentication foundations (owner-approved design Rev.3).
-- Additive only. No existing table altered destructively; no financial/MODEL2 surface touched.
-- 1) login_attempts — server-authoritative progressive-lockout state (Edge Function only).
-- 2) user_roles identity columns (email/phone/is_disabled) + uniqueness, with backfill.
-- Applied to project ralifvemgapmsgrjgazh as migration `auth001_login_attempts_and_user_identity`.

-- ── 1) Progressive-lockout state ────────────────────────────────────────────
-- One row per canonical sign-in identifier (real email OR synthetic phone email).
-- Non-cumulative ladder: fresh 15 attempts per stage → 5m → 15m → 1h → admin lock.
create table if not exists public.login_attempts (
  id                 uuid primary key default gen_random_uuid(),
  identifier         text not null unique,               -- canonical GoTrue email
  user_id            uuid references auth.users(id) on delete cascade,
  attempts_in_stage  integer not null default 0,         -- reset to 0 on lock / success / admin-unlock
  escalation_level   integer not null default 0,         -- timed locks applied so far (0..3)
  locked_until       timestamptz,                        -- active timed lock end (null = none)
  admin_locked       boolean not null default false,     -- Stage-4 terminal lock
  last_attempt_at    timestamptz,
  updated_at         timestamptz not null default now()
);
create index if not exists login_attempts_user_idx on public.login_attempts(user_id);

-- RLS enabled with NO policies → no anon/authenticated access at all.
-- Reachable ONLY through the Edge Functions (service_role bypasses RLS).
alter table public.login_attempts enable row level security;

comment on table public.login_attempts is
  'AUTH-001: server-authoritative progressive-lockout state. Non-cumulative (fresh 15 per stage → 5m/15m/1h/admin). RLS: service_role only (Edge Functions). Never read/written by the client.';

-- ── 2) user_roles identity + status ─────────────────────────────────────────
alter table public.user_roles add column if not exists email       text;
alter table public.user_roles add column if not exists phone       text;
alter table public.user_roles add column if not exists is_disabled boolean not null default false;

-- Uniqueness: phone unique if provided, email unique (case-insensitive) if provided.
create unique index if not exists user_roles_email_uidx on public.user_roles (lower(email)) where email is not null;
create unique index if not exists user_roles_phone_uidx on public.user_roles (phone)        where phone is not null;

comment on column public.user_roles.email       is 'AUTH-001: display/reset identifier. Unique (case-insensitive) when present.';
comment on column public.user_roles.phone       is 'AUTH-001: normalized phone identifier. Unique when present. Legacy synthetic-email accounts backfilled from the email local-part.';
comment on column public.user_roles.is_disabled is 'AUTH-001: admin-disabled account. login-gate blocks; the SPA re-checks this to terminate active tabs.';

-- ── 3) Backfill existing users (derive identity from auth.users) ─────────────
-- Real-email users → email set, phone null. Legacy synthetic phone users
-- (<digits>@diwan-fainance.com) → phone derived from the local-part.
update public.user_roles ur
set email = au.email,
    phone = case when au.email like '%@diwan-fainance.com' then split_part(au.email, '@', 1) else ur.phone end
from auth.users au
where au.id = ur.user_id and ur.email is null;
