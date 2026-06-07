/**
 * server.js — Local development Express server only.
 * On Vercel, /api/verify is handled by api/verify.js (Vercel serverless).
 * This file mirrors that logic so local dev behaves identically to production.
 *
 * Fix history (matches api/verify.js):
 *   Issue A — reads SUPABASE_SERVICE_ROLE_KEY first (bypasses RLS)
 *   Issue B — uses .eq() not .ilike() to eliminate PGRST125
 *   Issue C — is_deleted checked in JS, not in SQL filter
 *   Issue D — queries payments table when receipts returns nothing
 *   Issue E — dead code, wrong field names removed
 *   Issue G — unnecessary probe query removed
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { createClient } = require('@supabase/supabase-js');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ── /api/config — pass Supabase URL + anon key to the browser client ── */
app.get('/api/config', (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY,
  });
});

/* ── /api/verify — QR verification (mirrors api/verify.js exactly) ───── */
app.get('/api/verify', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ valid: false, error: 'Missing document ID' });
  }

  const docId = id.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');

  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey        = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  const supabaseKey    = serviceRoleKey || anonKey;

  /* ── DIAGNOSTIC LOGGING ───────────────────────────────────────────────
   * Remove this block after the fix is confirmed in production.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('[verify] ── RUNTIME DIAGNOSTICS (server.js) ──────────');
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

    /* ── RECEIPTS ─────────────────────────────────────────────────────── */
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

    /* ── PAYMENTS ─────────────────────────────────────────────────────── */
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
});

/* ── /verify/* — serve QR verification page ──────────────────────────── */
app.get('/verify/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

/* ── catch-all ────────────────────────────────────────────────────────── */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('\n  ====================================');
  console.log('  ديوان آل طه — خادم التطوير المحلي');
  console.log('  ====================================');
  console.log(`  http://localhost:${PORT}`);
  console.log('  ====================================\n');
});
