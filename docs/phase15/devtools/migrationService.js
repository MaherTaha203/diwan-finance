'use strict';

/**
 * migrationService — Phase 15  (Option 1: spreadsheet is authoritative)
 * --------------------------------------------------------------------
 * Imports the approved migration spreadsheet into the NEW structured fields.
 * NO receipt replay. NO allocation engine. Direct per-year assignment.
 * The allocation engine governs only LIVE payments entered after activation.
 *
 * This module consumes already-parsed, normalized rows (see SPREADSHEET_COLUMNS).
 * Spreadsheet parsing (.xlsx) is done with SheetJS at call time once the file
 * is provided; keep parsing separate so this logic stays pure and testable.
 *
 * Writes go through a service_role supabase client (Express API).
 * Nothing here touches legacy fields (opening_balance, prepaid_subscription_ils).
 */

const { AUDIT_ACTIONS, writeAudit } = require('./auditService');

// Approved exceptions — imported verbatim, NO generation/recalc/status change.
const EXCEPTION_CODES = Object.freeze(['TAHA-0120', 'TAHA-0134', 'TAHA-0149']);

/**
 * Spreadsheet column -> normalized field mapping (10 approved columns).
 * `matchKey` (Member ID) maps a spreadsheet row to public.members.
 * CONFIRM before first run whether Member ID == member_code (e.g. 'TAHA-0001')
 * or a bare sequence ('1'). Default below assumes member_code.
 */
const SPREADSHEET_COLUMNS = Object.freeze({
  matchKey:            'Member ID',
  name:                'Member Name',
  historicalBalance:   'Historical Balance Before 01.01.2025',
  historicalPayments:  'Total Payments Before 01.01.2025',
  payments2025:        'Payments 2025',
  payments2026:        'Payments 2026',
  remaining2025_2026:  'Remaining 2025+2026 Balance',          // validation target (col 7)
  totalPaymentsTo2026: 'Total Payments Until 31.12.2026',      // validation target (col 8)
  totalRemainingTo2026:'Total Remaining Balance Until 31.12.2026', // validation target (col 9)
  activeYear:          'Active Year',
});

const num = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/,/g, '').trim());
  if (Number.isNaN(n)) throw new Error(`Non-numeric value: "${v}"`);
  return Math.round(n * 100) / 100;
};

/**
 * Build subscription rows for one member.
 * Validated against the approved spreadsheet (146/146 reconcile to col8 + col9):
 *   - due(year)   = (year >= activeYear) ? annual_dues.amount : 0
 *   - POOL the per-year spreadsheet payments (Payments2025 + Payments2026) and
 *     allocate OLDEST-FIRST across due years (matches the approved allocation order).
 *   - Any overflow beyond total dues becomes member credit (returned separately).
 *   - balance(year) = due - allocated  (floored at 0; overflow lives in credit).
 *
 * @returns {{subscriptions:Array, credit:number}}
 */
function buildMigratedSubscriptions(activeYear, duesByYear, paidByYear) {
  const years = Object.keys(duesByYear).map(Number).sort((a, b) => a - b);
  let pool = years.reduce((s, y) => s + num(paidByYear[y] ?? 0), 0);
  const subscriptions = years.map((year) => {
    const due = year >= activeYear ? num(duesByYear[year]) : 0;
    const paid = Math.min(pool, due);
    pool = Math.round((pool - paid) * 100) / 100;
    return {
      year,
      due_amount_ils: due,
      paid_amount_ils: Math.round(paid * 100) / 100,
      balance_ils: Math.round((due - paid) * 100) / 100,
      is_overridden: false,
    };
  });
  return { subscriptions, credit: Math.round(pool * 100) / 100 }; // leftover -> credit
}

/**
 * Import one normalized spreadsheet row.
 * @returns {object} the planned member patch + subscription rows (NOT yet written)
 */
function planMemberImport(row, ctx) {
  const C = SPREADSHEET_COLUMNS;
  const code = String(row[C.matchKey]).trim();
  const member = ctx.membersByKey.get(code);
  if (!member) throw new Error(`No member matched key "${code}"`);

  const isException = EXCEPTION_CODES.includes(member.member_code);
  const activeYear = Number(row[C.activeYear]);
  if (!Number.isInteger(activeYear)) throw new Error(`Bad Active Year for ${code}: ${row[C.activeYear]}`);

  const memberPatch = {
    id: member.id,
    member_code: member.member_code,
    is_migration_exception: isException,
    active_from_year: activeYear,                       // Phase 4: overwrite from spreadsheet
    historical_balance_ils: num(row[C.historicalBalance]),
    historical_payments_ils: num(row[C.historicalPayments]),
    // credit_balance_ils assigned below from pooled subscription overflow
  };

  // Exceptions: import the member fields verbatim, but DO NOT generate subscriptions.
  let subscriptions = [];
  let credit = 0;
  if (!isException) {
    const built = buildMigratedSubscriptions(
      activeYear,
      ctx.duesByYear,
      { 2025: row[C.payments2025], 2026: row[C.payments2026] }
    );
    subscriptions = built.subscriptions;
    credit = built.credit; // overflow beyond total dues
  }
  memberPatch.credit_balance_ils = credit;

  return {
    member: memberPatch,
    subscriptions,
    isException,
    spreadsheet: { // retained for the validation report
      remaining2025_2026: num(row[C.remaining2025_2026]),
      totalPaymentsTo2026: num(row[C.totalPaymentsTo2026]),
      totalRemainingTo2026: num(row[C.totalRemainingTo2026]),
      expectedName: String(row[C.name] ?? '').trim(),
    },
  };
}

/**
 * Orchestrate the full import inside a single rebuild_run, with audit.
 * Caller passes: supabase (service_role), parsed rows, userName.
 * Does NOT switch accounting_model. Caller runs validation + comparison after.
 */
async function runMigration(supabase, rows, userName) {
  // Load members + dues once.
  const { data: members, error: mErr } = await supabase
    .from('members').select('id, member_code, name, active_from_year, opening_balance, prepaid_subscription_ils');
  if (mErr) throw new Error(`load members: ${mErr.message}`);
  const { data: dues, error: dErr } = await supabase.from('annual_dues').select('year, amount');
  if (dErr) throw new Error(`load dues: ${dErr.message}`);

  const ctx = {
    membersByKey: new Map(members.map((m) => [m.member_code, m])),
    duesByYear: Object.fromEntries(dues.map((d) => [d.year, Number(d.amount)])),
  };

  const { data: run, error: rErr } = await supabase
    .from('rebuild_runs')
    .insert({ triggered_by: userName, scope: 'all', status: 'running', reason: 'phase15 spreadsheet migration' })
    .select('id').single();
  if (rErr) throw new Error(`open run: ${rErr.message}`);

  const plans = rows.map((row) => planMemberImport(row, ctx));

  for (const plan of plans) {
    const before = members.find((m) => m.id === plan.member.id);
    // 1. member fields
    const { error: upErr } = await supabase.from('members').update({
      is_migration_exception: plan.member.is_migration_exception,
      active_from_year: plan.member.active_from_year,
      historical_balance_ils: plan.member.historical_balance_ils,
      historical_payments_ils: plan.member.historical_payments_ils,
      credit_balance_ils: plan.member.credit_balance_ils,
    }).eq('id', plan.member.id);
    if (upErr) throw new Error(`update member ${plan.member.member_code}: ${upErr.message}`);

    // 2. subscriptions (skip for exceptions)
    if (plan.subscriptions.length) {
      const rowsToUpsert = plan.subscriptions.map((s) => ({ member_id: plan.member.id, ...s }));
      const { error: subErr } = await supabase
        .from('member_subscriptions')
        .upsert(rowsToUpsert, { onConflict: 'member_id,year' });
      if (subErr) throw new Error(`subs ${plan.member.member_code}: ${subErr.message}`);
    }

    // 3. audit (active_year + historical changes captured as before/after)
    await writeAudit(supabase, {
      userName, action: AUDIT_ACTIONS.ACTIVE_YEAR_CHANGE, tableName: 'members',
      recordId: plan.member.id,
      description: `Phase15 migration import (${plan.isException ? 'EXCEPTION verbatim' : 'generated'})`,
      oldData: { active_from_year: before?.active_from_year ?? null },
      newData: {
        active_from_year: plan.member.active_from_year,
        historical_balance_ils: plan.member.historical_balance_ils,
        historical_payments_ils: plan.member.historical_payments_ils,
        is_migration_exception: plan.member.is_migration_exception,
      },
    });
  }

  await supabase.from('rebuild_runs')
    .update({ status: 'completed', members_affected: plans.length, finished_at: new Date().toISOString() })
    .eq('id', run.id);

  return { runId: run.id, plans };
}

module.exports = {
  EXCEPTION_CODES, SPREADSHEET_COLUMNS, num,
  buildMigratedSubscriptions, planMemberImport, runMigration,
};
