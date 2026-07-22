/* Chapters that cannot be certified by execution because the operation is DEFINED
   in MODEL2 but has NO live UI capture path (reserved / deferred). They are marked
   OWNER DECISION REQUIRED and, under strict FOC order, block the campaign until the
   owner rules on them. Their certification records are authored by hand (evidence of
   the finding), not generated from a run. */
'use strict';
module.exports = {
  'FOC-012': { status: 'OWNER DECISION REQUIRED', reason: 'BO-06 deficit settlement — defined in MODEL2, no capture path, deferred/out-of-scope' },
  'FOC-013': { status: 'OWNER DECISION REQUIRED', reason: 'refund — reserved MODEL2 event, no capture path; reversal covered today by cancel (FOC-019)' }
};
