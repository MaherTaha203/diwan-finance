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

const RL_WINDOW_MS = 60 * 1000;
const RL_MAX = 30;
const rlHits = new Map();

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
  if (!arr) {
    arr = [];
    rlHits.set(ip, arr);
  }
  while (arr.length && arr[0] <= now - RL_WINDOW_MS) arr.shift();
  if (arr.length >= RL_MAX) return true;
  arr.push(now);

  if (rlHits.size > 10000) {
    for (const [key, values] of rlHits) {
      if (!values.length || values[values.length - 1] <= now - RL_WINDOW_MS) {
        rlHits.delete(key);
      }
    }
  }
  return false;
}

function publicError(res, status, error) {
  return res.status(status).json({ valid: false, error });
}

module.exports = async function handler(req, res) {
  // QR verification is a public GET endpoint. CORS is intentionally not
  // enabled here; the public verification page is same-origin and does not
  // require cross-origin API access. This avoids a wildcard CORS policy.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    res.setHeader('Retry-After', '60');
    return publicError(res, 429, 'Too many requests');
  }

  const { id } = req.query;
  if (!id) return publicError(res, 400, 'Missing verification token');

  const token = String(id).trim().replace(/[^A-Za-z0-9]/g, '');
  if (!token || token.length < 10 || token.length > 64) {
    return publicError(res, 404, 'Document not found');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  // Never use a generic SUPABASE_KEY here. Verification may use the service
  // role server-side when configured, otherwise the public anon key.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseKey = serviceRoleKey || anonKey;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[verify] Missing server configuration');
    return publicError(res, 500, 'Server configuration error');
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: receipt, error: recErr } = await supabase
      .from('receipts')
      .select('no, receipt_date, is_deleted')
      .eq('verification_token', token)
      .maybeSingle();

    if (recErr) {
      console.error('[verify] receipts query failed:', recErr.code, recErr.message);
      return publicError(res, 500, 'Verification service unavailable');
    }

    if (receipt) {
      if (receipt.is_deleted === true) {
        return publicError(res, 200, 'Document has been cancelled');
      }
      return res.status(200).json({
        valid: true,
        document: {
          id: receipt.no,
          type: 'Receipt Voucher',
          date: receipt.receipt_date,
        },
      });
    }

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('no, payment_date, is_deleted')
      .eq('verification_token', token)
      .maybeSingle();

    if (payErr) {
      console.error('[verify] payments query failed:', payErr.code, payErr.message);
      return publicError(res, 500, 'Verification service unavailable');
    }

    if (payment) {
      if (payment.is_deleted === true) {
        return publicError(res, 200, 'Document has been cancelled');
      }
      return res.status(200).json({
        valid: true,
        document: {
          id: payment.no,
          type: 'Payment Voucher',
          date: payment.payment_date,
        },
      });
    }

    return publicError(res, 404, 'Document not found');
  } catch (err) {
    console.error('[verify] exception:', err && err.message);
    return publicError(res, 500, 'Verification service unavailable');
  }
};
