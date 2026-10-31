/* ==========================================================================
   STATE: the app's in-memory copy of your data.

   The database listeners (js/db/*.js) put courses, task types, tasks and
   settings in here. Screens read from here and re-draw when something changes.
   Because the listeners deliver data from the offline copy first, screens fill
   in instantly and offline.
   ========================================================================== */

import { DEFAULT_TYPES, DEFAULT_SETTINGS, ORGS } from "./constants.js";

export const state = {
  fb: null,            // Firebase handles (set by main.js)
  uid: null,           // signed-in user id
  courses: [],
  customTypes: [],
  tasks: [],
  settings: {},
  ready: { courses: false, types: false, tasks: false, settings: false },
};

const subscribers = new Set();
let scheduled = false;

/** Register a function to run whenever data changes. Returns an "unsubscribe" function. */
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** Merge new values in and tell screens to redraw. Several quick updates become one redraw. */
export function setState(patch) {
  Object.assign(state, patch);
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    subscribers.forEach((fn) => fn());
  }, 0);
}

export function setReady(key) {
  if (state.ready[key]) return;
  state.ready = { ...state.ready, [key]: true };
}

export function resetState() {
  Object.assign(state, {
    fb: null, uid: null, courses: [], customTypes: [], tasks: [], settings: {},
    ready: { courses: false, types: false, tasks: false, settings: false },
  });
}

/* ---- Handy lookups ---- */

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...state.settings };
}

/** Every task type (built-in + custom), for looking up names. */
export function allTypes() {
  return [...DEFAULT_TYPES, ...sortedCustom()];
}

/** Types offered for one workspace. Custom types saved before workspaces existed count as Academics. */
export function typesFor(workspace) {
  return allTypes().filter((t) => (t.workspace || "academics") === workspace);
}

function sortedCustom() {
  return [...state.customTypes].sort((a, b) => a.name.localeCompare(b.name));
}

export function typeName(id) {
  const t = allTypes().find((x) => x.id === id);
  return t ? t.name : "Unknown type";
}

export function courseById(id) {
  return state.courses.find((c) => c.id === id) || null;
}

export function courseName(id) {
  const c = courseById(id);
  return c ? c.name : "Unknown course";
}

export function orgName(id) {
  const o = ORGS.find((x) => x.id === id);
  return o ? o.name : "Unknown organization";
}

/** A task counts as archived if it is archived itself OR its course is archived. */
export function isTaskArchived(task) {
  if (task.archived) return true;
  if (task.workspace === "academics") {
    const c = courseById(task.courseId);
    if (c && c.archived) return true;
  }
  return false;
}

/** "CS 101" for academic tasks, "GDGoC-TUPM" for organization tasks. */
export function taskGroupName(task) {
  return task.workspace === "academics" ? courseName(task.courseId) : orgName(task.orgId);
}
