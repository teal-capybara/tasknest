/* ==========================================================================
   BOARD LOGIC: which tasks go in which column.

   Pure functions (no screens, no database). Three columns, one per status:
   Not started, In progress, Done. Archived tasks never show on the board.
   Open columns are ordered by urgency (most urgent first). The Done column shows
   the newest finished tasks first, and by default only those finished in the last
   14 days so it never grows forever ("Show all done" reveals the rest).

   filters = { workspace: "all" | "academics" | "organizations", courseId, orgId, search }
   ctx     = { now, settings, isArchived(task), names, showAllDone }
   ========================================================================== */

import { applyFilters, emptyFilters } from "./filters.js";
import { STATUSES } from "../constants.js";

const DAY = 24 * 60 * 60 * 1000;
export const DONE_RECENT_DAYS = 14;

export function boardColumns(tasks, filters, ctx) {
  const f = { ...emptyFilters(), workspace: filters.workspace || "all", courseId: filters.courseId || "", orgId: filters.orgId || "", search: filters.search || "" };
  const visible = applyFilters(tasks, f, ctx);          // sorted by urgency, archived left out

  return STATUSES.map((status) => {
    let list = visible.filter((t) => t.status === status.id);
    let hiddenDone = 0;
    if (status.id === "done") {
      list = list.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
      if (!ctx.showAllDone) {
        const cutoff = ctx.now - DONE_RECENT_DAYS * DAY;
        const recent = list.filter((t) => (t.completedAt || 0) >= cutoff);
        hiddenDone = list.length - recent.length;
        list = recent;
      }
    }
    return { id: status.id, name: status.name, tasks: list, hiddenDone };
  });
}

/** The status a "move" button sends a task to, and the label it shows. */
export function moveOptions(task) {
  const reopen = task.inProgressAt ? "in_progress" : "not_started";
  switch (task.status) {
    case "not_started": return [{ to: "in_progress", label: "Start" }, { to: "done", label: "Done ✓" }];
    case "in_progress": return [{ to: "not_started", label: "← Back" }, { to: "done", label: "Done ✓" }];
    default:            return [{ to: reopen, label: "Reopen" }];
  }
}
