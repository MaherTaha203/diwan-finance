// api/verify.js
// Vercel Serverless Function — يعمل تلقائياً على Vercel
// المسار: diwan-finance.com/api/verify?id=REC-000123

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // السماح بالطلبات من أي مصدر (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-store');

  const { id } = req.query;

  // التحقق من وجود المعرّف
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ valid: false, error: 'Missing document ID' });
  }

  // تنظيف المدخل — منع SQL Injection
  const docId = id.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');

  if (!docId) {
    return res.status(400).json({ valid: false, error: 'Invalid document ID format' });
  }

  try {
    // ────────────────────────────────────────────
    // الاستعلام من Supabase
    // جدول: vouchers
    // أعمدة: id, type, fund, date, amount, description, prepared_by, token
    // ────────────────────────────────────────────
    const { data, error } = await supabase
      .from('vouchers')
      .select('id, type, fund, date, amount, description, prepared_by')
      .eq('id', docId)
      .single();

    if (error || !data) {
      // السند غير موجود
      return res.status(404).json({ valid: false, error: 'Document not found' });
    }

    // السند موجود — إرجاع البيانات
    return res.status(200).json({
      valid: true,
      document: {
        id:          data.id,
        type:        data.type,
        fund:        data.fund,
        date:        data.date,
        amount:      data.amount,
        description: data.description,
        preparedBy:  data.prepared_by
      }
    });

  } catch (err) {
    console.error('Verification error:', err);
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
}
