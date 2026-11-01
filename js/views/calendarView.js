/* ==========================================================================
   CALENDAR: your schedule events and task deadlines in one place.

   Three views (the buttons at the top):
     Month  a grid of the month. Tap a day and a floating window opens with
            everything on that day (and the private capybara diary, see
            js/ui/dayWindow.js).
     Week   the 7 days of a week, each with its items.
     Day    one day.
   Use the arrows to move, "Today" to jump back.

   On a wide screen the month sits beside a side column: Today, Upcoming events
   and a little quote. Under the month: how this week's tasks are going.

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
import { itemRow } from "../ui/calendarItems.js";
import { openDayWindow } from "../ui/dayWindow.js";
import { WEEK_START } from "../constants.js";
import { state, isTaskArchived, eventGroupName } from "../state.js";
import {
  dayKey, parseDayKey, noonOf, addDays, addMonths, weekDays, monthGrid, weekdayNames,
  monthLabel, dayLabel, weekLabel, formatClock, itemsByDay, upcomingEvents,
} from "../logic/calendar.js";

const VIEWS = [{ id: "month", name: "Month" }, { id: "week", name: "Week" }, { id: "day", name: "Day" }];

const QUOTES = [
  "Small steps lead to big progress.",
  "One thing at a time. You've got this.",
  "Rest is part of the plan, too.",
  "Done is better than perfect.",
  "Future you will be glad you started today.",
  "Be kind to yourself. Keep going.",
  "A little every day adds up.",
];

// Remembered while you move between screens (reset when you close the app).
let memory = { view: "month", cursor: noonOf(Date.now()) };

export function calendarView(container, params, query = {}) {
  if (VIEWS.some((v) => v.id === query.view)) memory.view = query.view;
  const fromQuery = parseDayKey(query.date);
  if (fromQuery) memory.cursor = fromQuery;

  let dayWindow = null;   // the floating window, while it is open

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
  const side = h("aside", { class: "cal-side", "aria-label": "Today and coming up" });

  container.append(
    h("div", { class: "cal-banner" },
      h("div", { class: "cal-banner-text" },
        h("h1", {}, "Calendar"),
        h("p", { class: "cal-tagline" }, "Plan ahead, stay on track!"),
        addEvent),
      h("div", { class: "cal-banner-art" }, capybara("cloud"))),
    h("div", { class: "seg", role: "group", "aria-label": "Calendar view" }, viewButtons),
    h("div", { class: "cal-nav" }, prev, label, next, todayButton),
    h("div", { class: "cal-layout" }, body, side));

  function move(direction) {
    const view = memory.view;
    memory.cursor = view === "month" ? addMonths(memory.cursor, direction) : addDays(memory.cursor, direction * (view === "week" ? 7 : 1));
    render();
  }

  const allItems = () => itemsByDay(state.events, state.tasks, { isTaskArchived });

  /* ---------- drawing ---------- */
  function render() {
    const view = memory.view;
    const cursor = memory.cursor;
    const items = allItems();
    const now = Date.now();

    for (const b of viewButtons) b.setAttribute("aria-pressed", String(b.dataset.view === view));
    const unit = view === "month" ? "month" : view === "week" ? "week" : "day";
    prev.setAttribute("aria-label", `Previous ${unit}`);
    next.setAttribute("aria-label", `Next ${unit}`);
    const addHref = `#/event/new?date=${dayKey(cursor)}`;
    addEvent.setAttribute("href", addHref);
    // the big floating / sidebar button follows the day you are looking at
    document.querySelectorAll("[data-add-task]").forEach((a) => a.setAttribute("href", addHref));

    clear(body);
    if (view === "month") {
      label.textContent = monthLabel(cursor);
      body.append(monthGridEl(cursor, items), weekGlance(now));
    } else if (view === "week") {
      const days = weekDays(cursor);
      label.textContent = weekLabel(days);
      body.append(h("div", { class: "cal-week" }, days.map((d) => dayBlock(d, items, now, { compact: true }))), weekGlance(now));
    } else {
      label.textContent = dayLabel(cursor);
      body.append(dayBlock(cursor, items, now, { showHeading: false }), weekGlance(now));
    }
    renderSide(items, now);
    if (dayWindow) dayWindow.refresh();
  }

  /* ---------- the month grid ---------- */
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
        const mark = (i) => h("span", { class: i.type === "event" ? "cal-mark cal-mark-event" : "cal-mark cal-mark-task", "aria-hidden": "true" });
        // phones: small hearts and flowers; wide screens: little labels with the title
        const markers = list.slice(0, 3).map(mark);
        const chips = list.slice(0, 2).map((i) => h("span", { class: `cal-chip ${i.type === "event" ? "is-event" : "is-task"}` }, mark(i), h("span", { class: "cal-chip-text" }, i.type === "event" ? i.event.title : i.task.title)));
        cells.push(h("button", {
          type: "button",
          class: `cal-day${date.getMonth() !== cursor.getMonth() ? " is-other" : ""}${key === todayKey ? " is-today" : ""}${key === selectedKey ? " is-selected" : ""}`,
          dataset: { day: key },
          "aria-pressed": String(key === selectedKey),
          "aria-haspopup": "dialog",
          "aria-label": `${dayLabel(date)}${key === todayKey ? " (today)" : ""}: ${parts.length ? parts.join(", ") : "nothing scheduled"}`,
          onClick: () => openDay(date),
        }, h("span", { class: "cal-num" }, String(date.getDate())),
           h("span", { class: "cal-marks" }, markers, list.length > 3 ? h("span", { class: "cal-more", "aria-hidden": "true" }, "+") : null),
           h("span", { class: "cal-chips" }, chips, list.length > 2 ? h("span", { class: "cal-chip-more" }, `+${list.length - 2} more`) : null)));
      }
    }
    return h("div", { class: "cal-grid" }, head, cells);
  }

  /** Tapping a day: highlight it and open the floating window. */
  function openDay(date) {
    memory.cursor = date;
    const key = dayKey(date);
    render();
    if (dayWindow) dayWindow.close();
    const win = openDayWindow({
      date,
      getItems: () => allItems().get(key) || [],
      // (closing is reported a moment later, so only forget THIS window, not a newer one)
      onClose: () => {
        if (dayWindow !== win) return;
        dayWindow = null;
        const cell = body.querySelector(`[data-day="${key}"]`);
        if (cell) cell.focus();
      },
    });
    dayWindow = win;
  }

  /* ---------- how this week's tasks are going ---------- */
  function weekGlance(now) {
    const keys = new Set(weekDays(new Date(now)).map((d) => dayKey(d)));
    const tasks = state.tasks.filter((t) => t.dueAt != null && !isTaskArchived(t) && keys.has(dayKey(t.dueAt)));
    const done = tasks.filter((t) => t.status === "done").length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return h("section", { class: "cal-glance" },
      h("div", { class: "cal-glance-text" },
        h("h3", {}, "Your week at a glance"),
        h("p", { class: "muted" }, tasks.length ? `You've finished ${done} of ${tasks.length} tasks due this week.` : "No tasks are due this week.")),
      tasks.length ? h("div", { class: "cal-glance-bar" },
        h("div", { class: "bar", role: "progressbar", "aria-label": "Tasks done this week", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct) },
          h("span", { class: "bar-fill", style: `width: ${pct}%` })),
        h("strong", {}, `${pct}%`)) : null);
  }

  /* ---------- the side column (wide screens) ---------- */
  function renderSide(items, now) {
    clear(side);
    const todayItems = items.get(dayKey(now)) || [];
    const upcoming = upcomingEvents(state.events, now, 30, 3);
    const quote = QUOTES[Math.floor(now / 86400000) % QUOTES.length];
    side.append(
      h("section", { class: "side-card" },
        h("h3", {}, h("span", { class: "side-star", "aria-hidden": "true" }, "✦"), "Today"),
        h("p", { class: "muted" }, new Date(now).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })),
        todayItems.length
          ? h("ul", { class: "cal-items" }, todayItems.slice(0, 3).map((i) => itemRow(i)))
          : h("div", { class: "side-empty" }, h("p", {}, "Nothing scheduled today!"), capybara("sit")),
        h("a", { class: "btn btn-primary side-wide", href: `#/event/new?date=${dayKey(now)}` }, "+ Add event")),
      upcoming.length ? h("section", { class: "side-card" },
        h("h3", {}, "Upcoming events", h("a", { class: "side-link", href: "#/dashboard" }, "See all")),
        h("ul", { class: "side-events" }, upcoming.map((e) => {
          const d = new Date(e.startAt);
          const group = eventGroupName(e);
          return h("li", {}, h("a", { class: "side-event", href: `#/event/${encodeURIComponent(e.id)}` },
            h("span", { class: "side-date" }, h("small", {}, d.toLocaleDateString([], { month: "short" }).toUpperCase()), h("strong", {}, String(d.getDate()))),
            h("span", { class: "side-event-text" }, h("strong", {}, e.title), h("span", { class: "muted small" }, `${e.allDay ? "All day" : formatClock(e.startAt)}${group ? ` · ${group}` : ""}`))));
        }))) : null,
      h("section", { class: "side-card side-quote" }, h("p", {}, `“${quote}”`)));
  }

  /* ---------- week / day lists ---------- */
  function dayBlock(date, items, now, { compact = false, showHeading = true } = {}) {
    const key = dayKey(date);
    const list = items.get(key) || [];
    const isToday = key === dayKey(now);
    return h("section", { class: `cal-agenda${compact ? " is-compact" : ""}${isToday ? " is-today" : ""}` },
      showHeading ? h("h3", { class: "cal-agenda-title" },
        h("a", { href: `#/calendar?view=day&date=${key}` }, dayLabel(date)),
        isToday ? h("span", { class: "chip" }, "Today") : null) : null,
      list.length
        ? h("ul", { class: "cal-items" }, list.map((item) => itemRow(item)))
        : compact
          ? h("p", { class: "muted cal-empty" }, "Nothing scheduled.")
          : h("div", { class: "cal-empty-art" }, capybara("sit"), h("p", { class: "muted" }, "Nothing scheduled. A free day!")),
      compact ? null : h("p", {}, h("a", { class: "btn btn-small", href: `#/event/new?date=${key}` }, "Add event on this day")));
  }

  render();
  return {
    update: render,
    destroy() { if (dayWindow) dayWindow.close(); },
  };
}
