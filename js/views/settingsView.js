/* ==========================================================================
   SETTINGS: theme, account, install, and the offline check.

   (Phase 3 adds: default view, urgency thresholds.)
   ========================================================================== */

import { h } from "../ui/dom.js";
import { state } from "../state.js";
import { session } from "../session.js";
import { applyTheme, currentTheme } from "../theme.js";
import { saveSettings } from "../db/settings.js";
import { watchSyncTest, addPing } from "../db/syncTest.js";
import { guard } from "../db/helpers.js";
import { describe, onChange as onSyncChange } from "../sync-status.js";
import { renderThemePicker, markSelected } from "../ui/themePicker.js";
import { bindInstallCard } from "../ui/install.js";
import { toast } from "../ui/screens.js";

export function settingsView(container) {
  const user = (state.fb && state.fb.auth.currentUser) || {};

  /* ---------- theme ---------- */
  const themeGrid = h("div", { class: "theme-grid", role: "radiogroup", "aria-label": "Theme" });
  renderThemePicker(themeGrid, currentTheme(), (id) => {
    applyTheme(id);                       // instant on this device
    markSelected(themeGrid, id);
    guard(saveSettings(state.fb, state.uid, { theme: id }), "Theme not saved"); // synced in the background
  });

  /* ---------- account ---------- */
  const uidText = h("code", {}, state.uid || "—");
  const copyButton = h("button", { type: "button", class: "btn btn-small", onClick: async () => {
    try { await navigator.clipboard.writeText(state.uid); toast("Account ID copied."); }
    catch (e) { toast("Couldn't copy. Select the ID and copy it manually."); }
  } }, "Copy");

  /* ---------- install ---------- */
  const installText = h("p", { class: "muted" }, "On Android Chrome: open the ⋮ menu, then choose Install app (or Add to Home screen).");
  const installButton = h("button", { type: "button", class: "btn btn-primary", hidden: true }, "Install TaskNest");

  /* ---------- offline check ---------- */
  const count = h("span", { class: "check-number" }, "0");
  const last = h("span", { class: "muted small" }, "No taps yet");
  const detail = h("p", { class: "small" });
  const showDetail = (info) => { detail.textContent = info.detail; };

  container.append(
    h("div", { class: "page-head" }, h("h1", {}, "Settings")),
    h("div", { class: "grid" },
      h("section", { class: "card" },
        h("h2", {}, "Theme"),
        h("p", { class: "muted" }, "Saved to your account, so it follows you to other devices."),
        themeGrid),

      h("section", { class: "card" },
        h("h2", {}, "Account"),
        h("dl", { class: "kv" },
          h("dt", {}, "Name"), h("dd", {}, user.displayName || "—"),
          h("dt", {}, "Email"), h("dd", {}, user.email || "—"),
          h("dt", {}, "Account ID"), h("dd", {}, uidText, copyButton)),
        h("button", { type: "button", class: "btn", onClick: () => session.requestSignOut() }, "Sign out")),

      h("section", { class: "card" },
        h("h2", {}, "Install the app"),
        installText, installButton),

      h("section", { class: "card" },
        h("h2", {}, "Offline check"),
        h("p", { class: "muted" }, "Tap the button, then try it again in airplane mode. The number should still go up, and the status at the top should say it is saved on this device. Turn the internet back on and it should change to Synced."),
        h("div", { class: "check-row" },
          h("button", { type: "button", class: "btn btn-primary", onClick: () => addPing(state.fb, state.uid).catch((e) => toast(`Could not save: ${e.code || e.message}`)) }, "Add 1 to counter"),
          h("div", { class: "check-value" }, count, last)),
        detail)));

  bindInstallCard(installButton, installText);

  const stopSyncTest = watchSyncTest(state.fb, state.uid, (data) => {
    count.textContent = data.count ?? 0;
    last.textContent = data.lastTapAt
      ? `Last tap: ${new Date(data.lastTapAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
      : "No taps yet";
  });
  const stopSyncInfo = onSyncChange(showDetail);
  showDetail(describe());

  return {
    update() { markSelected(themeGrid, currentTheme()); },
    destroy() { stopSyncTest(); stopSyncInfo(); },
  };
}
