/* ==========================================================================
   BACKUP (database): applies an import plan (see js/logic/backup.js).
   All writes go into local batches, so it works offline and syncs later.
   ========================================================================== */

import { docRef, runBatched, guard } from "./helpers.js";
import { saveSettings } from "./settings.js";

export function applyImport(fb, uid, plan) {
  const now = Date.now();
  const ops = [
    ...plan.sets.map(({ col, id, fields }) => (batch) => batch.set(docRef(fb, uid, col, id), fields)),
    ...plan.deletes.map(({ col, id }) => (batch) => batch.delete(docRef(fb, uid, col, id))),
  ];
  runBatched(fb, ops);
  if (Object.keys(plan.settings).length) guard(saveSettings(fb, uid, plan.settings), "Settings not restored");
  return { written: plan.sets.length, deleted: plan.deletes.length, at: now };
}
