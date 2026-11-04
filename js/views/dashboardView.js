/* ==========================================================================
   DASHBOARD (Home): what needs you right now, in clear groups.

   From top to bottom (two columns on a wide screen):
     Hero      a greeting, how many things are on today, and your next event
     Strip     four small counters: Overdue, Due today, Due soon, In progress.
               Tap one to see exactly those tasks on the Tasks list.
     Needs attention   the most urgent tasks (up to 5), tick them off right here
     Coming up         your next events in the next 14 days (an exam with no task
                       yet gets a shortcut to create a review task)
     Progress          Academics and Organizations kept apart, each with its
                       courses / organizations and a bar
     Last 7 days       tasks finished, and whether early, on time or late

   The numbers come from js/logic/stats.js. Nothing is stored for the dashboard;
   it is worked out from your tasks every time, so it always matches them.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { state, getSettings, isTaskHidden, taskGroupName, eventGroupName, eventKindName, termNow } from "../state.js";
import { homeSchedule, dayName, formatRange } from "../logic/schedule.js";
import { dashboardStats } from "../logic/stats.js";
import { buildTaskCard } from "../ui/taskCard.js";
import { upcomingEvents, relativeDay, formatClock } from "../logic/calendar.js";
import { capybara, icon } from "../ui/capybara.js";

const MAX_ATTENTION = 5;

const TILES = [
  { key: "overdue",     label: "Overdue",     icon: "overdue",    tone: "danger", href: "#/tasks?when=overdue" },
  { key: "due_today",   label: "Due today",   icon: "duetoday",   tone: "warn",   href: "#/tasks?when=today" },
  { key: "due_soon",    label: "Due soon",    icon: "duesoon",    tone: "warn",   href: "#/tasks?when=soon" },
  { key: "in_progress", label: "In progress", icon: "inprogress", tone: "info",   href: "#/tasks?status=in_progress" },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function dashboardView(container) {
  const body = h("div", { class: "dash-body" });
  container.append(body);

  function render() {
    const now = Date.now();
    const settings = getSettings();
    const stats = dashboardStats(state.tasks, { now, settings, isArchived: isTaskHidden, groupName: taskGroupName });

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
    // (two columns on a wide screen: the main things on the left, the overview on the right)
    const main = [classesSection(now), attentionSection(stats, now), progressSection(stats)].filter(Boolean);
    const side = [eventsSection(upcoming, now), weekSection(stats, settings)].filter(Boolean);
    body.append(hero(stats, upcoming, now), tiles(stats),
      h("div", { class: "dash-cols" }, h("div", { class: "dash-col" }, main), h("div", { class: "dash-col" }, side)));
  }

  render();
  // Check once a minute, so the class card moves on to tomorrow right after your last class ends (and nothing else is redrawn).
  const planKey = () => { const p = homeSchedule(state.courses, termNow(), Date.now()); return p ? `${p.when}${p.day}` : ""; };
  let lastKey = planKey();
  const tick = setInterval(() => { const key = planKey(); if (key !== lastKey) { lastKey = key; render(); } }, 60 * 1000);
  return { update: render, destroy() { clearInterval(tick); } };
}

/**
 * Today's classes until your last class of the day has finished, then tomorrow's.
 * Only the course description and the time are shown here; the rest is on the Schedule page.
 */
function classesSection(now) {
  const plan = homeSchedule(state.courses, termNow(), now);
  if (!plan) return null;
  const title = plan.when === "today" ? "Today's classes" : "Tomorrow's classes";
  return h("section", { class: "dash-section dash-box class-card" },
    sectionHead(icon("calendar", 32), title, dayName(plan.day)),
    plan.when === "tomorrow" && plan.noClassesToday ? h("p", { class: "muted small" }, "No classes today.") : null,
    plan.items.length
      ? h("ul", { class: "class-list" }, plan.items.map(({ course, slot }) =>
          h("li", { class: "class-row" }, h("strong", { class: "class-time" }, formatRange(slot)), h("span", {}, course.name))))
      : h("div", { class: "class-none" }, capybara("relaxing"), h("p", { class: "muted" }, plan.when === "tomorrow" ? "No classes tomorrow." : "No classes.")),
    h("p", { class: "dash-more" }, h("a", { href: "#/schedule" }, "Full schedule")));
}

/* ---------------------------------------------------------------- pieces */

function greeting(now) {
  const hour = new Date(now).getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const user = (state.fb && state.fb.auth.currentUser) || {};
  const first = (user.displayName || "").trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

/** A section heading that is easy to spot: a round icon, a big title, and a count on the right. */
function sectionHead(icon, title, count) {
  return h("div", { class: "dash-head-row" },
    h("span", { class: "dash-icon", "aria-hidden": "true" }, icon),
    h("h2", {}, title),
    count ? h("span", { class: "dash-count" }, count) : null);
}

function hero(stats, upcoming, now) {
  const c = stats.counts;
  const bits = [];
  if (c.overdue) bits.push(`${c.overdue} overdue`);
  if (c.due_today) bits.push(`${c.due_today} due today`);
  const line = bits.length ? `You have ${bits.join(" and ")}.` : "Nothing due today. Nice and calm.";
  const next = upcoming[0];
  // The capybara matches the day: busy when something is overdue, thinking about what to do first, or relaxing
  const pose = c.overdue ? "working" : c.due_today ? "thinking" : "relaxing";
  return h("section", { class: "hero-card" },
    h("div", { class: "hero-text" },
      h("h1", {}, greeting(now)),
      h("p", { class: "hero-line" }, line),
      h("p", { class: "muted dash-date" }, new Date(now).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })),
      next ? h("a", { class: "hero-next", href: `#/event/${encodeURIComponent(next.id)}` },
        h("span", { class: "cal-mark cal-mark-event", "aria-hidden": "true" }),
        h("span", {}, h("strong", {}, "Up next: "), next.title, " · ", relativeDay(next.startAt, now), next.allDay ? "" : ` ${formatClock(next.startAt)}`)) : null),
    h("div", { class: "hero-art" }, capybara(pose)));
}

function tiles(stats) {
  return h("div", { class: "stat-grid" }, TILES.map((tile) => {
    const n = stats.counts[tile.key];
    return h("a", { class: `stat-tile stat-${tile.tone}${n ? "" : " is-zero"}`, href: tile.href },
      icon(tile.icon, 30),
      h("span", { class: "stat-number" }, String(n)),
      h("span", { class: "stat-label" }, tile.label));
  }));
}

function eventsSection(upcoming, now) {
  if (!upcoming.length) return null;
  return h("section", { class: "dash-section dash-box" },
    sectionHead(icon("calendar", 32), "Coming up", plural(upcoming.length, "event")),
    h("ul", { class: "event-list" }, upcoming.map((e) => {
      const kind = eventKindName(e.kind);
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
    h("p", { class: "dash-more" }, h("a", { href: "#/calendar" }, "Open the calendar")));
}

function attentionSection(stats, now) {
  const shown = stats.attention.slice(0, MAX_ATTENTION);
  const more = stats.attention.length - shown.length;
  return h("section", { class: "dash-section dash-box" },
    sectionHead(icon("overdue", 32), "Needs attention", stats.attention.length ? plural(stats.attention.length, "task") : ""),
    shown.length
      ? h("div", { class: "task-list" }, shown.map((task) => buildTaskCard(task, now)))
      : h("div", { class: "caught-up" },
          capybara("cheering"),
          h("div", {}, h("strong", {}, "You're all caught up."),
            h("p", { class: "muted" }, "Nothing is overdue or due soon."))),
    h("p", { class: "dash-more" },
      more > 0 ? h("a", { href: "#/tasks" }, `See ${plural(more, "more task")}`) : null,
      more > 0 ? " · " : null,
      h("a", { href: "#/tasks" }, "All tasks")));
}

/** Academics and Organizations are kept apart, each with its own total and bars. */
function progressSection(stats) {
  const names = { academics: "Academics", organizations: "Organizations" };
  const blocks = ["academics", "organizations"].map((ws) => {
    const w = stats.byWorkspace[ws];
    if (!w.groups.length) return null;
    return h("div", { class: `progress-block progress-${ws}` },
      h("div", { class: "progress-block-head" },
        h("h3", {}, names[ws]),
        h("span", { class: "muted small" }, w.done === w.total ? `All ${w.total} done ✓` : `${w.done} of ${w.total} done`)),
      h("ul", { class: "progress-list" }, w.groups.map((g) => {
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
  }).filter(Boolean);
  if (!blocks.length) return null;
  return h("section", { class: "dash-section dash-box" }, sectionHead(icon("inprogress", 32), "Progress"), blocks);
}

function weekSection(stats, settings) {
  const w = stats.week;
  const part = (n, label) => h("li", { class: "week-part" }, h("strong", {}, String(n)), h("span", { class: "muted small" }, label));
  return h("section", { class: "dash-section dash-box" },
    sectionHead(icon("completed", 32), "Last 7 days", w.done ? plural(w.done, "task") : ""),
    w.done
      ? [
          h("ul", { class: "week-list" }, part(w.early, "early"), part(w.ontime, "on time"), part(w.late, "late"), part(w.nodeadline, "no deadline")),
          h("p", { class: "muted small" }, `“Early” means finished at least ${settings.earlyHours} hours before the deadline (change it under Settings, View).`),
        ]
      : h("p", { class: "muted" }, "Nothing finished in the last 7 days yet."),
    h("p", { class: "dash-more" }, h("a", { href: "#/reports" }, "See full reports")));
}
