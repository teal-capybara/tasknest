/* ==========================================================================
   BACKUP: turn your data into a file, and read such a file back safely.

   What is in a backup:  courses, your custom task types and event types, tasks,
   events, and your settings (theme, start screen, deadline windows).
   What is NOT in it:    the diary and moods. They are private and stay in the app.

   This file is plain logic with no screen code, so it can be tested on its own.
   The import is defensive: a backup file is treated as untrusted text. Only known
   collections are read, each record must look right, and anything odd is dropped
   or refused before a single write happens.
   ========================================================================== */

export const BACKUP_APP = "TaskNest";
export const BACKUP_FORMAT = 1;
export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;

/** The collections in a backup: [name in the file and database, name field that must exist, label]. */
export const COLLECTIONS = [
  { key: "courses",    required: "name",  label: "courses" },
  { key: "taskTypes",  required: "name",  label: "task types" },
  { key: "eventTypes", required: "name",  label: "event types" },
  { key: "tasks",      required: "title", label: "tasks" },
  { key: "events",     required: "title", label: "events" },
];

const SETTING_KEYS = { theme: "string", defaultScreen: "string", dueSoonHours: "number", earlyHours: "number", termId: "string" };
const ID_OK = /^[A-Za-z0-9_-]{1,100}$/;
const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Everything in "state" that belongs in a backup, as a plain object ready for JSON. */
export function buildBackup(state, now = Date.now()) {
  const strip = (list) => list.map((x) => ({ ...x }));
  const settings = {};
  for (const key of Object.keys(SETTING_KEYS)) if (state.settings && state.settings[key] !== undefined) settings[key] = state.settings[key];
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: now,
    courses: strip(state.courses),
    taskTypes: strip(state.customTypes),
    eventTypes: strip(state.customEventTypes),
    tasks: strip(state.tasks),
    events: strip(state.events),
    settings,
  };
}

export const backupFileName = (now = Date.now()) => {
  const d = new Date(now), p = (n) => String(n).padStart(2, "0");
  return `tasknest-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
};

/** Removes anything Firestore would refuse (field names like __x__) and anything that is not plain JSON data. */
function cleanValue(v, depth = 0) {
  if (v === null || typeof v === "string" || typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (depth > 8) return null;
  if (Array.isArray(v)) return v.slice(0, 1000).map((x) => cleanValue(x, depth + 1));
  if (isPlain(v)) {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (/^__.*__$/.test(k) || k.includes("/") || !k) continue;
      out[k] = cleanValue(val, depth + 1);
    }
    return out;
  }
  return null;
}

/**
 * Reads the text of a backup file.
 * Returns { ok: true, data: { courses: [...], ..., settings }, counts, exportedAt, skipped }
 *      or { ok: false, error: "plain words" }.
 */
export function parseBackup(text) {
  if (typeof text !== "string" || text.length > MAX_BACKUP_BYTES) return { ok: false, error: "That file is too large to be a TaskNest backup." };
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return { ok: false, error: "That file isn't a TaskNest backup (it couldn't be read as a backup)." }; }
  if (!isPlain(raw) || raw.app !== BACKUP_APP) return { ok: false, error: "That file isn't a TaskNest backup." };
  if (raw.format !== BACKUP_FORMAT) return { ok: false, error: "This backup was made by a different version of TaskNest and can't be read here." };

  const data = {};
  const counts = {};
  let skipped = 0;
  for (const col of COLLECTIONS) {
    const list = Array.isArray(raw[col.key]) ? raw[col.key] : [];
    const seen = new Set();
    data[col.key] = [];
    for (const rec of list) {
      if (!isPlain(rec) || typeof rec.id !== "string" || !ID_OK.test(rec.id) || seen.has(rec.id)
        || typeof rec[col.required] !== "string" || !rec[col.required].trim()) { skipped++; continue; }
      seen.add(rec.id);
      const { id, ...fields } = rec;
      data[col.key].push({ id, ...cleanValue(fields) });
    }
    counts[col.key] = data[col.key].length;
  }

  data.settings = {};
  if (isPlain(raw.settings)) {
    for (const [key, type] of Object.entries(SETTING_KEYS)) {
      const v = raw.settings[key];
      if (typeof v === type && (type !== "string" || v.length <= 40) && (type !== "number" || (Number.isFinite(v) && v >= 1 && v <= 720))) data.settings[key] = v;
    }
  }

  const total = COLLECTIONS.reduce((n, c) => n + counts[c.key], 0);
  if (!total) return { ok: false, error: "That backup has nothing in it to bring back." };
  return { ok: true, data, counts, skipped, exportedAt: Number(raw.exportedAt) || null };
}

/**
 * Works out the writes for an import.
 *   mode "merge"   : everything in the file is added; an item with the same id is replaced by the file's version.
 *                    Nothing you have now is deleted.
 *   mode "replace" : the same, and then anything you have now that is NOT in the file is deleted.
 * current = { courses, taskTypes, eventTypes, tasks, events } (arrays with ids). Returns { sets, deletes, settings }.
 */
export function planImport(data, current, mode) {
  const sets = [], deletes = [];
  for (const col of COLLECTIONS) {
    const incoming = new Set();
    for (const { id, ...fields } of data[col.key]) { incoming.add(id); sets.push({ col: col.key, id, fields }); }
    if (mode === "replace") for (const old of current[col.key] || []) if (!incoming.has(old.id)) deletes.push({ col: col.key, id: old.id });
  }
  return { sets, deletes, settings: data.settings };
}
