/* ==========================================================================
   DATABASE HELPERS shared by courses, task types and tasks.

   Layout in the database (everything lives under YOUR user id):
     users/{uid}/courses/{courseId}
     users/{uid}/taskTypes/{typeId}      (your custom types only)
     users/{uid}/tasks/{taskId}
     users/{uid}/events/{eventId}       (exams, meetings, classes)
     users/{uid}/settings/main
   ========================================================================== */

import { reportSnapshot, reportError, forget } from "../sync-status.js";
import { toast } from "../ui/screens.js";

export function colRef(fb, uid, name) {
  return fb.F.collection(fb.db, "users", uid, name);
}

export function docRef(fb, uid, name, id) {
  return fb.F.doc(fb.db, "users", uid, name, id);
}

/** Makes a new unique id WITHOUT contacting the server (so it works offline). */
export function newId(fb, uid, name) {
  return fb.F.doc(colRef(fb, uid, name)).id;
}

/**
 * Listen to a whole collection. onData receives an array of plain objects,
 * each with an "id". Works offline: the first call comes from the copy on this
 * device. Returns a function that stops listening.
 */
export function watchCollection(fb, uid, name, onData) {
  const unsubscribe = fb.F.onSnapshot(
    colRef(fb, uid, name),
    { includeMetadataChanges: true }, // lets the sync chip see "pending" and "from cache"
    (snap) => {
      reportSnapshot(name, snap);
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => reportError(name, err)
  );
  return () => { unsubscribe(); forget(name); };
}

/**
 * Writes return a promise that only finishes when the CLOUD confirms, which can
 * take forever while offline. So we never wait for it. The screen updates from
 * the local copy straight away. We only watch for real errors (for example the
 * security rules refusing a write) and show them.
 */
export function guard(promise, what = "Could not save") {
  Promise.resolve(promise).catch((err) => {
    console.error(what, err);
    toast(`${what}: ${err.code || err.message}`, 6000);
  });
}

/**
 * Runs many writes in batches (Firestore allows at most 500 per batch).
 * "ops" is a list of functions that each receive the batch and add one write.
 */
export function runBatched(fb, ops, size = 400) {
  for (let i = 0; i < ops.length; i += size) {
    const batch = fb.F.writeBatch(fb.db);
    ops.slice(i, i + size).forEach((op) => op(batch));
    guard(batch.commit());
  }
}
