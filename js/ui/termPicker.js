/* ==========================================================================
   TERM PICKER: choose the school year and semester you are looking at.
   The choice is saved to your settings, so every screen (and your other
   devices) follows it. "＋ Add school year" adds the next year.
   Built once; call update() when settings change.
   ========================================================================== */

import { h, clear } from "./dom.js";
import { state, getSettings, termNow } from "../state.js";
import { saveSettings } from "../db/settings.js";
import { guard } from "../db/helpers.js";
import { SEMESTERS, schoolYears, parseTerm, makeTerm, followingYear, termName } from "../logic/schedule.js";

export function termPicker() {
  const yearSelect = h("select", { class: "select", id: "term-year", "aria-label": "School year", onChange: () => choose(yearSelect.value, parseTerm(termNow()).sem) });
  const semButtons = SEMESTERS.map((s) => h("button", { type: "button", class: "seg-btn", dataset: { sem: s.id }, onClick: () => choose(parseTerm(termNow()).year, s.id) }, s.name));
  const addYear = h("button", { type: "button", class: "btn btn-small", onClick: () => {
    const years = schoolYears(getSettings(), state.courses);
    const next = followingYear(years[years.length - 1]);
    guard(saveSettings(state.fb, state.uid, { schoolYears: [...years, next], termId: makeTerm(next, parseTerm(termNow()).sem) }), "Could not save the school year");
  } }, "＋ Add school year");

  function choose(year, sem) {
    guard(saveSettings(state.fb, state.uid, { termId: makeTerm(year, sem) }), "Could not save");
    // Show the choice straight away (the saved copy arrives a moment later).
    state.settings = { ...state.settings, termId: makeTerm(year, sem) };
    update();
    node.dispatchEvent(new CustomEvent("termchange", { bubbles: true }));
  }

  const node = h("div", { class: "term-picker", role: "group", "aria-label": "School year and semester" },
    h("div", { class: "term-row" }, yearSelect, addYear),
    h("div", { class: "seg", role: "group", "aria-label": "Semester" }, semButtons));

  function update() {
    const term = parseTerm(termNow());
    const years = schoolYears(getSettings(), state.courses);
    clear(yearSelect).append(...years.map((y) => h("option", { value: y }, `S.Y. ${y.replace("-", "–")}`)));
    yearSelect.value = term.year;
    for (const b of semButtons) b.setAttribute("aria-pressed", String(b.dataset.sem === term.sem));
  }
  update();
  return { node, update, label: () => termName(termNow()) };
}
