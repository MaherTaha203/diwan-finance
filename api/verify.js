const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ valid: false, error: 'Missing document ID' });
  }

  const docId = id.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');

  // تحقق من المتغيرات
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      valid: false, 
      error: 'Missing env vars',
      url: supabaseUrl ? 'OK' : 'MISSING',
      key: supabaseKey ? 'OK' : 'MISSING'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
console.log('ID FROM URL:', id);
console.log('DOC ID:', docId);
  const { data, error } = await supabase
.from('receipts')
.select('*')
.ilike('no', docId)
.eq('is_deleted', false)
.maybeSingle();
console.log('QUERY RESULT:', data);
console.log('QUERY ERROR:', error);
if (error) {
return res.status(500).json({
valid: false,
error: error.message,
code: error.code
});
}

if (!data) {
return res.status(404).json({
valid: false,
error: 'Document not found'
});
}

return res.status(200).json({
valid: true,
document: {
id: data.no,
type: 'Receipt Voucher',
fund: data.fund_type,
date: data.receipt_date,
amount: data.amount_ils,
description: data.description,
preparedBy: data.created_by
}
});

    if (error) {
      return res.status(500).json({ 
        valid: false, 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }

    if (!data) {
      return res.status(404).json({ valid: false, error: 'Document not found' });
    }

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
    return res.status(500).json({ valid: false, error: err.message });
  }
};
