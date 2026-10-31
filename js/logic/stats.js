/* ==========================================================================
   DASHBOARD NUMBERS

   Pure functions (no screens, no database): give them the tasks and they work
   out everything the Dashboard shows. Archived tasks (and tasks of archived
   courses) are left out, the same as on the Tasks list.

   ctx = {
     now,                         the current time (ms)
     settings,                    { dueSoonHours, earlyHours }
     isArchived(task),            true for archived tasks / archived courses
     groupName(task),             "CS 101" or "COMPASS"
   }
   ========================================================================== */

import { urgencyOf, compareByUrgency } from "./urgency.js";
import { completionTiming } from "./timing.js";

const DAY = 24 * 60 * 60 * 1000;
const NEEDS_ATTENTION = ["overdue", "due_today", "due_soon"];

export function dashboardStats(tasks, ctx) {
  const { now, settings, isArchived, groupName } = ctx;
  const active = tasks.filter((t) => !isArchived(t));
  const open = active.filter((t) => t.status !== "done");

  /* ---- the four tiles, and the tasks that need attention ---- */
  const counts = { overdue: 0, due_today: 0, due_soon: 0, in_progress: 0 };
  const attention = [];
  for (const task of open) {
    const key = urgencyOf(task, now, settings).key;
    if (NEEDS_ATTENTION.includes(key)) { counts[key]++; attention.push(task); }
    if (task.status === "in_progress") counts.in_progress++;
  }
  attention.sort(compareByUrgency);   // overdue first, then today, then soon

  /* ---- progress per course / organization (done out of all its tasks) ---- */
  const groups = new Map();
  for (const task of active) {
    const id = task.workspace === "academics" ? task.courseId : task.orgId;
    const key = `${task.workspace}:${id}`;
    if (!groups.has(key)) groups.set(key, { key, workspace: task.workspace, name: groupName(task), total: 0, done: 0 });
    const group = groups.get(key);
    group.total++;
    if (task.status === "done") group.done++;
  }
  // The ones with the most work left come first.
  const progress = [...groups.values()].sort((a, b) =>
    (b.total - b.done) - (a.total - a.done) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  /* ---- finished in the last 7 days, and how (early / on time / late) ---- */
  const since = now - 7 * DAY;
  const week = { done: 0, early: 0, ontime: 0, late: 0, nodeadline: 0 };
  for (const task of active) {
    if (task.status !== "done" || task.completedAt == null || task.completedAt < since || task.completedAt > now) continue;
    week.done++;
    const timing = completionTiming(task, settings.earlyHours);
    if (timing) week[timing.key]++;
  }

  return { counts, attention, progress, week, totalActive: active.length, openCount: open.length };
}
