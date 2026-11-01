/* ==========================================================================
   CONSTANTS: the fixed lists used across the app.

   This is where you change things like the organizations, the built-in task
   types, or the default urgency thresholds.

   IMPORTANT: the "id" values are what get saved in the database. Never change
   an existing id (change the "name" instead), or old tasks will lose their link.
   ========================================================================== */

export const WORKSPACES = [
  { id: "academics",     name: "Academics" },
  { id: "organizations", name: "Organizations" },
];

/* To add an organization later, add a line here. Tasks store the id. */
export const ORGS = [
  { id: "gdgoc-tupm", name: "GDGoC-TUPM" },
  { id: "compass",    name: "COMPASS" },
];
export const ORGANIZATIONS = ORGS; // same list, second name

/* Built-in task types live in code (not the database) and cannot be deleted.
   Each type belongs to ONE workspace, so the Academics form offers Quiz and Exam
   while the Organizations form offers Meeting and Event prep.
   Your own custom types are stored in the database (see js/db/taskTypes.js) and
   also belong to one workspace. */
export const ACADEMIC_TYPES = [
  { id: "project",    name: "Project",    workspace: "academics", builtIn: true },
  { id: "assignment", name: "Assignment", workspace: "academics", builtIn: true },
  { id: "exam",       name: "Exam",       workspace: "academics", builtIn: true },
  { id: "quiz",       name: "Quiz",       workspace: "academics", builtIn: true },
  { id: "recitation", name: "Recitation", workspace: "academics", builtIn: true },
];
export const ORG_TYPES = [
  { id: "org-meeting",   name: "Meeting",          workspace: "organizations", builtIn: true },
  { id: "org-event",     name: "Event prep",       workspace: "organizations", builtIn: true },
  { id: "org-script",    name: "Script writing",   workspace: "organizations", builtIn: true },
  { id: "org-content",   name: "Content creation", workspace: "organizations", builtIn: true },
  { id: "org-other",     name: "Other",            workspace: "organizations", builtIn: true },
];
export const DEFAULT_TYPES = [...ACADEMIC_TYPES, ...ORG_TYPES];

export const ARRANGEMENTS = [
  { id: "individual", name: "Individual" },
  { id: "group",      name: "Group work" },
];

/* Only these three are STORED. "Overdue" and "Unfinished" are worked out from
   the deadline and status whenever needed (see js/logic/urgency.js). */
export const STATUSES = [
  { id: "not_started", name: "Not started" },
  { id: "in_progress", name: "In progress" },
  { id: "done",        name: "Done" },
];

/* Defaults for the adjustable settings (a Settings screen for them comes in Phase 3).
   dueSoonHours: a task not due today but due within this many hours is "Due soon".
   earlyHours:   finishing at least this many hours before the deadline counts as "early".
   Anything you save in your settings document overrides these (see state.getSettings). */
export const DEFAULT_SETTINGS = { dueSoonHours: 48, earlyHours: 24 };

/* If you pick a due date but no time, this time is used. */
export const DEFAULT_DUE_TIME = { hours: 23, minutes: 59 };

/* Schedule events. Like task types, each kind of event belongs to ONE workspace,
   and you can add your own under Manage. The ids are saved in the database, so
   never change an existing id. ("exam" is special: it offers "Create review task".)
   Events saved before this change keep working: a kind that is not offered for an
   event's workspace is still shown by name. */
export const ACADEMIC_EVENT_KINDS = [
  { id: "exam",     name: "Exam",          workspace: "academics", builtIn: true },
  { id: "class",    name: "Class",         workspace: "academics", builtIn: true },
  { id: "ev-study", name: "Study session", workspace: "academics", builtIn: true },
  { id: "other",    name: "Other",         workspace: "academics", builtIn: true },
];
export const ORG_EVENT_KINDS = [
  { id: "meeting",      name: "Meeting",          workspace: "organizations", builtIn: true },
  { id: "ev-org-event", name: "Event / activity", workspace: "organizations", builtIn: true },
  { id: "ev-org-other", name: "Other",            workspace: "organizations", builtIn: true },
];
export const EVENT_KINDS = [...ACADEMIC_EVENT_KINDS, ...ORG_EVENT_KINDS];

/* The calendar's first day of the week: 0 = Sunday, 1 = Monday. */
export const WEEK_START = 0;

export const LIMITS = { title: 120, text: 5000, name: 60, location: 120 };
