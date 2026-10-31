/* ==========================================================================
   MANAGE: your courses and your task types.

   COURSES
   - Add, rename, archive (hide but keep everything) or delete.
   - Delete also deletes every task in the course, so it always shows a clear
     warning with the number of tasks and asks you to confirm. Archive is the
     safer choice and is offered first.
   TASK TYPES (one list for Academics, one for Organizations)
   - The built-in types are fixed. Your own types can be renamed or deleted.
   - Deleting a type asks where to move its tasks first (to another type of the
     SAME workspace), so no task ever ends up without a type.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { DEFAULT_TYPES, WORKSPACES } from "../constants.js";
import { state, typesFor } from "../state.js";
import { validateName } from "../logic/validate.js";
import { addCourse, renameCourse, setCourseArchived, deleteCourse } from "../db/courses.js";
import { addTaskType, renameTaskType, deleteTaskType } from "../db/taskTypes.js";
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
    const ok = await confirmDialog({
      title: `Delete "${course.name}"?`,
      message: [
        n
          ? `This will also permanently delete ${plural(n, "task")} that belong to this course, with their notes and history. This cannot be undone.`
          : "This course has no tasks. This cannot be undone.",
        "Not sure? Archive the course instead. It disappears from your lists but nothing is lost, and you can restore it any time.",
      ],
      confirmLabel: n ? `Delete course and ${plural(n, "task")}` : "Delete course",
      danger: true,
    });
    if (!ok) return;
    deleteCourse(state.fb, state.uid, course.id, tasks.map((t) => t.id));
    toast(n ? `Course and ${plural(n, "task")} deleted.` : "Course deleted.");
  }

  /* ---------- task types (one block per workspace) ---------- */
  const typeBlocks = WORKSPACES.map((ws) => {
    const builtIn = h("ul", { class: "chips" }, DEFAULT_TYPES.filter((t) => t.workspace === ws.id).map((t) => h("li", { class: "chip" }, t.name)));
    const list = h("ul", { class: "row-list" });
    const form = addForm({
      label: `New ${ws.name} task type name`,
      placeholder: ws.id === "academics" ? "e.g. Laboratory" : "e.g. Fundraising",
      button: "Add type",
      existingNames: () => typesFor(ws.id).map((t) => t.name),
      onAdd: (name) => { addTaskType(state.fb, state.uid, name, ws.id); toast("Task type added."); },
    });
    const node = h("section", { class: "type-block" },
      h("h3", {}, `${ws.name} task types`),
      h("p", { class: "muted small" }, "Built-in (fixed):"),
      builtIn,
      h("p", { class: "muted small" }, "Your own:"),
      form, list);
    return { ws, list, node };
  });

  const customOf = (wsId) => state.customTypes
    .filter((t) => (t.workspace || "academics") === wsId)
    .sort((a, b) => a.name.localeCompare(b.name));

  function renderTypes() {
    for (const block of typeBlocks) {
      clear(block.list);
      const custom = customOf(block.ws.id);
      if (!custom.length) {
        block.list.append(h("li", { class: "row empty-row muted" }, "No custom types yet."));
        continue;
      }
      for (const type of custom) {
        const count = state.tasks.filter((t) => t.typeId === type.id).length;
        block.list.append(h("li", { class: "row" },
          h("div", { class: "row-main" }, h("strong", {}, type.name), h("span", { class: "muted small" }, plural(count, "task"))),
          h("div", { class: "row-actions" },
            h("button", { type: "button", class: "btn btn-small", onClick: () => onRenameType(type) }, "Rename"),
            h("button", { type: "button", class: "btn btn-small btn-danger-outline", onClick: () => onDeleteType(type) }, "Delete…"))));
      }
    }
  }

  async function onRenameType(type) {
    const workspace = type.workspace || "academics";
    const others = typesFor(workspace).map((t) => t.name);
    const name = await promptDialog({
      title: "Rename task type", label: "Type name", value: type.name,
      validate: (text) => validateName(text, others, { ignore: type.name }).error || "",
    });
    if (name === null) return;
    renameTaskType(state.fb, state.uid, type.id, name);
    toast("Type renamed.");
  }

  async function onDeleteType(type) {
    const workspace = type.workspace || "academics";
    const affected = state.tasks.filter((t) => t.typeId === type.id);
    const replacements = typesFor(workspace).filter((t) => t.id !== type.id);
    const picker = h("select", { class: "select", "aria-label": "Move tasks to this type" },
      replacements.map((t) => h("option", { value: t.id }, t.name)));

    const ok = await confirmDialog({
      title: `Delete the type "${type.name}"?`,
      message: affected.length
        ? `${plural(affected.length, "task")} use this type. Choose a type to move them to. Only the type is deleted; no tasks are lost.`
        : "No tasks use this type.",
      body: affected.length ? h("label", { class: "label" }, "Move tasks to", picker) : null,
      confirmLabel: "Delete type",
      danger: true,
    });
    if (!ok) return;
    deleteTaskType(state.fb, state.uid, type.id, picker.value, affected.map((t) => t.id));
    toast(affected.length ? `Type deleted. ${plural(affected.length, "task")} moved.` : "Type deleted.");
  }

  /* ---------- page ---------- */
  container.append(
    h("div", { class: "page-head" }, h("h1", {}, "Manage")),

    h("section", { class: "card" },
      h("h2", {}, "Courses"),
      h("p", { class: "muted" }, "Each academic task belongs to a course. Renaming a course updates all its tasks."),
      addForm({
        label: "New course name", placeholder: "e.g. CS 101 Data Structures", button: "Add course",
        existingNames: () => state.courses.map((c) => c.name),
        onAdd: (name) => { addCourse(state.fb, state.uid, name); toast("Course added."); },
      }),
      h("label", { class: "check" }, archivedBox, h("span", {}, "Show archived courses")),
      courseList),

    h("section", { class: "card" },
      h("h2", {}, "Task types"),
      h("p", { class: "muted" }, "Each workspace has its own task types. The Add task form shows the ones for the workspace you pick."),
      typeBlocks.map((b) => b.node)));

  function refresh() { renderCourses(); renderTypes(); }
  refresh();
  return { update: refresh };
}
