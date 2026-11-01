/* ==========================================================================
   DASHBOARD (Home): what needs you right now.

   From top to bottom:
     1. A greeting and today's date.
     2. Four tiles: Overdue, Due today, Due soon, In progress. Tap one to see
        exactly those tasks on the Tasks list.
     2b. "Coming up": your next events (exams, meetings, classes) in the next 14 days.
         An exam with no task yet gets a shortcut to create a review task.
     3. "Needs attention": the most urgent tasks (up to 5), with the same
        controls as the Tasks list (tick them off right here).
     4. Progress per course / organization (how many tasks are done).
     5. The last 7 days: how many tasks you finished, and whether early,
        on time or late.

   The numbers come from js/logic/stats.js. Nothing is stored for the dashboard;
   it is worked out from your tasks every time, so it always matches them.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { state, getSettings, isTaskArchived, taskGroupName, eventGroupName } from "../state.js";
import { dashboardStats } from "../logic/stats.js";
import { buildTaskCard } from "../ui/taskCard.js";
import { upcomingEvents, relativeDay, formatClock } from "../logic/calendar.js";
import { EVENT_KINDS } from "../constants.js";

const MAX_ATTENTION = 5;

const TILES = [
  { key: "overdue",     label: "Overdue",     icon: "⚠", tone: "danger", href: "#/tasks?when=overdue" },
  { key: "due_today",   label: "Due today",   icon: "●", tone: "warn",   href: "#/tasks?when=today" },
  { key: "due_soon",    label: "Due soon",    icon: "◐", tone: "warn",   href: "#/tasks?when=soon" },
  { key: "in_progress", label: "In progress", icon: "▶", tone: "info",   href: "#/tasks?status=in_progress" },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function dashboardView(container) {
  const heading = h("h1", {});
  const dateLine = h("p", { class: "muted dash-date" });
  const body = h("div", { class: "dash-body" });
  container.append(h("div", { class: "page-head dash-head" }, h("div", {}, heading, dateLine)), body);

  function render() {
    const now = Date.now();
    const settings = getSettings();
    const stats = dashboardStats(state.tasks, { now, settings, isArchived: isTaskArchived, groupName: taskGroupName });

    heading.textContent = greeting(now);
    dateLine.textContent = new Date(now).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    clear(body);

    const upcoming = upcomingEvents(state.events, now, 14, 5);

    if (!stats.totalActive && !upcoming.length) {
      body.append(h("div", { class: "empty card" },
        h("h2", {}, "Nothing here yet"),
        h("p", { class: "muted" }, state.courses.length
          ? "Add your first task and it will show up here."
          : "Tip: add your courses under Manage first, then add your first task."),
        h("a", { class: "btn btn-primary", href: "#/task/new" }, "Add a task")));
      return;
    }

    // (append(null) would print the word "null", so leave out sections that have nothing to show)
    body.append(...[tiles(stats), eventsSection(upcoming, now), attentionSection(stats, now), progressSection(stats), weekSection(stats, settings)].filter(Boolean));
  }

  render();
  return { update: render };
}

/* ---------------------------------------------------------------- pieces */

function greeting(now) {
  const hour = new Date(now).getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const user = (state.fb && state.fb.auth.currentUser) || {};
  const first = (user.displayName || "").trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

function tiles(stats) {
  return h("div", { class: "stat-grid" }, TILES.map((tile) => {
    const n = stats.counts[tile.key];
    return h("a", { class: `stat-tile stat-${tile.tone}${n ? "" : " is-zero"}`, href: tile.href },
      h("span", { class: "stat-number" }, String(n)),
      h("span", { class: "stat-label" }, h("span", { class: "badge-icon", "aria-hidden": "true" }, tile.icon), tile.label));
  }));
}

function eventsSection(upcoming, now) {
  if (!upcoming.length) return null;
  return h("section", { class: "dash-section" },
    h("h2", {}, "Coming up"),
    h("ul", { class: "event-list card" }, upcoming.map((e) => {
      const kind = (EVENT_KINDS.find((k) => k.id === e.kind) || {}).name || "Event";
      const group = eventGroupName(e);
      const hasTask = state.tasks.some((t) => t.eventId === e.id && !t.archived);
      return h("li", { class: "event-row" },
        h("a", { class: "event-link", href: `#/event/${encodeURIComponent(e.id)}` },
          h("span", { class: "event-when" }, h("strong", {}, relativeDay(e.startAt, now)), h("span", { class: "muted small" }, e.allDay ? "All day" : formatClock(e.startAt))),
          h("span", { class: "event-main" },
            h("span", { class: "event-title" }, e.title),
            h("span", { class: "cal-meta" }, h("span", { class: `chip chip-kind kind-${e.kind}` }, kind), group ? h("span", { class: "muted small" }, group) : null))),
        e.kind === "exam" && !hasTask
          ? h("a", { class: "btn btn-small", href: `#/task/new?event=${encodeURIComponent(e.id)}` }, "Add review task")
          : null);
    })),
    h("p", {}, h("a", { href: "#/calendar" }, "Open the calendar")));
}

function attentionSection(stats, now) {
  const shown = stats.attention.slice(0, MAX_ATTENTION);
  const more = stats.attention.length - shown.length;
  return h("section", { class: "dash-section" },
    h("h2", {}, "Needs attention"),
    shown.length
      ? h("div", { class: "task-list" }, shown.map((task) => buildTaskCard(task, now)))
      : h("div", { class: "card caught-up" },
          h("strong", {}, "✓ You're all caught up."),
          h("p", { class: "muted" }, "Nothing is overdue or due soon.")),
    more > 0 ? h("p", {}, h("a", { href: "#/tasks" }, `See ${plural(more, "more task")} on the Tasks list`)) : null,
    h("p", {}, h("a", { class: "btn", href: "#/tasks" }, "All tasks")));
}

function progressSection(stats) {
  if (!stats.progress.length) return null;
  return h("section", { class: "dash-section" },
    h("h2", {}, "Progress"),
    h("ul", { class: "progress-list card" }, stats.progress.map((g) => {
      const label = `${g.done} of ${g.total} done`;
      return h("li", { class: "progress-row" },
        h("div", { class: "progress-top" },
          h("span", { class: `chip chip-${g.workspace}` }, g.name),
          h("span", { class: "muted small" }, g.done === g.total ? `All ${g.total} done ✓` : label)),
        h("div", {
          class: "bar", role: "progressbar", "aria-label": `${g.name}: ${label}`,
          "aria-valuemin": "0", "aria-valuemax": String(g.total), "aria-valuenow": String(g.done),
        }, h("span", { class: "bar-fill", style: `width: ${Math.round((g.done / g.total) * 100)}%` })));
    })));
}

function weekSection(stats, settings) {
  const w = stats.week;
  const part = (n, label) => h("li", { class: "week-part" }, h("strong", {}, String(n)), h("span", { class: "muted small" }, label));
  return h("section", { class: "dash-section" },
    h("h2", {}, "Last 7 days"),
    h("div", { class: "card" },
      w.done
        ? [
            h("p", {}, h("strong", {}, plural(w.done, "task")), " finished."),
            h("ul", { class: "week-list" }, part(w.early, "early"), part(w.ontime, "on time"), part(w.late, "late"), part(w.nodeadline, "no deadline")),
            h("p", { class: "muted small" }, `“Early” means finished at least ${settings.earlyHours} hours before the deadline (change it under Settings, View).`),
          ]
        : h("p", { class: "muted" }, "Nothing finished in the last 7 days yet.")));
}
