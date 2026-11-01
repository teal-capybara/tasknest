/* ==========================================================================
   CALENDAR LOGIC (no screens, no database)

   Dates here are real JavaScript Date objects set to NOON of the day they
   stand for. Noon is used on purpose: clocks that change (daylight saving) can
   never push a "noon" date into the neighbouring day.
   A "day key" is the text "2026-11-03" (year-month-day in YOUR time zone). It
   is how items are grouped by day.

   What shows on the calendar:
     - schedule EVENTS (exams, meetings, classes) on the day they start
     - task DEADLINES on the day they are due (tasks without a deadline are
       not on the calendar; archived tasks are left out)
   ========================================================================== */

import { WEEK_START } from "../constants.js";
import { calendarDaysBetween, startOfDay } from "./format.js";

const pad = (n) => String(n).padStart(2, "0");
const DAY = 24 * 60 * 60 * 1000;

/** ms or Date -> "2026-11-03" */
export function dayKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-11-03" -> Date at noon that day (null if the text is not a real date). */
export function parseDayKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return dayKey(d) === key ? d : null;
}

export function noonOf(value) {
  const d = new Date(value);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = noonOf(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function addMonths(date, n) {
  const d = noonOf(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));      // Jan 31 + 1 month = Feb 28/29, never "March 3"
  return d;
}

export function startOfWeek(date, weekStart = WEEK_START) {
  const d = noonOf(date);
  d.setDate(d.getDate() - ((d.getDay() - weekStart + 7) % 7));
  return d;
}

/** The 7 days of the week that contains `date`. */
export function weekDays(date, weekStart = WEEK_START) {
  const first = startOfWeek(date, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Rows of 7 days that cover the whole month (including the greyed days around it). */
export function monthGrid(date, weekStart = WEEK_START) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
  const weeks = [];
  let cursor = startOfWeek(first, weekStart);
  while (cursor <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function weekdayNames(weekStart = WEEK_START, style = "short") {
  const base = startOfWeek(new Date(2026, 10, 1, 12), weekStart); // any week works
  return Array.from({ length: 7 }, (_, i) => addDays(base, i).toLocaleDateString([], { weekday: style }));
}

export const monthLabel = (date) => date.toLocaleDateString([], { month: "long", year: "numeric" });
export const dayLabel = (date) => date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
export function weekLabel(days) {
  const a = days[0], b = days[6];
  const short = (d, year) => d.toLocaleDateString([], { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) });
  return `${short(a, a.getFullYear() !== b.getFullYear())} – ${short(b, true)}`;
}

const timeFmt = { hour: "numeric", minute: "2-digit" };
export const formatClock = (ms) => new Date(ms).toLocaleTimeString([], timeFmt);

/** "Mon, Nov 2 · All day"  or  "Mon, Nov 2 · 9:00 AM – 11:00 AM" */
export function eventWhen(event) {
  const date = new Date(event.startAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  if (event.allDay) return `${date} · All day`;
  return `${date} · ${formatClock(event.startAt)}${event.endAt ? ` – ${formatClock(event.endAt)}` : ""}`;
}

/** "Today", "Tomorrow", "In 3 days", "2 days ago" */
export function relativeDay(ms, now = Date.now()) {
  const n = calendarDaysBetween(now, ms);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

/**
 * Groups events and task deadlines by day.
 * Returns a Map: "2026-11-03" -> [ item, item ... ] in the order they should be shown:
 *   all-day events first, then everything else by time (events before tasks at the same time).
 * item = { type: "event", id, at, allDay, event } or { type: "task", id, at, allDay: false, task }
 */
export function itemsByDay(events, tasks, { isTaskArchived = () => false } = {}) {
  const map = new Map();
  const add = (item) => {
    const key = dayKey(item.at);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  };
  for (const event of events) add({ type: "event", id: event.id, at: event.startAt, allDay: Boolean(event.allDay), event });
  for (const task of tasks) {
    if (task.dueAt == null || isTaskArchived(task)) continue;
    add({ type: "task", id: task.id, at: task.dueAt, allDay: false, task });
  }
  const title = (i) => (i.type === "event" ? i.event.title : i.task.title);
  for (const list of map.values()) {
    list.sort((a, b) =>
      (b.allDay - a.allDay) || (a.at - b.at) || (a.type === b.type ? 0 : a.type === "event" ? -1 : 1) ||
      title(a).localeCompare(title(b), undefined, { sensitivity: "base" }));
  }
  return map;
}

/** Events that are still ahead (or happening now) within the next `days` days, soonest first. */
export function upcomingEvents(events, now = Date.now(), days = 14, limit = 5) {
  const endOf = (e) => (e.allDay ? startOfDay(e.startAt) + DAY : (e.endAt ?? e.startAt));
  return events
    .filter((e) => endOf(e) > now && e.startAt <= now + days * DAY)
    .sort((a, b) => a.startAt - b.startAt)
    .slice(0, limit);
}
