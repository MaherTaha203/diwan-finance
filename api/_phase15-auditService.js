'use strict';

/**
 * auditService — Phase 15
 * Reuses the EXISTING public.audit_log table (append-only, jsonb old_data/new_data).
 * Does NOT create a second audit trail.
 *
 * audit_log columns: user_name, action, table_name, record_id, description,
 *                    old_data (jsonb), new_data (jsonb), created_at.
 *
 * Every mutable accounting input + every action routes through here so that
 * old/new values are captured uniformly. Caller supplies a supabase client
 * already scoped to the acting identity (service_role from the Express API).
 */

// Canonical action names for structured accounting (kept stable for querying).
const AUDIT_ACTIONS = Object.freeze({
  ACTIVE_YEAR_CHANGE:        'active_year_change',
  HISTORICAL_BALANCE_CHANGE: 'historical_balance_change',
  HISTORICAL_PAYMENT_CHANGE: 'historical_payment_change',
  CREDIT_BALANCE_CHANGE:     'credit_balance_change',
  SUBSCRIPTION_OVERRIDE:     'subscription_override',
  ALLOCATION_CHANGE:         'allocation_change',
  REBUILD_ACCOUNT:           'rebuild_account',
});

/**
 * @param {object} supabase           supabase-js client (service_role)
 * @param {object} entry
 * @param {string} entry.userName     acting admin (required)
 * @param {string} entry.action       one of AUDIT_ACTIONS
 * @param {string} entry.tableName    affected table (e.g. 'members')
 * @param {string} [entry.recordId]   affected row id (uuid)
 * @param {string} [entry.description] human-readable summary (bilingual upstream)
 * @param {object} [entry.oldData]    before snapshot
 * @param {object} [entry.newData]    after snapshot
 */
async function writeAudit(supabase, entry) {
  if (!entry || !entry.userName) throw new Error('audit: userName is required');
  if (!Object.values(AUDIT_ACTIONS).includes(entry.action)) {
    throw new Error(`audit: unknown action "${entry.action}"`);
  }
  const row = {
    user_name:   entry.userName,
    action:      entry.action,
    table_name:  entry.tableName ?? null,
    record_id:   entry.recordId ?? null,
    description: entry.description ?? null,
    old_data:    entry.oldData ?? null,
    new_data:    entry.newData ?? null,
  };
  const { error } = await supabase.from('audit_log').insert(row);
  if (error) throw new Error(`audit insert failed: ${error.message}`);
}

/**
 * Convenience: audit a single-field change only when the value actually moved.
 * Returns true if an audit row was written.
 */
async function auditFieldChange(supabase, { userName, action, tableName, recordId, field, oldValue, newValue, reason }) {
  if (oldValue === newValue) return false;
  await writeAudit(supabase, {
    userName, action, tableName, recordId,
    description: reason
      ? `${field}: ${oldValue} -> ${newValue} (${reason})`
      : `${field}: ${oldValue} -> ${newValue}`,
    oldData: { [field]: oldValue },
    newData: { [field]: newValue, ...(reason ? { reason } : {}) },
  });
  return true;
}

module.exports = { AUDIT_ACTIONS, writeAudit, auditFieldChange };
