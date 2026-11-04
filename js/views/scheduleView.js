/* ==========================================================================
   SCHEDULE (#/schedule): your classes for the chosen school year and semester.
   Phone: a card for each day, one colored row per class.
   Computer: a weekly timetable (every school day, free days too) with a side
   panel for today's classes and the week in numbers.
   Both are drawn; css shows the right one for the screen width.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { state, termNow } from "../state.js";
import { weekOf, classesOn, timetableBounds, toMinutes, formatRange, formatTime, dayName, DAYS } from "../logic/schedule.js";
import { termPicker } from "../ui/termPicker.js";
import { scheduleSwitch } from "../ui/scheduleSwitch.js";
import { banner, courseColors, termStats, statTiles } from "../ui/scheduleBits.js";
import { capybara } from "../ui/capybara.js";

const HOUR_REM = 5;      // height of one hour in the timetable (keep in step with --hour below)

export function scheduleView(container) {
  const picker = termPicker();
  const top = h("div", { class: "sched-top" });
  const body = h("div", { class: "sched-body" });
  container.append(h("div", { class: "page-head sched-head" }, scheduleSwitch("schedule")), top, picker.node, body);
  container.addEventListener("termchange", render);

  function render() {
    const term = termNow();
    clear(top).append(banner("Class Schedule", term));
    const week = weekOf(state.courses, term);
    clear(body);
    if (!week.length) {
      body.append(h("div", { class: "empty card" }, capybara("relaxing"),
        h("h2", {}, "No classes yet"),
        h("p", { class: "muted" }, "Add your courses with their days and times and your schedule appears here."),
        h("a", { class: "btn btn-primary", href: "#/course/new" }, "Add a course")));
      return;
    }
    const color = courseColors(state.courses);
    body.append(statTiles(termStats(state.courses, term)),
      phoneList(week, color),
      h("div", { class: "sched-desktop" }, todayStrip(term, color), timetable(week, color, term)));
  }

  render();
  return { update() { picker.update(); render(); } };
}

/* ---- phone: one card per day, one colored row per class ---- */
function phoneList(week, color) {
  const today = new Date().getDay();
  return h("ol", { class: "sched-list" }, week.map(({ day, items }) =>
    h("li", { class: `sched-day${day === today ? " is-today" : ""}` },
      h("h2", { class: "sched-dayname" }, dayName(day), day === today ? h("span", { class: "chip" }, "Today") : null,
        h("span", { class: "sched-daycount" }, `${items.length} ${items.length === 1 ? "class" : "classes"}`)),
      h("ul", { class: "sched-items" }, items.map(({ course, slot }) =>
        // Left: course name, then professor.  Right: time, then room.  A long name wraps on the left; the time stays put.
        h("li", { class: "sched-item", style: color.get(course.id) },
          h("div", { class: "sched-what" },
            h("strong", { class: "sched-name" }, course.name),
            course.professor ? h("span", { class: "sched-prof" }, course.professor) : null),
          h("div", { class: "sched-when" },
            h("strong", { class: "sched-time" }, formatRange(slot)),
            course.room ? h("span", { class: "sched-room" }, course.room) : null)))))));
}

/* ---- computer: weekly timetable ---- */
function timetable(week, color, term) {
  const { from, to } = timetableBounds(week);
  const hours = to - from;
  const labels = [];
  for (let hr = from; hr < to; hr++) labels.push(h("span", { class: "tt-hour", style: `top: ${(hr - from) * HOUR_REM}rem` }, formatTime(`${String(hr).padStart(2, "0")}:00`)));

  // Every school day Monday to Saturday, plus Sunday when it has classes. Days with no classes show as a free day.
  const hasSunday = week.some((d) => d.day === 0);
  const days = DAYS.filter((d) => d.id !== 0 || hasSunday);
  const nowDate = new Date(), todayId = nowDate.getDay();
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();

  const columns = days.map(({ id }) => {
    const items = classesOn(state.courses, id, term);
    return h("div", { class: `tt-col${id === todayId ? " is-today" : ""}` },
      h("div", { class: "tt-dayhead" }, h("span", { class: "tt-daypill" }, dayName(id))),
      h("div", { class: "tt-track", style: `height: ${hours * HOUR_REM}rem` },
        id === todayId && nowMin >= from * 60 && nowMin <= to * 60
          ? h("div", { class: "tt-now", style: `top: ${((nowMin - from * 60) / 60) * HOUR_REM}rem`, "aria-hidden": "true" }) : null,
        items.length ? null : h("div", { class: "tt-free" }, capybara("relaxing"), h("span", {}, "Free day")),
        ...items.map(({ course, slot }) => {
          const a = toMinutes(slot.start) - from * 60, len = toMinutes(slot.end) - toMinutes(slot.start);
          return h("div", { class: "tt-block", style: `top: ${(a / 60) * HOUR_REM}rem; height: ${(len / 60) * HOUR_REM}rem; ${color.get(course.id)}` },
            h("strong", { class: "tt-name" }, course.name),
            h("span", { class: "tt-time" }, formatRange(slot)),
            course.professor ? h("span", { class: "tt-prof" }, course.professor) : null,
            course.room ? h("span", { class: "tt-room" }, course.room) : null);
        })));
  });

  return h("div", { class: "sched-table", style: `--cols: ${days.length}; --hour: ${HOUR_REM}rem` },
    h("div", { class: "tt-times" }, h("div", { class: "tt-dayhead", "aria-hidden": "true" }, " "), h("div", { class: "tt-track", style: `height: ${hours * HOUR_REM}rem` }, labels)),
    columns);
}

/* ---- computer: today's classes in a strip above the timetable ---- */
function todayStrip(term, color) {
  const today = new Date().getDay();
  const items = classesOn(state.courses, today, term);
  return h("section", { class: "sched-today", "aria-label": "Today" },
    h("h2", {}, `Today · ${dayName(today)}`),
    items.length
      ? h("ul", { class: "today-classes" }, items.map(({ course, slot }) =>
          h("li", { class: "today-class", style: color.get(course.id) }, h("strong", {}, course.name), h("span", {}, formatRange(slot)), course.room ? h("span", { class: "small" }, course.room) : null)))
      : h("div", { class: "class-none" }, capybara("relaxing"), h("p", { class: "muted" }, "No classes today. Enjoy your free day!")));
}
