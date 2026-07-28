# OUTPUT-002-A · Field Completeness Matrix — Screen = Print = PDF = Excel?

> **Evidence-based, measured.** For each engine report the four surfaces were produced from
> **one** `ReportModel` (`compose()` — pure, no side effects) and scanned for field presence.
> Goal: prove **Screen = Print = PDF = Excel** for every field the user sees — not only totals.
> `Y` = field present, `.` = absent. `len` = composed artifact length (a proxy for content depth).

## How to read this
- **Screen / Print / PDF are produced from the same `ReportLayout.build` HTML** → they are
  expected to be byte-identical. The matrix **confirms** this for every report (identical
  field row *and* identical `len`).
- **Excel** is a different medium (spreadsheet `aoa`) → the interesting divergences live here.

## Per-report matrix (measured)

Fields: `titl`=title · `filt`=filters · `bene`=beneficiary · `note`=notes · `move`=movement/desc ·
`fund` · `year` · `curr`=₪ currency · `qr` · `sign`=signature · `bala`=balance · `tota`=totals.

### Member statement — filename `MEMBER_STATEMENT-A-001-2026-07-28`
| surface | titl | filt | bene | note | move | fund | year | curr | qr | sign | bala | tota | len |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|--:|
| screen | Y | . | . | . | Y | . | Y | Y | . | . | Y | Y | 4624 |
| print | Y | . | . | . | Y | . | Y | Y | . | . | Y | Y | 4624 |
| pdf | Y | . | . | . | Y | . | Y | Y | . | . | Y | Y | 4624 |
| **excel** | **.** | . | . | . | Y | . | Y | **.** | . | . | Y | Y | 718 |

### Fund statement (food) — `FUND_STATEMENT-2026-07-28`
| surface | titl | filt | bene | note | move | fund | year | curr | qr | sign | bala | tota | len |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|--:|
| screen | Y | . | . | Y | Y | Y | Y | Y | . | . | Y | Y | 3372 |
| print | Y | . | . | Y | Y | Y | Y | Y | . | . | Y | Y | 3372 |
| pdf | Y | . | . | Y | Y | Y | Y | Y | . | . | Y | Y | 3372 |
| **excel** | **.** | . | . | Y | Y | Y | Y | **.** | . | . | Y | Y | 510 |

### Annual debt · Delinquent · Donation · Members · Annual-log · Users (screen=print=pdf verified identical; Excel row shown)
| Report | screen=print=pdf | Excel drops | Excel len |
|---|---|---|--:|
| Annual debt (`ANNUAL_DEBT-…`) | title,filters,year,₪,balance,totals | **title, filters, ₪** | 467 |
| Delinquent (`DELINQUENT-…`) | title,filters,year,₪ | **title, filters** | 308 |
| Donation (`DONATION_REPORT-…`) | title,filters,notes,fund,year,₪,totals | **title, filters, year** | 366 |
| Members list (`MEMBERS_LIST-…`) | title,filters,year,₪,balance | **title, filters, ₪** | 278 |
| Annual log (`ANNUAL_LOG-…`) | title,filters,year,₪ | **title, filters, ₪** | 169 |
| Users list (`USERS_LIST-…`) | title,filters,year | **everything but data** (stub, len 38) | 38 |

## Findings

**F-1 — Screen/Print/PDF: 100% parity, every report.** Identical field set *and* identical
`len` across the three. The REPORT-001 engine fully satisfies "Screen = Print = PDF". No gap.

**F-2 — Excel is the single divergent surface.** Every report's Excel export **drops the
report title, the filter line, and the ₪ currency symbol/format** that the paper surfaces
carry, and some (`annual-log`, `users`) are near-empty stubs. Excel today is a raw data grid,
not a faithful spreadsheet copy of the report. → **OUTPUT-002-B**: Excel header parity (title
+ filters + currency), and complete the `annual-log`/`users` sheets.

### F-2 divergence table — exactly where each surface differs (measured)

| التقرير | Screen | Print | PDF | Excel | سبب الاختلاف (Excel) |
|---|:--:|:--:|:--:|:--:|---|
| كشف العضو | ✅ | ✅ | ✅ | ❌ | لا عنوان · لا رمز عملة ₪ |
| كشف الصندوق (غداء/ديوان) | ✅ | ✅ | ✅ | ❌ | لا عنوان · لا رمز عملة ₪ |
| المديونية السنوية | ✅ | ✅ | ✅ | ❌ | لا عنوان · لا فلاتر · لا رمز عملة ₪ |
| المتأخرون | ✅ | ✅ | ✅ | ❌ | لا عنوان · لا فلاتر |
| تقرير التبرعات | ✅ | ✅ | ✅ | ❌ | لا عنوان · لا فلاتر · لا سنة |
| قائمة الأعضاء | ✅ | ✅ | ✅ | ❌ | لا عنوان · لا فلاتر · لا رمز عملة ₪ |
| سجل الاشتراكات السنوي | ✅ | ✅ | ✅ | ❌ | لا عنوان · لا فلاتر · لا رمز عملة ₪ · Excel شبه فارغ (len 169) |
| قائمة المستخدمين | ✅ | ✅ | ✅ | ❌ | قشرة فارغة — لا عنوان/فلاتر ولا بيانات كافية (len 38) |

> **Screen = Print = PDF = ✅ في كل صف** (نفس الحقول ونفس الطول المُقاس). **الاختلاف الوحيد
> في عمود Excel** — وهو فقدان القشرة (عنوان/فلاتر/رمز العملة) لا فقدان الأرقام. هذا الجدول هو
> المرجع الدقيق لبند **-B رقم 6** (تكافؤ ترويسة Excel).

**F-3 — QR + Signature: absent from ALL reports.** Only vouchers carry a QR/verification token
and signature block; statements and reports have neither. The owner's Output Profile asks for
per-report QR/Signature toggles — these fields **do not exist on reports today** and must be
**added** (not merely toggled). → **OUTPUT-002-C** (Output Profile).

**F-4 — Beneficiary field.** `المستفيد` is a voucher/payment field; aggregate reports show the
counterparty under `الاسم`/`البيان` rather than a labelled "beneficiary". Voucher-level
beneficiary/notes completeness is verified separately (vouchers use the hybrid renderer, not
in this model scan) — flagged for a voucher field-check in **-B**.

**F-5 — Filenames exist but are not human-friendly.** Every report already yields a filename
from the model (`<REPORT_ID>-<code?>-<date>`), so smart-naming is half-built. It uses the
**registry id/code**, not the localized human title + party name the owner wants
(e.g. «كشف حساب - أحمد آل طه — 2026-07-28»). → **OUTPUT-002-C** (smart filenames from `meta.title`).

## Verdict
The **paper trio (screen/print/pdf) is already fully consistent**; the field-completeness work
in OUTPUT-002 is narrow and specific: **Excel header/format parity**, **add QR/Signature to
reports via the Output Profile**, **humanize filenames**, and a **voucher field-completeness
pass**. No report needs re-layout.
