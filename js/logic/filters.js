/* ==========================================================================
   FILTERS AND SEARCH

   All filters work together (AND): a task must match every active filter.
   Example: workspace = Academics, course = CS101, arrangement = Group,
   when = Next 7 days  ->  group tasks in CS101 due within a week.
   ========================================================================== */

import { SORTS, urgencyOf } from "./urgency.js";
import { DEFAULT_SETTINGS } from "../constants.js";

const DAY = 24 * 60 * 60 * 1000;

export const WHEN_OPTIONS = [
  { id: "",           name: "Any time" },
  { id: "today",      name: "Due today" },
  { id: "soon",       name: "Due soon" },
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

function matchesWhen(task, when, now, settings) {
  const done = task.status === "done";
  switch (when) {
    case "": return true;
    case "completed": return done;
    case "unfinished": return !done;
    case "nodeadline": return !done && task.dueAt == null;
    case "overdue": return !done && task.dueAt != null && task.dueAt < now;
    case "upcoming": return !done && task.dueAt != null && task.dueAt >= now;
    case "week": return !done && task.dueAt != null && task.dueAt >= now && task.dueAt <= now + 7 * DAY;
    // "today" and "soon" use the same rule as the urgency badge, so the Dashboard tiles match the list.
    // (A deadline earlier today that has already passed counts as overdue, not as due today.)
    case "today": return urgencyOf(task, now, settings).key === "due_today";
    case "soon": return urgencyOf(task, now, settings).key === "due_soon";
    default: return true;
  }
}

/**
 * ctx = { now, settings, isArchived(task), names: { course(id), org(id), type(id), arrangement(id) } }
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
    if (!matchesWhen(t, f.when, ctx.now, ctx.settings || DEFAULT_SETTINGS)) return false;

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
