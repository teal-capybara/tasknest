/* ==========================================================================
   SYNC TEST (database)

   A tiny counter used only to prove that offline saving and syncing work on
   your phone. It lives in users/{your-id}/meta/syncTest.
   You can delete this file, the "Offline check" card in index.html and its
   code in main.js once you have seen it work. Nothing else depends on it.
   ========================================================================== */

import { reportSnapshot, reportError, forget } from "../sync-status.js";

const SOURCE = "syncTest";

function ref(fb, uid) {
  return fb.F.doc(fb.db, "users", uid, "meta", "syncTest");
}

export function watchSyncTest(fb, uid, onData) {
  const unsubscribe = fb.F.onSnapshot(
    ref(fb, uid),
    { includeMetadataChanges: true },
    (snap) => {
      reportSnapshot(SOURCE, snap);
      onData(snap.exists() ? snap.data() : { count: 0 });
    },
    (err) => reportError(SOURCE, err)
  );
  return () => { unsubscribe(); forget(SOURCE); };
}

/**
 * Add 1 to the counter. increment(1) is applied by the database itself, so even
 * if two devices tap while offline, both taps are counted when they sync.
 */
export function addPing(fb, uid) {
  return fb.F.setDoc(
    ref(fb, uid),
    { count: fb.F.increment(1), lastTapAt: Date.now() },
    { merge: true }
  );
}
