/* ==========================================================================
   EVENTS (database): exams, meetings, classes and other things on your schedule.

   An event is NOT a task: it happens at a time and you attend it. A task is
   something you have to do before a deadline. (You can create a task for an
   event, for example "Review for Midterm", and the two stay linked.)

   An event document:
     title
     kind        "exam" | "meeting" | "class" | "other"
     workspace   "academics" | "organizations"
     courseId    (academics, optional)   orgId (organizations, optional)
     allDay      true or false
     startAt     the start as a number (ms since 1970). For an all-day event: midnight of that day
     endAt       the end as a number, or null (all-day events and events with no end time)
     location, notes
     createdAt, updatedAt

   Events last one day. (Multi-day events are not supported yet.)
   ========================================================================== */

import { docRef, newId, watchCollection, guard, runBatched } from "./helpers.js";

export function watchEvents(fb, uid, onData) {
  return watchCollection(fb, uid, "events", onData);
}

function toFields(input) {
  const academics = input.workspace === "academics";
  return {
    title: input.title.trim(),
    kind: input.kind,
    workspace: input.workspace,
    courseId: academics ? (input.courseId || null) : null,
    orgId: academics ? null : (input.orgId || null),
    allDay: Boolean(input.allDay),
    startAt: input.startAt,
    endAt: input.allDay ? null : (input.endAt ?? null),
    location: (input.location || "").trim(),
    notes: (input.notes || "").trim(),
  };
}

/** Returns the new id immediately; the cloud write finishes in the background. */
export function createEvent(fb, uid, input) {
  const id = newId(fb, uid, "events");
  const now = Date.now();
  guard(fb.F.setDoc(docRef(fb, uid, "events", id), { ...toFields(input), createdAt: now, updatedAt: now }));
  return id;
}

export function updateEvent(fb, uid, id, input) {
  guard(fb.F.setDoc(docRef(fb, uid, "events", id), { ...toFields(input), updatedAt: Date.now() }, { merge: true }));
}

export function deleteEvent(fb, uid, id) {
  runBatched(fb, [(batch) => batch.delete(docRef(fb, uid, "events", id))]);
}
