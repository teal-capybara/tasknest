/* ==========================================================================
   MANAGE: the task types and event types of each workspace. (Courses live on the Courses page.)

   The page is a few collapsible groups (tap a heading to open it), so you see
   the headings first instead of everything at once:
     Academics        task types + event types
     Organizations    task types + event types
   The built-in types are fixed. Your own can be renamed or deleted. Deleting one
   asks where to move its tasks / events first (to another type of the SAME
   workspace), so nothing ever ends up without a type.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { DEFAULT_TYPES, EVENT_KINDS, WORKSPACES } from "../constants.js";
import { state, typesFor, eventKindsFor } from "../state.js";
import { validateName } from "../logic/validate.js";
import { addTaskType, renameTaskType, deleteTaskType } from "../db/taskTypes.js";
import { addEventType, renameEventType, deleteEventType } from "../db/eventTypes.js";
import { confirmDialog, promptDialog } from "../ui/dialogs.js";
import { toast } from "../ui/screens.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function manageView(container) {
  /* ---------- a small "add something" form (built once, so typing is never interrupted) ---------- */
  function addForm({ label, placeholder, button, existingNames, onAdd }) {
    const input = h("input", { type: "text", class: "input", placeholder, "aria-label": label, autocomplete: "off" });
    const error = h("p", { class: "error-text", role: "alert", hidden: true });
    const form = h("form", { class: "add-form", novalidate: true, onSubmit: (e) => {
      e.preventDefault();
      const result = validateName(input.value, existingNames());
      error.textContent = result.error || "";
      error.hidden = !result.error;
      if (result.error) return input.focus();
      onAdd(result.name);
      input.value = "";
      input.focus();
    } }, input, h("button", { type: "submit", class: "btn btn-primary" }, button));
    return h("div", {}, form, error);
  }

  /* ---------- task types and event types (one block per workspace and per thing) ---------- */
  const KINDS = {
    task: {
      noun: "task", Title: "Task types",
      builtIn: (ws) => DEFAULT_TYPES.filter((t) => t.workspace === ws),
      custom: (ws) => state.customTypes.filter((t) => (t.workspace || "academics") === ws),
      all: (ws) => typesFor(ws),
      usedBy: (type) => state.tasks.filter((t) => t.typeId === type.id),
      add: (name, ws) => addTaskType(state.fb, state.uid, name, ws),
      rename: (id, name) => renameTaskType(state.fb, state.uid, id, name),
      remove: (type, to, used) => deleteTaskType(state.fb, state.uid, type.id, to, used.map((x) => x.id)),
      example: { academics: "e.g. Laboratory", organizations: "e.g. Fundraising" },
    },
    event: {
      noun: "event", Title: "Event types",
      builtIn: (ws) => EVENT_KINDS.filter((t) => t.workspace === ws),
      custom: (ws) => state.customEventTypes.filter((t) => (t.workspace || "academics") === ws),
      all: (ws) => eventKindsFor(ws),
      usedBy: (type) => state.events.filter((e) => e.kind === type.id),
      add: (name, ws) => addEventType(state.fb, state.uid, name, ws),
      rename: (id, name) => renameEventType(state.fb, state.uid, id, name),
      remove: (type, to, used) => deleteEventType(state.fb, state.uid, type.id, to, used.map((x) => x.id)),
      example: { academics: "e.g. Defense", organizations: "e.g. Rehearsal" },
    },
  };

  const typeBlocks = [];
  function typeBlock(ws, kindKey) {
    const K = KINDS[kindKey];
    const list = h("ul", { class: "row-list" });
    const form = addForm({
      label: `New ${ws.name} ${K.noun} type name`,
      placeholder: K.example[ws.id],
      button: "Add type",
      existingNames: () => K.all(ws.id).map((t) => t.name),
      onAdd: (name) => { K.add(name, ws.id); toast(`${K.noun === "task" ? "Task" : "Event"} type added.`); },
    });
    const node = h("div", { class: "type-block" },
      h("h3", {}, K.Title),
      h("ul", { class: "chips", "aria-label": "Built-in (fixed)" }, K.builtIn(ws.id).map((t) => h("li", { class: "chip" }, t.name))),
      h("p", { class: "muted small" }, "Your own:"),
      form, list);
    typeBlocks.push({ ws, K, list });
    return node;
  }

  function renderTypes() {
    for (const { ws, K, list } of typeBlocks) {
      clear(list);
      const custom = K.custom(ws.id).sort((a, b) => a.name.localeCompare(b.name));
      if (!custom.length) { list.append(h("li", { class: "row empty-row muted" }, "None of your own yet.")); continue; }
      for (const type of custom) {
        const count = K.usedBy(type).length;
        list.append(h("li", { class: "row" },
          h("div", { class: "row-main" }, h("strong", {}, type.name), h("span", { class: "muted small" }, plural(count, K.noun))),
          h("div", { class: "row-actions" },
            h("button", { type: "button", class: "btn btn-small", onClick: () => onRenameType(K, ws, type) }, "Rename"),
            h("button", { type: "button", class: "btn btn-small btn-danger-outline", onClick: () => onDeleteType(K, ws, type) }, "Delete…"))));
      }
    }
  }

  async function onRenameType(K, ws, type) {
    const others = K.all(ws.id).map((t) => t.name);
    const name = await promptDialog({
      title: `Rename ${K.noun} type`, label: "Type name", value: type.name,
      validate: (text) => validateName(text, others, { ignore: type.name }).error || "",
    });
    if (name === null) return;
    K.rename(type.id, name);
    toast("Type renamed.");
  }

  async function onDeleteType(K, ws, type) {
    const used = K.usedBy(type);
    const replacements = K.all(ws.id).filter((t) => t.id !== type.id);
    const picker = h("select", { class: "select", "aria-label": `Move ${K.noun}s to this type` },
      replacements.map((t) => h("option", { value: t.id }, t.name)));
    const ok = await confirmDialog({
      title: `Delete the type "${type.name}"?`,
      message: used.length
        ? `${plural(used.length, K.noun)} use this type. Choose a type to move them to. Only the type is deleted; nothing else is lost.`
        : `No ${K.noun}s use this type.`,
      body: used.length ? h("label", { class: "label" }, `Move ${K.noun}s to`, picker) : null,
      confirmLabel: "Delete type",
      danger: true,
    });
    if (!ok) return;
    K.remove(type, picker.value, used);
    toast(used.length ? `Type deleted. ${plural(used.length, K.noun)} moved.` : "Type deleted.");
  }

  /* ---------- a collapsible group ---------- */
  function fold(title, subtitle, ...children) {
    const sub = h("span", { class: "muted small" }, subtitle);
    const node = h("details", { class: "fold" },
      h("summary", {}, h("span", { class: "fold-title" }, h("strong", {}, title), sub), h("span", { class: "fold-chevron", "aria-hidden": "true" }, "›")),
      h("div", { class: "fold-body" }, children));
    return { node, sub };
  }

  /* ---------- page ---------- */
  const wsFolds = WORKSPACES.map((ws) => ({
    ws,
    ...fold(ws.name, "",
      h("p", { class: "muted" }, ws.id === "academics"
        ? "Types you can pick on the Add task and Add event forms for Academics."
        : "Types you can pick on the Add task and Add event forms for Organizations."),
      typeBlock(ws, "task"), typeBlock(ws, "event")),
  }));

  container.append(
    h("a", { class: "back-link", href: "#/settings" }, "← Settings"),
    h("div", { class: "page-head" }, h("h1", {}, "Manage")),
    h("p", { class: "muted" }, "Tap a group to open it."),
    h("p", { class: "muted small" }, "Courses (with their days, times and professors) now live under ", h("a", { href: "#/courses" }, "Courses"), "."),
    ...wsFolds.map((f) => f.node));

  function refresh() {
    renderTypes();
    for (const f of wsFolds) {
      const t = KINDS.task.custom(f.ws.id).length, e = KINDS.event.custom(f.ws.id).length;
      f.sub.textContent = `Task types and event types${t + e ? ` · ${t + e} of your own` : ""}`;
    }
  }
  refresh();
  return { update: refresh };
}
