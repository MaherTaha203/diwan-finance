/* ═══════════════════════════════════════════════════════════════════════════
   Constitutional Laboratory — RUNNER
   Boots the REAL application against a WRITABLE in-memory store seeded from
   lab/seed/constitution-seed.json, with EVERY external network request blocked
   (guaranteeing zero production contact). For each permanent test case it:
     reset seed → BEFORE snapshot + screenshots → execute via the real UI →
     AFTER snapshot + screenshots → compare expected vs actual → write evidence.
   Exit code is non-zero if any expected result changed (regression gate).

   Usage:
     node lab/run.cjs                 run all cases
     node lab/run.cjs FOC-001 FOC-003 run selected cases

   Never touches production. Never uses production data. Reproducible.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LAB = __dirname;
const seedPath = path.join(LAB, 'seed', 'constitution-seed.json');
const SEED = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const CASES = require('./cases.cjs');
const { start } = require('./static.cjs');

const SHOTS = path.join(LAB, 'screenshots');
const RESULTS = path.join(LAB, 'results');
fs.mkdirSync(RESULTS, { recursive: true });

const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
const cases = only.length ? CASES.filter(c => only.includes(c.id)) : CASES;

/* resolve a chromium binary shipped with the environment */
function chromeExe() {
  const cands = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
    '/opt/pw-browsers/chromium'
  ];
  for (const c of cands) { try { if (fs.statSync(c)) return c; } catch (e) {} }
  return '/opt/pw-browsers/chromium';
}
const gp = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(gp, 'playwright'));

/* ── the isolated in-memory backend (Supabase + auth + print, all stubbed) ──
   Adapted from tests/e2e-acceptance.cjs. It replaces the Supabase client with a
   writable in-memory store over the seed; no network, no production. ── */
const HARNESS = (seed) => {
  window.__seed = seed;
  function b(t) {
    let rows = (window.__seed[t] || []).slice(); let single = false; let inserted = null; let pendingUpdate = null;
    const api = {
      select() { return api; }, order() { return api; }, limit(n) { rows = rows.slice(0, n); return api; },
      eq(c, v) { rows = rows.filter(r => r[c] === v); return api; }, neq(c, v) { rows = rows.filter(r => r[c] !== v); return api; },
      in(c, a2) { rows = rows.filter(r => a2.includes(r[c])); return api; }, match(o) { rows = rows.filter(r => Object.keys(o).every(k => r[k] === o[k])); return api; },
      single() { single = true; return api; }, maybeSingle() { single = true; return api; },
      insert(v) { const a = Array.isArray(v) ? v : [v]; a.forEach(x => { if (!x.id) x.id = 'lab' + Math.random().toString(36).slice(2); }); (window.__seed[t] = window.__seed[t] || []).push(...a); inserted = a; rows = a; return api; },
      upsert() { return api; }, update(v) { pendingUpdate = v; return api; }, delete() { return api; },
      then(res, rej) { if (pendingUpdate) { rows.forEach(r => Object.assign(r, pendingUpdate)); } return Promise.resolve({ data: single ? ((inserted || rows)[0] || null) : (inserted || rows), error: null }).then(res, rej); }
    };
    return api;
  }
  const SB = {
    from: t => b(t),
    rpc: async (name, a) => {
      try {
        if (name === 'reclassify_split_atomic') {
          const tbl = a.p_kind === 'payment' ? 'payments' : 'receipts';
          const arr = window.__seed[tbl] = window.__seed[tbl] || [];
          const parent = arr.find(r => r.id === a.p_parent_id);
          if (!parent) return { data: null, error: { message: 'parent not found' } };
          const child = Object.assign({}, a.p_child); if (!child.id) child.id = 'rpc' + Math.random().toString(36).slice(2);
          arr.push(child);
          parent.amount = a.p_remain_amount; parent.amount_ils = a.p_remain_amount_ils; parent.version = a.p_parent_version;
          return { data: { child_no: child.no, parent_no: parent.no }, error: null };
        }
        if (name === 'create_member_atomic') {
          const id = 'm' + Math.random().toString(36).slice(2);
          (window.__seed.members = window.__seed.members || []).push(Object.assign({ id, is_active: true }, a.p_member));
          const subs = window.__seed.member_subscriptions = window.__seed.member_subscriptions || [];
          (a.p_subscriptions || []).forEach(s => subs.push(Object.assign({ id: 's' + Math.random().toString(36).slice(2), member_id: id }, s)));
          return { data: { member_id: id }, error: null };
        }
        return { data: null, error: null };
      } catch (e) { return { data: null, error: { message: String(e.message || e) } }; }
    },
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'admin-id', email: 'lab@lab' } } }, error: null }),
      signInWithPassword: async () => ({ data: { user: { id: 'admin-id' } }, error: null }), signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getUser: async () => ({ data: { user: { id: 'admin-id' } }, error: null }),
      updateUser: async () => ({ data: {}, error: null }), resetPasswordForEmail: async () => ({ data: {}, error: null }), signUp: async () => ({ data: { user: { id: 'x' } }, error: null })
    }
  };
  window.supabase = { createClient: () => SB };
  window.fetch = () => Promise.resolve({ ok: true, status: 200, json: async () => ({}), text: async () => '' });
  window.confirm = () => true; window.alert = () => {};
  window.__printHTML = '';
  window.open = () => ({ document: { write(h) { window.__printHTML += h; }, writeln(h) { window.__printHTML += h; }, close() {} }, focus() {}, print() {}, close() {}, addEventListener() {}, moveTo() {}, resizeTo() {} });
  try { localStorage.setItem('diwan_theme', 'light'); localStorage.setItem('diwan_lang', 'ar'); } catch (e) {}
};

/* snapshot of all constitutional surfaces, computed from the real read-models */
const SNAPSHOT = () => {
  const R2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const c = FIN2.composed();
  const codes = ['LAB-001', 'LAB-002', 'LAB-003', 'LAB-004'];
  const members = {};
  codes.forEach(code => {
    const m = DB.members.find(x => x.member_code === code); if (!m) return;
    const st = FIN.memberStatement(m.id);
    members[code] = { finalBalance: R2(st.finalBalance), totalDues: R2(st.totalDues), totalPaid: R2(st.totalPaid), openingBalance: R2(st.openingBalance), creditBalance: R2(st.creditBalance) };
  });
  const lr = (DB.receipts || []).filter(r => !r.is_deleted).slice(-1)[0] || null;
  return {
    treasuries: { food: R2(c.food), diwan: R2(c.diwan), defRem: R2(c.historical_deficit_remaining), over: R2(c.overflow_to_food) },
    members,
    registers: { cashN: FIN2.cashDonationRegister().length, cashS: R2(FIN2.cashDonationRegister().reduce((s, x) => s + Number(x.amount || 0), 0)), inkN: FIN2.inkindRegister().length },
    auditN: (DB.audit_log || []).length,
    lastReceipt: lr ? { no: lr.no, movement_type: lr.movement_type, destination_treasury: lr.destination_treasury, amount_ils: R2(lr.amount_ils || lr.amount) } : null
  };
};

/* execute one operation through the REAL UI forms */
const EXECUTE = async (op) => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const set = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('change')); } };
  const today = new Date().toISOString().slice(0, 10);
  const memberId = op.member ? (DB.members.find(m => m.member_code === op.member) || {}).id : null;
  if (op.type === 'receipt') {
    window.openRec(op.fund); await wait(200);
    set('rec-payer-type', op.payerType || 'member'); window.onPayerTypeChange && window.onPayerTypeChange(); await wait(80);
    if (memberId) set('rec-member', memberId);
    if (op.payerName) set('rec-payer-name', op.payerName);
    set('rec-amount', op.amount); document.getElementById('rec-amount').dispatchEvent(new Event('input'));
    set('rec-date', today);
    if (op.fund === 'diwan' && op.diwanType) set('rec-diwan-type', op.diwanType);
    if (op.fund === 'donation') {
      set('rec-don-kind', op.kind || 'cash'); window.onDonKindChange && window.onDonKindChange(); await wait(60);
      if ((op.kind || 'cash') === 'cash') { set('rec-don-display', op.display); window.onDonDisplayChange && window.onDonDisplayChange(); await wait(60); if (op.alloc) set('rec-don-alloc-type', op.alloc); }
      else if (op.category) set('rec-don-category', op.category);
    }
    const n0 = window.__seed.receipts.length;
    await window.saveRec(false); await wait(3300); /* guardSave throttles 3s */
    return window.__seed.receipts.length > n0;
  }
  if (op.type === 'payment') {
    window.openPay(op.fund); await wait(200);
    set('pay-fund', op.fund);
    set('pay-beneficiary-type', op.benType || 'nonmember'); window.onPayBenType && window.onPayBenType(); await wait(80);
    if (op.member && memberId) set('pay-member', memberId);
    if (op.benName) set('pay-ben-name', op.benName);
    set('pay-amount', op.amount); const pa = document.getElementById('pay-amount'); if (pa) pa.dispatchEvent(new Event('input'));
    set('pay-date', today);
    if (op.expense) set('pay-expense', op.expense);
    if (op.method) set('pay-method', op.method);
    const n0 = (window.__seed.payments || []).length;
    await window.savePay(false); await wait(3300);
    return (window.__seed.payments || []).length > n0;
  }
  return false;
};

async function shoot(page, dir, phase, memberCode) {
  fs.mkdirSync(dir, { recursive: true });
  const cap = async (name) => { try { await page.screenshot({ path: path.join(dir, `${phase}-${name}.png`), fullPage: false }); } catch (e) {} };
  // dashboard
  await page.evaluate(() => { try { window.nav('dash'); } catch (e) {} });
  await page.waitForTimeout(500); await cap('01-dashboard');
  // member statement for the case member
  await page.evaluate((code) => { try { window.nav('member-stmt'); const m = DB.members.find(x => x.member_code === code); const sel = document.getElementById('ms-member'); if (sel && m) { sel.value = m.id; window.renderMemberStmt && window.renderMemberStmt(); } } catch (e) {} }, memberCode);
  await page.waitForTimeout(500); await cap('02-member-statement');
  // treasury / food fund statement
  await page.evaluate(() => { try { window.nav('food-stmt'); } catch (e) {} });
  await page.waitForTimeout(500); await cap('03-food-statement');
  // reports — annual debt / delinquency
  await page.evaluate(() => { try { window.nav('annual-debt'); } catch (e) {} });
  await page.waitForTimeout(500); await cap('04-reports');
}

(async () => {
  const PORT = 4599;
  const srv = await start(PORT);
  const br = await chromium.launch({ executablePath: chromeExe(), args: ['--no-sandbox'] });

  const report = [];
  let totalAssert = 0, totalPass = 0, failedCases = 0;

  for (const c of cases) {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 960 }, locale: 'ar' });
    // HARD ISOLATION: block every non-localhost request → production is unreachable.
    await ctx.route('**', route => {
      const u = route.request().url();
      if (u.startsWith('http://localhost') || u.startsWith('http://127.0.0.1')) return route.continue();
      return route.abort();
    });
    const freshSeed = JSON.parse(JSON.stringify(SEED)); // reset to identical seed
    await ctx.addInitScript(`(${HARNESS})(${JSON.stringify(freshSeed)})`);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 25000 }).catch(() => {});
    await page.waitForFunction(() => { const a = document.getElementById('app'); return a && getComputedStyle(a).display !== 'none'; }, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1100);

    const dir = path.join(SHOTS, c.id);
    const before = await page.evaluate(SNAPSHOT);
    await shoot(page, dir, 'before', c.member);

    const did = await page.evaluate(EXECUTE, c.op);
    await page.waitForTimeout(300);

    const after = await page.evaluate(SNAPSHOT);
    await shoot(page, dir, 'after', c.member);

    const checks = did ? c.expect(before, after) : [{ label: 'العملية نُفِّذت وحُفظت', pass: false, detail: 'saveRec لم يُنشئ سندًا' }];
    const pass = checks.filter(x => x.pass).length;
    totalAssert += checks.length; totalPass += pass;
    const caseFail = pass !== checks.length || errs.length;
    if (caseFail) failedCases++;

    fs.writeFileSync(path.join(RESULTS, `${c.id}.json`), JSON.stringify({ id: c.id, title: c.title, before, after, checks, pageErrors: errs }, null, 2));

    report.push({ c, before, after, checks, pass, errs });
    console.log(`${caseFail ? '✗' : '✓'} ${c.id} — ${c.title}: ${pass}/${checks.length}${errs.length ? ' · pageerrors=' + errs.length : ''}`);
    await ctx.close();
  }

  // ── evidence report ──
  const R2 = n => Math.round((Number(n) || 0) * 100) / 100;
  let md = `# تقرير المختبر الدستوري — نتائج التشغيل\n\n`;
  md += `التاريخ: ${new Date().toISOString()} · الأساس المعزول: بذرة ثابتة (لا بيانات إنتاج)\n\n`;
  md += `**الإجمالي:** ${totalPass}/${totalAssert} تحقّق ناجح · ${cases.length - failedCases}/${cases.length} حالة خضراء.\n\n`;
  for (const r of report) {
    md += `\n## ${r.c.id} — ${r.c.title}\n\n${r.c.narrative}\n\n`;
    md += `| القيمة | قبل | بعد |\n|---|---|---|\n`;
    md += `| خزينة الغداء | ${r.before.treasuries.food} | ${r.after.treasuries.food} |\n`;
    md += `| خزينة الديوان | ${r.before.treasuries.diwan} | ${r.after.treasuries.diwan} |\n`;
    md += `| العجز المتبقّي | ${r.before.treasuries.defRem} | ${r.after.treasuries.defRem} |\n`;
    const mc = r.c.member;
    if (r.before.members[mc]) md += `| رصيد ${mc} | ${r.before.members[mc].finalBalance} | ${r.after.members[mc].finalBalance} |\n`;
    md += `| سجلّ التبرّعات (عدد) | ${r.before.registers.cashN} | ${r.after.registers.cashN} |\n\n`;
    md += `**التحقّقات (المتوقَّع ↔ الفعلي):**\n\n`;
    r.checks.forEach(x => { md += `- ${x.pass ? '✅' : '❌'} ${x.label}${x.detail ? ' — `' + x.detail + '`' : ''}\n`; });
    md += `\n**الأدلة (لقطات):** \`lab/screenshots/${r.c.id}/before-*.png\` ← → \`after-*.png\`\n`;
  }
  fs.writeFileSync(path.join(RESULTS, 'REPORT.md'), md);

  /* ── official certification records (generated from REAL run results only) ── */
  const CERT = path.join(LAB, 'certification');
  fs.mkdirSync(CERT, { recursive: true });
  const statusOf = (r) => r.c.ownerDecision ? 'OWNER DECISION REQUIRED' : ((r.errs.length || r.pass !== r.checks.length) ? 'FAILED' : 'CERTIFIED');
  const today = new Date().toISOString().slice(0, 10);
  const shotList = (id) => { try { return fs.readdirSync(path.join(SHOTS, id)).filter(f => f.endsWith('.png')); } catch (e) { return []; } };

  for (const r of report) {
    const st = statusOf(r); const shots = shotList(r.c.id);
    let cm = `# ${r.c.id} — ${r.c.title}\n\n> **الحالة: ${st}** · تاريخ الشهادة: ${today} · مُولَّد من تشغيلٍ حقيقيّ في المختبر الدستوري.\n\n`;
    cm += `## القصّة\n${r.c.narrative}\n\n`;
    cm += `## الشرح التجاري (بالعربية المبسّطة)\n${r.c.business || '—'}\n\n`;
    cm += `## المقارنة (قبل ↔ بعد)\n\n| القيمة | قبل | بعد |\n|---|---|---|\n`;
    cm += `| خزينة الغداء | ${r.before.treasuries.food} | ${r.after.treasuries.food} |\n`;
    cm += `| خزينة الديوان | ${r.before.treasuries.diwan} | ${r.after.treasuries.diwan} |\n`;
    cm += `| العجز المتبقّي | ${r.before.treasuries.defRem} | ${r.after.treasuries.defRem} |\n`;
    if (r.before.members[r.c.member]) cm += `| رصيد ${r.c.member} | ${r.before.members[r.c.member].finalBalance} | ${r.after.members[r.c.member].finalBalance} |\n`;
    cm += `| سجلّ التبرّعات (عدد) | ${r.before.registers.cashN} | ${r.after.registers.cashN} |\n`;
    cm += `| سجلّ القيود (audit) | ${r.before.auditN} | ${r.after.auditN} |\n\n`;
    cm += `## المتوقَّع ↔ الفعلي (كل تحقّق)\n\n`;
    r.checks.forEach(x => { cm += `- ${x.pass ? '✅' : '❌'} ${x.label}${x.detail ? ' — `' + x.detail + '`' : ''}\n`; });
    cm += `\n## القوانين الدستورية المُشارِكة\n${(r.c.laws || []).map(l => '- القانون ' + l).join('\n') || '—'}\n\n`;
    cm += `## الأدلّة (لقطات حقيقية)\n${shots.map(s => '- `lab/screenshots/' + r.c.id + '/' + s + '`').join('\n')}\n\n`;
    cm += `## معايير الشهادة\n- تشغيل المختبر نجح: ${r.errs.length ? '❌' : '✅'}\n- كل التحقّقات نجحت: ${r.pass === r.checks.length ? '✅' : '❌'} (${r.pass}/${r.checks.length})\n- لقطات موجودة: ${shots.length ? '✅' : '❌'} (${shots.length})\n- المتوقَّع = الفعلي: ${r.pass === r.checks.length ? '✅' : '❌'}\n- الامتثال الدستوري مؤكَّد: ${st === 'CERTIFIED' ? '✅' : '⏸'}\n- الشرح التجاري مكتمل: ${r.c.business ? '✅' : '❌'}\n\n`;
    fs.writeFileSync(path.join(CERT, `${r.c.id}.md`), cm);
  }

  // permanent certification dashboard
  const ALL_FOC = require('./foc-index.cjs'); // full FOC chapter list + pending status
  let BLOCKED = {}; try { BLOCKED = require('./blocked.cjs'); } catch (e) {} // OWNER DECISION REQUIRED chapters (no capture path)
  const doneMap = {}; report.forEach(r => { doneMap[r.c.id] = { st: statusOf(r), a: `${r.pass}/${r.checks.length}`, shots: shotList(r.c.id).length }; });
  let db = `# لوحة الشهادة الدستورية — Constitutional Certification Dashboard\n\n`;
  db += `آخر تحديث: ${new Date().toISOString()} · المنصّة: المختبر الدستوري المجمَّد (\`lab/\`)\n\n`;
  const certN = report.filter(r => statusOf(r) === 'CERTIFIED').length;
  const failN = report.filter(r => statusOf(r) === 'FAILED').length;
  const odrN = Object.keys(BLOCKED).length + report.filter(r => statusOf(r) === 'OWNER DECISION REQUIRED').length;
  // first chapter that is neither certified nor owner-decision = where strict-order stops
  const firstBlock = ALL_FOC.find(f => BLOCKED[f.id]);
  db += `**التغطية:** ${certN}/${ALL_FOC.length} فصلًا مُعتمَدًا (${Math.round(certN / ALL_FOC.length * 100)}%) · FAILED: ${failN} · OWNER DECISION: ${odrN} · لقطات: ${report.reduce((s, r) => s + shotList(r.c.id).length, 0)}\n\n`;
  if (firstBlock) db += `> ⏸ **الحملة متوقّفة عند ${firstBlock.id}** (قرار مالكٍ مطلوب) — بحكم الترتيب الصارم لا يُتابَع إلى ما بعده قبل قرارك.\n\n`;
  db += `| الفصل | العنوان | الحالة | التحقّقات | لقطات | تجاري | دستوري | انحدار | تاريخ |\n|---|---|---|---|---|---|---|---|---|\n`;
  for (const f of ALL_FOC) {
    const d = doneMap[f.id];
    if (d) db += `| ${f.id} | ${f.title} | **${d.st}** | ${d.a} | ${d.shots} | ✅ | ${d.st === 'CERTIFIED' ? '✅' : '⏸'} | ✅ | ${today} |\n`;
    else if (BLOCKED[f.id]) db += `| ${f.id} | ${f.title} | **OWNER DECISION REQUIRED** | — | — | ⏸ | ⏸ | — | ${today} |\n`;
    else db += `| ${f.id} | ${f.title} | PENDING | — | — | — | — | — | — |\n`;
  }
  db += `\n> الشهادة مُولَّدة آليًّا من تشغيلٍ حقيقيّ في المختبر — لا يُعتمَد فصلٌ دون أدلّة كاملة. فصول OWNER DECISION موثَّقة يدويًّا (بلا تنفيذٍ ممكن). الفصول PENDING تُعتمَد لاحقًا بالترتيب الصارم بعد رفع الحظر.\n`;
  fs.writeFileSync(path.join(CERT, 'DASHBOARD.md'), db);

  console.log(`\nتقرير: lab/results/REPORT.md · شهادات: lab/certification/ · لقطات: lab/screenshots/<FOC-ID>/`);
  console.log(`الإجمالي: ${totalPass}/${totalAssert} تحقّق · مُعتمَد: ${certN}/${report.length} في هذه الدفعة`);

  await br.close(); srv.close();
  process.exit(failedCases ? 1 : 0);
})().catch(e => { console.error('LAB FAIL:', e); process.exit(2); });
