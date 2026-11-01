/* ==========================================================================
   EVENT DETAIL: one exam / meeting / class, at its own address (#/event/ID).

   The most useful button here is "Create review task": it opens the Add task
   form already filled in for this event (title, course or organization, and a
   deadline the day before). Tasks made that way stay linked to the event and are
   listed here.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { EVENT_KINDS, WORKSPACES } from "../constants.js";
import { state, eventById, eventGroupName, isTaskArchived } from "../state.js";
import { eventWhen, dayKey, relativeDay } from "../logic/calendar.js";
import { buildTaskCard } from "../ui/taskCard.js";
import { confirmDialog } from "../ui/dialogs.js";
import { deleteEvent } from "../db/events.js";
import { toast } from "../ui/screens.js";
import { go } from "../router.js";

export function eventDetailView(container, params) {
  // A just-created event can take a moment to reach this screen's data; wait briefly before saying "not found".
  const waitUntil = Date.now() + 1500;
  let waitTimer = null;

  function render() {
    clear(container);
    const event = eventById(params.id);

    if (!event) {
      if (Date.now() < waitUntil) {
        container.append(h("div", { class: "loading-view" }, h("div", { class: "spinner", role: "status", "aria-label": "Loading" })));
        clearTimeout(waitTimer);
        waitTimer = setTimeout(render, waitUntil - Date.now() + 20);
        return;
      }
      container.append(h("div", { class: "empty" },
        h("h1", {}, "Event not found"),
        h("p", { class: "muted" }, "It may have been deleted, or it hasn't finished syncing to this device yet."),
        h("a", { class: "btn btn-primary", href: "#/calendar" }, "Back to the calendar")));
      return;
    }

    const now = Date.now();
    const id = encodeURIComponent(event.id);
    const kind = (EVENT_KINDS.find((k) => k.id === event.kind) || {}).name || "Event";
    const group = eventGroupName(event);
    const workspaceName = (WORKSPACES.find((w) => w.id === event.workspace) || {}).name;
    const linked = state.tasks.filter((t) => t.eventId === event.id && !isTaskArchived(t))
      .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity));
    const row = (label, value) => h("div", { class: "detail-row" }, h("dt", {}, label), h("dd", {}, value));
    const taskLabel = event.kind === "exam" ? "Create review task" : "Create task for this event";

    container.append(h("div", { class: "detail-page" },
      h("a", { class: "back-link", href: `#/calendar?date=${dayKey(event.startAt)}&view=day` }, "← Calendar"),
      h("h1", { class: "detail-title" }, event.title),
      h("div", { class: "chips" },
        h("span", { class: `chip chip-kind kind-${event.kind}` }, kind),
        h("span", { class: `chip chip-${event.workspace}` }, group || workspaceName)),
      h("p", { class: "event-when-line" }, h("strong", {}, eventWhen(event)), h("span", { class: "muted" }, ` · ${relativeDay(event.startAt, now)}`)),

      h("div", { class: "action-row" },
        h("a", { class: "btn btn-primary", href: `#/task/new?event=${id}` }, taskLabel),
        h("a", { class: "btn", href: `#/event/${id}/edit` }, "Edit"),
        h("button", { type: "button", class: "btn btn-danger-outline", onClick: () => onDelete(event, linked.length) }, "Delete…")),

      h("section", { class: "card" },
        h("h2", {}, "Details"),
        h("dl", { class: "detail-list" },
          row("When", eventWhen(event)),
          row("Kind", kind),
          row("Workspace", workspaceName || "—"),
          row(event.workspace === "academics" ? "Course" : "Organization", group || "None"),
          row("Location", event.location || "Not set"))),

      event.notes ? h("section", { class: "card" }, h("h2", {}, "Notes"), h("p", { class: "prewrap" }, event.notes)) : null,

      h("section", { class: "dash-section" },
        h("h2", {}, "Tasks for this event"),
        linked.length
          ? h("div", { class: "task-list" }, linked.map((t) => buildTaskCard(t, now)))
          : h("p", { class: "muted" }, event.kind === "exam"
              ? "No tasks yet. Use “Create review task” to plan your studying."
              : "No tasks yet. Use “Create task for this event” if you need to prepare something."))));
  }

  async function onDelete(event, taskCount) {
    const ok = await confirmDialog({
      title: "Delete this event?",
      message: [
        `"${event.title}" will be permanently deleted from your calendar. This cannot be undone.`,
        taskCount ? `Its ${taskCount} linked task${taskCount === 1 ? "" : "s"} will not be deleted.` : null,
      ],
      confirmLabel: "Delete event",
      danger: true,
    });
    if (!ok) return;
    deleteEvent(state.fb, state.uid, event.id);
    toast("Event deleted.");
    go("/calendar");
  }

  const closeMenus = (e) => {
    document.querySelectorAll("details.menu[open]").forEach((d) => { if (!d.contains(e.target)) d.open = false; });
  };
  document.addEventListener("click", closeMenus);

  render();
  return { update: render, destroy() { clearTimeout(waitTimer); document.removeEventListener("click", closeMenus); } };
}
