/**
 * api/verify.js — Vercel Serverless Function
 * Handles GET /api/verify?id=DOC-XXXXX
 *
 * Fix history:
 *   Issue A — reads SUPABASE_SERVICE_ROLE_KEY first (bypasses RLS)
 *   Issue B — uses .eq() not .ilike() to eliminate PGRST125
 *   Issue C — is_deleted checked in JS, not in the SQL filter
 *   Issue D — queries payments table when receipts returns nothing
 *   Issue E — all dead code removed
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ valid: false, error: 'Missing document ID' });
  }

  /* Normalise: uppercase, strip anything that is not A-Z 0-9 or dash */
  const docId = id.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');

  /* ── KEY SELECTION (Issue A) ─────────────────────────────────────
   * Service role key bypasses Row Level Security entirely.
   * Anon key is the fallback only — it is blocked by RLS and will
   * return empty results or PGRST125 on restrictive policies.
   * SUPABASE_SERVICE_ROLE_KEY must be set in Vercel → Settings → Env.
   * ──────────────────────────────────────────────────────────────── */
  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey        = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  const supabaseKey    = serviceRoleKey || anonKey;

  /* ── DIAGNOSTIC LOGGING ──────────────────────────────────────────
   * Read at: Vercel Dashboard → Deployments → Functions → Logs
   * Remove this block once the fix is confirmed in production.
   * ──────────────────────────────────────────────────────────────── */
  console.log('[verify] ── RUNTIME DIAGNOSTICS ──────────────────────');
  console.log('[verify] raw id                :', id);
  console.log('[verify] docId (normalised)    :', docId);
  console.log('[verify] SUPABASE_URL          :', supabaseUrl   || 'MISSING');
  console.log('[verify] key type              :', serviceRoleKey ? 'SERVICE_ROLE' : anonKey ? 'ANON' : 'MISSING');
  console.log('[verify] key prefix            :', supabaseKey ? supabaseKey.slice(0, 20) + '...' : 'n/a');

  if (!supabaseUrl || !supabaseKey) {
    console.log('[verify] ABORT: env vars missing');
    return res.status(500).json({
      valid: false,
      error: 'Server configuration error',
      debug: {
        url: supabaseUrl ? 'OK' : 'MISSING',
        key: supabaseKey ? 'OK' : 'MISSING',
      },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    /* ── RECEIPTS ────────────────────────────────────────────────────
     * Issue B fix: .eq() instead of .ilike() — docId is already
     *              uppercase so case-insensitive match is unnecessary,
     *              and .ilike() generates PGRST125 under restrictive RLS.
     * Issue C fix: is_deleted is NOT filtered in SQL; checked in JS
     *              below so that NULL-flagged rows are also handled.
     * ──────────────────────────────────────────────────────────────── */
    const { data: receipt, error: recErr } = await supabase
      .from('receipts')
      .select('no, fund_type, receipt_date, amount_ils, amount, currency, notes, created_by, is_deleted')
      .eq('no', docId)
      .maybeSingle();

    console.log('[verify] receipts result       :', JSON.stringify(receipt));
    console.log('[verify] receipts error        :', JSON.stringify(recErr));

    if (recErr) {
      console.log('[verify] receipts query FAILED :', recErr.code, recErr.message);
      return res.status(500).json({ valid: false, error: recErr.message, code: recErr.code });
    }

    if (receipt) {
      /* Issue C: is_deleted = NULL is treated as not deleted */
      if (receipt.is_deleted === true) {
        console.log('[verify] receipt is CANCELLED');
        return res.status(200).json({ valid: false, error: 'Document has been cancelled' });
      }
      const fund =
        receipt.fund_type === 'food'     ? 'Food Fund'  :
        receipt.fund_type === 'diwan'    ? 'Diwan Fund' :
        receipt.fund_type === 'donation' ? 'Donations'  :
        receipt.fund_type                || '';
      console.log('[verify] receipt FOUND, returning valid');
      return res.status(200).json({
        valid: true,
        document: {
          id:          receipt.no,
          type:        'Receipt Voucher',
          fund,
          date:        receipt.receipt_date,
          amount:      receipt.amount_ils || receipt.amount,
          currency:    receipt.currency   || 'ILS',
          description: receipt.notes      || '',
          preparedBy:  receipt.created_by || '',
        },
      });
    }

    /* ── PAYMENTS (Issue D fix: was never queried before) ────────────
     * Exact same pattern as receipts: .eq() not .ilike(),
     * is_deleted checked in JS.
     * ──────────────────────────────────────────────────────────────── */
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('no, fund_type, payment_date, amount_ils, amount, currency, expense_type, notes, created_by, approved_by, is_deleted')
      .eq('no', docId)
      .maybeSingle();

    console.log('[verify] payments result       :', JSON.stringify(payment));
    console.log('[verify] payments error        :', JSON.stringify(payErr));

    if (payErr) {
      console.log('[verify] payments query FAILED :', payErr.code, payErr.message);
      return res.status(500).json({ valid: false, error: payErr.message, code: payErr.code });
    }

    if (payment) {
      if (payment.is_deleted === true) {
        console.log('[verify] payment is CANCELLED');
        return res.status(200).json({ valid: false, error: 'Document has been cancelled' });
      }
      const fund =
        payment.fund_type === 'food'     ? 'Food Fund'  :
        payment.fund_type === 'diwan'    ? 'Diwan Fund' :
        payment.fund_type                || '';
      console.log('[verify] payment FOUND, returning valid');
      return res.status(200).json({
        valid: true,
        document: {
          id:          payment.no,
          type:        'Payment Voucher',
          fund,
          date:        payment.payment_date,
          amount:      payment.amount_ils    || payment.amount,
          currency:    payment.currency      || 'ILS',
          description: payment.notes         || payment.expense_type || '',
          preparedBy:  payment.created_by    || '',
          approvedBy:  payment.approved_by   || '',
        },
      });
    }

    console.log('[verify] NOT FOUND for docId:', docId);
    return res.status(404).json({ valid: false, error: 'Document not found' });

  } catch (err) {
    console.log('[verify] EXCEPTION:', err.message);
    return res.status(500).json({ valid: false, error: err.message });
  }
};
