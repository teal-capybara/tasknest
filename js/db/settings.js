/* ==========================================================================
   SETTINGS (database)

   Stored in ONE document:  users/{your-id}/settings/main
   Phase 1 uses it for the theme. Later phases add: default view, urgency
   thresholds, last export date, and so on. Just add more fields to `patch`.

   Timestamps in this app are plain numbers: milliseconds since 1970, from
   Date.now(). They work offline (no server needed) and sort correctly.
   ========================================================================== */

import { reportSnapshot, reportError, forget } from "../sync-status.js";

const SOURCE = "settings";

function settingsRef(fb, uid) {
  return fb.F.doc(fb.db, "users", uid, "settings", "main");
}

/**
 * Listen for settings changes. onData receives a plain object (empty if you have
 * never saved settings). Returns a function that stops listening.
 */
export function watchSettings(fb, uid, onData) {
  const unsubscribe = fb.F.onSnapshot(
    settingsRef(fb, uid),
    { includeMetadataChanges: true }, // lets us see "pending" and "from cache"
    (snap) => {
      reportSnapshot(SOURCE, snap);
      onData(snap.exists() ? snap.data() : {});
    },
    (err) => reportError(SOURCE, err)
  );
  return () => { unsubscribe(); forget(SOURCE); };
}

/**
 * Save part of the settings. merge:true means "only change the fields I give
 * you", so two devices changing DIFFERENT settings never overwrite each other.
 * Works offline: the change is stored locally and queued for upload.
 */
export function saveSettings(fb, uid, patch) {
  return fb.F.setDoc(
    settingsRef(fb, uid),
    { ...patch, updatedAt: Date.now() },
    { merge: true }
  );
}
