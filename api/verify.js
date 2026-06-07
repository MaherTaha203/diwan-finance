const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ valid: false, error: 'Missing document ID' });
  }

  const docId = id.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');

  const supabaseUrl = process.env.SUPABASE_URL;

  /*
   * Use service role key so the query bypasses Row Level Security.
   * Fall back to anon key if service role is not configured.
   * Bug fix: the previous version only tried SUPABASE_ANON_KEY, which
   * is blocked by RLS when there is no authenticated session.
   */
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      valid: false,
      error: 'Server configuration error',
      url: supabaseUrl ? 'OK' : 'MISSING',
      key: supabaseKey ? 'OK' : 'MISSING',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    /*
     * RECEIPTS — query without .eq('is_deleted', false).
     *
     * Bug fix: the previous version used .eq('is_deleted', false) which
     * translates to SQL  WHERE is_deleted = false.
     * Records inserted without explicitly setting is_deleted have
     * is_deleted = NULL.  NULL != false in PostgreSQL, so every valid
     * record was excluded and the query always returned null.
     *
     * Correct approach: fetch the row, then check is_deleted in JS.
     */
    const { data: receipt, error: recErr } = await supabase
      .from('receipts')
      .select('no, fund_type, receipt_date, amount_ils, amount, currency, notes, created_by, is_deleted')
      .ilike('no', docId)
      .maybeSingle();

    if (recErr) {
      return res.status(500).json({ valid: false, error: recErr.message, code: recErr.code });
    }

    if (receipt) {
      if (receipt.is_deleted) {
        return res.status(200).json({ valid: false, error: 'Document has been cancelled' });
      }
      const fund =
        receipt.fund_type === 'food'     ? 'Food Fund'  :
        receipt.fund_type === 'diwan'    ? 'Diwan Fund' :
        receipt.fund_type === 'donation' ? 'Donations'  :
        receipt.fund_type || '';
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

    /*
     * PAYMENTS — fall through if no receipt matched.
     * Bug fix: the previous version never checked the payments table,
     * so all PAY vouchers returned 404.
     */
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('no, fund_type, payment_date, amount_ils, amount, currency, expense_type, notes, created_by, approved_by, is_deleted')
      .ilike('no', docId)
      .maybeSingle();

    if (payErr) {
      return res.status(500).json({ valid: false, error: payErr.message, code: payErr.code });
    }

    if (payment) {
      if (payment.is_deleted) {
        return res.status(200).json({ valid: false, error: 'Document has been cancelled' });
      }
      const fund =
        payment.fund_type === 'food'  ? 'Food Fund'  :
        payment.fund_type === 'diwan' ? 'Diwan Fund' :
        payment.fund_type || '';
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

    return res.status(404).json({ valid: false, error: 'Document not found' });

  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message });
  }
};
