# REPORT-001 · R7e — Vouchers cut-over (hybrid renderer)

> Fifth slice of **R7**. Gives the three vouchers (receipt · payment · internal
> transfer) a **unified engine entry point** without forcing them into the
> tabular `ReportModel`. Owner-approved approach: a **hybrid VoucherRenderer**
> that reuses the certified voucher builders verbatim. Behind one default-OFF
> flag. **No `FIN`/DB/accounting change, and the voucher output is byte-identical.**

## Why hybrid (not the tabular model)

Vouchers are formal **single-record** documents — watermark, key/value field
grid, big amount box + amount-in-words, QR verification token, signature — not
tabular reports. Modelling them as `summary`+`table` would mean re-implementing a
QR-verified legal artifact and extending the frozen schema. Instead the hybrid
renderer **reuses** `buildRecVoucher` / `buildPayVoucher` / `buildTransferVoucher`
and the same `openPrintWin` primitive, so the printed voucher is exactly what it
was — the engine only adds a unified entry point + filename.

## The flag

```js
window.REPORT_ENGINE_VOUCHERS   // default OFF
```

OFF → `prtRec` / `prtPay` / `prtTransfer` print via the legacy builders directly
(inert). ON → they call `Report.render('<VOUCHER_ID>', 'print', { record })`,
which the engine routes to the VoucherRenderer — same builder, same output.

## What R7e ships

| Deliverable | Where |
|---|---|
| Hybrid `VoucherRenderer` (`compose` + `render`) | `public/js/report-render-voucher.js` |
| Engine routing for `category:'voucher'` + `registerVoucherRenderer` | `public/js/report-engine.js` (additive) |
| Reusable builders exposed | `public/js/print.js` (`buildRecVoucher`/`buildPayVoucher`), `public/js/app.js` (`buildTransferVoucher` extracted) |
| Flag-gated branches in the live print fns | `public/js/print.js` (`prtRec`, `prtPay`), `public/js/app.js` (`prtTransfer`) |
| Node tests | `tests/report-r7e-voucher.test.cjs` (14) |
| Dormant script wired | `public/index.html` (`?v=0.7`) |

## Design

- **The engine gained a tiny, additive hook**: `render()` detects a report whose
  registry `category === 'voucher'` and delegates to the registered
  `_voucherRenderer`; every tabular report and the frozen `ReportModel` are
  untouched. `Report.registerVoucherRenderer(vr)` wires it once.
- **The VoucherRenderer reuses the certified builders** by report id
  (RECEIPT/PAYMENT/TRANSFER) and preserves each voucher's exact legacy `openPrintWin`
  CSS argument (receipt/payment `''`; transfer its own `@page`). It adds a unified
  filename `<REPORT_ID>-<no>-<YYYY-MM-DD>` (the legacy calls passed none).
- **The transfer voucher builder was extracted** from `prtTransfer` into
  `window.buildTransferVoucher` so both the legacy path and the engine produce the
  identical document.

## Verification

- `tests/report-r7e-voucher.test.cjs` (**14/14**): the flag defaults OFF;
  `compose()` reuses the certified builder (portrait, transfer keeps its `@page`)
  with the unified filename; the **engine routes** all three voucher ids to the
  hybrid renderer and **delivers via `openPrintWin`** with that filename, calling
  the certified builder (not a re-implementation); **tabular reports are
  unaffected** (voucher branch not taken); and the guards
  (`record_missing` / `voucher_builder_unavailable`) hold with no throw.
- **Parity by construction:** the printed voucher is produced by the SAME builder
  and SAME `openPrintWin` as before (both certified in PRINT-001), so its visual
  output is unchanged — the only additions are the entry point and the filename.
- Engine suite still **24/24** after the additive hook; full sweep: **no
  regressions** — R0–R6 + R7a–R7e green.

## Definition of Done (R7e)

- [x] Unified `Report.render('<VOUCHER_ID>','print',{record})` entry via a hybrid renderer.
- [x] Certified voucher builders reused verbatim (byte-identical output; QR + token intact).
- [x] Engine hook additive; frozen tabular schema untouched.
- [x] Default-OFF flag; legacy inert when OFF.
- [x] Node tests (14) + parity-by-construction; engine 24/24; no regressions.

## Next — R7f (Treasury position + Dues snapshot)

Both are tabular → back to the standard model-builder + adapter pattern (screen
vs outputs-only assessed per surface). Begins on "أبدا R7f".
