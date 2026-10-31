/* ==========================================================================
   TASK TYPES (database)

   Only YOUR custom types are stored here: { name, workspace, createdAt, updatedAt }.
   workspace is "academics" or "organizations". (Types saved before Phase 2.5 have no
   workspace field and are treated as Academics.)
   The built-in types live in js/constants.js and can't be renamed or deleted.

   Deleting a custom type never leaves tasks without a type: the caller picks a
   replacement type and every task using the old type is moved to it first.
   ========================================================================== */

import { docRef, newId, watchCollection, guard, runBatched } from "./helpers.js";

export function watchTaskTypes(fb, uid, onData) {
  return watchCollection(fb, uid, "taskTypes", onData);
}

export function addTaskType(fb, uid, name, workspace) {
  const id = newId(fb, uid, "taskTypes");
  const now = Date.now();
  guard(fb.F.setDoc(docRef(fb, uid, "taskTypes", id), { name: name.trim(), workspace, createdAt: now, updatedAt: now }));
  return id;
}

export function renameTaskType(fb, uid, id, name) {
  guard(fb.F.setDoc(docRef(fb, uid, "taskTypes", id),
    { name: name.trim(), updatedAt: Date.now() }, { merge: true }));
}

/** Moves the affected tasks to replacementId, then deletes the type. */
export function deleteTaskType(fb, uid, typeId, replacementId, affectedTaskIds) {
  const now = Date.now();
  const ops = affectedTaskIds.map((tid) => (batch) =>
    batch.set(docRef(fb, uid, "tasks", tid), { typeId: replacementId, updatedAt: now }, { merge: true }));
  ops.push((batch) => batch.delete(docRef(fb, uid, "taskTypes", typeId)));
  runBatched(fb, ops);
}
