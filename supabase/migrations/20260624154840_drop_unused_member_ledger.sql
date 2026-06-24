-- drop_unused_member_ledger
-- member_ledger is an orphan: 0 rows, never written (n_tup_ins=0), referenced nowhere in code
-- (app reads receipts/payments/members/contacts/annual_dues/audit_log/member_subscriptions/
--  settings/user_roles/attachments/vouchers/voucher_versions only), and has no view/function/
-- trigger/FK dependents. Its RLS-on/no-policy state was an incidental blanket lockdown, not an
-- intentional service-role feature. Self-guarded: aborts (raises -> rolls back) if any data or
-- dependency exists at execution time. DROP is RESTRICT (no CASCADE) as a final safety.

do $$
declare v_rows bigint; v_views int; v_funcs int; v_trigs int; v_fks int;
begin
  if to_regclass('public.member_ledger') is null then
    raise notice 'member_ledger already absent; nothing to do'; return;
  end if;

  select count(*) into v_rows from public.member_ledger;
  if v_rows <> 0 then
    raise exception 'ABORT drop_unused_member_ledger: % row(s) present (expected 0)', v_rows;
  end if;

  select count(*) into v_views
  from pg_depend d
  join pg_rewrite rw on rw.oid=d.objid
  join pg_class dv on dv.oid=rw.ev_class
  join pg_class st on st.oid=d.refobjid
  join pg_namespace sn on sn.oid=st.relnamespace
  where sn.nspname='public' and st.relname='member_ledger' and dv.relname<>'member_ledger';
  if v_views <> 0 then raise exception 'ABORT: % view/rule dependency on member_ledger', v_views; end if;

  select count(*) into v_funcs
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind in ('f','p') and pg_get_functiondef(p.oid) ilike '%member_ledger%';
  if v_funcs <> 0 then raise exception 'ABORT: % function(s) reference member_ledger', v_funcs; end if;

  select count(*) into v_trigs
  from pg_trigger where tgrelid='public.member_ledger'::regclass and not tgisinternal;
  if v_trigs <> 0 then raise exception 'ABORT: % trigger(s) on member_ledger', v_trigs; end if;

  select count(*) into v_fks
  from pg_constraint
  where confrelid='public.member_ledger'::regclass
     or (conrelid='public.member_ledger'::regclass and contype='f');
  if v_fks <> 0 then raise exception 'ABORT: % foreign key(s) involve member_ledger', v_fks; end if;

  -- All guards passed.
  drop table public.member_ledger;
  raise notice 'member_ledger dropped (0 rows, 0 dependents).';
end $$;
