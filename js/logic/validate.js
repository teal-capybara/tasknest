/* ==========================================================================
   FORM VALIDATION

   validateTaskForm checks what you typed and either returns a list of
   friendly error messages, or a clean task object ready to save.
   Nothing invalid is ever saved silently.
   ========================================================================== */

import { ARRANGEMENTS, LIMITS, ORGANIZATIONS, STATUSES, WORKSPACES } from "../constants.js";
import { fromInputs } from "./format.js";

const has = (list, id) => list.some((x) => x.id === id);

/**
 * values : the raw form values (all strings)
 * ctx    : { courseIds: [ids allowed], typeIds: [ids allowed] }
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
  else if (!ctx.typeIds.includes(values.typeId)) errors.typeId = "That task type no longer exists. Choose another.";

  if (!has(ARRANGEMENTS, values.arrangement)) errors.arrangement = "Choose Individual or Group work.";
  if (!has(STATUSES, values.status)) errors.status = "Choose a status.";

  const due = fromInputs(values.dueDate, values.dueTime);
  if (due.error) errors[due.field === "time" ? "dueTime" : "dueDate"] = due.error;

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
      dueAt: due.ms, instructions, notes, status: values.status,
    },
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
