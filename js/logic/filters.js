/* ==========================================================================
   FILTERS AND SEARCH

   All filters work together (AND): a task must match every active filter.
   Example: workspace = Academics, course = CS101, arrangement = Group,
   when = Next 7 days  ->  group tasks in CS101 due within a week.
   ========================================================================== */

import { SORTS } from "./urgency.js";

const DAY = 24 * 60 * 60 * 1000;

export const WHEN_OPTIONS = [
  { id: "",           name: "Any time" },
  { id: "today",      name: "Due today" },
  { id: "week",       name: "Next 7 days" },
  { id: "upcoming",   name: "Upcoming (not overdue)" },
  { id: "overdue",    name: "Overdue" },
  { id: "unfinished", name: "Unfinished (not done)" },
  { id: "completed",  name: "Completed" },
  { id: "nodeadline", name: "No deadline" },
];

export function emptyFilters() {
  return {
    workspace: "all",   // all | academics | organizations
    courseId: "", orgId: "", typeId: "", arrangement: "", status: "",
    when: "", search: "", sort: "urgency",
  };
}

/** How many of the filters in the panel are active (for the "Filters (2)" label). */
export function countActiveFilters(f) {
  return ["courseId", "orgId", "typeId", "arrangement", "status", "when"].filter((k) => f[k]).length;
}

export function hasAnyFilter(f) {
  return countActiveFilters(f) > 0 || f.workspace !== "all" || f.search.trim() !== "";
}

function matchesWhen(task, when, now) {
  const done = task.status === "done";
  switch (when) {
    case "": return true;
    case "completed": return done;
    case "unfinished": return !done;
    case "nodeadline": return !done && task.dueAt == null;
    case "overdue": return !done && task.dueAt != null && task.dueAt < now;
    case "upcoming": return !done && task.dueAt != null && task.dueAt >= now;
    case "week": return !done && task.dueAt != null && task.dueAt >= now && task.dueAt <= now + 7 * DAY;
    case "today": {
      if (done || task.dueAt == null) return false;
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      return task.dueAt >= start.getTime() && task.dueAt < start.getTime() + DAY;
    }
    default: return true;
  }
}

/**
 * ctx = { now, isArchived(task), names: { course(id), org(id), type(id), arrangement(id) } }
 * isArchived is true for a task archived itself OR whose course is archived
 * (archiving a course hides its tasks from the active lists but keeps them for reports).
 * Returns a NEW sorted array; the original is not changed.
 */
export function applyFilters(tasks, f, ctx) {
  const tokens = f.search.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const result = tasks.filter((t) => {
    if (ctx.isArchived(t)) return false;
    if (f.workspace !== "all" && t.workspace !== f.workspace) return false;
    if (f.courseId && t.courseId !== f.courseId) return false;
    if (f.orgId && t.orgId !== f.orgId) return false;
    if (f.typeId && t.typeId !== f.typeId) return false;
    if (f.arrangement && t.arrangement !== f.arrangement) return false;
    if (f.status && t.status !== f.status) return false;
    if (!matchesWhen(t, f.when, ctx.now)) return false;

    if (tokens.length) {
      // Search title, course/organization, type, work arrangement, instructions and notes.
      const haystack = [
        t.title, t.instructions, t.notes,
        t.courseId ? ctx.names.course(t.courseId) : "",
        t.orgId ? ctx.names.org(t.orgId) : "",
        ctx.names.type(t.typeId), ctx.names.arrangement(t.arrangement),
      ].join(" \n ").toLowerCase();
      if (!tokens.every((tok) => haystack.includes(tok))) return false;
    }
    return true;
  });

  const sort = SORTS.find((s) => s.id === f.sort) || SORTS[0];
  return result.sort(sort.compare);
}
