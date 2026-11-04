/* ==========================================================================
   CLASS SCHEDULE logic (pure: no screens, no database).

   - A TERM is a school year plus a semester, saved as "2025-2026|1" (1 = 1st, 2 = 2nd).
   - A course belongs to one term (course.termId). A course with no termId (the ones
     you had before this feature) counts as LEGACY_TERM (2026-2027, 1st semester).
   - Switching term gives a clean slate: the courses, schedule and ACADEMIC tasks of
     that term only. Organization tasks and calendar events are not tied to a term.
   - A course has "slots": the days and times it meets, e.g.
         { day: 4, start: "12:00", end: "13:30" }      day uses JS numbers: 0 = Sunday ... 6 = Saturday
     Times are saved as 24-hour "HH:MM" text.
   - Only the Schedule and Courses pages show professor, units and room. Everywhere
     else in the app a course is just its description (course.name).
   ========================================================================== */

import { LIMITS } from "../constants.js";

export const SEMESTERS = [{ id: "1", name: "1st Semester" }, { id: "2", name: "2nd Semester" }];
export const KINDS = [{ id: "lecture", name: "Lecture" }, { id: "laboratory", name: "Laboratory" }];
/** Monday first, like a school week. */
export const DAYS = [
  { id: 1, short: "Mon", name: "Monday" }, { id: 2, short: "Tue", name: "Tuesday" }, { id: 3, short: "Wed", name: "Wednesday" },
  { id: 4, short: "Thu", name: "Thursday" }, { id: 5, short: "Fri", name: "Friday" }, { id: 6, short: "Sat", name: "Saturday" },
  { id: 0, short: "Sun", name: "Sunday" },
];
export const DEFAULT_YEARS = ["2025-2026", "2026-2027"];
export const LEGACY_TERM = "2026-2027|1";
export const DEFAULT_TERM = LEGACY_TERM;
export const SLOT_LIMIT = 14;

const YEAR_RE = /^(\d{4})-(\d{4})$/;
const TERM_RE = /^(\d{4}-\d{4})\|([12])$/;
const dayById = (id) => DAYS.find((d) => d.id === id);
export const dayName = (id) => (dayById(id) || { name: "" }).name;
export const dayShort = (id) => (dayById(id) || { short: "" }).short;
export const kindName = (id) => (KINDS.find((k) => k.id === id) || { name: "" }).name;

/* ---------------------------------------------------------------- terms */

export const makeTerm = (year, sem) => `${year}|${sem}`;
export function parseTerm(id) {
  const m = TERM_RE.exec(id || "");
  return m ? { year: m[1], sem: m[2] } : null;
}
export function termName(id) {
  const t = parseTerm(id);
  if (!t) return "No semester";
  return `${t.year.replace("-", "–")} · ${(SEMESTERS.find((s) => s.id === t.sem) || {}).name}`;
}
export const isValidYear = (y) => { const m = YEAR_RE.exec(y || ""); return Boolean(m) && Number(m[2]) === Number(m[1]) + 1; };

/** "2025-2026" -> "2026-2027" */
export const followingYear = (y) => { const m = YEAR_RE.exec(y); return m ? `${Number(m[1]) + 1}-${Number(m[2]) + 1}` : DEFAULT_YEARS[0]; };

/** The school years you can choose, oldest first. Always includes the year of the chosen term. */
export function schoolYears(settings, courses = []) {
  const list = new Set(DEFAULT_YEARS);
  for (const c of courses) { const ct = parseTerm(c.termId); if (ct) list.add(ct.year); }
  for (const y of Array.isArray(settings.schoolYears) ? settings.schoolYears : []) if (isValidYear(y)) list.add(y);
  const t = parseTerm(settings.termId);
  if (t) list.add(t.year);
  return [...list].sort();
}
export const currentTerm = (settings) => (parseTerm(settings.termId) ? settings.termId : DEFAULT_TERM);

/** True when the course should show while this term is chosen. */
export const courseTerm = (course) => course.termId || LEGACY_TERM;
export const inTerm = (course, term) => courseTerm(course) === term;

/* ---------------------------------------------------------------- times */

export function toMinutes(text) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
/** "13:30" -> "1:30 PM" */
export function formatTime(text) {
  const mins = toMinutes(text);
  if (mins == null) return "";
  const h24 = Math.floor(mins / 60), mm = String(mins % 60).padStart(2, "0");
  return `${h24 % 12 === 0 ? 12 : h24 % 12}:${mm} ${h24 < 12 ? "AM" : "PM"}`;
}
export const formatRange = (slot) => `${formatTime(slot.start)} – ${formatTime(slot.end)}`;

/** Keeps only valid slots (a real day, start before end), no duplicates, in week order. */
export function cleanSlots(slots) {
  const seen = new Set(), out = [];
  for (const s of Array.isArray(slots) ? slots : []) {
    if (!s || !Number.isInteger(s.day) || !dayById(s.day)) continue;
    const a = toMinutes(s.start), b = toMinutes(s.end);
    if (a == null || b == null || a >= b) continue;
    const key = `${s.day}|${s.start}|${s.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ day: s.day, start: s.start, end: s.end });
    if (out.length >= SLOT_LIMIT) break;
  }
  const order = (d) => DAYS.findIndex((x) => x.id === d);
  return out.sort((x, y) => order(x.day) - order(y.day) || toMinutes(x.start) - toMinutes(y.start));
}

/* ---------------------------------------------------------------- the week */

/** Every class meeting of the term on one weekday: [{ course, slot }], earliest first. Archived courses are left out. */
export function classesOn(courses, day, term) {
  const out = [];
  for (const course of courses) {
    if (course.archived || !inTerm(course, term)) continue;
    for (const slot of cleanSlots(course.slots)) if (slot.day === day) out.push({ course, slot });
  }
  return out.sort((a, b) => toMinutes(a.slot.start) - toMinutes(b.slot.start) || (a.course.name || "").localeCompare(b.course.name || ""));
}

/** [{ day, items }] for each weekday that has classes (Monday first). */
export function weekOf(courses, term) {
  return DAYS.map((d) => ({ day: d.id, items: classesOn(courses, d.id, term) })).filter((d) => d.items.length);
}

/** Opening and closing hour for the desktop timetable (whole hours). */
export function timetableBounds(week) {
  let lo = 24 * 60, hi = 0;
  for (const d of week) for (const { slot } of d.items) { lo = Math.min(lo, toMinutes(slot.start)); hi = Math.max(hi, toMinutes(slot.end)); }
  if (lo > hi) return { from: 7, to: 18 };
  return { from: Math.floor(lo / 60), to: Math.min(24, Math.ceil(hi / 60)) };
}

/**
 * What the Home card shows.
 *   If today has classes and the last one hasn't finished yet: today's classes.
 *   Otherwise: tomorrow's classes (or "no classes").
 * Returns { when: "today" | "tomorrow", day, items, noClassesToday } or null when the term has no scheduled classes at all.
 */
export function homeSchedule(courses, term, now) {
  if (!weekOf(courses, term).length) return null;
  const date = new Date(now);
  const today = date.getDay();
  const todayItems = classesOn(courses, today, term);
  const minutesNow = date.getHours() * 60 + date.getMinutes();
  const lastEnd = todayItems.reduce((m, { slot }) => Math.max(m, toMinutes(slot.end)), -1);
  if (todayItems.length && minutesNow < lastEnd) return { when: "today", day: today, items: todayItems, noClassesToday: false };
  const tomorrow = (today + 1) % 7;
  return { when: "tomorrow", day: tomorrow, items: classesOn(courses, tomorrow, term), noClassesToday: !todayItems.length };
}

/** Other classes of the term that overlap this slot (same weekday). Used for a gentle warning, never to block saving. */
export function overlaps(slot, courses, term, ignoreCourseId) {
  const a = toMinutes(slot.start), b = toMinutes(slot.end);
  const out = [];
  for (const { course, slot: other } of classesOn(courses, slot.day, term)) {
    if (course.id === ignoreCourseId) continue;
    if (a < toMinutes(other.end) && toMinutes(other.start) < b) out.push(course);
  }
  return out;
}

/* ---------------------------------------------------------------- the course form */

/**
 * values: { name, code, kind, units, professor, room, termId, slots: [{day, start, end}] }  (strings, except slots)
 * ctx: { existing: [{ name, termId }] of the OTHER courses }
 * Returns { errors, value }. value has the clean fields ready to save.
 */
export function validateCourseForm(values, ctx) {
  const errors = {};
  const name = (values.name || "").trim();
  const code = (values.code || "").trim();
  const professor = (values.professor || "").trim();
  const room = (values.room || "").trim();

  if (!name) errors.name = "Enter the course description (this is the name shown when you pick a course for a task).";
  else if (name.length > LIMITS.title) errors.name = `Keep it under ${LIMITS.title} characters.`;
  if (code.length > 30) errors.code = "Keep the course code under 30 characters.";
  if (professor.length > 80) errors.professor = "Keep the professor's name under 80 characters.";
  if (room.length > 40) errors.room = "Keep the room under 40 characters.";

  if (values.kind && !KINDS.some((k) => k.id === values.kind)) errors.kind = "Choose Lecture or Laboratory.";

  let units = null;
  if ((values.units || "").trim() !== "") {
    const n = Number(values.units);
    if (!Number.isFinite(n) || n < 0 || n > 12 || Math.round(n * 2) !== n * 2) errors.units = "Enter units from 0 to 12 (for example 3, or 1.5).";
    else units = n;
  }

  const termId = values.termId || "";
  if (termId && !parseTerm(termId)) errors.termId = "Choose a school year and semester.";

  // The same description twice in the same semester would be confusing in the dropdowns.
  if (name && !errors.termId) {
    const clash = (ctx.existing || []).some((c) => (c.name || "").trim().toLowerCase() === name.toLowerCase() && (c.termId || "") === termId);
    if (clash) errors.name = "You already have a course with this description in this semester.";
  }

  const rawSlots = Array.isArray(values.slots) ? values.slots : [];
  const slots = cleanSlots(rawSlots);
  const slotProblem = rawSlots.some((s) => s && (s.start || s.end) && !cleanSlots([s]).length);
  if (slotProblem) errors.slots = "Each class time needs a day, and an end time after the start time.";

  if (Object.keys(errors).length) return { errors, value: null };
  return {
    errors,
    value: { name, code, kind: values.kind || "lecture", units, professor, room, termId, slots },
  };
}
