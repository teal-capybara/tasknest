/* ==========================================================================
   DRAFTS: keeps what you typed in the task form when you leave it.

   If you are adding a task and tap Settings by accident (or the app is closed),
   your entries are still there when you come back to the form.

   A draft is saved on THIS device only (localStorage, with an in-memory copy as
   a backup if the browser blocks storage). It is not sent to the cloud, and it
   is removed when you save the task, press Cancel, or tap "Start over".

   Each form has its own draft, so editing one task never mixes with adding another:
     "new"        the blank Add task form
     "copy:ID"    a duplicate of task ID
     "edit:ID"    editing task ID
     "eventtask:ID"   a new task made from event ID
     "event:new" / "event:edit:ID"   the event form
   Drafts belong to the signed-in account (the key includes your account ID).
   ========================================================================== */

const PREFIX = "tasknest.draft.";
const memory = new Map();   // backup copy, used if localStorage is blocked

const storageKey = (uid, key) => `${PREFIX}${uid}.${key}`;

export function saveDraft(uid, key, values) {
  const text = JSON.stringify(values);
  memory.set(storageKey(uid, key), text);
  try { localStorage.setItem(storageKey(uid, key), text); } catch (e) { /* storage blocked or full: the memory copy still works */ }
}

export function loadDraft(uid, key) {
  let text = null;
  try { text = localStorage.getItem(storageKey(uid, key)); } catch (e) { /* ignore */ }
  if (text == null) text = memory.get(storageKey(uid, key)) ?? null;
  if (text == null) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? value : null;
  } catch (e) {
    return null;
  }
}

export function clearDraft(uid, key) {
  memory.delete(storageKey(uid, key));
  try { localStorage.removeItem(storageKey(uid, key)); } catch (e) { /* ignore */ }
}

/** Removes every draft on this device (used when you sign out and choose to remove saved data). */
export function clearAllDrafts() {
  memory.clear();
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (e) { /* ignore */ }
}

/** The form fields a draft may hold. Anything else found in storage is ignored. */
export const DRAFT_FIELDS = [
  "title", "workspace", "courseId", "orgId", "typeId", "arrangement",
  "dueDate", "dueTime", "status", "instructions", "notes",
];

/** The fields of the Add/Edit event form. */
export const EVENT_DRAFT_FIELDS = [
  "title", "kind", "workspace", "courseId", "orgId", "date", "allDay", "startTime", "endTime", "location", "notes",
];

/** True when a draft differs from the form's starting values (so an untouched form leaves no draft). */
export function isDifferent(values, baseline, fields = DRAFT_FIELDS) {
  return fields.some((f) => (values[f] ?? "") !== (baseline[f] ?? ""));
}
