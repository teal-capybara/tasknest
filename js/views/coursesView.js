/* ==========================================================================
   COURSES (#/courses): everything about each course of the chosen semester:
   code, description, lecture/laboratory, units, professor, room and schedule.
   This and the Schedule are the only pages that show the details.
   Each course has its own color, the same one it has on the Schedule.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { state, termNow } from "../state.js";
import { inTerm, kindName, cleanSlots } from "../logic/schedule.js";
import { termPicker } from "../ui/termPicker.js";
import { scheduleSwitch } from "../ui/scheduleSwitch.js";
import { banner, meetingText, courseColors, termStats, statTiles } from "../ui/scheduleBits.js";
import { capybara, icon } from "../ui/capybara.js";

export function coursesView(container) {
  let showArchived = false;
  const picker = termPicker();
  const archivedBox = h("input", { type: "checkbox", onChange: (e) => { showArchived = e.target.checked; render(); } });
  const top = h("div", { class: "sched-top" });
  const body = h("div", { class: "sched-body" });
  container.append(
    h("div", { class: "page-head sched-head" }, h("a", { class: "btn btn-primary", href: "#/course/new" }, "＋ Add course"), scheduleSwitch("courses")),
    top, picker.node, h("label", { class: "check" }, archivedBox, h("span", {}, "Show archived courses")), body);
  container.addEventListener("termchange", render);

  function render() {
    const term = termNow();
    clear(top).append(banner("Courses", term));
    const color = courseColors(state.courses);
    const courses = state.courses.filter((c) => (showArchived || !c.archived) && inTerm(c, term))
      .sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name, undefined, { sensitivity: "base" }));
    clear(body);
    if (!courses.length) {
      body.append(h("div", { class: "empty card" }, capybara("relaxing"),
        h("h2", {}, "No courses in this semester"),
        h("p", { class: "muted" }, "Add a course, or switch to another semester above."),
        h("a", { class: "btn btn-primary", href: "#/course/new" }, "Add a course")));
      return;
    }
    body.append(statTiles(termStats(state.courses, term)), h("div", { class: "course-grid" }, courses.map((c) => card(c, color.get(c.id)))));
  }

  render();
  return { update() { picker.update(); render(); } };
}

function card(course, colorStyle) {
  const slots = cleanSlots(course.slots);
  const fact = (iconName, label, value) => (value ? h("li", { class: "course-fact" },
    h("span", { class: "course-fact-icon", "aria-hidden": "true" }, icon(iconName, 22)),
    h("span", { class: "course-fact-text" }, h("span", { class: "course-fact-label" }, label), h("strong", {}, value))) : null);
  return h("article", { class: `course-card${course.archived ? " is-archived" : ""}`, style: colorStyle },
    h("header", { class: "course-top" },
      h("div", { class: "course-toprow" },
        h("div", { class: "course-badges" },
          course.code ? h("span", { class: "course-code" }, course.code) : null,
          h("span", { class: "course-pill" }, kindName(course.kind) || "Lecture"),
          course.units != null ? h("span", { class: "course-pill" }, `${course.units} ${course.units === 1 ? "unit" : "units"}`) : null,
          course.archived ? h("span", { class: "course-pill" }, "Archived") : null),
        h("a", { class: "btn btn-small course-edit", href: `#/course/${encodeURIComponent(course.id)}/edit`, "aria-label": `Edit ${course.name}` }, "Edit")),
      h("h2", { class: "course-title" }, course.name)),
    h("ul", { class: "course-facts" },
      fact("profile", "Professor", course.professor), fact("home", "Room", course.room)),
    h("div", { class: "course-when" },
      h("span", { class: "course-fact-label" }, "Schedule"),
      slots.length
        ? h("ul", { class: "course-slots" }, slots.map((s) => h("li", { class: "course-slot" }, meetingText(s))))
        : h("span", { class: "muted small" }, "Not set")));
}
