/* ==========================================================================
   DIARY (database): one private note per calendar day.

   users/{uid}/diary/{day}   where {day} looks like "2026-11-03"
     text        what you wrote
     updatedAt

   PRIVACY RULES (on purpose):
   - Entries are NOT loaded into the app's general data (js/state.js) and there is
     no list, search or export of them. Only ONE day's entry is read, and only while
     that day's window is open on the Calendar (js/ui/dayWindow.js).
   - An empty entry is deleted rather than stored.
   - It is hidden in the app, not encrypted: anyone who can open TaskNest signed in
     as you could find it by opening the diary of a day.
   ========================================================================== */

import { docRef, guard, runBatched } from "./helpers.js";

export const DIARY_MAX = 10000;

/** Listens to ONE day's entry. onText receives the text ("" if there is none). Returns a stop function. */
export function watchDiaryDay(fb, uid, day, onText) {
  return fb.F.onSnapshot(
    docRef(fb, uid, "diary", day),
    (snap) => onText(snap.exists() ? String(snap.data().text || "") : ""),
    () => onText(null));   // null = could not read (the writer still works)
}

export function saveDiaryDay(fb, uid, day, text) {
  const ref = docRef(fb, uid, "diary", day);
  if (!text.trim()) {
    runBatched(fb, [(batch) => batch.delete(ref)]);
  } else {
    guard(fb.F.setDoc(ref, { text: text.slice(0, DIARY_MAX), updatedAt: Date.now() }, { merge: true }), "Could not save your diary");
  }
}
