/* ==========================================================================
   DAY WINDOW: the floating window that opens when you tap a day on the Calendar.

   It lists everything on that day (events and task deadlines), with a button to
   add an event on that day.

   The small capybara in the corner is a private diary for THIS day only:
   it opens one note, saved to this day and nothing else. The diary is not
   reachable from any other page and never shows other days
   (see js/db/diary.js for the rules).
   ========================================================================== */

import { h, clear } from "./dom.js";
import { capybara } from "./capybara.js";
import { itemRow } from "./calendarItems.js";
import { state } from "../state.js";
import { dayKey, dayLabel } from "../logic/calendar.js";
import { watchDiaryDay, saveDiaryDay, DIARY_MAX } from "../db/diary.js";

/**
 * date: the day to show.  getItems(): the current list of items for that day (called again on refresh()).
 * onClose(): called after the window has closed.
 * Returns { refresh(), close() }.
 */
export function openDayWindow({ date, getItems, onClose }) {
  const key = dayKey(date);
  const isToday = key === dayKey(Date.now());

  /* ---------- the day ---------- */
  const list = h("div", { class: "day-list" });
  const dayPanel = h("div", { class: "day-panel" }, list,
    h("p", { class: "day-actions" },
      h("a", { class: "btn btn-primary", href: `#/event/new?date=${key}` }, "Add event on this day")));

  /* ---------- the diary (for this day only) ---------- */
  let dirty = false, timer = null, loaded = false;
  const status = h("span", { class: "muted small diary-status", role: "status" }, "");
  const text = h("textarea", {
    class: "textarea diary-text", rows: 9, maxlength: DIARY_MAX, disabled: true,
    placeholder: "Opening your diary…", "aria-label": `Diary for ${dayLabel(date)}`,
  });
  const diaryPanel = h("div", { class: "diary-panel", hidden: true },
    h("p", { class: "muted small" }, "Only you can read this, and only from here. It belongs to this day alone."),
    text,
    h("div", { class: "diary-foot" }, status,
      h("button", { type: "button", class: "btn", onClick: () => showDiary(false) }, "Back to the day")));

  function save() {
    clearTimeout(timer); timer = null;
    if (!dirty || !loaded) return;
    saveDiaryDay(state.fb, state.uid, key, text.value);
    dirty = false;
    status.textContent = "Saved ✓";
  }
  text.addEventListener("input", () => {
    dirty = true; status.textContent = "Writing…";
    clearTimeout(timer); timer = setTimeout(save, 500);
  });
  text.addEventListener("blur", save);

  /* ---------- the little capybara button ---------- */
  const diaryButton = h("button", { type: "button", class: "diary-btn", "aria-label": "Open the diary for this day", "aria-pressed": "false", onClick: () => showDiary(diaryPanel.hidden) }, capybara("peek"));
  function showDiary(open) {
    if (!open) save();
    diaryPanel.hidden = !open;
    dayPanel.hidden = open;
    diaryButton.setAttribute("aria-pressed", String(open));
    title.textContent = open ? `Diary · ${dayLabel(date)}` : dayLabel(date);
    if (open) text.focus();
  }

  const stop = watchDiaryDay(state.fb, state.uid, key, (value) => {
    if (value !== null) {
      diaryButton.classList.toggle("has-entry", value !== "");
      if (!dirty) text.value = value;
    }
    loaded = true;
    text.disabled = false;
    text.placeholder = "What happened today?";
  });

  /* ---------- the window ---------- */
  const title = h("h2", { class: "day-title", id: "day-title" }, dayLabel(date));
  const dialog = h("dialog", { class: "dialog day-dialog", "aria-labelledby": "day-title" },
    h("div", { class: "day-head" },
      h("div", { class: "day-head-text" }, title, isToday ? h("span", { class: "chip" }, "Today") : null),
      diaryButton,
      h("button", { type: "button", class: "btn day-close", "aria-label": "Close", onClick: () => dialog.close() }, "✕")),
    dayPanel, diaryPanel);

  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });   // tap outside to close
  let closed = false;
  function finish() {
    if (closed) return;
    closed = true;
    save();
    stop();
    dialog.remove();
    if (onClose) onClose();
  }
  dialog.addEventListener("close", finish);

  function refresh() {
    const items = getItems();
    clear(list);
    list.append(items.length
      ? h("ul", { class: "cal-items" }, items.map((item) => itemRow(item)))
      : h("div", { class: "cal-empty-art" }, capybara("sit"), h("p", { class: "muted" }, "Nothing scheduled. A free day!")));
  }

  refresh();
  document.body.append(dialog);
  dialog.showModal();
  return { refresh, close: () => { if (dialog.open) dialog.close(); else finish(); } };
}
