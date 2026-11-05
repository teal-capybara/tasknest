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
import { sticker, peek, finale } from "../ui/stickers.js";

const HOUR_REM = 5;      // height of one hour in the timetable (keep in step with --hour below)
// Each course gets its own color from the theme, so classes are easy to tell apart.
const TINTS = [
  "color-mix(in srgb, var(--primary) 70%, var(--text))", "color-mix(in srgb, var(--accent) 65%, var(--text))",
  "color-mix(in srgb, var(--link) 70%, var(--surface))", "color-mix(in srgb, var(--primary) 50%, var(--accent))",
  "color-mix(in srgb, var(--accent) 55%, var(--link))", "color-mix(in srgb, var(--primary) 55%, var(--link))",
  "color-mix(in srgb, var(--link) 55%, var(--accent))", "color-mix(in srgb, var(--accent) 50%, var(--primary))",
];

export function scheduleView(container) {
  const picker = termPicker();
  const top = h("div", { class: "sched-top" });
  const body = h("div", { class: "sched-body" });
  container.append(h("div", { class: "page-head sched-head" }, scheduleSwitch("schedule")), top, picker.node, body);
  container.addEventListener("termchange", render);

  function render() {
    const term = termNow();
    clear(top).append(banner("Class Schedule", term, "planner"));
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
    body.append(phoneList(week, tint), h("div", { class: "tt-wrap" }, peek("book", "right: 2.5rem"), sticker("sparkle", "stk-corner", "left: 1.4rem; top: -.8rem; --r: -12deg"), timetable(week, tint)),
      finale("sleep", "That is your whole week. Rest up!"));
  }

  render();
  return { update() { picker.update(); render(); } };
}

/* ---- phone: one block per day ---- */
// Stickers on the day cards. They look scattered but follow a fixed pattern, so the page never reshuffles itself.
const DECOR = [
  { name: "star", style: "right: 1rem; --r: 12deg" },
  { name: "laptop", peek: true, style: "right: 2.2rem" },
  { name: "sprout", style: "right: 1.6rem; --r: -10deg" },
  { name: "music", peek: true, style: "right: 38%" },
  { name: "flower", style: "right: 1.1rem; --r: 14deg" },
  { name: "bag", peek: true, style: "right: 1.4rem" },
  { name: "heart", style: "right: 2rem; --r: -8deg" },
  { name: "pencil", peek: true, style: "right: 30%" },
];
function decorFor(i) {
  const d = DECOR[i % DECOR.length];
  if (i === 0 && d.peek) return null;    // nothing peeks over the very first card (the semester buttons are right above it)
  return d.peek ? peek(d.name, d.style) : sticker(d.name, "stk-corner", d.style);
}

function phoneList(week, tint) {
  const today = new Date().getDay();
  return h("ol", { class: "sched-list" }, week.map(({ day, items }, i) =>
    h("li", { class: `sched-day${i % 2 ? " alt" : ""}${day === today ? " is-today" : ""}${DECOR[i % DECOR.length].peek ? " has-peek" : ""}` },
      decorFor(i),
      // Left: the day (MON, TUE...). Right: that day's classes, each with a thin theme-colored bar.
      h("h2", { class: "sched-dayname", "aria-label": dayName(day) }, h("span", { "aria-hidden": "true" }, dayShort(day)),
        day === today ? h("span", { class: "sched-today" }, "Today") : null),
      h("ul", { class: "sched-items" }, items.map(({ course, slot }) =>
        // Left: course name, then professor.  Right: time, then room.  A long name wraps on the left and the time stays put.
        h("li", { class: "sched-item", style: `--tint: ${tint.get(course.id)}` },
          h("div", { class: "sched-what" },
            h("strong", { class: "sched-name" }, course.name),
            course.professor ? h("span", { class: "sched-prof" }, course.professor) : null),
          h("div", { class: "sched-when" },
            h("strong", { class: "sched-time" }, formatRange(slot)),
            course.room ? h("span", { class: "sched-room" }, course.room) : null)))))));
}

/* ---- computer: weekly timetable ---- */
function timetable(week, tint) {
  const { from, to } = timetableBounds(week);
  const hours = to - from;
  const labels = [];
  for (let hr = from; hr < to; hr++) labels.push(h("span", { class: "tt-hour", style: `top: ${(hr - from) * HOUR_REM}rem` }, formatTime(`${String(hr).padStart(2, "0")}:00`)));

  const nowDate = new Date(), todayId = nowDate.getDay();
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  const columns = week.map(({ day, items }) =>
    h("div", { class: `tt-col${day === todayId ? " is-today" : ""}` },
      h("div", { class: "tt-dayhead" }, h("span", { class: "tt-daypill" }, dayName(day))),
      h("div", { class: "tt-track", style: `height: ${hours * HOUR_REM}rem` },
        day === todayId && nowMin >= from * 60 && nowMin <= to * 60
          ? h("div", { class: "tt-now", style: `top: ${((nowMin - from * 60) / 60) * HOUR_REM}rem`, "aria-hidden": "true" }) : null,
        ...items.map(({ course, slot }) => {
        const a = toMinutes(slot.start) - from * 60, len = toMinutes(slot.end) - toMinutes(slot.start);
        return h("div", { class: "tt-block", style: `top: ${(a / 60) * HOUR_REM}rem; height: ${(len / 60) * HOUR_REM}rem; --tint: ${tint.get(course.id)}` },
          h("strong", { class: "tt-name" }, course.name),
          h("span", { class: "tt-time" }, formatRange(slot)),
          course.professor ? h("span", { class: "tt-prof" }, course.professor) : null,
          course.room ? h("span", { class: "tt-room" }, course.room) : null);
      }))));

  return h("div", { class: "sched-table", style: `--cols: ${week.length}; --hour: ${HOUR_REM}rem` },
    h("div", { class: "tt-times" }, h("div", { class: "tt-dayhead", "aria-hidden": "true" }, " "), h("div", { class: "tt-track", style: `height: ${hours * HOUR_REM}rem` }, labels)),
    columns);
}
