/* ==========================================================================
   EVENT FORM: add or edit an exam, meeting, class or other event.

     #/event/new                blank form
     #/event/new?date=2026-11-03   starts on that day (the calendar uses this)
     #/event/ID/edit            edit an existing event

   Like the task form, your entries are kept as a DRAFT if you leave the page
   (js/logic/drafts.js). Saving writes to the copy on your device and never
   waits for the internet.
   ========================================================================== */

import { h, optionEls, clear } from "../ui/dom.js";
import { LIMITS, ORGS, WORKSPACES } from "../constants.js";
import { state, eventById, allEventKinds, eventKindsFor, coursesForPicker } from "../state.js";
import { validateEventForm } from "../logic/validate.js";
import { toInputDate, toInputTime } from "../logic/format.js";
import { parseDayKey, dayKey } from "../logic/calendar.js";
import { createEvent, updateEvent } from "../db/events.js";
import { EVENT_DRAFT_FIELDS, saveDraft, loadDraft, clearDraft, isDifferent } from "../logic/drafts.js";
import { toast } from "../ui/screens.js";
import { go, reload } from "../router.js";

export function eventFormView(container, params, query) {
  const editing = params.id ? eventById(params.id) : null;
  if (params.id && !editing) return notFound(container);
  const mode = editing ? "edit" : "create";

  const courses = coursesForPicker(editing && editing.courseId);
  const courseIds = courses.map((c) => c.id);

  /* ---------- starting values ---------- */
  const normalize = (v) => ({ ...v, courseId: courseIds.includes(v.courseId) ? v.courseId : "" });
  const startDate = parseDayKey(query.date);
  const fresh = editing
    ? {
        title: editing.title, kind: editing.kind, workspace: editing.workspace,
        courseId: editing.courseId || "", orgId: editing.orgId || "",
        date: toInputDate(editing.startAt), allDay: editing.allDay ? "1" : "",
        startTime: editing.allDay ? "" : toInputTime(editing.startAt), endTime: editing.endAt ? toInputTime(editing.endAt) : "",
        location: editing.location || "", notes: editing.notes || "",
      }
    : {
        title: "", kind: "exam", workspace: query.ws === "organizations" ? "organizations" : "academics",
        courseId: query.course || "", orgId: query.org || "",
        date: startDate ? dayKey(startDate) : dayKey(Date.now()), allDay: "", startTime: "", endTime: "", location: "", notes: "",
      };
  const baseline = normalize(fresh);
  const draftKey = editing ? `event:edit:${editing.id}` : "event:new";
  const draft = readDraft(state.uid, draftKey, baseline);
  const initial = draft ? normalize({ ...baseline, ...draft }) : baseline;

  /* ---------- controls ---------- */
  const el = {
    title: h("input", { type: "text", class: "input", id: "f-title", name: "title", value: initial.title, maxlength: LIMITS.title, autocomplete: "off", "aria-describedby": "f-title-error" }),
    kind: h("select", { class: "select", id: "f-kind", name: "kind", "aria-describedby": "f-kind-error", value: initial.kind }),
    courseId: h("select", { class: "select", id: "f-courseId", name: "courseId", "aria-describedby": "f-courseId-error", value: initial.courseId },
      h("option", { value: "" }, "No course"), courses.map((c) => h("option", { value: c.id }, c.archived ? `${c.name} (archived)` : c.name))),
    orgId: h("select", { class: "select", id: "f-orgId", name: "orgId", "aria-describedby": "f-orgId-error", value: initial.orgId },
      h("option", { value: "" }, "No organization"), optionEls(ORGS, initial.orgId)),
    date: h("input", { type: "date", class: "input", id: "f-date", name: "date", value: initial.date, "aria-describedby": "f-date-error" }),
    allDay: h("input", { type: "checkbox", id: "f-allDay", name: "allDay", value: "1", checked: initial.allDay === "1" }),
    startTime: h("input", { type: "time", class: "input", id: "f-startTime", name: "startTime", value: initial.startTime, "aria-describedby": "f-startTime-error" }),
    endTime: h("input", { type: "time", class: "input", id: "f-endTime", name: "endTime", value: initial.endTime, "aria-describedby": "f-endTime-error" }),
    location: h("input", { type: "text", class: "input", id: "f-location", name: "location", value: initial.location, maxlength: LIMITS.location, autocomplete: "off", "aria-describedby": "f-location-error" }),
    notes: h("textarea", { class: "textarea", id: "f-notes", name: "notes", rows: 3, maxlength: LIMITS.text, value: initial.notes, "aria-describedby": "f-notes-error" }),
  };

  const errorLine = (name) => h("p", { class: "error-text field-error", id: `f-${name}-error`, role: "alert", hidden: true });
  const field = (name, label, control, { hint, required } = {}) =>
    h("div", { class: "field", dataset: { field: name } },
      h("label", { class: "label", for: `f-${name}` }, label, required ? h("span", { class: "req", "aria-hidden": "true" }, " *") : null),
      control, hint ? h("p", { class: "hint" }, hint) : null, errorLine(name));

  const workspaceGroup = h("fieldset", { class: "field", dataset: { field: "workspace" } },
    h("legend", { class: "label" }, "Workspace"),
    h("div", { class: "seg seg-form", role: "radiogroup" }, WORKSPACES.map((w) =>
      h("label", { class: "seg-radio" },
        h("input", { type: "radio", name: "workspace", value: w.id, checked: w.id === initial.workspace, onChange: () => syncWorkspace(true) }),
        h("span", {}, w.name)))),
    errorLine("workspace"));

  const courseField = field("courseId", "Course (optional)", el.courseId);
  const orgField = field("orgId", "Organization (optional)", el.orgId);
  const timeRow = h("div", { class: "due-row", dataset: { field: "times" } },
    field("startTime", "Starts", el.startTime, { required: true }),
    field("endTime", "Ends (optional)", el.endTime));
  const summary = h("div", { class: "form-summary error-text", role: "alert", hidden: true, tabindex: "-1" });

  const form = h("form", { class: "task-form", novalidate: true, onSubmit },
    summary,
    field("title", "Event title", el.title, { required: true }),
    field("kind", "Kind of event", el.kind, { required: true }),
    workspaceGroup, courseField, orgField,
    field("date", "Date", el.date, { required: true }),
    h("label", { class: "check all-day" }, el.allDay, h("span", {}, "All day (no specific time)")),
    timeRow,
    field("location", "Location (optional)", el.location, { hint: "A room, building or meeting link." }),
    field("notes", "Notes (optional)", el.notes),
    h("div", { class: "form-actions" },
      h("a", { class: "btn", href: editing ? `#/event/${encodeURIComponent(editing.id)}` : "#/calendar", onClick: () => discard() }, "Cancel"),
      h("button", { type: "submit", class: "btn btn-primary" }, mode === "edit" ? "Save changes" : "Save event")));

  container.append(h("div", { class: "page-head" }, h("h1", {}, mode === "edit" ? "Edit event" : "Add event")));
  if (draft) {
    container.append(h("div", { class: "banner banner-inline", role: "status" },
      h("span", {}, "Your unsaved entries were restored."),
      h("button", { type: "button", class: "btn btn-small", onClick: () => { discard(); reload(); } }, "Start over")));
  }
  container.append(form);

  /* ---------- behaviors ---------- */
  /** The kinds offered follow the workspace. A kind this event already has stays in the list. */
  function fillKinds(keep, allowLegacy) {
    const ws = form.elements.workspace.value;
    const list = eventKindsFor(ws);
    const current = allEventKinds().find((k) => k.id === keep);
    if (allowLegacy && current && !list.some((k) => k.id === keep)) list.push(current);
    clear(el.kind).append(...optionEls(list, keep));
    el.kind.value = list.some((k) => k.id === keep) ? keep : (list[0] ? list[0].id : "");
  }
  function syncWorkspace(fromUser) {
    const academics = form.elements.workspace.value === "academics";
    fillKinds(fromUser ? el.kind.value : initial.kind, !fromUser && Boolean(editing));
    courseField.hidden = !academics;
    orgField.hidden = academics;
  }
  function syncAllDay() { timeRow.hidden = el.allDay.checked; }
  el.allDay.addEventListener("change", syncAllDay);
  syncWorkspace(); syncAllDay();

  /* ---------- draft ---------- */
  let finished = false, timer = null;
  const currentValues = () => {
    const data = new FormData(form);
    return Object.fromEntries(EVENT_DRAFT_FIELDS.map((f) => [f, String(data.get(f) ?? "")]));
  };
  function persist() {
    clearTimeout(timer);
    if (finished) return;
    const values = currentValues();
    if (isDifferent(values, baseline, EVENT_DRAFT_FIELDS)) saveDraft(state.uid, draftKey, values);
    else clearDraft(state.uid, draftKey);
  }
  function discard() { finished = true; clearTimeout(timer); clearDraft(state.uid, draftKey); }
  const schedulePersist = () => { clearTimeout(timer); timer = setTimeout(persist, 250); };
  form.addEventListener("input", schedulePersist);
  form.addEventListener("change", schedulePersist);
  const onVisibility = () => { if (document.visibilityState === "hidden") persist(); };
  document.addEventListener("visibilitychange", onVisibility);

  /* ---------- saving ---------- */
  function onSubmit(event) {
    event.preventDefault();
    summary.hidden = true;
    form.querySelectorAll(".field-error").forEach((p) => { p.hidden = true; p.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach((i) => i.removeAttribute("aria-invalid"));

    const values = currentValues();
    const { errors, value } = validateEventForm(values, { courseIds, kindIds: allEventKinds().map((k) => k.id) });
    const names = Object.keys(errors);
    if (names.length) {
      for (const name of names) {
        const msg = form.querySelector(`#f-${name}-error`);
        if (msg) { msg.textContent = errors[name]; msg.hidden = false; }
        const control = form.querySelector(`#f-${name}, [name="${name}"]`);
        if (control) control.setAttribute("aria-invalid", "true");
      }
      summary.textContent = names.length === 1 ? "Please fix the problem marked below." : `Please fix the ${names.length} problems marked below.`;
      summary.hidden = false;
      const first = form.querySelector(`[data-field="${names[0]}"] input, [data-field="${names[0]}"] select, [data-field="${names[0]}"] textarea`);
      (first || summary).focus();
      return;
    }

    discard();
    if (mode === "edit") {
      updateEvent(state.fb, state.uid, editing.id, value);
      toast("Changes saved.");
      go(`/event/${encodeURIComponent(editing.id)}`);
    } else {
      const id = createEvent(state.fb, state.uid, value);
      toast("Event added.");
      go(`/event/${encodeURIComponent(id)}`);
    }
  }

  return {
    destroy() { document.removeEventListener("visibilitychange", onVisibility); persist(); },
  };
}

function readDraft(uid, key, baseline) {
  const saved = loadDraft(uid, key);
  if (!saved) return null;
  const clean = {};
  for (const f of EVENT_DRAFT_FIELDS) if (typeof saved[f] === "string") clean[f] = saved[f];
  if (clean.workspace && !WORKSPACES.some((w) => w.id === clean.workspace)) delete clean.workspace;
  if (clean.kind && !allEventKinds().some((k) => k.id === clean.kind)) delete clean.kind;
  if (clean.orgId && !ORGS.some((o) => o.id === clean.orgId)) clean.orgId = "";
  if (clean.allDay && clean.allDay !== "1") clean.allDay = "";
  const merged = { ...baseline, ...clean };
  if (!isDifferent(merged, baseline, EVENT_DRAFT_FIELDS)) { clearDraft(uid, key); return null; }
  return clean;
}

function notFound(container) {
  container.append(h("div", { class: "empty" },
    h("h1", {}, "Event not found"),
    h("p", { class: "muted" }, "It may have been deleted, or it hasn't finished syncing to this device yet."),
    h("a", { class: "btn btn-primary", href: "#/calendar" }, "Back to the calendar")));
  return {};
}
