-- CCR-001 IG-004 — DB-enforced closed fiscal period (FC-003 · FD-004 / FD-012 / FD-030)
-- Closed years are read-only AT THE DATABASE, not only in the client. The lock is driven
-- by settings.locked_through_year (the explicit reopen/close action changes that setting —
-- formalized further by IG-015). The guard is ROLE-AGNOSTIC: even service_role writes are
-- rejected while a year is closed; reopening is a recorded settings change, never a bypass.
--
-- Coverage (minimal per CCR-001 Rev A):
--   receipts             INSERT / UPDATE / DELETE  (effective date: receipt_date)
--   payments             INSERT / UPDATE / DELETE  (effective date: payment_date)
--   member_subscriptions UPDATE / DELETE only      (fiscal identity: year)
--     INSERT is intentionally NOT guarded: certified member onboarding (BO-07) recognizes a
--     new member's opening liability by inserting past-year subscription rows — that is a
--     recognition event, not a mutation of recorded history (FD-014; FC-003 Ch. 5.1).

create or replace function public.fn_closed_period_guard()
returns trigger
language plpgsql
as $$
declare
  locked int;
  col text := tg_argv[0];
  kind text := tg_argv[1];      -- 'date' | 'year'
  y_old int; y_new int;
begin
  select coalesce(nullif(trim(value), '')::int, extract(year from now())::int - 1)
    into locked from public.settings where key = 'locked_through_year';
  if locked is null then
    locked := extract(year from now())::int - 1;   -- same default as the client (crud.js)
  end if;

  if kind = 'date' then
    if tg_op in ('UPDATE','DELETE') then y_old := extract(year from ((to_jsonb(old) ->> col)::date))::int; end if;
    if tg_op in ('INSERT','UPDATE') then y_new := extract(year from ((to_jsonb(new) ->> col)::date))::int; end if;
  else
    if tg_op in ('UPDATE','DELETE') then y_old := (to_jsonb(old) ->> col)::int; end if;
    if tg_op in ('INSERT','UPDATE') then y_new := (to_jsonb(new) ->> col)::int; end if;
  end if;

  if (y_old is not null and y_old <= locked) or (y_new is not null and y_new <= locked) then
    raise exception 'closed_fiscal_period'
      using detail = format('%s on %s blocked: fiscal year %s is closed (locked through %s) — FC-003 FD-004/FD-012',
                            tg_op, tg_table_name, coalesce(y_old, y_new), locked),
            errcode = 'P0004';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_closed_period_receipts on public.receipts;
create trigger trg_closed_period_receipts
  before insert or update or delete on public.receipts
  for each row execute function public.fn_closed_period_guard('receipt_date','date');

drop trigger if exists trg_closed_period_payments on public.payments;
create trigger trg_closed_period_payments
  before insert or update or delete on public.payments
  for each row execute function public.fn_closed_period_guard('payment_date','date');

drop trigger if exists trg_closed_period_member_subscriptions on public.member_subscriptions;
create trigger trg_closed_period_member_subscriptions
  before update or delete on public.member_subscriptions
  for each row execute function public.fn_closed_period_guard('year','year');
