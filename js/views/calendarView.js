/* ==========================================================================
   CALENDAR: your schedule events and task deadlines in one place.

   Three views (the buttons at the top):
     Month  a grid of the month. Tap a day to see what is on it, listed below the grid.
     Week   the 7 days of a week, each with its items.
     Day    one day.
   Use the arrows to move, "Today" to jump back.

   What is shown (see js/logic/calendar.js):
     events    exams, meetings, classes (tap to open; add them with "Add event")
     deadlines your tasks, on the day they are due (tasks without a deadline
               and archived tasks are not shown)
   Shapes tell them apart as well as color: events are hearts, deadlines are
   flowers. Both use your theme's colors.

   The view you were on is remembered while the app is open. Addresses like
   #/calendar?view=week&date=2026-11-03 open a specific view.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { capybara } from "../ui/capybara.js";
import { WEEK_START } from "../constants.js";
import { state, isTaskArchived, eventGroupName, taskGroupName, eventKindName } from "../state.js";
import {
  dayKey, parseDayKey, noonOf, addDays, addMonths, weekDays, monthGrid, weekdayNames,
  monthLabel, dayLabel, weekLabel, formatClock, itemsByDay,
} from "../logic/calendar.js";

const VIEWS = [{ id: "month", name: "Month" }, { id: "week", name: "Week" }, { id: "day", name: "Day" }];
const kindName = eventKindName;

// Remembered while you move between screens (reset when you close the app).
let memory = { view: "month", cursor: noonOf(Date.now()) };

export function calendarView(container, params, query = {}) {
  if (VIEWS.some((v) => v.id === query.view)) memory.view = query.view;
  const fromQuery = parseDayKey(query.date);
  if (fromQuery) memory.cursor = fromQuery;

  /* ---------- controls (built once; only the body is redrawn) ---------- */
  const viewButtons = VIEWS.map((v) => h("button", {
    type: "button", class: "seg-btn", dataset: { view: v.id },
    onClick: () => { memory.view = v.id; render(); },
  }, v.name));
  const label = h("h2", { class: "cal-label", "aria-live": "polite" });
  const prev = h("button", { type: "button", class: "btn cal-arrow", onClick: () => move(-1) }, "‹");
  const next = h("button", { type: "button", class: "btn cal-arrow", onClick: () => move(1) }, "›");
  const todayButton = h("button", { type: "button", class: "btn", onClick: () => { memory.cursor = noonOf(Date.now()); render(); } }, "Today");
  const addEvent = h("a", { class: "btn btn-primary", href: "#/event/new" }, "Add event");
  const body = h("div", { class: "cal-body" });

  container.append(
    h("div", { class: "cal-head" },
      h("div", { class: "page-head" }, h("h1", {}, "Calendar"), addEvent),
      h("div", { class: "cal-peek" }, capybara("peek"))),
    h("div", { class: "seg", role: "group", "aria-label": "Calendar view" }, viewButtons),
    h("div", { class: "cal-nav" }, prev, label, next, todayButton),
    body);

  function move(direction) {
    const view = memory.view;
    memory.cursor = view === "month" ? addMonths(memory.cursor, direction) : addDays(memory.cursor, direction * (view === "week" ? 7 : 1));
    render();
  }

  /* ---------- drawing ---------- */
  function render() {
    const view = memory.view;
    const cursor = memory.cursor;
    const items = itemsByDay(state.events, state.tasks, { isTaskArchived });
    const now = Date.now();

    for (const b of viewButtons) b.setAttribute("aria-pressed", String(b.dataset.view === view));
    const unit = view === "month" ? "month" : view === "week" ? "week" : "day";
    prev.setAttribute("aria-label", `Previous ${unit}`);
    next.setAttribute("aria-label", `Next ${unit}`);
    addEvent.setAttribute("href", `#/event/new?date=${dayKey(cursor)}`);
    // the big floating / sidebar button follows the day you are looking at
    document.querySelectorAll("[data-add-task]").forEach((a) => a.setAttribute("href", `#/event/new?date=${dayKey(cursor)}`));

    clear(body);
    if (view === "month") {
      label.textContent = monthLabel(cursor);
      body.append(monthGridEl(cursor, items), selectedDay(cursor, items, now));
    } else if (view === "week") {
      const days = weekDays(cursor);
      label.textContent = weekLabel(days);
      body.append(h("div", { class: "cal-week" }, days.map((d) => dayBlock(d, items, now, { compact: true }))));
    } else {
      label.textContent = dayLabel(cursor);
      body.append(dayBlock(cursor, items, now, { showHeading: false }));
    }
  }

  function monthGridEl(cursor, items) {
    const todayKey = dayKey(Date.now()), selectedKey = dayKey(cursor);
    const head = weekdayNames(WEEK_START, "short").map((n) => h("div", { class: "cal-dow", "aria-hidden": "true" }, n));
    const cells = [];
    for (const week of monthGrid(cursor)) {
      for (const date of week) {
        const key = dayKey(date);
        const list = items.get(key) || [];
        const events = list.filter((i) => i.type === "event"), tasks = list.filter((i) => i.type === "task");
        const parts = [];
        if (events.length) parts.push(`${events.length} event${events.length === 1 ? "" : "s"}`);
        if (tasks.length) parts.push(`${tasks.length} task${tasks.length === 1 ? "" : "s"} due`);
        const markers = list.slice(0, 3).map((i) => h("span", {
          class: i.type === "event" ? "cal-mark cal-mark-event" : "cal-mark cal-mark-task", "aria-hidden": "true",
        }));
        cells.push(h("button", {
          type: "button",
          class: `cal-day${date.getMonth() !== cursor.getMonth() ? " is-other" : ""}${key === todayKey ? " is-today" : ""}${key === selectedKey ? " is-selected" : ""}`,
          dataset: { day: key },
          "aria-pressed": String(key === selectedKey),
          "aria-label": `${dayLabel(date)}${key === todayKey ? " (today)" : ""}: ${parts.length ? parts.join(", ") : "nothing scheduled"}`,
          onClick: () => { memory.cursor = date; render(); },
        }, h("span", { class: "cal-num" }, String(date.getDate())),
           h("span", { class: "cal-marks" }, markers, list.length > 3 ? h("span", { class: "cal-more", "aria-hidden": "true" }, "+") : null)));
      }
    }
    return h("div", { class: "cal-grid" }, head, cells);
  }

  /** The list under the month grid for the chosen day. */
  function selectedDay(cursor, items, now) {
    return h("section", { class: "cal-selected" }, dayBlock(cursor, items, now, { showHeading: true, withAdd: true }));
  }

  /** One day: a heading, then everything scheduled on it. */
  function dayBlock(date, items, now, { compact = false, showHeading = true, withAdd = false } = {}) {
    const key = dayKey(date);
    const list = items.get(key) || [];
    const isToday = key === dayKey(now);
    return h("section", { class: `cal-agenda${compact ? " is-compact" : ""}${isToday ? " is-today" : ""}` },
      showHeading ? h("h3", { class: "cal-agenda-title" },
        compact ? h("a", { href: `#/calendar?view=day&date=${key}` }, dayLabel(date)) : dayLabel(date),
        isToday ? h("span", { class: "chip" }, "Today") : null) : null,
      list.length
        ? h("ul", { class: "cal-items" }, list.map((item) => itemRow(item)))
        : compact
          ? h("p", { class: "muted cal-empty" }, "Nothing scheduled.")
          : h("div", { class: "cal-empty-art" }, capybara("sit"), h("p", { class: "muted" }, "Nothing scheduled. A free day!")),
      withAdd || !compact ? h("p", {}, h("a", { class: "btn btn-small", href: `#/event/new?date=${key}` }, "Add event on this day")) : null);
  }

  function itemRow(item) {
    if (item.type === "event") {
      const e = item.event;
      const group = eventGroupName(e);
      return h("li", { class: `cal-item cal-item-event kind-${e.kind}` },
        h("a", { class: "cal-link", href: `#/event/${encodeURIComponent(e.id)}` },
          h("span", { class: "cal-time" }, e.allDay ? "All day" : formatClock(e.startAt)),
          h("span", { class: "cal-main" },
            h("span", { class: "cal-title" }, h("span", { class: "cal-mark cal-mark-event", "aria-hidden": "true" }), e.title),
            h("span", { class: "cal-meta" },
              h("span", { class: `chip chip-kind kind-${e.kind}` }, kindName(e.kind)),
              group ? h("span", { class: "muted small" }, group) : null,
              e.location ? h("span", { class: "muted small" }, h("span", { "aria-hidden": "true" }, "📍 "), e.location) : null))));
    }
    const t = item.task;
    const done = t.status === "done";
    return h("li", { class: `cal-item cal-item-task${done ? " is-done" : ""}` },
      h("a", { class: "cal-link", href: `#/task/${encodeURIComponent(t.id)}` },
        h("span", { class: "cal-time" }, formatClock(t.dueAt)),
        h("span", { class: "cal-main" },
          h("span", { class: "cal-title" }, h("span", { class: "cal-mark cal-mark-task", "aria-hidden": "true" }), t.title),
          h("span", { class: "cal-meta" },
            h("span", { class: "chip" }, done ? "✓ Task done" : "Task due"),
            h("span", { class: "muted small" }, taskGroupName(t))))));
  }

  render();
  return { update: render };
}
