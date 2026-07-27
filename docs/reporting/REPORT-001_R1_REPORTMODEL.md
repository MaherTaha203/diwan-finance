# REPORT-001 · R1 — ReportModel (delivery record)

> Second implementation phase. **Freezes the `ReportModel` schema** and ships the
> first model builder (Member Statement — the pilot). **No rendering, no DOM, no
> report migrated, no production call site.** Governed by
> `REPORT-001_ARCHITECTURE_SPEC.md` (§2.1/§3).

## What R1 ships

| Deliverable | Where |
|---|---|
| Frozen `ReportModel` schema + validator | `public/js/report-model.js` → `ReportModel.validate` (JSDoc header = the frozen schema) |
| `buildMemberStatementModel(source)` — **pure** mapper | `report-model.js` |
| `ReportModels.memberStatement(id, from, to)` — runtime gatherer (reads `FIN`/`DB`) | `report-model.js` (dormant; no call site) |
| Parity + schema tests | `tests/report-model.test.cjs` (27 assertions) |

## Frozen `ReportModel` schema

```
ReportModel = {
  meta: { reportId, title:{ar,en}, orientation:'portrait'|'landscape',
          party?:{name,code,phone,activeFrom}, period?:{from,to},
          printDate?, docNo?, verifyToken?, org?, filters?:[], signatures?:[] },
  summary: [ { key:{ar,en}, value:Number, format:'money'|'int'|'text', tone?:'pos'|'neg' } ],
  sections: [ Section ]
}
Section =
  | { type:'band',  key:{ar,en}, value:Number, format:'money', tone? }
  | { type:'table', id, columns:[Column], rows:[RowByKey], totals?, footnotes?:[{ar,en}] }
Column = { key, header:{ar,en}, align:'start'|'center'|'end', format:'text'|'num'|'money'|'date'|'tag'|'int' }
RowByKey = { <columnKey>: <rawValue>, _*?:<aux> }   // raw values only; `_`-prefixed keys are auxiliary meta, not columns
totals   = { label:{ar,en}, cells:{<columnKey>:value}, status?:{ar,en} }
```

**Design rules (held):** the model carries **data + intent only** — no styling, no
markup, no DOM. Numbers pass through **unchanged** (renderers format at R3–R5). Labels
are `{ar,en}` pairs, never pre-rendered strings.

## Member Statement model (pilot)

`buildMemberStatementModel(source)` is a **pure** projection of the certified
`FIN.memberStatementView` shape (`{statement, moves, carried, histPaid, totSub, totPay}`)
plus the member record and `memberDonations`. It reproduces the exact derivations of the
current statement (carried-balance band; leading carried row + one row per move; `year`
from date; `sysNo`/`refNo` only for receipts via the same `refFromNotes` rule; signed
running balance; final-balance totals + status; optional donations table). The runtime
gatherer `ReportModels.memberStatement(id, from, to)` assembles the source from
`FIN`/`DB` and calls the pure builder — **it is not wired to any production surface.**

## Parity — how R1 proves faithfulness

`tests/report-model.test.cjs` (27/27) feeds a **synthetic certified source with known
numbers** and asserts the model reproduces every figure in the correct slot
(summary = totSub/totPay/histPaid; band = carried; ledger rows; totals = finalBalance +
status; donations amount + settlement), plus schema validity and edge cases (empty
statement, credit/zero status, `refFromNotes`, validator rejections).

> This is **mapping parity** — the builder does not alter or drop any certified value.
> The financial engine (`FIN.*`) is untouched and remains the single source of truth.
> **Full live end-to-end parity** (model-rendered statement == current statement, value
> for value, on screen/print/PDF/Excel) is verified at **R6**, the cut-over phase.

## Definition of Done (R1)

- [x] `ReportModel` schema frozen + `ReportModel.validate` implemented.
- [x] `buildMemberStatementModel` is pure (no `FIN`/`DB`/DOM access inside).
- [x] Runtime gatherer exists, reads `FIN`/`DB`, **no production call site**.
- [x] Parity test proves no mutation/loss of certified numbers; schema-valid output.
- [x] Tests green (`node tests/report-model.test.cjs` → 27/27); R0 tests still green.
- [x] No rendering, no report migrated, no production behaviour changed.

## Next — R2 (Layout Components)

Turn the frozen model into renderer-agnostic layout primitives (Header, Meta, KPI,
Filters, Table, Totals, Notes, Signatures, Footer) that any renderer composes. Still no
live surface migrated. R2 begins only on approval.
