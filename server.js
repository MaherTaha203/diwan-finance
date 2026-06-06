require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// تمرير بيانات Supabase للواجهة بأمان
app.get('/api/config', (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  });
});

// QR Verification API (نفس منطق api/verify.js لبيئة Express)
app.get('/api/verify', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { id } = req.query;
  if (!id) return res.status(400).json({ valid: false, error: 'Missing document ID' });
  const docId = id.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ valid: false, error: 'Server configuration error' });
  }
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    /* ===== TEMP QR DIAGNOSTIC LOGGING ===== */
    console.log('SUPABASE URL=', supabaseUrl);
    console.log('HAS SERVICE ROLE=', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    const probe = await supabase
      .from('receipts')
      .select('no')
      .limit(10);
    console.log('PROBE DATA=', JSON.stringify(probe.data));
    console.log('PROBE ERROR=', JSON.stringify(probe.error));

    const { data: receipt } = await supabase.from('receipts')
      .select('no, fund_type, receipt_date, amount_ils, amount, currency, notes, created_by, is_deleted')
      .ilike('no', docId).maybeSingle();
    console.log('RECEIPT=', JSON.stringify(receipt));
    if (receipt) {
      if (receipt.is_deleted) return res.status(200).json({ valid: false, error: 'Document has been cancelled' });
      const fund = receipt.fund_type === 'food' ? 'Food Fund' : receipt.fund_type === 'diwan' ? 'Diwan Fund' : receipt.fund_type === 'donation' ? 'Donations' : receipt.fund_type;
      return res.status(200).json({ valid: true, document: { id: receipt.no, type: 'Receipt Voucher', fund, date: receipt.receipt_date, amount: receipt.amount_ils || receipt.amount, currency: receipt.currency || 'ILS', description: receipt.notes || '', preparedBy: receipt.created_by || '' } });
    }
    const { data: payment } = await supabase.from('payments')
      .select('no, fund_type, payment_date, amount_ils, amount, currency, expense_type, notes, created_by, approved_by, is_deleted')
      .ilike('no', docId).maybeSingle();
    if (payment) {
      if (payment.is_deleted) return res.status(200).json({ valid: false, error: 'Document has been cancelled' });
      const fund = payment.fund_type === 'food' ? 'Food Fund' : payment.fund_type === 'diwan' ? 'Diwan Fund' : payment.fund_type;
      return res.status(200).json({ valid: true, document: { id: payment.no, type: 'Payment Voucher', fund, date: payment.payment_date, amount: payment.amount_ils || payment.amount, currency: payment.currency || 'ILS', description: payment.notes || payment.expense_type || '', preparedBy: payment.created_by || '', approvedBy: payment.approved_by || '' } });
    }
    return res.status(404).json({ valid: false, error: 'Document not found' });
  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message });
  }
});

// مسار التحقق من QR → verify.html
app.get('/verify/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// كل المسارات الأخرى (عدا /api) ترجع index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('\n  ====================================');
  console.log('  ديوان آل طه - نظام الإدارة المالية');
  console.log('  ====================================');
  console.log(`  http://localhost:${PORT}`);
  console.log('  ====================================\n');
});
