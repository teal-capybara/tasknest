/* ==========================================================================
   DIARY (database): one private note, and one mood, per calendar day.

   users/{uid}/diary/{day}   where {day} looks like "2026-11-03"
     text        what you wrote
     mood        id of how you felt (see js/logic/moods.js), optional
     updatedAt

   PRIVACY RULES (on purpose):
   - Entries are NOT loaded into the app's general data (js/state.js) and there is
     no list, search or export of them. Only ONE day's entry is read, and only while
     that day's window is open on the Calendar (js/ui/dayWindow.js).
   - An entry with no text and no mood is deleted rather than stored.
   - It is hidden in the app, not encrypted: anyone who can open Cove signed in
     as you could find it by opening the diary of a day.
   ========================================================================== */

import { docRef, guard, runBatched } from "./helpers.js";
import { moodById } from "../logic/moods.js";

export const DIARY_MAX = 10000;

/** Listens to ONE day's entry. onEntry receives { text, mood } ("" and "" if none), or null if it could not be read. Returns a stop function. */
export function watchDiaryDay(fb, uid, day, onEntry) {
  return fb.F.onSnapshot(
    docRef(fb, uid, "diary", day),
    (snap) => {
      const d = snap.exists() ? snap.data() : {};
      onEntry({ text: String(d.text || ""), mood: moodById(d.mood) ? d.mood : "" });
    },
    () => onEntry(null));   // null = could not read (the writer still works)
}

/** Saves { text, mood } for one day. Pass the whole entry. */
export function saveDiaryDay(fb, uid, day, { text = "", mood = "" }) {
  const ref = docRef(fb, uid, "diary", day);
  if (!text.trim() && !mood) {
    runBatched(fb, [(batch) => batch.delete(ref)]);
  } else {
    guard(fb.F.setDoc(ref, { text: text.slice(0, DIARY_MAX), mood: moodById(mood) ? mood : "", updatedAt: Date.now() }), "Could not save your diary");
  }
}
