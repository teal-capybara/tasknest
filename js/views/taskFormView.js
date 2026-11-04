/* ==========================================================================
   TASK FORM: add, edit and duplicate share this one screen.

     #/task/new                 blank form (uses ?ws=, ?course=, ?org= from the list you were in)
     #/task/new?from=ID         a copy of an existing task (status reset to Not started)
     #/task/ID/edit             edit an existing task

   Nothing is saved until it passes validation (js/logic/validate.js).
   Saving never waits for the internet: it writes to the copy on your device and
   returns straight to the list.

   Your entries are kept as a DRAFT while you fill the form (js/logic/drafts.js).
   If you leave the form (say, by tapping Settings) and come back, everything is
   still there. A draft is removed when you save, press Cancel, or tap "Start over".

   The Task type list follows the workspace: Academics shows Quiz, Exam ...;
   Organizations shows Meeting, Event prep ...
   ========================================================================== */

import { h, clear, optionEls } from "../ui/dom.js";
import { ARRANGEMENTS, LIMITS, ORGS, STATUSES, WORKSPACES } from "../constants.js";
import { state, typesFor, eventById, eventGroupName, coursesForPicker } from "../state.js";
import { validateTaskForm } from "../logic/validate.js";
import { fromInputs, toInputDate, toInputTime, startOfDay } from "../logic/format.js";
import { eventWhen, addDays, dayKey as dayKeyOf } from "../logic/calendar.js";
import { createTask, updateTask } from "../db/tasks.js";
import { toast } from "../ui/screens.js";
import { go, reload } from "../router.js";
import { DRAFT_FIELDS, saveDraft, loadDraft, clearDraft, isDifferent } from "../logic/drafts.js";

export function taskFormView(container, params, query) {
  const editing = params.id ? state.tasks.find((t) => t.id === params.id) : null;
  if (params.id && !editing) return notFound(container);

  const copyOf = !editing && query.from ? state.tasks.find((t) => t.id === query.from) : null;
  const base = editing || copyOf;
  const mode = editing ? "edit" : "create";
  // "Create review task" on an event page opens this form already filled in (#/task/new?event=ID).
  const forEvent = !base && query.event ? eventById(query.event) : null;

  /* ---------- choices for the dropdowns ---------- */
  // Archived courses can't be picked for NEW work, but keep the one this task already uses.
  const courses = coursesForPicker(editing && editing.courseId);
  const courseIds = courses.map((c) => c.id);
  const typeIdsByWorkspace = Object.fromEntries(WORKSPACES.map((w) => [w.id, typesFor(w.id).map((t) => t.id)]));

  /** Resets a course or type that is not available (deleted, or from the other workspace). */
  function normalize(v) {
    const out = { ...v };
    if (!courseIds.includes(out.courseId)) out.courseId = "";
    if (!(typeIdsByWorkspace[out.workspace] || []).includes(out.typeId)) out.typeId = "";
    return out;
  }

  /* ---------- starting values ---------- */
  const fresh = base
    ? {
        title: copyOf ? `${base.title} (copy)` : base.title,
        workspace: base.workspace, courseId: base.courseId || "", orgId: base.orgId || "",
        typeId: base.typeId, arrangement: base.arrangement,
        startDate: copyOf ? "" : toInputDate(base.startAt), dueDate: toInputDate(base.dueAt), dueTime: toInputTime(base.dueAt),
        status: copyOf ? "not_started" : base.status,
        instructions: base.instructions || "", notes: base.notes || "",
      }
    : forEvent ? fromEvent(forEvent)
    : {
        title: "",
        workspace: query.ws === "organizations" ? "organizations" : "academics",
        courseId: query.course || "", orgId: query.org || "",
        typeId: "", arrangement: "individual", startDate: "", dueDate: "", dueTime: "",
        status: "not_started", instructions: "", notes: "",
      };
  // What the form looks like before you touch it. A draft only exists if you changed something.
  const baseline = normalize(fresh);
  const typeWasReset = Boolean(base) && fresh.typeId !== "" && baseline.typeId === "";

  const draftKey = editing ? `edit:${editing.id}` : copyOf ? `copy:${copyOf.id}` : forEvent ? `eventtask:${forEvent.id}` : "new";
  const eventId = (base && base.eventId) || (forEvent && forEvent.id) || "";
  const draft = readDraft(state.uid, draftKey, baseline);
  const initial = draft ? normalize({ ...baseline, ...draft }) : baseline;

  /* ---------- form controls ---------- */
  const el = {
    title: h("input", { type: "text", class: "input", id: "f-title", name: "title", value: initial.title, maxlength: LIMITS.title, autocomplete: "off", "aria-describedby": "f-title-error" }),
    courseId: h("select", { class: "select", id: "f-courseId", name: "courseId", "aria-describedby": "f-courseId-error", value: initial.courseId },
      h("option", { value: "" }, courses.length ? "Choose a course…" : "No courses yet"),
      courses.map((c) => h("option", { value: c.id }, c.archived ? `${c.name} (archived)` : c.name))),
    orgId: h("select", { class: "select", id: "f-orgId", name: "orgId", "aria-describedby": "f-orgId-error", value: initial.orgId },
      h("option", { value: "" }, "Choose an organization…"), optionEls(ORGS, initial.orgId)),
    typeId: h("select", { class: "select", id: "f-typeId", name: "typeId", "aria-describedby": "f-typeId-error f-typeId-hint" }),
    startDate: h("input", { type: "date", class: "input", id: "f-startDate", name: "startDate", value: initial.startDate, "aria-describedby": "f-startDate-error f-startDate-hint" }),
    dueDate: h("input", { type: "date", class: "input", id: "f-dueDate", name: "dueDate", value: initial.dueDate, "aria-describedby": "f-dueDate-error f-due-hint" }),
    dueTime: h("input", { type: "time", class: "input", id: "f-dueTime", name: "dueTime", value: initial.dueTime, "aria-describedby": "f-dueTime-error f-due-hint" }),
    status: h("select", { class: "select", id: "f-status", name: "status", "aria-describedby": "f-status-error", value: initial.status }, optionEls(STATUSES, initial.status)),
    instructions: h("textarea", { class: "textarea", id: "f-instructions", name: "instructions", rows: 5, maxlength: LIMITS.text, value: initial.instructions, "aria-describedby": "f-instructions-error" }),
    notes: h("textarea", { class: "textarea", id: "f-notes", name: "notes", rows: 3, maxlength: LIMITS.text, value: initial.notes, "aria-describedby": "f-notes-error" }),
  };

  /** Segmented radio group (used for workspace and work arrangement). */
  function radios(name, list, selected, onPick) {
    return h("div", { class: "seg seg-form", role: "radiogroup" },
      list.map((item) => h("label", { class: "seg-radio" },
        h("input", { type: "radio", name, value: item.id, checked: item.id === selected, onChange: () => onPick && onPick(item.id) }),
        h("span", {}, item.name))));
  }

  const errorLine = (name) => h("p", { class: "error-text field-error", id: `f-${name}-error`, role: "alert", hidden: true });
  const field = (name, label, control, { hint, hintEl, required } = {}) =>
    h("div", { class: "field", dataset: { field: name } },
      h("label", { class: "label", for: `f-${name}` }, label, required ? h("span", { class: "req", "aria-hidden": "true" }, " *") : null),
      control, hintEl || (hint ? h("p", { class: "hint" }, hint) : null), errorLine(name));

  const workspaceGroup = h("fieldset", { class: "field", dataset: { field: "workspace" } },
    h("legend", { class: "label" }, "Workspace"),
    radios("workspace", WORKSPACES, initial.workspace, () => syncWorkspace()), errorLine("workspace"));
  const arrangementGroup = h("fieldset", { class: "field", dataset: { field: "arrangement" } },
    h("legend", { class: "label" }, "Work arrangement"),
    radios("arrangement", ARRANGEMENTS, initial.arrangement), errorLine("arrangement"));

  const courseField = field("courseId", "Course", el.courseId, {
    required: true,
    hint: courses.length ? null : "You have no courses yet. Add one on the Manage page, then come back.",
  });
  const orgField = field("orgId", "Organization", el.orgId, { required: true });
  const typeHint = h("p", { class: "hint", id: "f-typeId-hint" });
  const typeField = field("typeId", "Task type", el.typeId, { required: true, hintEl: typeHint });

  const dueHint = h("p", { class: "hint", id: "f-due-hint" });
  const dueWarn = h("p", { class: "warn-text", hidden: true });
  const clearDue = h("button", { type: "button", class: "btn btn-link", onClick: () => { el.dueDate.value = ""; el.dueTime.value = ""; syncDueHint(); } }, "Clear deadline");

  const clearStart = h("button", { type: "button", class: "btn btn-link", onClick: () => { el.startDate.value = ""; syncStartClear(); el.startDate.dispatchEvent(new Event("input", { bubbles: true })); } }, "Clear start date");
  const syncStartClear = () => { clearStart.hidden = !el.startDate.value; };
  el.startDate.addEventListener("input", syncStartClear);
  syncStartClear();

  const summary = h("div", { class: "form-summary error-text", role: "alert", hidden: true, tabindex: "-1" });

  const form = h("form", { class: "task-form", novalidate: true, onSubmit: onSubmit },
    h("input", { type: "hidden", name: "eventId", value: eventId }),   // links the task to its event (see js/db/events.js)
    summary,
    field("title", "Task title", el.title, { required: true }),
    workspaceGroup,
    courseField, orgField,
    typeField,
    arrangementGroup,
    field("startDate", "Start date (optional)", el.startDate, { hint: "The day you plan to begin. Leave empty if it doesn't matter." }),
    clearStart,
    h("div", { class: "due-row" },
      field("dueDate", "Due date", el.dueDate),
      field("dueTime", "Due time", el.dueTime)),
    dueHint, dueWarn, clearDue,
    field("status", "Status", el.status),
    field("instructions", "Instructions / task details", el.instructions, { hint: "The full instructions from your professor or organization." }),
    field("notes", "Personal notes", el.notes, { hint: "Only for you: reminders, ideas, who is doing what." }),
    h("div", { class: "form-actions" },
      h("a", { class: "btn", href: editing ? `#/task/${encodeURIComponent(editing.id)}` : "#/tasks", onClick: () => discard() }, "Cancel"),
      h("button", { type: "submit", class: "btn btn-primary" }, mode === "edit" ? "Save changes" : "Save task")));

  const heading = mode === "edit" ? "Edit task" : copyOf ? "Duplicate task" : "Add task";
  container.append(h("div", { class: "page-head" }, h("h1", {}, heading)));
  // (append(null) would print the word "null", so only add the note when there is one)
  if (copyOf) container.append(h("p", { class: "muted" }, "This is a copy. Change whatever is different, then save."));
  if (forEvent) container.append(h("p", { class: "muted" }, `This task is for “${forEvent.title}”. Change anything you like, then save.`));
  if (draft) {
    container.append(h("div", { class: "banner banner-inline", role: "status" },
      h("span", {}, "Your unsaved entries were restored."),
      h("button", { type: "button", class: "btn btn-small", onClick: () => { discard(); reload(); } }, "Start over")));
  }
  container.append(form);

  /* ---------- small behaviors ---------- */
  function currentWorkspace() { return form.elements.workspace.value; }

  /** Offers only the task types of the chosen workspace; keeps the current pick if it is still offered. */
  function fillTypes(selected) {
    const workspace = currentWorkspace();
    const keep = selected !== undefined ? selected : el.typeId.value;
    const list = typesFor(workspace);
    clear(el.typeId).append(h("option", { value: "" }, "Choose a task type…"), ...optionEls(list, ""));
    el.typeId.value = list.some((t) => t.id === keep) ? keep : "";
    const name = (WORKSPACES.find((w) => w.id === workspace) || {}).name;
    typeHint.textContent = typeWasReset && el.typeId.value === ""
      ? `This task's old type doesn't belong to ${name}. Please choose a new one.`
      : `Types for ${name}. Need another? Add your own on the Manage page.`;
  }

  function syncWorkspace(firstTime) {
    const academics = currentWorkspace() === "academics";
    courseField.hidden = !academics;
    orgField.hidden = academics;
    fillTypes(firstTime ? initial.typeId : undefined);
  }

  // Explains what will be saved and warns when the deadline is already in the past.
  function syncDueHint() {
    const date = el.dueDate.value, time = el.dueTime.value;
    if (!date) {
      dueHint.textContent = "Leave the date empty if this task has no deadline.";
      dueWarn.hidden = true;
      clearDue.hidden = !time;
      return;
    }
    clearDue.hidden = false;
    dueHint.textContent = time ? "" : "No time set, so 11:59 PM will be used.";
    const { ms } = fromInputs(date, time);
    const pastAndOpen = ms != null && ms < Date.now() && form.elements.status.value !== "done";
    dueWarn.textContent = "This deadline has already passed, so the task will show as overdue.";
    dueWarn.hidden = !pastAndOpen;
  }

  for (const input of [el.dueDate, el.dueTime, el.status]) input.addEventListener("input", syncDueHint);
  syncWorkspace(true);
  syncDueHint();

  /* ---------- draft: save what you type, so leaving the form never loses it ---------- */
  let finished = false;   // true after save / cancel / start over, so nothing is re-saved
  let timer = null;

  function currentValues() {
    const data = new FormData(form);
    return Object.fromEntries(DRAFT_FIELDS.map((f) => [f, String(data.get(f) ?? "")]));
  }
  function persist() {
    clearTimeout(timer);
    if (finished) return;
    const values = currentValues();
    if (isDifferent(values, baseline)) saveDraft(state.uid, draftKey, values);
    else clearDraft(state.uid, draftKey);
  }
  function discard() {
    finished = true;
    clearTimeout(timer);
    clearDraft(state.uid, draftKey);
  }
  const schedulePersist = () => { clearTimeout(timer); timer = setTimeout(persist, 250); };
  form.addEventListener("input", schedulePersist);
  form.addEventListener("change", schedulePersist);
  // Phones can close the app without warning, so also save the moment the page is hidden.
  const onVisibility = () => { if (document.visibilityState === "hidden") persist(); };
  document.addEventListener("visibilitychange", onVisibility);

  /* ---------- saving ---------- */
  function clearErrors() {
    summary.hidden = true;
    form.querySelectorAll(".field-error").forEach((p) => { p.hidden = true; p.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach((i) => i.removeAttribute("aria-invalid"));
  }

  function onSubmit(event) {
    event.preventDefault();
    clearErrors();

    const data = new FormData(form);
    const values = Object.fromEntries([...data.entries()].map(([k, v]) => [k, String(v)]));
    const { errors, value } = validateTaskForm(values, { courseIds, typeIds: typeIdsByWorkspace, eventIds: state.events.map((e) => e.id) });

    const names = Object.keys(errors);
    if (names.length) {
      for (const name of names) {
        const msg = form.querySelector(`#f-${name}-error`);
        if (msg) { msg.textContent = errors[name]; msg.hidden = false; }
        const control = form.querySelector(`#f-${name}, [name="${name}"]`);
        if (control) control.setAttribute("aria-invalid", "true");
      }
      summary.textContent = names.length === 1 ? "Please fix the problem marked below." : `Please fix the ${names.length} problems marked below.`;
      summary.hidden = false;
      const first = form.querySelector(`[data-field="${names[0]}"] input, [data-field="${names[0]}"] select, [data-field="${names[0]}"] textarea`);
      (first || summary).focus();
      return;
    }

    discard();
    if (mode === "edit") {
      updateTask(state.fb, state.uid, editing, value);
      toast("Changes saved.");
      go(`/task/${encodeURIComponent(editing.id)}`);
    } else {
      createTask(state.fb, state.uid, value);
      toast("Task added.");
      go("/tasks");
    }
  }

  return {
    // Leaving the form (any way) keeps a draft of what is in it.
    destroy() {
      document.removeEventListener("visibilitychange", onVisibility);
      persist();
    },
  };
}

/**
 * Starting values for a task made from an event:
 *   title      "Review for Midterm" (exams) or "Prepare for ..." (everything else)
 *   deadline   the day before the event (or today, if that day has passed); time left empty = 11:59 PM
 *   type       Exam for an exam, Meeting for an organization meeting (otherwise you choose)
 */
function fromEvent(event) {
  const dayBefore = addDays(new Date(event.startAt), -1);
  const due = startOfDay(dayBefore.getTime()) < startOfDay(Date.now()) ? new Date() : dayBefore;
  const academics = event.workspace === "academics";
  return {
    title: `${event.kind === "exam" ? "Review for" : "Prepare for"} ${event.title}`,
    workspace: event.workspace, courseId: academics ? (event.courseId || "") : "", orgId: academics ? "" : (event.orgId || ""),
    typeId: event.kind === "exam" && academics ? "exam" : event.kind === "meeting" && !academics ? "org-meeting" : "",
    arrangement: "individual", startDate: "", dueDate: dayKeyOf(due), dueTime: "", status: "not_started",
    instructions: `For ${event.title} (${eventWhen(event)}).`, notes: "",
  };
}

/** Reads a saved draft and keeps only known, valid fields. Returns null if there is nothing worth restoring. */
function readDraft(uid, key, baseline) {
  const saved = loadDraft(uid, key);
  if (!saved) return null;
  const clean = {};
  for (const f of DRAFT_FIELDS) if (typeof saved[f] === "string") clean[f] = saved[f];
  if (clean.workspace && !WORKSPACES.some((w) => w.id === clean.workspace)) delete clean.workspace;
  if (clean.arrangement && !ARRANGEMENTS.some((a) => a.id === clean.arrangement)) delete clean.arrangement;
  if (clean.status && !STATUSES.some((s) => s.id === clean.status)) delete clean.status;
  if (clean.orgId && !ORGS.some((o) => o.id === clean.orgId)) clean.orgId = "";
  const merged = { ...baseline, ...clean };
  if (!isDifferent(merged, baseline)) { clearDraft(uid, key); return null; }
  return clean;
}

function notFound(container) {
  container.append(h("div", { class: "empty" },
    h("h1", {}, "Task not found"),
    h("p", { class: "muted" }, "It may have been deleted, or it hasn't finished syncing to this device yet."),
    h("a", { class: "btn btn-primary", href: "#/tasks" }, "Back to tasks")));
  return {};
}
