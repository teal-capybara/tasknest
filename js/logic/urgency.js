/* ==========================================================================
   URGENCY AND SORTING

   STATUS (stored)  is what YOU say about progress: not started / in progress / done.
   URGENCY (worked out here) is how close the deadline is, right now.
   They are separate on purpose: a task can be "In progress" AND "Overdue".

   Urgency levels (for a task that is not done):
     overdue      deadline has passed
     due_today    deadline is later today
     due_soon     not today, but within dueSoonHours (default 48) from now
     upcoming     further away
     no_deadline  no due date
   Finished tasks are always "done" (see timing.js for early / on time / late).

   Every level has an icon AND a text label, so the meaning never depends on
   color alone.
   ========================================================================== */

import { DEFAULT_SETTINGS } from "../constants.js";
import { calendarDaysBetween } from "./format.js";
import { describeSpan } from "./timing.js";

const HOUR = 3600000;

/** Returns { key, label, icon, text } describing how urgent a task is at time `now`. */
export function urgencyOf(task, now = Date.now(), settings = DEFAULT_SETTINGS) {
  if (task.status === "done") {
    return { key: "done", label: "Done", icon: "✓", text: "Done" };
  }
  if (task.dueAt == null) {
    return { key: "no_deadline", label: "No deadline", icon: "–", text: "No deadline" };
  }

  const diff = task.dueAt - now;
  if (diff < 0) {
    return { key: "overdue", label: "Overdue", icon: "⚠", text: `Overdue · ${describeSpan(-diff)} late` };
  }

  const days = calendarDaysBetween(now, task.dueAt);
  if (days === 0) {
    return { key: "due_today", label: "Due today", icon: "●", text: "Due today" };
  }
  if (diff <= settings.dueSoonHours * HOUR) {
    return { key: "due_soon", label: "Due soon", icon: "◐", text: "Due soon" };
  }
  return { key: "upcoming", label: "Upcoming", icon: "○", text: days === 1 ? "Due tomorrow" : `Due in ${days} days` };
}

/**
 * The default ordering:
 *   1. Unfinished tasks WITH a deadline, soonest first. Overdue deadlines are in
 *      the past, so overdue tasks naturally come first, then today, then
 *      tomorrow, and so on.
 *   2. Unfinished tasks without a deadline (newest first).
 *   3. Finished tasks at the bottom (most recently finished first).
 */
export function compareByUrgency(a, b) {
  const group = (t) => (t.status === "done" ? 2 : t.dueAt == null ? 1 : 0);
  const ga = group(a), gb = group(b);
  if (ga !== gb) return ga - gb;
  if (ga === 0) return a.dueAt - b.dueAt || (a.createdAt || 0) - (b.createdAt || 0);
  if (ga === 1) return (b.createdAt || 0) - (a.createdAt || 0);
  return (b.completedAt || b.updatedAt || 0) - (a.completedAt || a.updatedAt || 0);
}

export const SORTS = [
  { id: "urgency", name: "Urgency (default)", compare: compareByUrgency },
  { id: "due", name: "Due date", compare: (a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) || (a.createdAt || 0) - (b.createdAt || 0) },
  { id: "created", name: "Recently added", compare: (a, b) => (b.createdAt || 0) - (a.createdAt || 0) },
  { id: "title", name: "Title (A to Z)", compare: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) },
];
