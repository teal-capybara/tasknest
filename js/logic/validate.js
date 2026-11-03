/* ==========================================================================
   FORM VALIDATION

   validateTaskForm checks what you typed and either returns a list of
   friendly error messages, or a clean task object ready to save.
   Nothing invalid is ever saved silently.
   ========================================================================== */

import { ARRANGEMENTS, EVENT_KINDS, LIMITS, ORGANIZATIONS, STATUSES, WORKSPACES } from "../constants.js";
import { fromInputs } from "./format.js";

const has = (list, id) => list.some((x) => x.id === id);

/**
 * values : the raw form values (all strings)
 * ctx    : { courseIds: [ids allowed], typeIds: { academics: [ids], organizations: [ids] }, eventIds: [ids] }
 * Returns { errors: { fieldName: message }, value } (value is null if there are errors)
 */
export function validateTaskForm(values, ctx) {
  const errors = {};

  const title = (values.title || "").trim();
  if (!title) errors.title = "Give the task a title.";
  else if (title.length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`;

  if (!has(WORKSPACES, values.workspace)) errors.workspace = "Choose Academics or Organizations.";

  let courseId = null, orgId = null;
  if (values.workspace === "academics") {
    if (!values.courseId) errors.courseId = "Choose a course (add one under Manage if the list is empty).";
    else if (!ctx.courseIds.includes(values.courseId)) errors.courseId = "That course no longer exists. Choose another.";
    else courseId = values.courseId;
  } else if (values.workspace === "organizations") {
    if (!has(ORGANIZATIONS, values.orgId)) errors.orgId = "Choose an organization.";
    else orgId = values.orgId;
  }

  if (!values.typeId) errors.typeId = "Choose a task type.";
  else if (!((ctx.typeIds || {})[values.workspace] || []).includes(values.typeId)) errors.typeId = "That task type is not available here. Choose another.";

  if (!has(ARRANGEMENTS, values.arrangement)) errors.arrangement = "Choose Individual or Group work.";
  if (!has(STATUSES, values.status)) errors.status = "Choose a status.";

  const due = fromInputs(values.dueDate, values.dueTime);
  if (due.error) errors[due.field === "time" ? "dueTime" : "dueDate"] = due.error;

  // Optional start date: the day you plan to begin (stored as the start of that day).
  const start = values.startDate ? fromInputs(values.startDate, "00:00") : { ms: null };
  if (start.error) errors.startDate = start.error;
  else if (start.ms != null && due.ms != null && start.ms > due.ms) errors.startDate = "The start date can't be after the deadline.";

  const instructions = (values.instructions || "").trim();
  const notes = (values.notes || "").trim();
  if (instructions.length > LIMITS.text) errors.instructions = `Keep this under ${LIMITS.text} characters.`;
  if (notes.length > LIMITS.text) errors.notes = `Keep this under ${LIMITS.text} characters.`;

  if (Object.keys(errors).length) return { errors, value: null };

  return {
    errors,
    value: {
      title, workspace: values.workspace, courseId, orgId,
      typeId: values.typeId, arrangement: values.arrangement,
      dueAt: due.ms, startAt: start.ms ?? null, instructions, notes, status: values.status,
      // The event this task is for. Dropped quietly if that event no longer exists.
      eventId: values.eventId && (ctx.eventIds || []).includes(values.eventId) ? values.eventId : null,
    },
  };
}

/**
 * Checks the Add/Edit event form.
 * values: all strings. allDay is "1" when the box is ticked.
 * ctx: { courseIds, kindIds }  (kindIds = every valid kind id, built-in and custom)
 * Returns { errors, value }. value has startAt / endAt as numbers, ready to save.
 */
export function validateEventForm(values, ctx) {
  const errors = {};

  const title = (values.title || "").trim();
  if (!title) errors.title = "Give the event a title.";
  else if (title.length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`;

  if (!(ctx.kindIds || EVENT_KINDS.map((k) => k.id)).includes(values.kind)) errors.kind = "Choose what kind of event this is.";
  if (!has(WORKSPACES, values.workspace)) errors.workspace = "Choose Academics or Organizations.";

  let courseId = null, orgId = null;
  if (values.workspace === "academics" && values.courseId) {
    if (!(ctx.courseIds || []).includes(values.courseId)) errors.courseId = "That course no longer exists. Choose another.";
    else courseId = values.courseId;
  } else if (values.workspace === "organizations" && values.orgId) {
    if (!has(ORGANIZATIONS, values.orgId)) errors.orgId = "Choose an organization from the list.";
    else orgId = values.orgId;
  }

  const allDay = values.allDay === "1";
  let startAt = null, endAt = null;
  if (!values.date) {
    errors.date = "Pick the date of the event.";
  } else {
    const start = fromInputs(values.date, allDay ? "00:00" : values.startTime);
    if (start.error) errors[start.field === "time" ? "startTime" : "date"] = start.error;
    else if (!allDay && !values.startTime) errors.startTime = "Choose a start time, or tick All day.";
    else startAt = start.ms;

    if (!allDay && values.endTime && !errors.date && !errors.startTime) {
      const end = fromInputs(values.date, values.endTime);
      if (end.error) errors.endTime = end.error;
      else if (startAt != null && end.ms <= startAt) errors.endTime = "The end time must be after the start time.";
      else endAt = end.ms;
    }
  }

  const location = (values.location || "").trim();
  const notes = (values.notes || "").trim();
  if (location.length > LIMITS.location) errors.location = `Keep this under ${LIMITS.location} characters.`;
  if (notes.length > LIMITS.text) errors.notes = `Keep this under ${LIMITS.text} characters.`;

  if (Object.keys(errors).length) return { errors, value: null };
  return {
    errors,
    value: { title, kind: values.kind, workspace: values.workspace, courseId, orgId, allDay, startAt, endAt, location, notes },
  };
}

/** Validates a course or task-type name against existing names (case-insensitive). */
export function validateName(name, existingNames, { ignore = "" } = {}) {
  const n = (name || "").trim();
  if (!n) return { error: "Enter a name." };
  if (n.length > LIMITS.name) return { error: `Keep it under ${LIMITS.name} characters.` };
  const lower = n.toLowerCase();
  const taken = existingNames.some((e) => e.toLowerCase() === lower && e.toLowerCase() !== ignore.toLowerCase());
  if (taken) return { error: "You already have one with that name." };
  return { name: n };
}
