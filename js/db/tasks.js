/* ==========================================================================
   TASKS (database)

   A task document looks like this:
     title, workspace ("academics" | "organizations"),
     courseId (academics only) / orgId (organizations only),
     typeId, arrangement ("individual" | "group"),
     status ("not_started" | "in_progress" | "done"),
     dueAt            deadline as a number (ms since 1970), or null for none
     startAt          optional start date (the start of that day), or null
     instructions, notes
     createdAt, updatedAt            set automatically
     inProgressAt                    the FIRST time it was marked In progress
     completedAt                     when it was marked Done (null if not done)
     eventId          the schedule event this task is for (optional, see js/db/events.js)
     archived, archivedAt
     deadlineHistory                 list of { from, to, changedAt }

   All times are plain numbers from Date.now(), which work offline.

   STATUS RULES (one place: statusPatch below)
   - Marking Done records completedAt. Moving it back out of Done clears it.
   - The first time it becomes In progress, inProgressAt is recorded. That is a
     real signal of "work started" for later reports, unlike the creation time.
   ========================================================================== */

import { docRef, newId, guard, runBatched } from "./helpers.js";

/** Cleans up what the form gives us so we only ever store tidy values. */
function toFields(input) {
  const academics = input.workspace === "academics";
  return {
    title: input.title.trim(),
    workspace: input.workspace,
    courseId: academics ? input.courseId : null,
    orgId: academics ? null : input.orgId,
    typeId: input.typeId,
    arrangement: input.arrangement,
    status: input.status,
    dueAt: input.dueAt == null ? null : input.dueAt,
    startAt: input.startAt == null ? null : input.startAt,
    instructions: (input.instructions || "").trim(),
    notes: (input.notes || "").trim(),
    eventId: input.eventId || null,
  };
}

/** The extra fields to change when a task's status changes. */
function statusPatch(oldTask, newStatus, now) {
  const patch = {};
  if (oldTask && oldTask.status === newStatus) return patch;

  if (newStatus === "done") patch.completedAt = now;
  else if (oldTask && oldTask.status === "done") patch.completedAt = null;

  if (newStatus === "in_progress" && !(oldTask && oldTask.inProgressAt)) patch.inProgressAt = now;
  return patch;
}

/** Creates a task. Returns its id immediately; the cloud write finishes in the background. */
export function createTask(fb, uid, input) {
  const now = Date.now();
  const id = newId(fb, uid, "tasks");
  const fields = toFields(input);
  guard(fb.F.setDoc(docRef(fb, uid, "tasks", id), {
    ...fields,
    archived: false,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    inProgressAt: fields.status === "in_progress" ? now : null,
    completedAt: fields.status === "done" ? now : null,
    deadlineHistory: [],
  }));
  return id;
}

/**
 * Saves edits. If the deadline changed, the OLD deadline is added to
 * deadlineHistory. arrayUnion adds to the list safely even if two devices edit
 * at the same time (neither overwrites the other's entry).
 */
export function updateTask(fb, uid, oldTask, input) {
  const now = Date.now();
  const fields = toFields(input);
  const patch = { ...fields, updatedAt: now, ...statusPatch(oldTask, fields.status, now) };

  if ((oldTask.dueAt ?? null) !== fields.dueAt) {
    patch.deadlineHistory = fb.F.arrayUnion({ from: oldTask.dueAt ?? null, to: fields.dueAt, changedAt: now });
  }
  guard(fb.F.setDoc(docRef(fb, uid, "tasks", oldTask.id), patch, { merge: true }));
}

/** Inline status change from a task card. */
export function setTaskStatus(fb, uid, task, status) {
  const now = Date.now();
  guard(fb.F.setDoc(docRef(fb, uid, "tasks", task.id),
    { status, updatedAt: now, ...statusPatch(task, status, now) }, { merge: true }));
}

export function setTaskArchived(fb, uid, task, archived) {
  const now = Date.now();
  guard(fb.F.setDoc(docRef(fb, uid, "tasks", task.id),
    { archived, archivedAt: archived ? now : null, updatedAt: now }, { merge: true }));
}

export function deleteTask(fb, uid, taskId) {
  runBatched(fb, [(batch) => batch.delete(docRef(fb, uid, "tasks", taskId))]);
}
