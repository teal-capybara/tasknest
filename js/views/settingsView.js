/* ==========================================================================
   SETTINGS: a short list of words. Tap one to open its page.

     #/settings            the list
     #/settings/theme      pick a color theme
     #/settings/view       the screen the app starts on, and how "due soon" and "early" are worked out
     #/settings/account    who you are signed in as, sign out
     #/settings/archived   tasks you archived (restore or delete them here)
     #/settings/install    install the app on your phone
     #/settings/offline    the little counter that proves offline saving works

   To add a page: write a function below that returns { title, build }, add it
   to SECTIONS, and add a row for it in SECTION_ORDER.
   (The Board view will be added to the start screen choices in the next Phase 3 step.)
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { DEFAULT_SETTINGS } from "../constants.js";
import { state, getSettings, isTaskArchived } from "../state.js";
import { session } from "../session.js";
import { applyTheme, currentTheme, THEMES } from "../theme.js";
import { saveSettings } from "../db/settings.js";
import { watchSyncTest, addPing } from "../db/syncTest.js";
import { guard } from "../db/helpers.js";
import { describe, onChange as onSyncChange } from "../sync-status.js";
import { renderThemePicker, markSelected } from "../ui/themePicker.js";
import { bindInstallCard } from "../ui/install.js";
import { buildTaskCard } from "../ui/taskCard.js";
import { toast } from "../ui/screens.js";

const START_NAMES = { dashboard: "Dashboard", tasks: "Tasks", calendar: "Calendar" };
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function settingsView(container, params) {
  if (!params.section) return menuPage(container);
  const section = SECTIONS[params.section];
  if (!section) { location.replace("#/settings"); return {}; }

  container.append(
    h("a", { class: "back-link", href: "#/settings" }, "← Settings"),
    h("div", { class: "page-head" }, h("h1", {}, section.title)));
  return section.build(container) || {};
}

/* ---------------------------------------------------------------- the list */

const SECTION_ORDER = ["theme", "view", "account", "archived", "install", "offline"];

/** One short line under each word, so you can see the current state without opening it. */
const SUMMARY = {
  theme: () => (THEMES.find((t) => t.id === currentTheme()) || THEMES[0]).name,
  view: () => `Starts on ${START_NAMES[getSettings().defaultScreen] || "Dashboard"} · due soon ${getSettings().dueSoonHours} h`,
  account: () => ((state.fb && state.fb.auth.currentUser) || {}).email || "Signed in",
  archived: () => plural(state.tasks.filter((t) => t.archived).length, "archived task"),
  install: () => "Add TaskNest to your home screen",
  offline: () => "Check that offline saving works",
};

function menuPage(container) {
  const rows = SECTION_ORDER.map((id) => {
    const hint = h("span", { class: "settings-hint" });
    const link = h("a", { class: "settings-row", href: `#/settings/${id}` },
      h("span", { class: "settings-name" }, SECTIONS[id].title), hint,
      h("span", { class: "settings-chevron", "aria-hidden": "true" }, "›"));
    return { id, hint, link };
  });

  const fill = () => rows.forEach((r) => { r.hint.textContent = SUMMARY[r.id](); });
  container.append(
    h("div", { class: "page-head" }, h("h1", {}, "Settings")),
    h("nav", { class: "settings-list card", "aria-label": "Settings" }, rows.map((r) => r.link)));
  fill();
  return { update: fill };
}

/* ------------------------------------------------------------ the pages */

const SECTIONS = {
  theme: {
    title: "Theme",
    build(container) {
      const grid = h("div", { class: "theme-grid", role: "radiogroup", "aria-label": "Theme" });
      renderThemePicker(grid, currentTheme(), (id) => {
        applyTheme(id);                       // instant on this device
        markSelected(grid, id);
        guard(saveSettings(state.fb, state.uid, { theme: id }), "Theme not saved"); // synced in the background
      });
      container.append(h("section", { class: "card" },
        h("p", { class: "muted" }, "Saved to your account, so it follows you to other devices."), grid));
      return { update() { markSelected(grid, currentTheme()); } };
    },
  },

  view: {
    title: "View",
    build(container) {
      const settings = getSettings();
      const number = (id, value) => h("input", { type: "number", class: "input", id, min: "1", max: "720", step: "1", inputmode: "numeric", value: String(value) });
      const dueSoon = number("set-dueSoon", settings.dueSoonHours);
      const early = number("set-early", settings.earlyHours);
      const error = h("p", { class: "error-text", role: "alert", hidden: true });

      const readHours = (input) => {
        const n = Number(input.value);
        return Number.isInteger(n) && n >= 1 && n <= 720 ? n : null;
      };

      const form = h("form", { novalidate: true, onSubmit: (e) => {
        e.preventDefault();
        const soon = readHours(dueSoon), earlyHours = readHours(early);
        if (soon == null || earlyHours == null) {
          error.textContent = "Enter whole numbers of hours between 1 and 720.";
          error.hidden = false;
          return;
        }
        error.hidden = true;
        guard(saveSettings(state.fb, state.uid, { dueSoonHours: soon, earlyHours }), "Settings not saved");
        toast("Saved.");
      } },
        h("div", { class: "field" },
          h("label", { class: "label", for: "set-dueSoon" }, "“Due soon” window (hours)"),
          dueSoon,
          h("p", { class: "hint" }, "A task not due today, but due within this many hours, shows “Due soon”. Default 48.")),
        h("div", { class: "field" },
          h("label", { class: "label", for: "set-early" }, "“Early” window (hours)"),
          early,
          h("p", { class: "hint" }, "Finishing at least this many hours before the deadline counts as early. Default 24.")),
        error,
        h("div", { class: "form-actions" },
          h("button", { type: "button", class: "btn", onClick: () => {
            dueSoon.value = DEFAULT_SETTINGS.dueSoonHours; early.value = DEFAULT_SETTINGS.earlyHours; error.hidden = true;
          } }, "Use defaults"),
          h("button", { type: "submit", class: "btn btn-primary" }, "Save")));

      const startScreen = h("select", { class: "select", id: "set-start", value: START_NAMES[settings.defaultScreen] ? settings.defaultScreen : "dashboard", onChange: (e) => {
        guard(saveSettings(state.fb, state.uid, { defaultScreen: e.target.value }), "Settings not saved");
        toast("Saved.");
      } },
        h("option", { value: "dashboard" }, "Dashboard"),
        h("option", { value: "tasks" }, "Tasks list"),
        h("option", { value: "calendar" }, "Calendar"));

      container.append(
        h("section", { class: "card" }, h("h2", {}, "Start screen"),
          h("div", { class: "field" },
            h("label", { class: "label", for: "set-start" }, "When I open the app, show"),
            startScreen,
            h("p", { class: "hint" }, "The Board view will be added to this list later."))),
        h("section", { class: "card" }, h("h2", {}, "Deadlines"), form));
    },
  },

  account: {
    title: "Account",
    build(container) {
      const user = (state.fb && state.fb.auth.currentUser) || {};
      const copyButton = h("button", { type: "button", class: "btn btn-small", onClick: async () => {
        try { await navigator.clipboard.writeText(state.uid); toast("Account ID copied."); }
        catch (e) { toast("Couldn't copy. Select the ID and copy it manually."); }
      } }, "Copy");
      container.append(h("section", { class: "card" },
        h("dl", { class: "kv" },
          h("dt", {}, "Name"), h("dd", {}, user.displayName || "—"),
          h("dt", {}, "Email"), h("dd", {}, user.email || "—"),
          h("dt", {}, "Account ID"), h("dd", {}, h("code", {}, state.uid || "—"), copyButton)),
        h("button", { type: "button", class: "btn", onClick: () => session.requestSignOut() }, "Sign out")));
    },
  },

  archived: {
    title: "Archived tasks",
    build(container) {
      const note = h("p", { class: "muted" });
      const list = h("div", { class: "task-list" });
      const hiddenNote = h("p", { class: "muted small", hidden: true });
      container.append(note, list, hiddenNote);

      function render() {
        const now = Date.now();
        const archived = state.tasks.filter((t) => t.archived)
          .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
        // Tasks that are hidden only because their COURSE is archived (restore the course in Manage).
        const viaCourse = state.tasks.filter((t) => !t.archived && isTaskArchived(t)).length;

        note.textContent = archived.length
          ? "Archived tasks are hidden from your lists but kept for your records. Open the ⋯ menu to restore one."
          : "";
        clear(list);
        if (!archived.length) {
          list.append(h("div", { class: "empty" },
            h("h2", {}, "No archived tasks"),
            h("p", { class: "muted" }, "When you archive a task it is kept here, out of your way.")));
        } else {
          list.append(...archived.map((t) => buildTaskCard(t, now)));
        }
        hiddenNote.hidden = !viaCourse;
        hiddenNote.textContent = viaCourse
          ? `${plural(viaCourse, "other task")} ${viaCourse === 1 ? "is" : "are"} hidden because ${viaCourse === 1 ? "its" : "their"} course is archived. Restore the course under Manage (Show archived courses).`
          : "";
      }

      // Close any open ⋯ menu when you tap elsewhere.
      const closeMenus = (e) => {
        document.querySelectorAll("details.menu[open]").forEach((d) => { if (!d.contains(e.target)) d.open = false; });
      };
      document.addEventListener("click", closeMenus);

      render();
      return { update: render, destroy() { document.removeEventListener("click", closeMenus); } };
    },
  },

  install: {
    title: "Install the app",
    build(container) {
      const text = h("p", { class: "muted" }, "On Android Chrome: open the ⋮ menu, then choose Install app (or Add to Home screen).");
      const button = h("button", { type: "button", class: "btn btn-primary", hidden: true }, "Install TaskNest");
      container.append(h("section", { class: "card" }, text, button));
      bindInstallCard(button, text);
    },
  },

  offline: {
    title: "Offline check",
    build(container) {
      const count = h("span", { class: "check-number" }, "0");
      const last = h("span", { class: "muted small" }, "No taps yet");
      const detail = h("p", { class: "small" });
      container.append(h("section", { class: "card" },
        h("p", { class: "muted" }, "Tap the button, then try it again in airplane mode. The number should still go up, and the status at the top should say it is saved on this device. Turn the internet back on and it should change to Synced."),
        h("div", { class: "check-row" },
          h("button", { type: "button", class: "btn btn-primary", onClick: () => addPing(state.fb, state.uid).catch((e) => toast(`Could not save: ${e.code || e.message}`)) }, "Add 1 to counter"),
          h("div", { class: "check-value" }, count, last)),
        detail));

      const stopSyncTest = watchSyncTest(state.fb, state.uid, (data) => {
        count.textContent = data.count ?? 0;
        last.textContent = data.lastTapAt
          ? `Last tap: ${new Date(data.lastTapAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
          : "No taps yet";
      });
      const showDetail = (info) => { detail.textContent = info.detail; };
      const stopSyncInfo = onSyncChange(showDetail);
      showDetail(describe());
      return { destroy() { stopSyncTest(); stopSyncInfo(); } };
    },
  },
};
