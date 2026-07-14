/* ═══ RESERVATIONS — Diwan Reservation Calendar (Module R · approved Design Review v1) ═══
   One purpose: is the Diwan free on a given day? Monthly grid (week starts
   Saturday, Gregorian only), one active reservation per date (DB-enforced by
   uq_reservations_active_date), soft-delete cancellation, audit via logAction.
   Runtime deps (shared globals, resolved at call time like every module):
   SB, CU, CUR, toast, esc, today, openM, closeM, logAction, window.LANG. */

const RES_TYPES = {
  wedding:                ['زفاف',                'Wedding'],
  engagement:             ['خطوبة',               'Engagement'],
  henna:                  ['حنّاء',               'Henna'],
  wedding_lunch:          ['غداء عرس',            'Wedding Lunch'],
  evening_party:          ['سهرة',                'Evening Party'],
  talbeh:                 ['طلبة',                'Talbeh (Proposal)'],
  small_party:            ['حفلة صغيرة',          'Small Party'],
  large_party_two_floors: ['حفلة كبيرة (طابقان)', 'Large Party (Two Floors)'],
  birthday:               ['عيد ميلاد',           'Birthday'],
  graduation:             ['تخرج',                'Graduation'],
  lecture:                ['محاضرة',              'Lecture'],
  general:                ['عام',                 'General'],
};
// Gregorian month names are shown in English (Latin) even in the Arabic UI —
// per owner preference for an English-calendar look. Day names stay Arabic.
const RES_MONTHS_AR = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const RES_MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const RES_DOW_AR = ['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
const RES_DOW_EN = ['Sat','Sun','Mon','Tue','Wed','Thu','Fri'];
const RES_DAYNAMES_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

const RES = {
  y: null, m: null,          // current view (m = 0-based)
  byDate: {},                // 'YYYY-MM-DD' -> active reservation row
  loadedYears: {},           // year -> true once fetched
  filter: 'month',           // today | week | month | reserved | available
  q: '',
  loading: false,
  error: false,
  inited: false,
  selDate: null,             // mobile: selected day
};

const resEn = () => window.LANG === 'en';
const resTypeLabel = k => (RES_TYPES[k] || [k, k])[resEn() ? 1 : 0];
const resISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const resCanWrite = () => !!CUR && (CUR.role === 'admin' || CUR.role === 'reservation');
function resFmtLong(iso) {
  const dt = new Date(iso + 'T00:00:00');
  if (resEn()) return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${RES_DAYNAMES_AR[dt.getDay()]} ${dt.getDate()} ${RES_MONTHS_AR[dt.getMonth()]} ${dt.getFullYear()}`;
}
const resT = (ar, en) => resEn() ? en : ar;
const escAttr = s => esc(s).replace(/"/g, '&quot;');

/* ── entry points ── */
window.resOnShow = async function () {
  if (!RES.inited) {
    const t = new Date();
    RES.y = t.getFullYear(); RES.m = t.getMonth();
    RES.inited = true;
  }
  resRender();
  await resEnsureYear(RES.y);
  resRender();
};

async function resEnsureYear(y) {
  if (RES.loadedYears[y]) return;
  if (RES.loading) return;              // a fetch is in flight; caller re-renders after it lands
  RES.loading = true; RES.error = false;
  const { data, error } = await SB.from('reservations')
    .select('*')
    .gte('res_date', `${y - 1}-12-01`)
    .lte('res_date', `${y + 1}-01-31`)
    .eq('is_deleted', false);
  RES.loading = false;
  if (error) { RES.error = true; return; }
  RES.loadedYears[y] = true;
  (data || []).forEach(r => { RES.byDate[r.res_date] = r; });
}

window.resRetry = async function () { RES.loadedYears = {}; resRender(); await resEnsureYear(RES.y); resRender(); };

/* ── navigation ── */
window.resPrev = async function () { RES.m--; if (RES.m < 0) { RES.m = 11; RES.y--; } resRender(); await resEnsureYear(RES.y); resRender(); };
window.resNext = async function () { RES.m++; if (RES.m > 11) { RES.m = 0; RES.y++; } resRender(); await resEnsureYear(RES.y); resRender(); };
window.resGoToday = function () { const t = new Date(); RES.y = t.getFullYear(); RES.m = t.getMonth(); RES.filter = 'month'; resRender(); };
window.resSetFilter = async function (f) {
  RES.filter = f;
  if (f === 'today' || f === 'week' || f === 'month') { const t = new Date(); RES.y = t.getFullYear(); RES.m = t.getMonth(); }
  resRender(); await resEnsureYear(RES.y); resRender();
};

/* ── rendering ── */
function resRender() {
  const el = document.getElementById('res-cal');
  if (!el) return;
  const monthName = (resEn() ? RES_MONTHS_EN : RES_MONTHS_AR)[RES.m];
  const bar = document.getElementById('res-month-label');
  if (bar) bar.innerHTML = `${monthName} <b>${RES.y}</b>`;
  document.querySelectorAll('#pg-reservations .res-pill').forEach(p =>
    p.classList.toggle('on', p.dataset.f === RES.filter));

  const err = document.getElementById('res-err');
  if (err) {
    err.innerHTML = RES.error ? `<div class="res-errbar"><i class="ti ti-wifi-off"></i>
      <div><b>${resT('تعذّر تحميل الحجوزات', 'Could not load reservations')}</b>
      <span>${resT('تحقق من الاتصال ثم أعد المحاولة — لن تفقد أي بيانات.', 'Check your connection and retry — nothing is lost.')}</span></div>
      <button class="btn sm" onclick="window.resRetry()">${resT('إعادة المحاولة', 'Retry')}</button></div>` : '';
  }

  if (RES.loading && !RES.loadedYears[RES.y]) {
    el.innerHTML = `<div class="res-head">${resDowHead()}</div>
      <div class="res-grid">${Array.from({ length: 35 }, () =>
        '<div class="res-day skel"><span class="sk sk1"></span><span class="sk sk2"></span></div>').join('')}</div>`;
    return;
  }

  const first = new Date(RES.y, RES.m, 1);
  const daysIn = new Date(RES.y, RES.m + 1, 0).getDate();
  const lead = (first.getDay() + 1) % 7;               // Saturday-start index
  const prevDays = new Date(RES.y, RES.m, 0).getDate();
  const t = new Date();
  const todayISO = resISO(t.getFullYear(), t.getMonth(), t.getDate());
  const cells = [];
  for (let i = lead - 1; i >= 0; i--) {
    const d = prevDays - i, mm = RES.m === 0 ? 11 : RES.m - 1, yy = RES.m === 0 ? RES.y - 1 : RES.y;
    cells.push({ d, iso: resISO(yy, mm, d), out: true });
  }
  for (let d = 1; d <= daysIn; d++) cells.push({ d, iso: resISO(RES.y, RES.m, d), out: false });
  while (cells.length % 7 !== 0) {
    const idx = cells.length - (lead + daysIn), d = idx + 1;
    const mm = RES.m === 11 ? 0 : RES.m + 1, yy = RES.m === 11 ? RES.y + 1 : RES.y;
    cells.push({ d, iso: resISO(yy, mm, d), out: true });
  }

  // week range (for the week filter): Saturday..Friday around today
  const wkStart = new Date(t); wkStart.setDate(t.getDate() - ((t.getDay() + 1) % 7));
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkStart.getDate() + 6);
  const wkA = resISO(wkStart.getFullYear(), wkStart.getMonth(), wkStart.getDate());
  const wkB = resISO(wkEnd.getFullYear(), wkEnd.getMonth(), wkEnd.getDate());

  let monthHasRes = false;
  let grid = '';
  for (const c of cells) {
    const r = RES.byDate[c.iso];
    if (r && !c.out) monthHasRes = true;
    const isToday = c.iso === todayISO;
    const isPast = c.iso < todayISO;
    let cls = 'res-day';
    if (c.out) cls += ' out';
    else {
      if (isPast) cls += ' past';
      if (r) cls += ' res';
      if (isToday) cls += ' today';
      if (RES.selDate === c.iso) cls += ' sel';
      if (RES.filter === 'reserved' && !r) cls += ' dim';
      if (RES.filter === 'available' && r) cls += ' dim';
      if (RES.filter === 'today' && !isToday) cls += ' dim';
      if (RES.filter === 'week' && (c.iso < wkA || c.iso > wkB)) cls += ' dim';
    }
    const aria = `${resFmtLong(c.iso)} — ${r ? resTypeLabel(r.res_type) + ' · ' + r.customer_name : resT('متاح', 'Available')}`;
    grid += `<div class="${cls}" ${c.out ? '' : `role="gridcell" tabindex="0" aria-label="${escAttr(aria)}"
      onclick="window.resDayClick('${c.iso}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.resDayClick('${c.iso}')}"`}>
      <div class="res-dn"><span class="num">${c.d}</span>${isToday && !c.out ? `<span class="res-today-chip">${resT('اليوم', 'Today')}</span>` : ''}</div>
      ${r && !c.out ? `<div class="res-rv"><span class="res-badge">${esc(resTypeLabel(r.res_type))}</span><span class="res-name">${esc(r.customer_name)}</span></div>`
        : (!c.out && !isPast ? '<div class="res-addhint"><i class="ti ti-plus"></i></div>' : '')}
    </div>`;
  }

  el.innerHTML = `<div class="res-head">${resDowHead()}</div>
    ${!monthHasRes && RES.loadedYears[RES.y] && !RES.error ? `<div class="res-emptybar"><i class="ti ti-calendar-plus"></i>${resT('لا توجد حجوزات في هذا الشهر — كل الأيام متاحة، انقر أي يوم للإضافة.', 'No reservations this month — every day is free. Click any day to add one.')}</div>` : ''}
    <div class="res-grid" role="grid">${grid}</div>`;
  resRenderDayCard();
  resRenderAgenda();
}

/* mobile month-agenda — turns the empty space below the compact grid into
   a tappable list of this month's reservations (CSS shows it ≤820px only). */
function resRenderAgenda() {
  const el = document.getElementById('res-agenda');
  if (!el) return;
  const prefix = `${RES.y}-${String(RES.m + 1).padStart(2, '0')}-`;
  const rows = Object.values(RES.byDate)
    .filter(r => r.res_date.startsWith(prefix))
    .sort((a, b) => a.res_date < b.res_date ? -1 : 1);
  const title = `<div class="res-ag-t"><i class="ti ti-list-details"></i>${resT('حجوزات هذا الشهر', 'This month')} · ${rows.length}</div>`;
  if (!rows.length) {
    el.innerHTML = title + `<div class="res-ag-empty">${resT('لا حجوزات — انقر أي يوم للإضافة', 'None — tap a day to add')}</div>`;
    return;
  }
  el.innerHTML = title + rows.map(r => {
    const d = +r.res_date.slice(8, 10);
    return `<div class="res-ag-it" onclick="window.resOpenView('${r.res_date}')">
      <div class="res-ag-d"><b>${d}</b><span>${RES_MONTHS_AR[RES.m].slice(0, 3)}</span></div>
      <div class="res-ag-m"><b>${esc(r.customer_name)}</b><span class="res-ag-meta"><span class="res-badge">${esc(resTypeLabel(r.res_type))}</span><span class="ltr">${esc(r.phone)}</span></span></div>
      <i class="ti ti-chevron-left" style="color:var(--tx2)"></i></div>`;
  }).join('');
}
const RES_DOW_AR_SHORT = ['سبت','أحد','اثن','ثلا','أرب','خمس','جمع'];
function resDowHead() {
  const full = resEn() ? RES_DOW_EN : RES_DOW_AR;
  const short = resEn() ? RES_DOW_EN : RES_DOW_AR_SHORT;
  return full.map((d, i) => `<div><span class="dwf">${d}</span><span class="dws">${short[i]}</span></div>`).join('');
}

/* ── day interactions ── */
window.resDayClick = function (iso) {
  const t = today();
  const r = RES.byDate[iso];
  RES.selDate = iso;
  if (r) {
    if (window.matchMedia('(max-width: 820px)').matches) { resRender(); resRenderDayCard(true); }
    else resOpenView(iso);
    return;
  }
  if (iso < t) { resRender(); return; }               // past + empty: view-only calendar, no retro bookings
  if (window.matchMedia('(max-width: 820px)').matches) { resRender(); resRenderDayCard(true); return; }
  resOpenAdd(iso);
};
window.resOpenAddToday = function () {
  const t = today();
  const free = !RES.byDate[t];
  resOpenAdd(free ? t : resNextFreeDay(t));
};
function resNextFreeDay(fromISO) {
  const d = new Date(fromISO + 'T00:00:00');
  for (let i = 0; i < 366; i++) {
    const iso = resISO(d.getFullYear(), d.getMonth(), d.getDate());
    if (!RES.byDate[iso]) return iso;
    d.setDate(d.getDate() + 1);
  }
  return fromISO;
}

/* mobile selected-day card */
function resRenderDayCard(scroll) {
  const el = document.getElementById('res-daycard');
  if (!el) return;
  if (!RES.selDate) { el.style.display = 'none'; return; }
  const iso = RES.selDate, r = RES.byDate[iso], isPast = iso < today();
  el.style.display = '';
  if (r) {
    el.innerHTML = `<div class="res-dc-h"><b>${resFmtLong(iso)}</b><span class="res-badge">${esc(resTypeLabel(r.res_type))}</span></div>
      <div class="res-dc-b"><i class="ti ti-user"></i>${esc(r.customer_name)}<span class="sep">·</span><i class="ti ti-phone"></i><span class="ltr">${esc(r.phone)}</span></div>
      ${r.notes ? `<div class="res-dc-n"><i class="ti ti-note"></i>${esc(r.notes)}</div>` : ''}
      <div class="res-dc-a"><button class="btn sm" onclick="window.resOpenView('${iso}')">${resT('التفاصيل', 'Details')}</button>
      ${resCanWrite() && !isPast ? `<button class="btn sm primary" onclick="window.resOpenEdit('${iso}')"><i class="ti ti-edit"></i>${resT('تعديل', 'Edit')}</button>` : ''}</div>`;
  } else {
    el.innerHTML = `<div class="res-dc-h"><b>${resFmtLong(iso)}</b><span class="badge green">${resT('متاح', 'Available')}</span></div>
      <div class="res-dc-a">${resCanWrite() && !isPast ? `<button class="btn sm primary" onclick="window.resOpenAdd('${iso}')"><i class="ti ti-plus"></i>${resT('حجز هذا اليوم', 'Book this day')}</button>` : `<span class="res-dc-muted">${isPast ? resT('يوم ماضٍ — للاطلاع فقط', 'Past day — view only') : ''}</span>`}</div>`;
  }
  if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ── dialogs ── */
window.resOpenAdd = function (iso) {
  if (!resCanWrite()) { toast(resT('لا تملك صلاحية إضافة حجز', 'No permission to add reservations'), 'err'); return; }
  // Past days (yesterday / previous months) are view-only — no retro bookings.
  if (iso < today()) { toast(resT('لا يمكن الحجز على يوم ماضٍ — الأشهر السابقة للاطّلاع فقط', 'Cannot book a past day — previous months are view-only'), 'warn'); return; }
  if (RES.byDate[iso]) { resOpenView(iso); return; }
  document.getElementById('res-f-id').value = '';
  const dAdd = document.getElementById('res-f-date'); dAdd.value = iso; dAdd.min = today();
  document.getElementById('res-f-name').value = '';
  document.getElementById('res-f-phone').value = '';
  document.getElementById('res-f-type').value = '';
  document.getElementById('res-f-notes').value = '';
  document.getElementById('m-res-form-title').innerHTML =
    `<i class="ti ti-calendar-plus"></i>${resT('حجز جديد — ', 'New reservation — ')}${resFmtLong(iso)}`;
  document.getElementById('res-f-save').innerHTML = `<i class="ti ti-check"></i>${resT('حفظ الحجز', 'Save reservation')}`;
  resClearErrors();
  openM('res-form');
};

window.resOpenView = function (iso) {
  const r = RES.byDate[iso];
  if (!r) return;
  const isPast = iso < today();
  document.getElementById('res-v-body').innerHTML = `
    <div class="res-vrow"><i class="ti ti-user"></i><div><i>${resT('اسم الزبون', 'Customer')}</i><b>${esc(r.customer_name)}</b></div></div>
    <div class="res-vrow"><i class="ti ti-phone"></i><div><i>${resT('رقم الهاتف', 'Phone')}</i><b class="ltr">${esc(r.phone)}</b></div></div>
    <div class="res-vrow"><i class="ti ti-tag"></i><div><i>${resT('نوع الحجز', 'Type')}</i><b><span class="res-badge">${esc(resTypeLabel(r.res_type))}</span></b></div></div>
    <div class="res-vrow"><i class="ti ti-calendar"></i><div><i>${resT('التاريخ', 'Date')}</i><b>${resFmtLong(iso)}</b></div></div>
    ${r.notes ? `<div class="res-vrow"><i class="ti ti-note"></i><div><i>${resT('ملاحظات', 'Notes')}</i><b>${esc(r.notes)}</b></div></div>` : ''}
    <div class="res-audit"><i class="ti ti-clock"></i>${resT('أُنشئ بواسطة', 'Created by')} ${esc(r.created_by || '—')} · ${(r.created_at || '').slice(0, 16).replace('T', ' ')}
      ${r.updated_at ? ` — ${resT('آخر تعديل', 'updated')} ${(r.updated_at).slice(0, 16).replace('T', ' ')}` : ''}</div>`;
  const w = resCanWrite() && !isPast;
  document.getElementById('res-v-edit').style.display = w ? '' : 'none';
  document.getElementById('res-v-del').style.display = w ? '' : 'none';
  document.getElementById('res-v-edit').onclick = () => window.resOpenEdit(iso);
  document.getElementById('res-v-del').onclick = () => window.resAskCancel(iso);
  openM('res-view');
};

window.resOpenEdit = function (iso) {
  const r = RES.byDate[iso];
  if (!r || !resCanWrite()) return;
  document.getElementById('res-f-id').value = r.id;
  const dEdit = document.getElementById('res-f-date'); dEdit.value = r.res_date; dEdit.min = today();
  document.getElementById('res-f-name').value = r.customer_name;
  document.getElementById('res-f-phone').value = r.phone;
  document.getElementById('res-f-type').value = r.res_type;
  document.getElementById('res-f-notes').value = r.notes || '';
  document.getElementById('m-res-form-title').innerHTML =
    `<i class="ti ti-edit"></i>${resT('تعديل الحجز — ', 'Edit reservation — ')}${resFmtLong(iso)}`;
  document.getElementById('res-f-save').innerHTML = `<i class="ti ti-check"></i>${resT('حفظ التعديلات', 'Save changes')}`;
  resClearErrors();
  openM('res-form');
};

window.resAskCancel = function (iso) {
  const r = RES.byDate[iso];
  if (!r || !resCanWrite()) return;
  document.getElementById('res-d-text').innerHTML =
    resT(`هل أنت متأكد من إلغاء حجز «${esc(resTypeLabel(r.res_type))} — ${esc(r.customer_name)}» يوم ${resFmtLong(iso)}؟`,
         `Cancel the “${esc(resTypeLabel(r.res_type))} — ${esc(r.customer_name)}” reservation on ${resFmtLong(iso)}?`);
  document.getElementById('res-d-confirm').onclick = () => window.resDoCancel(iso);
  openM('res-del');
};

/* ── validation + persistence ── */
function resErr(id, msg) {
  const inp = document.getElementById(id);
  inp.classList.add('err');
  const fe = document.getElementById(id + '-err');
  if (fe) { fe.textContent = msg; fe.classList.add('on'); }
}
function resClearErrors() {
  ['res-f-date', 'res-f-name', 'res-f-phone', 'res-f-type'].forEach(id => {
    document.getElementById(id)?.classList.remove('err');
    const fe = document.getElementById(id + '-err');
    if (fe) fe.classList.remove('on');
  });
}
function resValidate() {
  resClearErrors();
  let ok = true;
  const id = document.getElementById('res-f-id').value;
  const date = document.getElementById('res-f-date').value;
  const name = document.getElementById('res-f-name').value.trim();
  const phone = document.getElementById('res-f-phone').value.replace(/[\s-]/g, '');
  const type = document.getElementById('res-f-type').value;
  if (!date) { resErr('res-f-date', resT('اختر التاريخ', 'Pick a date')); ok = false; }
  else if (date < today()) { resErr('res-f-date', resT('لا يمكن الحجز على يوم ماضٍ — الأشهر السابقة للاطّلاع فقط', 'Cannot book a past day — previous months are view-only')); ok = false; }
  else {
    const clash = RES.byDate[date];
    if (clash && String(clash.id) !== String(id)) {
      resErr('res-f-date', resT('هذا اليوم محجوز بالفعل — افتح الحجز القائم', 'Day already reserved — open the existing reservation'));
      ok = false;
    }
  }
  if (name.length < 2) { resErr('res-f-name', resT('أدخل اسم الزبون', 'Enter the customer name')); ok = false; }
  if (!/^05\d{8}$/.test(phone)) { resErr('res-f-phone', resT('رقم الهاتف غير صالح — أدخل 10 أرقام تبدأ بـ 05', 'Invalid phone — 10 digits starting with 05')); ok = false; }
  if (!type) { resErr('res-f-type', resT('اختر نوع الحجز', 'Choose a reservation type')); ok = false; }
  return ok ? { id, date, name, phone, type, notes: document.getElementById('res-f-notes').value.trim() || null } : null;
}

window.resSave = async function () {
  if (!resCanWrite()) return;
  const v = resValidate();
  if (!v) return;
  const btn = document.getElementById('res-f-save');
  btn.disabled = true;
  const who = CUR?.full_name || CU?.email;
  let saved = null, error = null;
  if (v.id) {
    const prev = Object.values(RES.byDate).find(r => String(r.id) === String(v.id));
    ({ data: saved, error } = await SB.from('reservations')
      .update({ res_date: v.date, customer_name: v.name, phone: v.phone, res_type: v.type, notes: v.notes, updated_by: who, updated_at: new Date().toISOString() })
      .eq('id', v.id).select().single());
    if (!error && prev) delete RES.byDate[prev.res_date];
  } else {
    ({ data: saved, error } = await SB.from('reservations')
      .insert({ res_date: v.date, customer_name: v.name, phone: v.phone, res_type: v.type, notes: v.notes, created_by: who })
      .select().single());
  }
  btn.disabled = false;
  if (error) {
    if (error.code === '23505') {
      resErr('res-f-date', resT('سبقك أحد إلى هذا اليوم للتو — اليوم محجوز', 'Someone just booked this day'));
      await resHardRefreshDay(v.date);
    } else toast(resT('تعذّر الحفظ — أعد المحاولة', 'Save failed — try again'), 'err');
    return;
  }
  RES.byDate[saved.res_date] = saved;
  RES.selDate = saved.res_date;
  closeM();
  resRender();
  toast(v.id ? resT('تم حفظ التعديلات', 'Changes saved') : resT('تم إنشاء الحجز', 'Reservation created'), 'ok');
  try { await logAction(v.id ? 'update' : 'create', `${v.id ? 'تعديل' : 'إنشاء'} حجز — ${v.name} · ${v.date}`, 'reservations', saved.id); } catch (e) {}
};

async function resHardRefreshDay(iso) {
  const { data } = await SB.from('reservations').select('*').eq('res_date', iso).eq('is_deleted', false).maybeSingle();
  if (data) RES.byDate[iso] = data;
  resRender();
}

window.resDoCancel = async function (iso) {
  const r = RES.byDate[iso];
  if (!r || !resCanWrite()) return;
  const who = CUR?.full_name || CU?.email;
  const { error } = await SB.from('reservations')
    .update({ is_deleted: true, deleted_by: who, deleted_at: new Date().toISOString() })
    .eq('id', r.id);
  if (error) { toast(resT('تعذّر الإلغاء — أعد المحاولة', 'Cancel failed — try again'), 'err'); return; }
  delete RES.byDate[iso];
  closeM();
  resRender();
  toast(resT('تم إلغاء الحجز — اليوم متاح الآن', 'Reservation cancelled — day is free'), 'warn');
  try { await logAction('cancel', `إلغاء حجز — ${r.customer_name} · ${iso}`, 'reservations', r.id); } catch (e) {}
};

/* ── instant search ── */
window.resSearch = function () {
  const q = document.getElementById('res-q').value.trim().toLowerCase();
  RES.q = q;
  const dd = document.getElementById('res-q-dd');
  if (!q) { dd.style.display = 'none'; dd.innerHTML = ''; return; }
  const hits = Object.values(RES.byDate).filter(r =>
    r.customer_name.toLowerCase().includes(q) ||
    r.phone.replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, '')) ||
    r.res_date.includes(q) ||
    resTypeLabel(r.res_type).toLowerCase().includes(q)
  ).sort((a, b) => a.res_date < b.res_date ? -1 : 1).slice(0, 8);
  dd.innerHTML = hits.length ? hits.map(r =>
    `<div class="res-dd-it" onclick="window.resJump('${r.res_date}')">
      <span class="res-badge">${esc(resTypeLabel(r.res_type))}</span>
      <b>${esc(r.customer_name)}</b><span class="ltr mut">${esc(r.phone)}</span>
      <span class="mut">${r.res_date}</span></div>`).join('')
    : `<div class="res-dd-empty">${resT('لا نتائج', 'No results')}</div>`;
  dd.style.display = '';
};
window.resJump = function (iso) {
  const dt = new Date(iso + 'T00:00:00');
  RES.y = dt.getFullYear(); RES.m = dt.getMonth(); RES.selDate = iso;
  document.getElementById('res-q-dd').style.display = 'none';
  document.getElementById('res-q').value = '';
  resRender();
  resEnsureYear(RES.y).then(resRender);
  resOpenView(iso);
};
document.addEventListener('click', e => {
  const dd = document.getElementById('res-q-dd');
  if (dd && !e.target.closest('.res-search')) dd.style.display = 'none';
});

/* Language switch: applyLang() translates data-i18n nodes only — the grid,
   month label, weekday headers and type badges are JS-rendered, so wrap
   applyLang to re-render the calendar with the new language. */
if (typeof window.applyLang === 'function') {
  const _resApplyLang = window.applyLang;
  window.applyLang = function () {
    _resApplyLang();
    if (RES.inited) resRender();
  };
}
