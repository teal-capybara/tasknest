/* ==========================================================================
   TASK CARD: one task in the list.

   Shows: title, course/organization, type, Individual/Group, due date and
   time, an urgency badge (icon + text, never color alone), a short preview of
   the instructions, and the controls to change status WITHOUT opening the task:
     - the round checkbox  (checked = Done)
     - the status dropdown (Not started / In progress / Done)
   Plus a "Details" link and a ⋯ menu (Edit, Duplicate, Archive, Delete).
   ========================================================================== */

import { h } from "./dom.js";
import { ARRANGEMENTS, STATUSES } from "../constants.js";
import { getSettings, typeName, taskGroupName, isTaskArchived } from "../state.js";
import { urgencyOf } from "../logic/urgency.js";
import { completionTiming } from "../logic/timing.js";
import { formatDue } from "../logic/format.js";
import { changeStatus, toggleDone, toggleArchive, deleteWithConfirm } from "./taskActions.js";

export const arrangementName = (id) => (ARRANGEMENTS.find((a) => a.id === id) || { name: "—" }).name;

/** The urgency (or "finished early/late") badge, also used on the detail page. */
export function urgencyBadge(task, now) {
  const settings = getSettings();
  const u = urgencyOf(task, now, settings);
  let text = u.text;
  if (u.key === "done") {
    const timing = completionTiming(task, settings.earlyHours);
    if (timing) text = timing.label;
  }
  return h("span", { class: `badge badge-${u.key}` },
    h("span", { class: "badge-icon", "aria-hidden": "true" }, u.icon), text);
}

export function buildTaskCard(task, now) {
  const u = urgencyOf(task, now, getSettings());
  const archived = isTaskArchived(task);
  const href = `#/task/${encodeURIComponent(task.id)}`;

  const menu = h("details", { class: "menu" },
    h("summary", { class: "btn btn-small menu-button", "aria-label": `More actions for ${task.title}` }, "⋯"),
    h("div", { class: "menu-list" },
      h("a", { href: `${href}/edit` }, "Edit"),
      h("a", { href: `#/task/new?from=${encodeURIComponent(task.id)}` }, "Duplicate"),
      h("button", { type: "button", onClick: () => { menu.open = false; toggleArchive(task); } },
        task.archived ? "Restore from archive" : "Archive"),
      h("button", { type: "button", class: "danger-item", onClick: () => { menu.open = false; deleteWithConfirm(task); } }, "Delete…")));

  const statusSelect = h("select", {
    class: "select status-select",
    "aria-label": `Status of ${task.title}`,
    value: task.status,
    onChange: (e) => changeStatus(task, e.target.value),
  }, STATUSES.map((s) => h("option", { value: s.id }, s.name)));

  return h("article", { class: `task-card urg-${u.key}${archived ? " is-archived" : ""}` },
    h("input", {
      type: "checkbox", class: "task-check", checked: task.status === "done",
      "aria-label": `Mark "${task.title}" as done`,
      onChange: (e) => toggleDone(task, e.target.checked),
    }),
    h("div", { class: "task-body" },
      h("a", { class: "task-title", href }, task.title),
      h("div", { class: "chips" },
        h("span", { class: `chip chip-${task.workspace}` }, taskGroupName(task)),
        h("span", { class: "chip" }, typeName(task.typeId)),
        h("span", { class: "chip" }, arrangementName(task.arrangement)),
        archived ? h("span", { class: "chip chip-archived" }, "Archived") : null),
      h("div", { class: "task-due" },
        urgencyBadge(task, now),
        // Skip the date when done (the badge says so) or when there is no deadline (the badge already says it).
        task.status === "done" || task.dueAt == null ? null : h("span", { class: "due-text" }, formatDue(task.dueAt, now))),
      task.instructions ? h("p", { class: "task-preview" }, task.instructions) : null),
    h("div", { class: "task-side" },
      statusSelect,
      h("a", { class: "btn btn-small", href }, "Details"),
      menu));
}
