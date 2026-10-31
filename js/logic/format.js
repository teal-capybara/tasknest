/* ==========================================================================
   DATE AND TIME HELPERS

   All times in the app are stored as numbers: milliseconds since 1970
   (what Date.now() gives). These helpers convert between those numbers and
   what you see on screen or type into the date/time pickers.
   Everything uses YOUR device's time zone.
   ========================================================================== */

import { DEFAULT_DUE_TIME } from "../constants.js";

const pad = (n) => String(n).padStart(2, "0");
const DAY = 24 * 60 * 60 * 1000;

/** Number -> "2026-10-30" for <input type="date"> (empty string if none). */
export function toInputDate(ms) {
  if (ms == null) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Number -> "23:59" for <input type="time"> (empty string if none). */
export function toInputTime(ms) {
  if (ms == null) return "";
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Combine the date and time pickers into one number.
 * Returns { ms, error, field } where field says which picker the error belongs to.
 *  - no date, no time  -> { ms: null }  (task without a deadline)
 *  - time but no date  -> error
 *  - date, no time     -> uses 11:59 PM (DEFAULT_DUE_TIME)
 */
export function fromInputs(dateStr, timeStr) {
  if (!dateStr) {
    return timeStr ? { ms: null, field: "date", error: "Pick a date for this time, or clear the time." } : { ms: null };
  }
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!dm) return { ms: null, field: "date", error: "Enter a valid date." };

  let hh = DEFAULT_DUE_TIME.hours, mm = DEFAULT_DUE_TIME.minutes;
  if (timeStr) {
    const tm = /^(\d{2}):(\d{2})$/.exec(timeStr);
    if (!tm) return { ms: null, field: "time", error: "Enter a valid time." };
    hh = Number(tm[1]); mm = Number(tm[2]);
  }
  const y = Number(dm[1]), mo = Number(dm[2]), day = Number(dm[3]);
  const d = new Date(y, mo - 1, day, hh, mm, 0, 0);
  // new Date() "rolls over" impossible dates (Feb 30 -> Mar 2). Detect that.
  const rolled = d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day;
  if (rolled || Number.isNaN(d.getTime())) return { ms: null, field: "date", error: "That date doesn't exist." };
  if (y < 2000 || y > 2100) return { ms: null, field: "date", error: "Enter a year between 2000 and 2100." };
  return { ms: d.getTime() };
}

export function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole calendar days from one moment to another (0 = same day, 1 = next day...). */
export function calendarDaysBetween(fromMs, toMs) {
  return Math.round((startOfDay(toMs) - startOfDay(fromMs)) / DAY);
}

const timeFmt = { hour: "numeric", minute: "2-digit" };

/** "Fri, Oct 30 · 11:59 PM" (adds the year if it is not this year). */
export function formatDue(ms, now = Date.now()) {
  if (ms == null) return "No deadline";
  const d = new Date(ms);
  const dateOpts = { weekday: "short", month: "short", day: "numeric" };
  if (d.getFullYear() !== new Date(now).getFullYear()) dateOpts.year = "numeric";
  return `${d.toLocaleDateString([], dateOpts)} · ${d.toLocaleTimeString([], timeFmt)}`;
}

/** "Fri, Oct 30, 2026, 11:59 PM" for detail pages and history. */
export function formatDateTime(ms) {
  if (ms == null) return "—";
  const d = new Date(ms);
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${d.toLocaleTimeString([], timeFmt)}`;
}
