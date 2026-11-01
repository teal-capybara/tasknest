/* ==========================================================================
   EVENT TYPES (database)

   Only YOUR custom kinds of event are stored here: { name, workspace, createdAt, updatedAt }.
   workspace is "academics" or "organizations". The built-in kinds live in
   js/constants.js and can't be renamed or deleted.

   Deleting a custom kind never leaves events without one: the caller picks a
   replacement and every event using the old kind is moved to it first.
   ========================================================================== */

import { docRef, newId, watchCollection, guard, runBatched } from "./helpers.js";

export function watchEventTypes(fb, uid, onData) {
  return watchCollection(fb, uid, "eventTypes", onData);
}

export function addEventType(fb, uid, name, workspace) {
  const id = newId(fb, uid, "eventTypes");
  const now = Date.now();
  guard(fb.F.setDoc(docRef(fb, uid, "eventTypes", id), { name: name.trim(), workspace, createdAt: now, updatedAt: now }));
  return id;
}

export function renameEventType(fb, uid, id, name) {
  guard(fb.F.setDoc(docRef(fb, uid, "eventTypes", id), { name: name.trim(), updatedAt: Date.now() }, { merge: true }));
}

/** Moves the affected events to replacementId, then deletes the kind. */
export function deleteEventType(fb, uid, typeId, replacementId, affectedEventIds) {
  const now = Date.now();
  const ops = affectedEventIds.map((eid) => (batch) =>
    batch.set(docRef(fb, uid, "events", eid), { kind: replacementId, updatedAt: now }, { merge: true }));
  ops.push((batch) => batch.delete(docRef(fb, uid, "eventTypes", typeId)));
  runBatched(fb, ops);
}
