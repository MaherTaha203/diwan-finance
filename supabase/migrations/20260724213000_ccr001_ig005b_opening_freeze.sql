-- CCR-001 IG-005B — constitutional freeze of opening balances after FY2026 close
-- (FC-003 · FD-005: opening balances may be edited ONLY until the end of fiscal year
--  2026; after closing 2026 they are constitutionally FROZEN — no direct edits.)
-- The freeze activates automatically when settings.locked_through_year >= 2026
-- (the fiscal year 2026 is closed). INERT until then. Role-agnostic (IG-004 doctrine).

create or replace function public.fn_opening_freeze_guard()
returns trigger
language plpgsql
as $$
declare
  locked int;
begin
  select coalesce(nullif(trim(value), '')::int, extract(year from now())::int - 1)
    into locked from public.settings where key = 'locked_through_year';
  if locked is null or locked < 2026 then
    return new;                                     -- FY2026 not closed yet → editable (FD-005)
  end if;

  if tg_table_name = 'members' then
    if new.historical_balance_ils  is distinct from old.historical_balance_ils
    or new.historical_payments_ils is distinct from old.historical_payments_ils then
      raise exception 'opening_balance_frozen'
        using detail = 'Member opening balances are constitutionally frozen after FY2026 close — FC-003 FD-005',
              errcode = 'P0005';
    end if;
  elsif tg_table_name = 'settings' then
    if (new.key in ('food_opening_balance','diwan_opening_balance'))
       and (tg_op = 'INSERT' or new.value is distinct from old.value) then
      raise exception 'opening_balance_frozen'
        using detail = 'Fund opening balances are constitutionally frozen after FY2026 close — FC-003 FD-005',
              errcode = 'P0005';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_opening_freeze_members on public.members;
create trigger trg_opening_freeze_members
  before update on public.members
  for each row execute function public.fn_opening_freeze_guard();

drop trigger if exists trg_opening_freeze_settings on public.settings;
create trigger trg_opening_freeze_settings
  before insert or update on public.settings
  for each row execute function public.fn_opening_freeze_guard();
