/* ==========================================================================
   SCHEDULE (#/schedule): your classes for the chosen school year and semester.
   Phone: a list of days. Computer: a weekly timetable (days across, hours down).
   Both are drawn; css shows the right one for the screen width.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { state, termNow } from "../state.js";
import { weekOf, timetableBounds, toMinutes, formatRange, formatTime, dayName, dayShort } from "../logic/schedule.js";
import { termPicker } from "../ui/termPicker.js";
import { scheduleSwitch } from "../ui/scheduleSwitch.js";
import { banner } from "../ui/scheduleBits.js";
import { capybara } from "../ui/capybara.js";

const HOUR_REM = 4;      // height of one hour in the timetable
const TINTS = ["var(--primary)", "var(--mark-event)", "var(--mark-task)", "var(--link)"];

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
    const tint = new Map();
    state.courses.forEach((c, i) => tint.set(c.id, TINTS[i % TINTS.length]));
    body.append(phoneList(week), timetable(week, tint));
  }

  render();
  return { update() { picker.update(); render(); } };
}

/* ---- phone: one block per day ---- */
function phoneList(week) {
  return h("ol", { class: "sched-list" }, week.map(({ day, items }, i) =>
    h("li", { class: `sched-day${i % 2 ? " alt" : ""}` },
      h("h2", { class: "sched-dayname", "aria-label": dayName(day) }, dayShort(day).toUpperCase()),
      h("ul", { class: "sched-items" }, items.map(({ course, slot }) =>
        h("li", { class: "sched-item" },
          h("div", { class: "sched-what" },
            h("strong", { class: "sched-name" }, course.name),
            course.professor ? h("span", { class: "muted small" }, course.professor) : null),
          h("div", { class: "sched-when" }, h("strong", {}, formatRange(slot)), course.room ? h("span", { class: "muted small" }, course.room) : null)))))));
}

/* ---- computer: weekly timetable ---- */
function timetable(week, tint) {
  const { from, to } = timetableBounds(week);
  const hours = to - from;
  const labels = [];
  for (let hr = from; hr < to; hr++) labels.push(h("span", { class: "tt-hour", style: `top: ${(hr - from) * HOUR_REM}rem` }, formatTime(`${String(hr).padStart(2, "0")}:00`)));

  const columns = week.map(({ day, items }) =>
    h("div", { class: "tt-col" },
      h("div", { class: "tt-dayhead" }, dayName(day)),
      h("div", { class: "tt-track", style: `height: ${hours * HOUR_REM}rem` }, items.map(({ course, slot }) => {
        const a = toMinutes(slot.start) - from * 60, len = toMinutes(slot.end) - toMinutes(slot.start);
        return h("div", { class: "tt-block", style: `top: ${(a / 60) * HOUR_REM}rem; height: ${(len / 60) * HOUR_REM}rem; --tint: ${tint.get(course.id)}` },
          h("strong", { class: "tt-name" }, course.name),
          h("span", { class: "tt-time" }, formatRange(slot)),
          course.professor ? h("span", { class: "tt-prof" }, course.professor) : null,
          course.room ? h("span", { class: "tt-room" }, course.room) : null);
      }))));

  return h("div", { class: "sched-table", style: `--cols: ${week.length}` },
    h("div", { class: "tt-times" }, h("div", { class: "tt-dayhead", "aria-hidden": "true" }, " "), h("div", { class: "tt-track", style: `height: ${hours * HOUR_REM}rem` }, labels)),
    columns);
}
