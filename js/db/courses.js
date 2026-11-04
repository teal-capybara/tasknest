/* ==========================================================================
   COURSES (database)

   A course document:
     name         the course description: the name shown everywhere in the app (task forms, lists...)
     code         course code, e.g. "PATHFIT3-M"          (only the Schedule and Courses pages show the next ones)
     kind         "lecture" | "laboratory"
     units        number or null
     professor, room
     termId       "2025-2026|1" (school year | semester), or missing for older courses
     slots        [{ day, start, end }]  when the class meets (see js/logic/schedule.js)
     archived, createdAt, updatedAt
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

/** Saves the full course form. id = null creates a new course. Returns the id. */
export function saveCourse(fb, uid, id, fields) {
  const now = Date.now();
  if (!id) {
    id = newId(fb, uid, "courses");
    guard(fb.F.setDoc(docRef(fb, uid, "courses", id), { ...fields, archived: false, createdAt: now, updatedAt: now }));
  } else {
    guard(fb.F.setDoc(docRef(fb, uid, "courses", id), { ...fields, updatedAt: now }, { merge: true }));
  }
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

/**
 * Permanently deletes the course and every task that belongs to it.
 * Events of the course are NOT deleted: they stay on the calendar, just without a course.
 */
export function deleteCourse(fb, uid, courseId, taskIds, eventIds = []) {
  const ops = taskIds.map((tid) => (batch) => batch.delete(docRef(fb, uid, "tasks", tid)));
  for (const eid of eventIds) {
    ops.push((batch) => batch.set(docRef(fb, uid, "events", eid), { courseId: null, updatedAt: Date.now() }, { merge: true }));
  }
  ops.push((batch) => batch.delete(docRef(fb, uid, "courses", courseId)));
  runBatched(fb, ops);
}
