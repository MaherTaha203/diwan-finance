/**
 * server.js — Local development Express server only.
 * On Vercel, /api/verify is handled by api/verify.js (Vercel serverless).
 *
 * SINGLE SOURCE OF TRUTH: this file delegates /api/verify to the exact
 * same handler exported by api/verify.js — no duplicated logic.
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const verifyHandler = require('./api/verify.js');

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

/* ── /api/verify — delegates to api/verify.js (single source of truth) ── */
app.get('/api/verify', (req, res) => verifyHandler(req, res));

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
