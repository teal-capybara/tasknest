/* ==========================================================================
   COURSE FORM (#/course/new and #/course/:id/edit)

   Course code, description (the name used everywhere in the app), Lecture or
   Laboratory, units, professor, room, the semester it belongs to, and the days
   and times it meets. Only the Schedule and Courses pages show everything but
   the description.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { state, termNow } from "../state.js";
import { saveCourse, setCourseArchived, deleteCourse } from "../db/courses.js";
import { confirmDialog } from "../ui/dialogs.js";
import { go } from "../router.js";
import { toast } from "../ui/screens.js";
import {
  KINDS, DAYS, SEMESTERS, SLOT_LIMIT, schoolYears, parseTerm, makeTerm, termName,
  validateCourseForm, overlaps, formatRange, cleanSlots, courseTerm,
} from "../logic/schedule.js";
import { getSettings } from "../state.js";

export function courseFormView(container, params, query) {
  const editing = params.id ? state.courses.find((c) => c.id === params.id) : null;
  if (params.id && !editing) {
    container.append(h("div", { class: "empty" }, h("h2", {}, "Course not found"), h("p", { class: "muted" }, "It may have been deleted."), h("a", { class: "btn btn-primary", href: "#/courses" }, "Back to courses")));
    return {};
  }

  const start = editing || {};
  const years = schoolYears(getSettings(), state.courses);
  const initialTerm = editing ? courseTerm(editing) : termNow();
  const t0 = parseTerm(initialTerm);

  const el = {
    name: h("input", { type: "text", class: "input", id: "c-name", maxlength: 120, autocomplete: "off", value: start.name || "", "aria-describedby": "c-name-error c-name-hint" }),
    code: h("input", { type: "text", class: "input", id: "c-code", maxlength: 30, autocomplete: "off", value: start.code || "", placeholder: "e.g. PATHFIT3-M", "aria-describedby": "c-code-error" }),
    kind: h("select", { class: "select", id: "c-kind", value: start.kind || "lecture" }, KINDS.map((k) => h("option", { value: k.id }, k.name))),
    units: h("input", { type: "text", inputmode: "decimal", class: "input", id: "c-units", maxlength: 4, autocomplete: "off", value: start.units == null ? "" : String(start.units), placeholder: "e.g. 3", "aria-describedby": "c-units-error" }),
    professor: h("input", { type: "text", class: "input", id: "c-professor", maxlength: 80, autocomplete: "off", value: start.professor || "", placeholder: "e.g. MR. JOHN DOE", "aria-describedby": "c-professor-error" }),
    room: h("input", { type: "text", class: "input", id: "c-room", maxlength: 40, autocomplete: "off", value: start.room || "", placeholder: "e.g. TBA", "aria-describedby": "c-room-error" }),
    year: h("select", { class: "select", id: "c-year", "aria-label": "School year" },
      !t0 ? h("option", { value: "" }, "Not set") : null,
      years.map((y) => h("option", { value: y }, `S.Y. ${y.replace("-", "–")}`))),
    sem: h("select", { class: "select", id: "c-sem", "aria-label": "Semester" },
      !t0 ? h("option", { value: "" }, "Not set") : null,
      SEMESTERS.map((s) => h("option", { value: s.id }, s.name))),
  };
  el.year.value = t0 ? t0.year : ""; el.sem.value = t0 ? t0.sem : "";
  const termValue = () => (el.year.value && el.sem.value ? makeTerm(el.year.value, el.sem.value) : "");

  const errorLine = (name) => h("p", { class: "error-text field-error", id: `c-${name}-error`, role: "alert", hidden: true });
  const field = (name, label, control, { hint, required } = {}) =>
    h("div", { class: "field", dataset: { field: name } },
      h("label", { class: "label", for: `c-${name}` }, label, required ? h("span", { class: "req", "aria-hidden": "true" }, " *") : null),
      control, hint ? h("p", { class: "hint", id: `c-${name}-hint` }, hint) : null, errorLine(name));

  /* ---------- class times ---------- */
  let slots = (start.slots && start.slots.length ? cleanSlots(start.slots) : []).map((s) => ({ ...s }));
  const slotList = h("div", { class: "slot-list" });
  const slotWarn = h("p", { class: "warn-text", hidden: true, role: "status" });

  function drawSlots() {
    clear(slotList);
    slots.forEach((slot, i) => {
      const day = h("select", { class: "select", "aria-label": `Day, class time ${i + 1}`, onChange: (e) => { slot.day = Number(e.target.value); warn(); } },
        DAYS.map((d) => h("option", { value: String(d.id), selected: d.id === slot.day }, d.name)));
      const from = h("input", { type: "time", class: "input", "aria-label": `Start time, class time ${i + 1}`, value: slot.start, onInput: (e) => { slot.start = e.target.value; warn(); } });
      const to = h("input", { type: "time", class: "input", "aria-label": `End time, class time ${i + 1}`, value: slot.end, onInput: (e) => { slot.end = e.target.value; warn(); } });
      slotList.append(h("div", { class: "slot-row" }, day, from, to,
        h("button", { type: "button", class: "btn btn-small", "aria-label": `Remove class time ${i + 1}`, onClick: () => { slots.splice(i, 1); drawSlots(); warn(); } }, "Remove")));
    });
    addSlot.hidden = slots.length >= SLOT_LIMIT;
  }
  const addSlot = h("button", { type: "button", class: "btn", onClick: () => {
    const last = slots[slots.length - 1];
    slots.push({ day: last ? last.day : 1, start: "", end: "" });
    drawSlots();
    const rows = slotList.querySelectorAll(".slot-row");
    rows[rows.length - 1].querySelector("select").focus();
  } }, "＋ Add a class time");

  /** A gentle heads-up when a class time overlaps another course of the same semester. It never blocks saving. */
  function warn() {
    const lines = [];
    for (const slot of cleanSlots(slots)) {
      const other = overlaps(slot, state.courses, termValue(), editing ? editing.id : "");
      if (other.length) lines.push(`${slot.day === 0 ? "Sun" : DAYS.find((d) => d.id === slot.day).short} ${formatRange(slot)} overlaps ${other.map((c) => c.name).join(", ")}`);
    }
    slotWarn.hidden = !lines.length;
    slotWarn.textContent = lines.length ? `Heads-up: ${lines.join("; ")}.` : "";
  }
  el.year.addEventListener("change", warn); el.sem.addEventListener("change", warn);
  drawSlots(); warn();

  /* ---------- saving ---------- */
  const summary = h("div", { class: "form-summary error-text", role: "alert", hidden: true, tabindex: "-1" });
  function clearErrors() {
    form.querySelectorAll(".field-error").forEach((p) => { p.hidden = true; p.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach((c) => c.removeAttribute("aria-invalid"));
    summary.hidden = true;
  }
  function onSubmit(e) {
    e.preventDefault();
    clearErrors();
    const values = {
      name: el.name.value, code: el.code.value, kind: el.kind.value, units: el.units.value, professor: el.professor.value, room: el.room.value,
      termId: termValue(), slots,
    };
    const others = state.courses.filter((c) => !editing || c.id !== editing.id).map((c) => ({ name: c.name, termId: courseTerm(c) }));
    const { errors, value } = validateCourseForm(values, { existing: others });
    if (!value) {
      let first = null;
      for (const [name, message] of Object.entries(errors)) {
        const line = name === "slots" ? slotErr : form.querySelector(`#c-${name}-error`);
        if (line) { line.textContent = message; line.hidden = false; }
        const control = el[name === "termId" ? "year" : name];
        if (control) control.setAttribute("aria-invalid", "true");
        if (!first) first = control || line;
      }
      summary.textContent = "Please fix the problem marked below.";
      summary.hidden = false;
      (first || summary).focus();
      return;
    }
    saveCourse(state.fb, state.uid, editing ? editing.id : null, value);
    toast(editing ? "Course saved." : "Course added.");
    go("/courses");
  }

  const slotErr = errorLine("slots");
  const form = h("form", { class: "task-form course-form", novalidate: true, onSubmit },
    summary,
    field("name", "Course description", el.name, { required: true, hint: "The name of the course. This is what shows when you pick a course for a task." }),
    field("code", "Course code", el.code),
    h("div", { class: "due-row" },
      field("kind", "Lecture or laboratory", el.kind),
      field("units", "Units", el.units)),
    field("professor", "Professor", el.professor),
    field("room", "Room", el.room),
    h("fieldset", { class: "field", dataset: { field: "termId" } },
      h("legend", { class: "label" }, "Semester"),
      h("div", { class: "due-row" }, el.year, el.sem), errorLine("termId")),
    h("fieldset", { class: "field", dataset: { field: "slots" } },
      h("legend", { class: "label" }, "Schedule"),
      h("p", { class: "hint" }, "The days and times this class meets. Add one line for each day."),
      slotList, slotWarn, slotErr, addSlot),
    h("div", { class: "form-actions" },
      h("a", { class: "btn", href: "#/courses" }, "Cancel"),
      h("button", { type: "submit", class: "btn btn-primary" }, editing ? "Save changes" : "Add course")));

  /* ---------- archive / delete (editing only) ---------- */
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  async function onDelete() {
    const tasks = state.tasks.filter((t) => t.courseId === editing.id);
    const events = state.events.filter((e) => e.courseId === editing.id);
    const n = tasks.length;
    const ok = await confirmDialog({
      title: `Delete "${editing.name}"?`,
      message: [
        n ? `This will also permanently delete ${plural(n, "task")} that belong to this course, with their notes and history. This cannot be undone.` : "This course has no tasks. This cannot be undone.",
        events.length ? `Its ${plural(events.length, "event")} will stay on your calendar, without a course.` : null,
        "Not sure? Archive the course instead. It disappears from your lists and schedule but nothing is lost, and you can restore it any time.",
      ],
      confirmLabel: n ? `Delete course and ${plural(n, "task")}` : "Delete course", danger: true,
    });
    if (!ok) return;
    deleteCourse(state.fb, state.uid, editing.id, tasks.map((t) => t.id), events.map((e) => e.id));
    toast(n ? `Course and ${plural(n, "task")} deleted.` : "Course deleted.");
    go("/courses");
  }
  const danger = editing ? h("section", { class: "card" }, h("h2", {}, "Archive or delete"),
    h("p", { class: "muted" }, editing.archived ? "This course is archived: hidden from your lists and schedule, but kept." : "Archiving hides the course, its tasks and its classes but keeps everything. You can restore it later."),
    h("div", { class: "action-row" },
      h("button", { type: "button", class: "btn", onClick: () => {
        setCourseArchived(state.fb, state.uid, editing.id, !editing.archived);
        toast(editing.archived ? "Course restored." : "Course archived.");
        go("/courses");
      } }, editing.archived ? "Restore course" : "Archive course"),
      h("button", { type: "button", class: "btn btn-danger-outline", onClick: onDelete }, "Delete…"))) : null;

  container.append(
    h("a", { class: "back-link", href: "#/courses" }, "← Courses"),
    h("div", { class: "page-head" }, h("h1", {}, editing ? "Edit course" : "Add course")),
    h("section", { class: "card" }, form),
    ...(danger ? [danger] : []));
  return {};
}
