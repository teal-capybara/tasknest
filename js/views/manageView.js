/* ==========================================================================
   MANAGE: your courses, and the task types and event types of each workspace.

   The page is a few collapsible groups (tap a heading to open it), so you see
   the headings first instead of everything at once:
     Courses          add, rename, archive or delete (delete also deletes the
                      course's tasks, so it warns and asks you to confirm;
                      archive is the safer choice and is offered first)
     Academics        task types + event types
     Organizations    task types + event types
   The built-in types are fixed. Your own can be renamed or deleted. Deleting one
   asks where to move its tasks / events first (to another type of the SAME
   workspace), so nothing ever ends up without a type.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { DEFAULT_TYPES, EVENT_KINDS, WORKSPACES } from "../constants.js";
import { state, typesFor, eventKindsFor } from "../state.js";
import { validateName } from "../logic/validate.js";
import { addCourse, renameCourse, setCourseArchived, deleteCourse } from "../db/courses.js";
import { addTaskType, renameTaskType, deleteTaskType } from "../db/taskTypes.js";
import { addEventType, renameEventType, deleteEventType } from "../db/eventTypes.js";
import { confirmDialog, promptDialog } from "../ui/dialogs.js";
import { toast } from "../ui/screens.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function manageView(container) {
  let showArchived = false;

  /* ---------- a small "add something" form (built once, so typing is never interrupted) ---------- */
  function addForm({ label, placeholder, button, existingNames, onAdd }) {
    const input = h("input", { type: "text", class: "input", placeholder, "aria-label": label, autocomplete: "off" });
    const error = h("p", { class: "error-text", role: "alert", hidden: true });
    const form = h("form", { class: "add-form", novalidate: true, onSubmit: (e) => {
      e.preventDefault();
      const result = validateName(input.value, existingNames());
      error.textContent = result.error || "";
      error.hidden = !result.error;
      if (result.error) return input.focus();
      onAdd(result.name);
      input.value = "";
      input.focus();
    } }, input, h("button", { type: "submit", class: "btn btn-primary" }, button));
    return h("div", {}, form, error);
  }

  /* ---------- courses ---------- */
  const courseList = h("ul", { class: "row-list" });
  const archivedBox = h("input", { type: "checkbox", onChange: (e) => { showArchived = e.target.checked; renderCourses(); } });

  function renderCourses() {
    clear(courseList);
    const courses = state.courses.filter((c) => showArchived || !c.archived);
    if (!courses.length) {
      courseList.append(h("li", { class: "row empty-row muted" },
        state.courses.length ? "All your courses are archived." : "No courses yet. Add your first one above."));
      return;
    }
    for (const course of courses) {
      const tasks = state.tasks.filter((t) => t.courseId === course.id);
      const open = tasks.filter((t) => t.status !== "done" && !t.archived).length;

      courseList.append(h("li", { class: `row${course.archived ? " is-archived" : ""}` },
        h("div", { class: "row-main" },
          h("strong", {}, course.name, course.archived ? h("span", { class: "chip chip-archived" }, "Archived") : null),
          h("span", { class: "muted small" }, `${plural(tasks.length, "task")} · ${open} unfinished`)),
        h("div", { class: "row-actions" },
          h("button", { type: "button", class: "btn btn-small", onClick: () => onRenameCourse(course) }, "Rename"),
          h("button", { type: "button", class: "btn btn-small", onClick: () => onArchiveCourse(course) }, course.archived ? "Restore" : "Archive"),
          h("button", { type: "button", class: "btn btn-small btn-danger-outline", onClick: () => onDeleteCourse(course, tasks) }, "Delete…"))));
    }
  }

  async function onRenameCourse(course) {
    const others = state.courses.map((c) => c.name);
    const name = await promptDialog({
      title: "Rename course", label: "Course name", value: course.name,
      validate: (text) => validateName(text, others, { ignore: course.name }).error || "",
    });
    if (name === null) return;
    renameCourse(state.fb, state.uid, course.id, name);
    toast("Course renamed. All its tasks follow automatically.");
  }

  function onArchiveCourse(course) {
    setCourseArchived(state.fb, state.uid, course.id, !course.archived);
    toast(course.archived ? "Course restored." : "Course archived. Its tasks are hidden from your lists but kept for your records.");
  }

  async function onDeleteCourse(course, tasks) {
    const n = tasks.length;
    const events = state.events.filter((e) => e.courseId === course.id);
    const ok = await confirmDialog({
      title: `Delete "${course.name}"?`,
      message: [
        n
          ? `This will also permanently delete ${plural(n, "task")} that belong to this course, with their notes and history. This cannot be undone.`
          : "This course has no tasks. This cannot be undone.",
        events.length ? `Its ${plural(events.length, "event")} will stay on your calendar, without a course.` : null,
        "Not sure? Archive the course instead. It disappears from your lists but nothing is lost, and you can restore it any time.",
      ],
      confirmLabel: n ? `Delete course and ${plural(n, "task")}` : "Delete course",
      danger: true,
    });
    if (!ok) return;
    deleteCourse(state.fb, state.uid, course.id, tasks.map((t) => t.id), events.map((e) => e.id));
    toast(n ? `Course and ${plural(n, "task")} deleted.` : "Course deleted.");
  }

  /* ---------- task types and event types (one block per workspace and per thing) ---------- */
  const KINDS = {
    task: {
      noun: "task", Title: "Task types",
      builtIn: (ws) => DEFAULT_TYPES.filter((t) => t.workspace === ws),
      custom: (ws) => state.customTypes.filter((t) => (t.workspace || "academics") === ws),
      all: (ws) => typesFor(ws),
      usedBy: (type) => state.tasks.filter((t) => t.typeId === type.id),
      add: (name, ws) => addTaskType(state.fb, state.uid, name, ws),
      rename: (id, name) => renameTaskType(state.fb, state.uid, id, name),
      remove: (type, to, used) => deleteTaskType(state.fb, state.uid, type.id, to, used.map((x) => x.id)),
      example: { academics: "e.g. Laboratory", organizations: "e.g. Fundraising" },
    },
    event: {
      noun: "event", Title: "Event types",
      builtIn: (ws) => EVENT_KINDS.filter((t) => t.workspace === ws),
      custom: (ws) => state.customEventTypes.filter((t) => (t.workspace || "academics") === ws),
      all: (ws) => eventKindsFor(ws),
      usedBy: (type) => state.events.filter((e) => e.kind === type.id),
      add: (name, ws) => addEventType(state.fb, state.uid, name, ws),
      rename: (id, name) => renameEventType(state.fb, state.uid, id, name),
      remove: (type, to, used) => deleteEventType(state.fb, state.uid, type.id, to, used.map((x) => x.id)),
      example: { academics: "e.g. Defense", organizations: "e.g. Rehearsal" },
    },
  };

  const typeBlocks = [];
  function typeBlock(ws, kindKey) {
    const K = KINDS[kindKey];
    const list = h("ul", { class: "row-list" });
    const form = addForm({
      label: `New ${ws.name} ${K.noun} type name`,
      placeholder: K.example[ws.id],
      button: "Add type",
      existingNames: () => K.all(ws.id).map((t) => t.name),
      onAdd: (name) => { K.add(name, ws.id); toast(`${K.noun === "task" ? "Task" : "Event"} type added.`); },
    });
    const node = h("div", { class: "type-block" },
      h("h3", {}, K.Title),
      h("ul", { class: "chips", "aria-label": "Built-in (fixed)" }, K.builtIn(ws.id).map((t) => h("li", { class: "chip" }, t.name))),
      h("p", { class: "muted small" }, "Your own:"),
      form, list);
    typeBlocks.push({ ws, K, list });
    return node;
  }

  function renderTypes() {
    for (const { ws, K, list } of typeBlocks) {
      clear(list);
      const custom = K.custom(ws.id).sort((a, b) => a.name.localeCompare(b.name));
      if (!custom.length) { list.append(h("li", { class: "row empty-row muted" }, "None of your own yet.")); continue; }
      for (const type of custom) {
        const count = K.usedBy(type).length;
        list.append(h("li", { class: "row" },
          h("div", { class: "row-main" }, h("strong", {}, type.name), h("span", { class: "muted small" }, plural(count, K.noun))),
          h("div", { class: "row-actions" },
            h("button", { type: "button", class: "btn btn-small", onClick: () => onRenameType(K, ws, type) }, "Rename"),
            h("button", { type: "button", class: "btn btn-small btn-danger-outline", onClick: () => onDeleteType(K, ws, type) }, "Delete…"))));
      }
    }
  }

  async function onRenameType(K, ws, type) {
    const others = K.all(ws.id).map((t) => t.name);
    const name = await promptDialog({
      title: `Rename ${K.noun} type`, label: "Type name", value: type.name,
      validate: (text) => validateName(text, others, { ignore: type.name }).error || "",
    });
    if (name === null) return;
    K.rename(type.id, name);
    toast("Type renamed.");
  }

  async function onDeleteType(K, ws, type) {
    const used = K.usedBy(type);
    const replacements = K.all(ws.id).filter((t) => t.id !== type.id);
    const picker = h("select", { class: "select", "aria-label": `Move ${K.noun}s to this type` },
      replacements.map((t) => h("option", { value: t.id }, t.name)));
    const ok = await confirmDialog({
      title: `Delete the type "${type.name}"?`,
      message: used.length
        ? `${plural(used.length, K.noun)} use this type. Choose a type to move them to. Only the type is deleted; nothing else is lost.`
        : `No ${K.noun}s use this type.`,
      body: used.length ? h("label", { class: "label" }, `Move ${K.noun}s to`, picker) : null,
      confirmLabel: "Delete type",
      danger: true,
    });
    if (!ok) return;
    K.remove(type, picker.value, used);
    toast(used.length ? `Type deleted. ${plural(used.length, K.noun)} moved.` : "Type deleted.");
  }

  /* ---------- a collapsible group ---------- */
  function fold(title, subtitle, ...children) {
    const sub = h("span", { class: "muted small" }, subtitle);
    const node = h("details", { class: "fold" },
      h("summary", {}, h("span", { class: "fold-title" }, h("strong", {}, title), sub), h("span", { class: "fold-chevron", "aria-hidden": "true" }, "›")),
      h("div", { class: "fold-body" }, children));
    return { node, sub };
  }

  /* ---------- page ---------- */
  const coursesFold = fold("Courses", "",
    h("p", { class: "muted" }, "Each academic task belongs to a course. Renaming a course updates all its tasks."),
    addForm({
      label: "New course name", placeholder: "e.g. CS 101 Data Structures", button: "Add course",
      existingNames: () => state.courses.map((c) => c.name),
      onAdd: (name) => { addCourse(state.fb, state.uid, name); toast("Course added."); },
    }),
    h("label", { class: "check" }, archivedBox, h("span", {}, "Show archived courses")),
    courseList);

  const wsFolds = WORKSPACES.map((ws) => ({
    ws,
    ...fold(ws.name, "",
      h("p", { class: "muted" }, ws.id === "academics"
        ? "Types you can pick on the Add task and Add event forms for Academics."
        : "Types you can pick on the Add task and Add event forms for Organizations."),
      typeBlock(ws, "task"), typeBlock(ws, "event")),
  }));

  container.append(
    h("div", { class: "page-head" }, h("h1", {}, "Manage")),
    h("p", { class: "muted" }, "Tap a group to open it."),
    coursesFold.node, ...wsFolds.map((f) => f.node));

  function refresh() {
    renderCourses(); renderTypes();
    const live = state.courses.filter((c) => !c.archived).length;
    coursesFold.sub.textContent = live ? `${plural(live, "course")}` : "No courses yet";
    for (const f of wsFolds) {
      const t = KINDS.task.custom(f.ws.id).length, e = KINDS.event.custom(f.ws.id).length;
      f.sub.textContent = `Task types and event types${t + e ? ` · ${t + e} of your own` : ""}`;
    }
  }
  refresh();
  return { update: refresh };
}
