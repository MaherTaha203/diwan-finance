/**
 * api/verify.js — Vercel Serverless Function (also used by server.js for local dev).
 * Handles GET /api/verify?id=<verification_token>
 *
 * QR Verification security model:
 *   - Lookup is by verification_token ONLY (random base62, 16 chars).
 *     Receipt/payment NUMBERS are NEVER used for lookup → no enumeration.
 *   - Public response exposes only non-sensitive fields: number, type, date.
 *   - Per-IP rate limiting blocks abusive scanning.
 */

const { createClient } = require('@supabase/supabase-js');

/* ═══ Phase 8 — in-memory per-IP rate limiter (sliding 60s window) ═══
 * 30 requests / minute / IP (within the 20–30 target). In-memory per
 * function instance — matches the existing serverless architecture
 * (no Redis/KV in the project). On Vercel each warm instance enforces
 * the limit; in local/express it is a single process. */
const RL_WINDOW_MS = 60 * 1000;
const RL_MAX       = 30;
const rlHits = new Map(); // ip -> [timestamps]

function clientIp(req) {
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress)
      || (req.connection && req.connection.remoteAddress)
      || 'unknown';
}

function rateLimited(ip) {
  const now = Date.now();
  let arr = rlHits.get(ip);
  if (!arr) { arr = []; rlHits.set(ip, arr); }
  while (arr.length && arr[0] <= now - RL_WINDOW_MS) arr.shift();
  if (arr.length >= RL_MAX) return true;
  arr.push(now);
  if (rlHits.size > 10000) { // opportunistic cleanup to bound memory
    for (const [k, v] of rlHits) {
      if (!v.length || v[v.length - 1] <= now - RL_WINDOW_MS) rlHits.delete(k);
    }
  }
  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  /* ── Phase 8: rate limit ── */
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ valid: false, error: 'Too many requests' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ valid: false, error: 'Missing verification token' });

  /* ── Phase 6: tokens are case-sensitive base62 — sanitise but DO NOT uppercase. ── */
  const token = String(id).trim().replace(/[^A-Za-z0-9]/g, '');
  if (!token || token.length < 10 || token.length > 64) {
    /* Malformed/short input → generic not-found (no enumeration signal). */
    return res.status(404).json({ valid: false, error: 'Document not found' });
  }

  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey        = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  const supabaseKey    = serviceRoleKey || anonKey;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      valid: false,
      error: 'Server configuration error',
      debug: { url: supabaseUrl ? 'OK' : 'MISSING', key: supabaseKey ? 'OK' : 'MISSING' },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    /* ── RECEIPTS — lookup by verification_token ONLY (never by number).
     *    Select only the public fields; is_deleted is checked in JS. ── */
    const { data: receipt, error: recErr } = await supabase
      .from('receipts')
      .select('no, receipt_date, is_deleted')
      .eq('verification_token', token)
      .maybeSingle();

    if (recErr) {
      console.log('[verify] receipts query FAILED :', recErr.code, recErr.message);
      return res.status(500).json({ valid: false, error: recErr.message, code: recErr.code });
    }

    if (receipt) {
      if (receipt.is_deleted === true) {
        return res.status(200).json({ valid: false, error: 'Document has been cancelled' });
      }
      /* Phase 7 — public set ONLY: number, type, date.
       * No amount / currency / description / fund / member / internal IDs / notes. */
      return res.status(200).json({
        valid: true,
        document: { id: receipt.no, type: 'Receipt Voucher', date: receipt.receipt_date },
      });
    }

    /* ── PAYMENTS — lookup by verification_token ONLY ── */
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('no, payment_date, is_deleted')
      .eq('verification_token', token)
      .maybeSingle();

    if (payErr) {
      console.log('[verify] payments query FAILED :', payErr.code, payErr.message);
      return res.status(500).json({ valid: false, error: payErr.message, code: payErr.code });
    }

    if (payment) {
      if (payment.is_deleted === true) {
        return res.status(200).json({ valid: false, error: 'Document has been cancelled' });
      }
      return res.status(200).json({
        valid: true,
        document: { id: payment.no, type: 'Payment Voucher', date: payment.payment_date },
      });
    }

    /* ── Phase 9 — unknown token → generic not-found, identical for every miss. ── */
    return res.status(404).json({ valid: false, error: 'Document not found' });

  } catch (err) {
    console.log('[verify] EXCEPTION:', err.message);
    return res.status(500).json({ valid: false, error: err.message });
  }
};
