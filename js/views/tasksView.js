/* ==========================================================================
   TASKS VIEW: the main list.

   Controls (top to bottom): workspace tabs, search, Filters panel.
   Below them: the task cards, sorted by urgency unless you pick another sort.

   The controls are built ONCE; only the card list is redrawn when data changes.
   That way typing in the search box never loses focus.
   ========================================================================== */

import { h, clear, fillSelect } from "../ui/dom.js";
import { ARRANGEMENTS, ORGS, STATUSES, WORKSPACES } from "../constants.js";
import { state, allTypes, typesFor, orgName, courseName, typeName, isTaskArchived, getSettings } from "../state.js";
import { applyFilters, emptyFilters, countActiveFilters, hasAnyFilter, WHEN_OPTIONS } from "../logic/filters.js";
import { SORTS } from "../logic/urgency.js";
import { buildTaskCard, arrangementName } from "../ui/taskCard.js";
import { loadDraft, clearDraft } from "../logic/drafts.js";
import { tasksSwitch } from "../ui/tasksSwitch.js";

// Remembered while you move between screens (reset when you close the app).
let filters = emptyFilters();
let panelOpen = false;

export function tasksView(container, params, query = {}) {
  // Coming from a Dashboard tile (#/tasks?when=overdue ...): start from exactly that list.
  if (query.when || query.status || query.ws) {
    filters = emptyFilters();
    if (WHEN_OPTIONS.some((o) => o.id && o.id === query.when)) filters.when = query.when;
    if (STATUSES.some((s) => s.id === query.status)) filters.status = query.status;
    if (WORKSPACES.some((w) => w.id === query.ws)) filters.workspace = query.ws;
  }

  /* ---------- controls ---------- */
  const tabButtons = [{ id: "all", name: "All" }, ...WORKSPACES].map((tab) =>
    h("button", {
      type: "button", class: "seg-btn", dataset: { tab: tab.id },
      onClick: () => { filters.workspace = tab.id; refresh(); },
    }, tab.name));

  const search = h("input", {
    type: "search", class: "input", placeholder: "Search title, course, notes…", "aria-label": "Search tasks",
    value: filters.search, autocomplete: "off",
    onInput: (e) => { filters.search = e.target.value; refresh(); },
  });

  const filterToggle = h("button", {
    type: "button", class: "btn", "aria-expanded": String(panelOpen), "aria-controls": "filter-panel",
    onClick: () => { panelOpen = !panelOpen; refresh(); },
  });
  const clearButton = h("button", {
    type: "button", class: "btn btn-link",
    onClick: () => { filters = emptyFilters(); search.value = ""; refresh(); },
  }, "Clear filters");

  const select = (key, label) => {
    const el = h("select", { class: "select", id: `flt-${key}`, onChange: (e) => { filters[key] = e.target.value; refresh(); } });
    return { el, field: h("div", { class: "field" }, h("label", { class: "label", for: `flt-${key}` }, label), el) };
  };
  const course = select("courseId", "Course");
  const org = select("orgId", "Organization");
  const type = select("typeId", "Task type");
  const arrangement = select("arrangement", "Work arrangement");
  const status = select("status", "Status");
  const when = select("when", "Deadline");
  const sort = select("sort", "Sort by");

  const panel = h("div", { class: "filter-panel", id: "filter-panel" },
    h("div", { class: "filter-grid" }, course.field, org.field, type.field, arrangement.field, status.field, when.field, sort.field),
    h("p", { class: "muted small" }, "Archived tasks are kept under Settings, then Archived tasks."));

  // Shown only while an unfinished "Add task" form is waiting (see js/logic/drafts.js).
  const draftBox = h("div", { class: "banner banner-inline", role: "status", hidden: true });

  const summary = h("p", { class: "muted small result-count", role: "status", "aria-live": "polite" });
  const list = h("div", { class: "task-list" });

  container.append(
    h("div", { class: "page-head" }, h("h1", {}, "Tasks"), tasksSwitch("list")),
    draftBox,
    h("div", { class: "seg", role: "group", "aria-label": "Workspace" }, tabButtons),
    h("div", { class: "toolbar" }, search, filterToggle, clearButton),
    panel, summary, list);

  /* ---------- keep controls and list in step with the data ---------- */
  function syncControls() {
    for (const b of tabButtons) b.setAttribute("aria-pressed", String(b.dataset.tab === filters.workspace));

    fillSelect(course.el, state.courses.map((c) => ({ id: c.id, name: c.archived ? `${c.name} (archived)` : c.name })), filters.courseId, { placeholder: "All courses" });
    fillSelect(org.el, ORGS, filters.orgId, { placeholder: "All organizations" });
    // Task types of the workspace you are looking at (all of them on the "All" tab).
    fillSelect(type.el, filters.workspace === "all" ? allTypes() : typesFor(filters.workspace), filters.typeId, { placeholder: "All types" });
    fillSelect(arrangement.el, ARRANGEMENTS, filters.arrangement, { placeholder: "Individual or group" });
    fillSelect(status.el, STATUSES, filters.status, { placeholder: "Any status" });
    fillSelect(when.el, WHEN_OPTIONS.slice(1), filters.when, { placeholder: "Any time" });
    fillSelect(sort.el, SORTS, filters.sort);

    // A filter that points at something that no longer exists would hide everything.
    if (filters.courseId && course.el.value !== filters.courseId) filters.courseId = "";
    if (filters.typeId && type.el.value !== filters.typeId) filters.typeId = "";

    // Show the course selector for Academics/All and the organization one for Organizations/All.
    course.field.hidden = filters.workspace === "organizations";
    org.field.hidden = filters.workspace === "academics";

    const count = countActiveFilters(filters);
    filterToggle.textContent = count ? `Filters (${count})` : "Filters";
    filterToggle.setAttribute("aria-expanded", String(panelOpen));
    panel.hidden = !panelOpen;
    clearButton.hidden = !hasAnyFilter(filters);

    // The Add Task button / FAB opens the form already set to what you are looking at.
    const params = new URLSearchParams();
    if (filters.workspace !== "all") params.set("ws", filters.workspace);
    if (filters.courseId) params.set("course", filters.courseId);
    if (filters.orgId) params.set("org", filters.orgId);
    setAddTaskLinks(params.toString());
  }

  function renderList() {
    const now = Date.now();
    const shown = applyFilters(state.tasks, filters, {
      now,
      settings: getSettings(),
      isArchived: isTaskArchived,
      names: {
        course: courseName, org: orgName, type: typeName,
        arrangement: arrangementName,
      },
    });

    clear(list);
    summary.textContent = state.tasks.length ? `${shown.length} task${shown.length === 1 ? "" : "s"}` : "";

    if (!state.tasks.length) {
      list.append(emptyState("No tasks yet",
        state.courses.length
          ? "Add your first task to get started."
          : "Tip: add your courses first under Manage, then add your first task."));
    } else if (!shown.length) {
      list.append(h("div", { class: "empty" },
        h("h2", {}, "No tasks match"),
        h("p", { class: "muted" }, "Try changing or clearing your search and filters."),
        h("button", { type: "button", class: "btn", onClick: () => { filters = emptyFilters(); search.value = ""; refresh(); } }, "Clear filters")));
    } else {
      list.append(...shown.map((task) => buildTaskCard(task, now)));
    }
  }

  function showDraftNote() {
    const draft = loadDraft(state.uid, "new");
    clear(draftBox);
    draftBox.hidden = !draft;
    if (!draft) return;
    const title = (draft.title || "").trim();
    draftBox.append(
      h("span", {}, title ? `Unfinished task: “${title}”` : "You have an unfinished task."),
      h("span", { class: "row-actions" },
        h("a", { class: "btn btn-small btn-primary", href: "#/task/new" }, "Continue"),
        h("button", { type: "button", class: "btn btn-small", onClick: () => { clearDraft(state.uid, "new"); showDraftNote(); } }, "Discard")));
  }

  function refresh() { syncControls(); renderList(); showDraftNote(); }

  // Close any open ⋯ menu when you tap elsewhere.
  const closeMenus = (e) => {
    document.querySelectorAll("details.menu[open]").forEach((d) => { if (!d.contains(e.target)) d.open = false; });
  };
  document.addEventListener("click", closeMenus);

  refresh();

  return {
    update: refresh,
    destroy() {
      document.removeEventListener("click", closeMenus);
      setAddTaskLinks("");
    },
  };
}

function emptyState(title, text) {
  return h("div", { class: "empty" },
    h("h2", {}, title), h("p", { class: "muted" }, text),
    h("a", { class: "btn btn-primary", href: "#/task/new" }, "Add a task"));
}

/** Points every "Add task" link at the form, optionally pre-filled from the current view. */
function setAddTaskLinks(query) {
  document.querySelectorAll("[data-add-task]").forEach((a) => {
    a.setAttribute("href", query ? `#/task/new?${query}` : "#/task/new");
  });
}
