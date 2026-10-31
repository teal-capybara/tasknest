/* ==========================================================================
   COURSES (database)

   A course document:  { name, archived, createdAt, updatedAt }
   Tasks point to a course by its id (courseId), never by its name, so renaming
   a course updates every task automatically.

   Archive vs delete:
   - Archive hides the course (and its tasks) from normal lists but keeps all
     history. It can be restored.
   - Delete removes the course AND all its tasks permanently.
   ========================================================================== */

import { colRef, docRef, newId, watchCollection, guard, runBatched } from "./helpers.js";

export function watchCourses(fb, uid, onData) {
  return watchCollection(fb, uid, "courses", onData);
}

/** Returns the new course id immediately (the write finishes in the background). */
export function addCourse(fb, uid, name) {
  const id = newId(fb, uid, "courses");
  const now = Date.now();
  guard(fb.F.setDoc(docRef(fb, uid, "courses", id), {
    name: name.trim(), archived: false, createdAt: now, updatedAt: now,
  }));
  return id;
}

export function renameCourse(fb, uid, id, name) {
  guard(fb.F.setDoc(docRef(fb, uid, "courses", id),
    { name: name.trim(), updatedAt: Date.now() }, { merge: true }));
}

export function setCourseArchived(fb, uid, id, archived) {
  guard(fb.F.setDoc(docRef(fb, uid, "courses", id),
    { archived, updatedAt: Date.now() }, { merge: true }));
}

/** Permanently deletes the course and every task that belongs to it. */
export function deleteCourse(fb, uid, courseId, taskIds) {
  const ops = taskIds.map((tid) => (batch) => batch.delete(docRef(fb, uid, "tasks", tid)));
  ops.push((batch) => batch.delete(docRef(fb, uid, "courses", courseId)));
  runBatched(fb, ops);
}
