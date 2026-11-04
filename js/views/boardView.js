/* ==========================================================================
   BOARD: your tasks as three columns, one per status.

     Not started  |  In progress  |  Done

   Move a task with the buttons on its card (works everywhere, including phones),
   or drag it to another column on a computer. Moving a task is the same as
   changing its status on the list: it records the same timestamps.

   Filters: workspace tabs, course / organization, search. Archived tasks are not
   shown. The Done column shows the last 14 days unless you press "Show all done".

   On a phone the columns sit side by side and you swipe between them; on a wide
   screen all three are visible at once.
   ========================================================================== */

import { h, clear, fillSelect } from "../ui/dom.js";
import { ORGS, WORKSPACES } from "../constants.js";
import { state, orgName, courseName, typeName, taskGroupName, isTaskHidden, termCourses, getSettings } from "../state.js";
import { boardColumns, moveOptions } from "../logic/board.js";
import { formatDue } from "../logic/format.js";
import { urgencyBadge, arrangementName, startChip } from "../ui/taskCard.js";
import { changeStatus } from "../ui/taskActions.js";
import { tasksSwitch } from "../ui/tasksSwitch.js";
import { icon } from "../ui/capybara.js";

// Remembered while you move between screens (reset when you close the app).
let filters = { workspace: "all", courseId: "", orgId: "", search: "" };
let showAllDone = false;

const COLUMN_ICON = { not_started: "tasks", in_progress: "inprogress", done: "completed" };

export function boardView(container) {
  /* ---------- controls (built once) ---------- */
  const tabs = [{ id: "all", name: "All" }, ...WORKSPACES].map((tab) => h("button", {
    type: "button", class: "seg-btn", dataset: { tab: tab.id },
    onClick: () => { filters.workspace = tab.id; filters.courseId = ""; filters.orgId = ""; refresh(); },
  }, tab.name));
  const search = h("input", {
    type: "search", class: "input", placeholder: "Search the board…", "aria-label": "Search the board",
    value: filters.search, autocomplete: "off",
    onInput: (e) => { filters.search = e.target.value; renderColumns(); },
  });
  const course = h("select", { class: "select", "aria-label": "Course", onChange: (e) => { filters.courseId = e.target.value; renderColumns(); } });
  const org = h("select", { class: "select", "aria-label": "Organization", onChange: (e) => { filters.orgId = e.target.value; renderColumns(); } });
  const summary = h("p", { class: "muted small", role: "status", "aria-live": "polite" });
  const scroller = h("div", { class: "board", role: "list" });

  container.append(
    h("div", { class: "page-head" }, h("h1", {}, "Tasks"), tasksSwitch("board")),
    h("div", { class: "seg", role: "group", "aria-label": "Workspace" }, tabs),
    h("div", { class: "toolbar board-toolbar" }, search, course, org),
    summary, scroller);

  /* ---------- the columns ---------- */
  const columnEls = new Map();   // status id -> { section, count, body }
  for (const id of ["not_started", "in_progress", "done"]) {
    const count = h("span", { class: "dash-count" }, "0");
    const body = h("div", { class: "board-cards" });
    const section = h("section", { class: `board-col col-${id}`, role: "listitem", dataset: { status: id } },
      h("h2", { class: "board-col-head" }, icon(COLUMN_ICON[id], 26), h("span", { class: "board-col-title" }), count), body);
    // dragging a card over a column (computers)
    section.addEventListener("dragover", (e) => { e.preventDefault(); section.classList.add("is-drop"); });
    section.addEventListener("dragleave", (e) => { if (!section.contains(e.relatedTarget)) section.classList.remove("is-drop"); });
    section.addEventListener("drop", (e) => {
      e.preventDefault(); section.classList.remove("is-drop");
      const task = state.tasks.find((t) => t.id === e.dataTransfer.getData("text/plain"));
      if (task) changeStatus(task, id);
    });
    columnEls.set(id, { section, count, body, title: section.querySelector(".board-col-title") });
    scroller.append(section);
  }

  function syncControls() {
    for (const b of tabs) b.setAttribute("aria-pressed", String(b.dataset.tab === filters.workspace));
    fillSelect(course, termCourses().map((c) => ({ id: c.id, name: c.name })), filters.courseId, { placeholder: "All courses" });
    fillSelect(org, ORGS, filters.orgId, { placeholder: "All organizations" });
    if (filters.courseId && course.value !== filters.courseId) filters.courseId = "";
    // pick Academics or Organizations to narrow down by course or organization (keeps the phone screen short)
    course.hidden = filters.workspace !== "academics";
    org.hidden = filters.workspace !== "organizations";
    // the Add task button opens the form already set to what you are looking at
    const q = new URLSearchParams();
    if (filters.workspace !== "all") q.set("ws", filters.workspace);
    if (filters.courseId) q.set("course", filters.courseId);
    if (filters.orgId) q.set("org", filters.orgId);
    setAddTaskLinks(q.toString());
  }

  function renderColumns() {
    const now = Date.now();
    const columns = boardColumns(state.tasks, filters, {
      now, settings: getSettings(), isArchived: isTaskHidden, showAllDone,
      names: { course: courseName, org: orgName, type: typeName, arrangement: arrangementName },
    });
    const total = columns.reduce((n, c) => n + c.tasks.length, 0);
    summary.textContent = state.tasks.length ? `${total} task${total === 1 ? "" : "s"} on the board` : "";

    for (const col of columns) {
      const el = columnEls.get(col.id);
      el.title.textContent = col.name;
      el.count.textContent = String(col.tasks.length);
      clear(el.body);
      if (!col.tasks.length) el.body.append(h("p", { class: "muted board-empty" }, col.id === "done" ? "Nothing finished recently." : "Nothing here."));
      else el.body.append(...col.tasks.map((t) => card(t, now)));
      if (col.id === "done" && (col.hiddenDone || showAllDone)) {
        el.body.append(h("button", { type: "button", class: "btn btn-small board-more", onClick: () => { showAllDone = !showAllDone; renderColumns(); } },
          showAllDone ? "Show recent only" : `Show all done (${col.hiddenDone} older)`));
      }
    }
    if (!state.tasks.length) {
      clear(columnEls.get("not_started").body);
      columnEls.get("not_started").body.append(h("div", { class: "empty" },
        h("p", { class: "muted" }, "No tasks yet. Add one and it will appear here."),
        h("a", { class: "btn btn-primary", href: "#/task/new" }, "Add a task")));
    }
  }

  /** One compact card. */
  function card(task, now) {
    const href = `#/task/${encodeURIComponent(task.id)}`;
    const el = h("article", { class: `board-card urg-${task.status === "done" ? "done" : ""}`, draggable: "true", dataset: { id: task.id } },
      h("a", { class: "task-title", href }, task.title),
      h("div", { class: "chips" },
        h("span", { class: `chip chip-${task.workspace}` }, taskGroupName(task)),
        h("span", { class: "chip" }, typeName(task.typeId)), startChip(task, now)),
      h("div", { class: "task-due" }, urgencyBadge(task, now),
        task.status === "done" || task.dueAt == null ? null : h("span", { class: "due-text" }, formatDue(task.dueAt, now))),
      h("div", { class: "board-moves" },
        moveOptions(task).map((m) => h("button", { type: "button", class: "btn btn-small", onClick: () => changeStatus(task, m.to), "aria-label": `${m.label}: ${task.title}` }, m.label)),
        h("a", { class: "btn btn-small", href }, "Details")));
    el.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", task.id); e.dataTransfer.effectAllowed = "move"; el.classList.add("is-dragging"); });
    el.addEventListener("dragend", () => el.classList.remove("is-dragging"));
    return el;
  }

  function refresh() { syncControls(); renderColumns(); }
  refresh();
  return { update: refresh, destroy() { setAddTaskLinks(""); } };
}

function setAddTaskLinks(query) {
  document.querySelectorAll("[data-add-task]").forEach((a) => {
    a.setAttribute("href", query ? `#/task/new?${query}` : "#/task/new");
  });
}
