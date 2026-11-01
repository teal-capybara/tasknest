/* ==========================================================================
   TASK DETAIL: everything about one task, at a stable address you can bookmark
   (#/task/ID). Status can be changed right here too.

   Shows the full instructions, your notes, deadline, type, work arrangement,
   timestamps, the early/on-time/late result, and the deadline history.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { STATUSES, WORKSPACES } from "../constants.js";
import { state, getSettings, typeName, taskGroupName, isTaskArchived, eventById } from "../state.js";
import { completionTiming } from "../logic/timing.js";
import { formatDateTime } from "../logic/format.js";
import { arrangementName, urgencyBadge } from "../ui/taskCard.js";
import { changeStatus, toggleArchive, deleteWithConfirm } from "../ui/taskActions.js";
import { go } from "../router.js";

export function taskDetailView(container, params) {
  function render() {
    clear(container);
    const task = state.tasks.find((t) => t.id === params.id);

    if (!task) {
      container.append(h("div", { class: "empty" },
        h("h1", {}, "Task not found"),
        h("p", { class: "muted" }, "It may have been deleted, or it hasn't finished syncing to this device yet."),
        h("a", { class: "btn btn-primary", href: "#/tasks" }, "Back to tasks")));
      return;
    }

    const now = Date.now();
    const settings = getSettings();
    const archived = isTaskArchived(task);
    const timing = completionTiming(task, settings.earlyHours);
    const id = encodeURIComponent(task.id);
    const linkedEvent = task.eventId ? eventById(task.eventId) : null;
    const workspaceName = (WORKSPACES.find((w) => w.id === task.workspace) || {}).name;

    const row = (label, value) => h("div", { class: "detail-row" }, h("dt", {}, label), h("dd", {}, value));

    // Everything goes inside one wrapper made by h(), which safely skips the optional (null) parts.
    // (container.append(null) would print the word "null" on the page.)
    container.append(h("div", { class: "detail-page" },
      h("a", { class: "back-link", href: "#/tasks" }, "← All tasks"),
      archived ? h("div", { class: "banner banner-inline" },
        h("span", {}, task.archived ? "This task is archived." : "This task's course is archived."),
        task.archived ? h("button", { type: "button", class: "btn btn-small", onClick: () => toggleArchive(task) }, "Restore") : null) : null,

      h("h1", { class: "detail-title" }, task.title),
      h("div", { class: "chips" },
        h("span", { class: `chip chip-${task.workspace}` }, taskGroupName(task)),
        h("span", { class: "chip" }, typeName(task.typeId)),
        h("span", { class: "chip" }, arrangementName(task.arrangement))),

      h("div", { class: "detail-status card" },
        urgencyBadge(task, now),
        h("label", { class: "label inline-label" }, "Status",
          h("select", {
            class: "select status-select", value: task.status,
            onChange: (e) => changeStatus(task, e.target.value),
          }, STATUSES.map((s) => h("option", { value: s.id }, s.name)))),
        timing ? h("p", { class: "muted small" }, `${timing.label}${timing.detail ? `: ${timing.detail}` : ""}`) : null),

      h("div", { class: "action-row" },
        h("a", { class: "btn btn-primary", href: `#/task/${id}/edit` }, "Edit"),
        h("a", { class: "btn", href: `#/task/new?from=${id}` }, "Duplicate"),
        h("button", { type: "button", class: "btn", onClick: () => toggleArchive(task) }, task.archived ? "Restore" : "Archive"),
        h("button", { type: "button", class: "btn btn-danger-outline", onClick: () => deleteWithConfirm(task, () => go("/tasks")) }, "Delete…")),

      h("section", { class: "card" },
        h("h2", {}, "Details"),
        h("dl", { class: "detail-list" },
          row("Deadline", task.dueAt == null ? "No deadline" : formatDateTime(task.dueAt)),
          row("Workspace", workspaceName || "—"),
          row(task.workspace === "academics" ? "Course" : "Organization", taskGroupName(task)),
          row("Task type", typeName(task.typeId)),
          row("Work arrangement", arrangementName(task.arrangement)),
          linkedEvent ? row("For event", h("a", { href: `#/event/${encodeURIComponent(linkedEvent.id)}` }, linkedEvent.title)) : null)),

      h("section", { class: "card" },
        h("h2", {}, "Instructions"),
        task.instructions ? h("p", { class: "prewrap" }, task.instructions) : h("p", { class: "muted" }, "No instructions added.")),

      h("section", { class: "card" },
        h("h2", {}, "Personal notes"),
        task.notes ? h("p", { class: "prewrap" }, task.notes) : h("p", { class: "muted" }, "No notes added.")),

      h("section", { class: "card" },
        h("h2", {}, "Timeline"),
        h("dl", { class: "detail-list" },
          row("Created", formatDateTime(task.createdAt)),
          row("Last changed", formatDateTime(task.updatedAt)),
          row("First marked In progress", task.inProgressAt ? formatDateTime(task.inProgressAt) : "Not yet"),
          row("Completed", task.completedAt ? formatDateTime(task.completedAt) : "Not yet"),
          task.archived ? row("Archived", formatDateTime(task.archivedAt)) : null),
        h("p", { class: "muted small" }, "“Created” is when you added the task here, not when you started working on it.")),

      h("section", { class: "card" },
        h("h2", {}, "Deadline history"),
        historyList(task))));
  }

  render();
  return { update: render };
}

/** Oldest change first. Each line: previous deadline, new deadline, when it was changed. */
function historyList(task) {
  const history = [...(task.deadlineHistory || [])].sort((a, b) => a.changedAt - b.changedAt);
  if (!history.length) return h("p", { class: "muted" }, "The deadline has not been changed.");
  const label = (ms) => (ms == null ? "no deadline" : formatDateTime(ms));
  return h("ol", { class: "history" }, history.map((entry) =>
    h("li", {}, h("span", {}, `${label(entry.from)} → ${label(entry.to)}`),
      h("span", { class: "muted small" }, ` (changed ${formatDateTime(entry.changedAt)})`))));
}
