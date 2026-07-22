/* Chapters EXCLUDED from the current release by an explicit OWNER DECISION
   (Ruling on FOC-012 & FOC-013). These operations are defined in MODEL2 but are
   intentionally deferred outside V1 scope and have no live capture path. Their
   exclusion is an approved business/scope decision — NOT a failure, defect,
   regression, or pending item. When MODEL2 is officially implemented, remove the
   exclusion and certify them under the same evidence-based methodology. */
'use strict';
module.exports = {
  'FOC-012': { status: 'EXCLUDED (OWNER APPROVED)', reason: 'BO-06 deficit settlement — intentionally deferred outside V1 scope; not executable; approved business decision (Owner Ruling 2026-07-22).' },
  'FOC-013': { status: 'EXCLUDED (OWNER APPROVED)', reason: 'refund — intentionally reserved; no active execution path; current behavior represented by the approved cancellation workflow (FOC-019) (Owner Ruling 2026-07-22).' }
};
