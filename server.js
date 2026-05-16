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

// كل المسارات ترجع index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('\n  ====================================');
  console.log('  ديوان آل طه - نظام الإدارة المالية');
  console.log('  ====================================');
  console.log(`  http://localhost:${PORT}`);
  console.log('  ====================================\n');
});
