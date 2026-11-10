/* ==========================================================================
   DAY WINDOW: the floating window that opens when you tap a day on the Calendar.

   It lists everything on that day (events and task deadlines), with a button to
   add an event on that day.

   It is a swipeable row of cards: the day you picked is in the middle, and the
   previous and next days show dimmed at the sides. Swipe (or tap a side card, or
   use the left and right arrow keys) to move to that day without closing the
   window. The diary and mood always belong to the card in the middle.

   The small capybara in the corner is a private diary for THIS day only:
   it opens one note, saved to this day and nothing else. The diary is not
   reachable from any other page and never shows other days
   (see js/db/diary.js for the rules).
   ========================================================================== */

import { h, clear } from "./dom.js";
import { capybara, icon } from "./capybara.js";
import { itemRow } from "./calendarItems.js";
import { state } from "../state.js";
import { dayKey, dayLabel, addDays } from "../logic/calendar.js";
import { watchDiaryDay, saveDiaryDay, DIARY_MAX } from "../db/diary.js";
import { MOODS, moodById } from "../logic/moods.js";

/**
 * date: the day to show.  getItems(key): the current list of items for the day with that key (called again on refresh()).
 * onDayChange(date): called when the person moves to another day inside the window.
 * onClose(): called after the window has closed.
 * Returns { refresh(), close(), date() }.
 */
export function openDayWindow({ date, getItems, onClose, onDayChange }) {
  let key = dayKey(date);
  const todayKey = () => dayKey(Date.now());

  /* ---------- the day ---------- */
  const list = h("div", { class: "day-list" });
  const addLink = h("a", { class: "btn btn-primary", href: `#/event/new?date=${key}` }, "Add event on this day");
  const dayPanel = h("div", { class: "day-panel" }, list,
    h("div", { class: "day-actions" }, addLink));

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
      h("button", { type: "button", class: "btn", onClick: () => show("day") }, "Back to the day")));

  let mood = "";
  function save() {
    clearTimeout(timer); timer = null;
    if (!dirty || !loaded) return;
    saveDiaryDay(state.fb, state.uid, key, { text: text.value, mood });
    dirty = false;
    status.textContent = "Saved ✓";
  }

  /* ---------- the mood (saved in the same private entry) ---------- */
  const moodNote = h("p", { class: "muted small mood-note", role: "status" }, "");
  const moodButtons = MOODS.map((m) => h("button", {
    type: "button", class: "mood-opt", "aria-pressed": "false", disabled: true, dataset: { mood: m.id },
    onClick: () => pickMood(mood === m.id ? "" : m.id),
  }, h("span", { class: "mood-emoji", "aria-hidden": "true" }, m.emoji), h("span", { class: "mood-label" }, m.label)));
  const moodGroup = h("div", { class: "mood-grid", role: "group", "aria-label": `Mood for ${dayLabel(date)}` }, moodButtons);
  const moodPanel = h("div", { class: "mood-panel", hidden: true },
    h("p", { class: "muted small" }, "How did you feel today? Private, like your diary. Tap it again to clear."),
    moodGroup,
    moodNote,
    h("div", { class: "diary-foot" }, h("span"),
      h("button", { type: "button", class: "btn", onClick: () => show("day") }, "Back to the day")));

  function paintMood() {
    const m = moodById(mood);
    for (const b of moodButtons) b.setAttribute("aria-pressed", String(b.dataset.mood === mood));
    moodNote.textContent = m ? `Feeling ${m.label.toLowerCase()} ${m.emoji}` : "No mood picked.";
    moodButton.replaceChildren(h("span", { class: "mood-emoji", "aria-hidden": "true" }, m ? m.emoji : "🙂"));
    moodButton.classList.toggle("has-entry", !!m);
    moodButton.setAttribute("aria-label", m ? `Mood for this day: ${m.label}. Change it.` : "Pick your mood for this day");
  }
  function pickMood(id) {
    if (!loaded) return;
    mood = id;
    saveDiaryDay(state.fb, state.uid, key, { text: text.value, mood });   // writes the current text too, so nothing is lost
    dirty = false;
    paintMood();
  }
  text.addEventListener("input", () => {
    dirty = true; status.textContent = "Writing…";
    clearTimeout(timer); timer = setTimeout(save, 500);
  });
  text.addEventListener("blur", save);

  /* ---------- the two little buttons (capybara = diary, face = mood) ---------- */
  const diaryButton = h("button", { type: "button", class: "diary-btn", "aria-label": "Open the diary for this day", "aria-pressed": "false", onClick: () => show(diaryPanel.hidden ? "diary" : "day") }, icon("profile", 44));
  const moodButton = h("button", { type: "button", class: "diary-btn mood-btn", "aria-pressed": "false", onClick: () => show(moodPanel.hidden ? "mood" : "day") });

  function show(which) {
    save();
    dayPanel.hidden = which !== "day";
    diaryPanel.hidden = which !== "diary";
    moodPanel.hidden = which !== "mood";
    diaryButton.setAttribute("aria-pressed", String(which === "diary"));
    moodButton.setAttribute("aria-pressed", String(which === "mood"));
    title.textContent = which === "diary" ? `Diary · ${dayLabel(date)}` : which === "mood" ? `Mood · ${dayLabel(date)}` : dayLabel(date);
    dialog.classList.toggle("is-locked", which !== "day");   // no swiping while writing
    if (which === "diary") text.focus();
  }

  let stop = () => {};
  let generation = 0;   // so a late answer for the day we just left is ignored
  function watchDay() {
    const mine = ++generation;
    stop = watchDiaryDay(state.fb, state.uid, key, (entry) => {
      if (mine !== generation) return;
      if (entry !== null) {
        diaryButton.classList.toggle("has-entry", entry.text !== "");
        if (!dirty) text.value = entry.text;
        mood = entry.mood;
      }
      loaded = true;
      text.disabled = false;
      text.placeholder = "What happened today?";
      for (const b of moodButtons) b.disabled = false;
      paintMood();
    });
  }
  watchDay();
  paintMood();

  /* ---------- the window ---------- */
  const title = h("h2", { class: "day-title", id: "day-title" }, dayLabel(date));
  const todayChip = h("span", { class: "chip", hidden: key !== todayKey() }, "Today");
  const card = h("div", { class: "day-card is-cur" },
    h("div", { class: "day-head" },
      h("div", { class: "day-head-text" }, title, todayChip),
      diaryButton, moodButton,
      h("button", { type: "button", class: "btn day-close", "aria-label": "Close", onClick: () => dialog.close() }, "✕")),
    dayPanel, diaryPanel, moodPanel);
  // The side cards are only a preview of the neighbouring days (not clickable inside, hidden from screen readers).
  const prevCard = h("div", { class: "day-card day-preview" });
  const nextCard = h("div", { class: "day-card day-preview" });
  const slides = [prevCard, card, nextCard].map((c) => h("div", { class: "day-slide" }, c));
  const track = h("div", { class: "day-track" }, slides);
  const dialog = h("dialog", { class: "dialog day-dialog", "aria-labelledby": "day-title" }, track);
  for (const c of [prevCard, nextCard]) { c.setAttribute("aria-hidden", "true"); c.inert = true; }

  dialog.addEventListener("click", (e) => { if (e.target === dialog || e.target === track) dialog.close(); });   // tap outside to close
  let closed = false;
  function finish() {
    if (closed) return;
    closed = true;
    save();
    stop();
    window.removeEventListener("resize", recenter);
    dialog.remove();
    if (onClose) onClose();
  }
  dialog.addEventListener("close", finish);

  function listFor(k) {
    const items = getItems(k);
    return items.length
      ? h("ul", { class: "cal-items" }, items.map((item) => itemRow(item)))
      : h("div", { class: "cal-empty-art" }, capybara("relaxing"), h("p", { class: "muted" }, "Nothing scheduled. A free day!"));
  }
  function previewOf(d) {
    const k = dayKey(d);
    return [h("div", { class: "day-head" }, h("div", { class: "day-head-text" }, h("h2", { class: "day-title" }, dayLabel(d)),
      k === todayKey() ? h("span", { class: "chip" }, "Today") : null)), h("div", { class: "day-panel" }, listFor(k))];
  }
  function refresh() {
    clear(list);
    list.append(listFor(key));
    prevCard.replaceChildren(...previewOf(addDays(date, -1)));
    nextCard.replaceChildren(...previewOf(addDays(date, 1)));
  }

  /* ---------- moving to another day ---------- */
  function go(step) {
    save();                       // keep what was typed for the day we are leaving
    stop();
    date = addDays(date, step);
    key = dayKey(date);
    dirty = false; loaded = false; mood = "";
    text.value = ""; text.disabled = true; text.placeholder = "Opening your diary…";
    text.setAttribute("aria-label", `Diary for ${dayLabel(date)}`);
    moodGroup.setAttribute("aria-label", `Mood for ${dayLabel(date)}`);
    for (const b of moodButtons) b.disabled = true;
    diaryButton.classList.remove("has-entry");
    status.textContent = "";
    addLink.setAttribute("href", `#/event/new?date=${key}`);
    todayChip.hidden = key !== todayKey();
    show("day");
    paintMood();
    refresh();
    watchDay();
    recenter();
    if (onDayChange) onDayChange(date);
  }

  /* The scrolling row does the swiping natively (it snaps to a card). Once it has settled on a side card, that day becomes
     the middle card and the row jumps back to the middle without anyone seeing it. */
  let recentering = false, touching = false, settleTimer = null;
  const reduceMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const centerLeft = (i) => { const el = slides[i]; return el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2; };

  function recenter() {
    recentering = true;
    track.scrollLeft = centerLeft(1);
    paintDepth();
    requestAnimationFrame(() => requestAnimationFrame(() => { recentering = false; }));
  }
  // Side cards are dimmer and a little smaller the farther they are from the middle.
  function paintDepth() {
    const mid = track.scrollLeft + track.clientWidth / 2;
    slides.forEach((el) => {
      const d = Math.min(1, Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid) / (el.offsetWidth * 0.9));
      el.style.setProperty("--d", d.toFixed(3));
    });
  }
  function settle() {
    if (recentering || touching || closed) return;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 1, gap = Infinity;
    slides.forEach((el, i) => { const g = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid); if (g < gap) { gap = g; best = i; } });
    if (best !== 1 && gap < 6) go(best === 2 ? 1 : -1);
  }
  const later = () => { clearTimeout(settleTimer); settleTimer = setTimeout(settle, 120); };
  track.addEventListener("scroll", () => { paintDepth(); if (!recentering) later(); }, { passive: true });
  track.addEventListener("scrollend", () => { if (!recentering) settle(); });
  track.addEventListener("touchstart", () => { touching = true; }, { passive: true });
  track.addEventListener("touchend", () => { touching = false; later(); }, { passive: true });
  track.addEventListener("touchcancel", () => { touching = false; later(); }, { passive: true });

  function slideTo(step) {
    if (dayPanel.hidden) return;
    track.scrollTo({ left: centerLeft(step > 0 ? 2 : 0), behavior: reduceMotion() ? "auto" : "smooth" });
  }
  // Tapping a side card moves to it.
  for (const [c, step] of [[prevCard, -1], [nextCard, 1]]) c.parentElement.addEventListener("click", () => slideTo(step));
  dialog.addEventListener("keydown", (e) => {
    if (dayPanel.hidden || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest && e.target.closest("textarea, input, select")) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); slideTo(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); slideTo(1); }
  });
  window.addEventListener("resize", recenter);

  refresh();
  document.body.append(dialog);
  dialog.showModal();
  recenter();
  return { refresh, date: () => date, close: () => { if (dialog.open) dialog.close(); else finish(); } };
}
