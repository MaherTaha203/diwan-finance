/**
 * tools/export-to-excel.mjs
 * ديوان آل طه — مُصدّر البيانات من Supabase إلى ملف Excel (ورقة لكل جدول).
 *
 * WHAT: Pulls every table exposed by the project's PostgREST API and writes a
 *       single multi-sheet .xlsx using the certified "Diwan sheet" look
 *       (navy 0F1B33 header, F2F5FA zebra, RTL, autofilter, frozen header,
 *       ₪ number format) — identical palette to public/js/report-render-excel.js.
 *
 * WHY curl (not fetch): outbound HTTPS in this environment goes through an agent
 *       proxy with its own CA. curl reads HTTPS_PROXY and we pass --cacert, so it
 *       works without wiring an undici ProxyAgent. The Supabase host must be
 *       allowed by the environment network policy for this to connect.
 *
 * USAGE:
 *   node tools/export-to-excel.mjs                 # all exposed tables
 *   node tools/export-to-excel.mjs --tables members,receipts,payments
 *   node tools/export-to-excel.mjs --out exports/custom.xlsx --page 1000
 *   node tools/export-to-excel.mjs --self-test     # offline: write a synthetic workbook
 *
 * ENV (.env, auto-loaded): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (preferred)
 *   or SUPABASE_ANON_KEY (limited by RLS — likely incomplete for a full export).
 *
 * Output goes to ./exports/ (gitignored — contains member/financial PII).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx-js-style';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ── Diwan sheet palette (Theme-01) — matches report-render-excel.js ───────── */
const NAVY = '0F1B33', WHITE = 'FFFFFF', BG = 'F2F5FA', GOLD = 'B99A47', LINE = 'E2E8F0', SUB = '64748B';
const MONEY_Z = '₪ #,##0.00';
const PAGE_DEFAULT = 1000;      // PostgREST hard max per request
const ROW_SAFETY_CAP = 500000;  // guard against runaway pulls

/* columns that should render as money (by key) */
const MONEY_RE = /(amount|total|balance|paid|unpaid|due|sum|price|fee|debit|credit|value|mablagh|مبلغ|رصيد|اجمالي|إجمالي|مدفوع|مستحق)/i;

/* ── tiny .env loader (no dependency) ──────────────────────────────────────── */
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}

/* ── CLI args ──────────────────────────────────────────────────────────────── */
function parseArgs(argv) {
  const a = { tables: null, out: null, page: PAGE_DEFAULT, selfTest: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--self-test') a.selfTest = true;
    else if (t === '--tables') a.tables = (argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
    else if (t === '--out') a.out = argv[++i];
    else if (t === '--page') a.page = Math.max(1, Math.min(1000, parseInt(argv[++i], 10) || PAGE_DEFAULT));
  }
  return a;
}

/* ── HTTP via curl (proxy + CA aware) ──────────────────────────────────────── */
const CA_BUNDLE = '/root/.ccr/ca-bundle.crt';
function curl(url, { headers = {}, dumpHeadersTo = null } = {}) {
  const args = ['-sS', '--max-time', '120', '--retry', '3', '--retry-delay', '2'];
  if (fs.existsSync(CA_BUNDLE)) args.push('--cacert', CA_BUNDLE);
  for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`);
  if (dumpHeadersTo) args.push('-D', dumpHeadersTo);
  args.push(url);
  try {
    return execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  } catch (e) {
    const stderr = (e.stderr || '').toString();
    throw new Error(`curl failed for ${url}\n${stderr || e.message}`);
  }
}

function apiHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

/* ── discover exposed tables from PostgREST OpenAPI root ────────────────────── */
function discoverTables(baseUrl, key) {
  const body = curl(`${baseUrl}/rest/v1/`, { headers: apiHeaders(key) });
  let doc;
  try { doc = JSON.parse(body); } catch { throw new Error('Could not parse PostgREST root (OpenAPI). Is the host reachable and the key valid?'); }
  const defs = doc.definitions || (doc.components && doc.components.schemas) || {};
  // PostgREST lists tables and views; exclude obvious RPC artefacts (none in definitions).
  return Object.keys(defs).sort((a, b) => a.localeCompare(b));
}

/* ── fetch all rows of a table, paginated via Range ────────────────────────── */
function fetchTable(baseUrl, key, table, page) {
  const rows = [];
  let offset = 0, total = null;
  for (;;) {
    const to = offset + page - 1;
    const hdrFile = path.join(ROOT, '.tmp-range-hdr');
    const url = `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*`;
    const body = curl(url, {
      headers: { ...apiHeaders(key), Range: `${offset}-${to}`, 'Range-Unit': 'items', Prefer: 'count=exact' },
      dumpHeadersTo: hdrFile,
    });
    // content-range: e.g. "0-999/5231"
    let batch;
    try { batch = JSON.parse(body); } catch { throw new Error(`Table ${table}: non-JSON response: ${body.slice(0, 200)}`); }
    if (!Array.isArray(batch)) {
      // PostgREST error object (RLS denial, missing table, etc.)
      const msg = (batch && (batch.message || batch.hint || batch.code)) || JSON.stringify(batch).slice(0, 200);
      throw new Error(`Table ${table}: ${msg}`);
    }
    if (total === null && fs.existsSync(hdrFile)) {
      const h = fs.readFileSync(hdrFile, 'utf8');
      const m = h.match(/content-range:\s*\d+-\d+\/(\d+|\*)/i);
      if (m && m[1] !== '*') total = parseInt(m[1], 10);
    }
    try { fs.unlinkSync(hdrFile); } catch {}
    rows.push(...batch);
    if (batch.length < page) break;                 // last page
    offset += page;
    if (total !== null && offset >= total) break;
    if (rows.length >= ROW_SAFETY_CAP) { console.warn(`  ⚠ ${table}: hit safety cap ${ROW_SAFETY_CAP}; stopping.`); break; }
  }
  return { rows, total: total ?? rows.length };
}

/* ── normalize a value for a spreadsheet cell ──────────────────────────────── */
function cellValue(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') return v;
  // objects / arrays (jsonb) → compact JSON string
  try { return JSON.stringify(v); } catch { return String(v); }
}

/* ── union of column keys, first-seen order preserved ──────────────────────── */
function columnsOf(rows) {
  const seen = new Set(), cols = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); cols.push(k); }
  return cols;
}

/* ── build one styled worksheet (Diwan look) from rows ─────────────────────── */
function buildTableSheet(table, rows) {
  const cols = columnsOf(rows);
  const header = cols.length ? cols : ['(empty)'];
  const aoa = [header, ...rows.map(r => cols.map(c => cellValue(r[c])))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!rtl'] = true;

  const nCols = header.length;
  const range = XLSX.utils.decode_range(ws['!ref']);

  // column widths from content (bounded)
  ws['!cols'] = header.map((h, ci) => {
    let w = String(h).length;
    for (let r = 0; r < rows.length && r < 500; r++) {
      const v = aoa[r + 1][ci];
      const len = v == null ? 0 : String(v).length;
      if (len > w) w = len;
    }
    return { wch: Math.max(8, Math.min(60, w + 2)) };
  });

  const thin = { style: 'thin', color: { rgb: LINE } };
  const border = { top: thin, bottom: thin, left: thin, right: thin };
  const moneyCol = header.map(h => MONEY_RE.test(h));

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[ref]; if (!cell) continue;
      cell.s = { border, alignment: { vertical: 'center', readingOrder: 2, wrapText: false } };
      if (R === 0) {
        cell.s.fill = { fgColor: { rgb: NAVY } };
        cell.s.font = { color: { rgb: WHITE }, bold: true, sz: 11 };
        cell.s.alignment.horizontal = 'center';
      } else {
        if (R % 2 === 1) cell.s.fill = { fgColor: { rgb: BG } }; // zebra (data row index)
        cell.s.alignment.horizontal = typeof cell.v === 'number' ? 'left' : 'start';
        if (moneyCol[C] && typeof cell.v === 'number') cell.z = MONEY_Z;
      }
    }
  }

  // autofilter + frozen header
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } }) };
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  return ws;
}

/* ── index sheet (فهرس) ─────────────────────────────────────────────────────── */
function buildIndexSheet(meta, summary) {
  const aoa = [
    ['ديوان آل طه — فهرس التصدير'],
    [`التاريخ: ${meta.when}`, `المشروع: ${meta.ref}`, `عدد الجداول: ${summary.length}`],
    [],
    ['الجدول', 'عدد الصفوف', 'عدد الأعمدة', 'الحالة'],
    ...summary.map(s => [s.table, s.rows, s.cols, s.status]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!rtl'] = true;
  ws['!cols'] = [{ wch: 34 }, { wch: 14 }, { wch: 14 }, { wch: 40 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, { s: { r: 1, c: 1 }, e: { r: 1, c: 1 } }];
  const thin = { style: 'thin', color: { rgb: LINE } };
  const border = { top: thin, bottom: thin, left: thin, right: thin };
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[ref]; if (!cell) continue;
      cell.s = { alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 } };
      if (R === 0) { cell.s.font = { color: { rgb: NAVY }, bold: true, sz: 15 }; }
      else if (R === 1) { cell.s.font = { color: { rgb: SUB }, sz: 10 }; }
      else if (R === 3) { cell.s.fill = { fgColor: { rgb: NAVY } }; cell.s.font = { color: { rgb: WHITE }, bold: true }; cell.s.border = border; }
      else if (R >= 4) { cell.s.border = border; if (R % 2 === 0) cell.s.fill = { fgColor: { rgb: BG } }; }
    }
  }
  ws['!autofilter'] = { ref: 'A4:D4' };
  ws['!freeze'] = { xSplit: 0, ySplit: 4, topLeftCell: 'A5', activePane: 'bottomLeft', state: 'frozen' };
  return ws;
}

/* Excel sheet-name rule: ≤31 chars, none of []:*?/\ , unique */
function safeSheetName(name, used) {
  let s = String(name).replace(/[\[\]\:\*\?\/\\]/g, '_').slice(0, 31) || 'sheet';
  let base = s, i = 2;
  while (used.has(s)) { s = `${base.slice(0, 28)}_${i++}`; }
  used.add(s);
  return s;
}

/* ── self-test: offline synthetic workbook (no network) ────────────────────── */
function selfTest() {
  const outDir = path.join(ROOT, 'exports');
  fs.mkdirSync(outDir, { recursive: true });
  const rows = [
    { id: 1, full_name: 'عضو تجريبي', amount: 1500.5, created_at: '2026-01-01T10:00:00Z', meta: { tag: 'x' } },
    { id: 2, full_name: 'عضو آخر', amount: 320, created_at: '2026-02-01T10:00:00Z', meta: null },
  ];
  const used = new Set();
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, buildIndexSheet({ when: new Date().toISOString(), ref: 'self-test' },
    [{ table: 'members', rows: rows.length, cols: columnsOf(rows).length, status: 'ok' }]), safeSheetName('فهرس', used));
  XLSX.utils.book_append_sheet(wb, buildTableSheet('members', rows), safeSheetName('members', used));
  const out = path.join(outDir, 'self-test.xlsx');
  XLSX.writeFile(wb, out);
  const stat = fs.statSync(out);
  const back = XLSX.readFile(out);
  console.log(`✓ self-test wrote ${out} (${stat.size} bytes); sheets: ${back.SheetNames.join(', ')}`);
  if (stat.size < 2000 || back.SheetNames.length !== 2) { console.error('✗ self-test sanity failed'); process.exit(1); }
}

/* ── main ──────────────────────────────────────────────────────────────────── */
function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();

  const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!baseUrl || !key) {
    console.error('✗ Missing SUPABASE_URL or a key (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY) in .env');
    process.exit(2);
  }
  const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ref = (baseUrl.match(/https?:\/\/([^.]+)\./) || [])[1] || baseUrl;
  console.log(`→ project: ${ref}  |  key: ${usingServiceRole ? 'service_role (full)' : 'anon (RLS-limited)'}`);
  if (!usingServiceRole) console.warn('  ⚠ anon key: rows may be incomplete due to RLS. service_role recommended for a full export.');

  let tables = args.tables;
  if (!tables) { console.log('→ discovering exposed tables…'); tables = discoverTables(baseUrl, key); }
  console.log(`→ ${tables.length} table(s): ${tables.join(', ')}`);

  const used = new Set();
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  const summary = [];
  const idxName = safeSheetName('فهرس', used);           // reserve index as first sheet
  const idxPlaceholder = XLSX.utils.aoa_to_sheet([['...']]);
  XLSX.utils.book_append_sheet(wb, idxPlaceholder, idxName);

  for (const t of tables) {
    process.stdout.write(`  • ${t} … `);
    try {
      const { rows, total } = fetchTable(baseUrl, key, t, args.page);
      const cols = columnsOf(rows).length;
      XLSX.utils.book_append_sheet(wb, buildTableSheet(t, rows), safeSheetName(t, used));
      summary.push({ table: t, rows: rows.length, cols, status: rows.length === total ? 'ok' : `${rows.length}/${total}` });
      console.log(`${rows.length} rows, ${cols} cols`);
    } catch (e) {
      summary.push({ table: t, rows: 0, cols: 0, status: `خطأ: ${e.message.split('\n')[0].slice(0, 80)}` });
      console.log(`SKIPPED (${e.message.split('\n')[0]})`);
    }
  }

  // replace placeholder index with the real one
  wb.Sheets[idxName] = buildIndexSheet({ when: new Date().toISOString(), ref }, summary);

  const outDir = path.join(ROOT, 'exports');
  fs.mkdirSync(outDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const out = args.out ? path.resolve(ROOT, args.out) : path.join(outDir, `diwan-export-${date}.xlsx`);
  XLSX.writeFile(wb, out);
  const totalRows = summary.reduce((a, s) => a + s.rows, 0);
  console.log(`\n✓ wrote ${out}`);
  console.log(`  tables: ${summary.length} | rows total: ${totalRows}`);
  const failed = summary.filter(s => s.status.startsWith('خطأ'));
  if (failed.length) console.log(`  ⚠ ${failed.length} table(s) skipped — see the فهرس sheet.`);
}

main();
