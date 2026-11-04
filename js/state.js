/* ==========================================================================
   STATE: the app's in-memory copy of your data.

   The database listeners (js/db/*.js) put courses, task types, tasks and
   settings in here. Screens read from here and re-draw when something changes.
   Because the listeners deliver data from the offline copy first, screens fill
   in instantly and offline.
   ========================================================================== */

import { DEFAULT_TYPES, DEFAULT_SETTINGS, EVENT_KINDS, ORGS } from "./constants.js";
import { currentTerm, inTerm } from "./logic/schedule.js";

export const state = {
  fb: null,            // Firebase handles (set by main.js)
  uid: null,           // signed-in user id
  courses: [],
  customTypes: [],
  customEventTypes: [],
  tasks: [],
  events: [],
  settings: {},
  ready: { courses: false, types: false, eventTypes: false, tasks: false, events: false, settings: false },
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
    fb: null, uid: null, courses: [], customTypes: [], customEventTypes: [], tasks: [], events: [], settings: {},
    ready: { courses: false, types: false, eventTypes: false, tasks: false, events: false, settings: false },
  });
}

/* ---- Handy lookups ---- */

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...state.settings };
}

/** Every task type (built-in + custom), for looking up names. */
/** The school year + semester you are looking at ("2025-2026|1"). */
export const termNow = () => currentTerm(getSettings());

/** Courses to offer when PICKING a course (forms): this semester's, plus the one already in use (keepId). */
export function coursesForPicker(keepId) {
  const term = termNow();
  return state.courses.filter((c) => (!c.archived && inTerm(c, term)) || c.id === keepId);
}

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

/**
 * True for an ACADEMIC task whose course belongs to another school year / semester than the one chosen.
 * (Organization tasks are never tied to a semester.) Lists, the Board, Home, Reports and Archived tasks
 * leave these out, so each semester starts with a clean slate. The Calendar still shows everything.
 */
export function isOutOfTerm(task) {
  if (task.workspace !== "academics") return false;
  const c = courseById(task.courseId);
  return Boolean(c) && !inTerm(c, termNow());
}

/** Hidden from the everyday screens: archived, or from another semester. */
export const isTaskHidden = (task) => isTaskArchived(task) || isOutOfTerm(task);

/** The courses of the chosen semester (not archived), for filters and menus. */
export const termCourses = () => state.courses.filter((c) => !c.archived && inTerm(c, termNow()));

/** "CS 101" for academic tasks, "GDGoC-TUPM" for organization tasks. */
export function taskGroupName(task) {
  return task.workspace === "academics" ? courseName(task.courseId) : orgName(task.orgId);
}

export function eventById(id) {
  return state.events.find((e) => e.id === id) || null;
}

/** "CS 101" / "COMPASS", or "" for an event with no course or organization. */
export function eventGroupName(event) {
  if (event.workspace === "academics") return event.courseId ? courseName(event.courseId) : "";
  return event.orgId ? orgName(event.orgId) : "";
}

/* ---- Event kinds (built-in + your own) ---- */

/** Every kind of event, for looking up names. */
export function allEventKinds() {
  const custom = [...state.customEventTypes].sort((a, b) => a.name.localeCompare(b.name));
  return [...EVENT_KINDS, ...custom];
}

/** Kinds offered for one workspace. */
export function eventKindsFor(workspace) {
  return allEventKinds().filter((k) => (k.workspace || "academics") === workspace);
}

export function eventKindName(id) {
  const k = allEventKinds().find((x) => x.id === id);
  return k ? k.name : "Event";
}
