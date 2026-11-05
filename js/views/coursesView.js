/* ==========================================================================
   COURSES (#/courses): everything about each course of the chosen semester:
   code, description, lecture/laboratory, units, professor, room and schedule.
   This and the Schedule are the only pages that show the details.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { state, termNow } from "../state.js";
import { inTerm, kindName, cleanSlots } from "../logic/schedule.js";
import { termPicker } from "../ui/termPicker.js";
import { scheduleSwitch } from "../ui/scheduleSwitch.js";
import { banner, meetingText } from "../ui/scheduleBits.js";
import { capybara } from "../ui/capybara.js";
import { sticker, peek, finale } from "../ui/stickers.js";

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
    clear(top).append(banner("Courses", term, "book"));
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
    body.append(h("div", { class: "course-grid" }, courses.map((c, i) => card(c, i))), finale("grad", "That is everything for this semester."));
  }

  render();
  return { update() { picker.update(); render(); } };
}

// Every third card gets a capybara peeking over its top edge, and the one before it a small sticker in the bottom corner.
const PEEKS = [["laptop", "left: 1.4rem"], ["music", "right: 5.5rem"], ["bag", "left: 40%"], ["pencil", "right: 5rem"], ["book", "left: 1.4rem"]];
const BITS = [["sprout", "--r: -10deg"], ["star", "--r: 12deg"], ["flower", "--r: 8deg"], ["heart", "--r: -8deg"], ["paw", "--r: 10deg"], ["sparkle", "--r: -12deg"]];

function card(course, i = 0) {
  const mode = i % 3 === 2 ? "peek" : i % 3 === 0 ? "bit" : "";
  const k = Math.floor(i / 3);
  const slots = cleanSlots(course.slots);
  const row = (label, value) => (value ? h("div", { class: "course-row" }, h("dt", {}, label), h("dd", {}, value)) : null);
  return h("article", { class: `card course-card${i % 2 ? " alt" : ""}${mode === "peek" ? " has-peek" : ""}${mode === "bit" ? " has-bit" : ""}` },
    mode === "peek" ? peek(PEEKS[k % PEEKS.length][0], PEEKS[k % PEEKS.length][1]) : null,
    mode === "bit" ? sticker(BITS[k % BITS.length][0], "stk-bit", BITS[k % BITS.length][1]) : null,
    h("div", { class: "course-head" },
      h("div", {},
        course.code ? h("p", { class: "course-code" }, course.code) : null,
        h("h2", {}, course.name)),
      h("a", { class: "btn btn-small", href: `#/course/${encodeURIComponent(course.id)}/edit`, "aria-label": `Edit ${course.name}` }, "Edit")),
    h("dl", { class: "course-info" },
      row("Type", kindName(course.kind)),
      row("Units", course.units == null ? "" : String(course.units)),
      row("Professor", course.professor),
      row("Room", course.room),
      h("div", { class: "course-row" }, h("dt", {}, "Schedule"),
        h("dd", {}, slots.length ? h("ul", { class: "course-slots" }, slots.map((s) => h("li", {}, meetingText(s)))) : "Not set")),
      course.archived ? h("div", { class: "course-row" }, h("dt", {}, "Status"), h("dd", {}, "Archived")) : null));
}
