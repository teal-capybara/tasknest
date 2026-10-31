/* ==========================================================================
   TASK FORM: add, edit and duplicate share this one screen.

     #/task/new                 blank form (uses ?ws=, ?course=, ?org= from the list you were in)
     #/task/new?from=ID         a copy of an existing task (status reset to Not started)
     #/task/ID/edit             edit an existing task

   Nothing is saved until it passes validation (js/logic/validate.js).
   Saving never waits for the internet: it writes to the copy on your device and
   returns straight to the list.
   ========================================================================== */

import { h, optionEls } from "../ui/dom.js";
import { ARRANGEMENTS, LIMITS, ORGS, STATUSES, WORKSPACES } from "../constants.js";
import { state, allTypes } from "../state.js";
import { validateTaskForm } from "../logic/validate.js";
import { fromInputs, toInputDate, toInputTime } from "../logic/format.js";
import { createTask, updateTask } from "../db/tasks.js";
import { toast } from "../ui/screens.js";
import { go } from "../router.js";

export function taskFormView(container, params, query) {
  const editing = params.id ? state.tasks.find((t) => t.id === params.id) : null;
  if (params.id && !editing) return notFound(container);

  const copyOf = !editing && query.from ? state.tasks.find((t) => t.id === query.from) : null;
  const base = editing || copyOf;
  const mode = editing ? "edit" : "create";

  /* ---------- starting values ---------- */
  const initial = base
    ? {
        title: copyOf ? `${base.title} (copy)` : base.title,
        workspace: base.workspace, courseId: base.courseId || "", orgId: base.orgId || "",
        typeId: base.typeId, arrangement: base.arrangement,
        dueDate: toInputDate(base.dueAt), dueTime: toInputTime(base.dueAt),
        status: copyOf ? "not_started" : base.status,
        instructions: base.instructions || "", notes: base.notes || "",
      }
    : {
        title: "",
        workspace: query.ws === "organizations" ? "organizations" : "academics",
        courseId: query.course || "", orgId: query.org || "",
        typeId: "", arrangement: "individual", dueDate: "", dueTime: "",
        status: "not_started", instructions: "", notes: "",
      };

  /* ---------- choices for the dropdowns ---------- */
  // Archived courses can't be picked for NEW work, but keep the one this task already uses.
  const courses = state.courses.filter((c) => !c.archived || (editing && c.id === editing.courseId));
  const types = allTypes();
  const courseIds = courses.map((c) => c.id);
  const typeIds = types.map((t) => t.id);
  if (!courseIds.includes(initial.courseId)) initial.courseId = "";

  /* ---------- form controls ---------- */
  const el = {
    title: h("input", { type: "text", class: "input", id: "f-title", name: "title", value: initial.title, maxlength: LIMITS.title, autocomplete: "off", "aria-describedby": "f-title-error" }),
    courseId: h("select", { class: "select", id: "f-courseId", name: "courseId", "aria-describedby": "f-courseId-error", value: initial.courseId },
      h("option", { value: "" }, courses.length ? "Choose a course…" : "No courses yet"),
      courses.map((c) => h("option", { value: c.id }, c.archived ? `${c.name} (archived)` : c.name))),
    orgId: h("select", { class: "select", id: "f-orgId", name: "orgId", "aria-describedby": "f-orgId-error", value: initial.orgId },
      h("option", { value: "" }, "Choose an organization…"), optionEls(ORGS, initial.orgId)),
    typeId: h("select", { class: "select", id: "f-typeId", name: "typeId", "aria-describedby": "f-typeId-error", value: initial.typeId },
      h("option", { value: "" }, "Choose a task type…"), optionEls(types, initial.typeId)),
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
  const field = (name, label, control, { hint, required } = {}) =>
    h("div", { class: "field", dataset: { field: name } },
      h("label", { class: "label", for: `f-${name}` }, label, required ? h("span", { class: "req", "aria-hidden": "true" }, " *") : null),
      control, hint ? h("p", { class: "hint" }, hint) : null, errorLine(name));

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

  const dueHint = h("p", { class: "hint", id: "f-due-hint" });
  const dueWarn = h("p", { class: "warn-text", hidden: true });
  const clearDue = h("button", { type: "button", class: "btn btn-link", onClick: () => { el.dueDate.value = ""; el.dueTime.value = ""; syncDueHint(); } }, "Clear deadline");

  const summary = h("div", { class: "form-summary error-text", role: "alert", hidden: true, tabindex: "-1" });

  const form = h("form", { class: "task-form", novalidate: true, onSubmit: onSubmit },
    summary,
    field("title", "Task title", el.title, { required: true }),
    workspaceGroup,
    courseField, orgField,
    field("typeId", "Task type", el.typeId, { required: true, hint: "Need a different type? Add your own on the Manage page." }),
    arrangementGroup,
    h("div", { class: "due-row" },
      field("dueDate", "Due date", el.dueDate),
      field("dueTime", "Due time", el.dueTime)),
    dueHint, dueWarn, clearDue,
    field("status", "Status", el.status),
    field("instructions", "Instructions / task details", el.instructions, { hint: "The full instructions from your professor or organization." }),
    field("notes", "Personal notes", el.notes, { hint: "Only for you: reminders, ideas, who is doing what." }),
    h("div", { class: "form-actions" },
      h("a", { class: "btn", href: editing ? `#/task/${encodeURIComponent(editing.id)}` : "#/tasks" }, "Cancel"),
      h("button", { type: "submit", class: "btn btn-primary" }, mode === "edit" ? "Save changes" : "Save task")));

  const heading = mode === "edit" ? "Edit task" : copyOf ? "Duplicate task" : "Add task";
  container.append(h("div", { class: "page-head" }, h("h1", {}, heading)));
  // (append(null) would print the word "null", so only add the note when there is one)
  if (copyOf) container.append(h("p", { class: "muted" }, "This is a copy. Change whatever is different, then save."));
  container.append(form);

  /* ---------- small behaviors ---------- */
  function currentWorkspace() { return form.elements.workspace.value; }

  function syncWorkspace() {
    const academics = currentWorkspace() === "academics";
    courseField.hidden = !academics;
    orgField.hidden = academics;
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
  syncWorkspace();
  syncDueHint();

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
    const { errors, value } = validateTaskForm(values, { courseIds, typeIds });

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

  return {};
}

function notFound(container) {
  container.append(h("div", { class: "empty" },
    h("h1", {}, "Task not found"),
    h("p", { class: "muted" }, "It may have been deleted, or it hasn't finished syncing to this device yet."),
    h("a", { class: "btn btn-primary", href: "#/tasks" }, "Back to tasks")));
  return {};
}
