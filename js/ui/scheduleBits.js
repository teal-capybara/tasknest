/* Small pieces shared by the Schedule and Courses pages. */

import { h } from "./dom.js";
import { capybara, icon } from "./capybara.js";
import { termName, formatRange, dayShort, inTerm, cleanSlots, toMinutes, classesOn } from "../logic/schedule.js";

const PALETTE = 8;   // --c1 ... --c8 in css/themes.css

/**
 * One color for each course, the same on the Schedule and the Courses pages.
 * Courses are numbered in the order you created them, so a color stays with its course.
 * Returns Map(courseId -> inline style that sets --fill and --accent).
 */
export function courseColors(courses) {
  const order = [...courses].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || String(a.id).localeCompare(String(b.id)));
  const map = new Map();
  order.forEach((c, i) => { const n = (i % PALETTE) + 1; map.set(c.id, `--fill: var(--c${n}); --accent: var(--c${n}d)`); });
  return map;
}

/** Numbers for the little stat tiles: courses, units and class hours per week of one term. */
export function termStats(courses, term) {
  const list = courses.filter((c) => !c.archived && inTerm(c, term));
  let minutes = 0, units = 0;
  for (const c of list) {
    units += Number(c.units) || 0;
    for (const s of cleanSlots(c.slots)) minutes += toMinutes(s.end) - toMinutes(s.start);
  }
  const hours = Math.round((minutes / 60) * 10) / 10;
  return { courses: list.length, units: Math.round(units * 10) / 10, hours };
}

export function statTiles(stats) {
  const tile = (value, label, n) => h("li", { class: "sched-stat", style: `--fill: var(--c${n}); --accent: var(--c${n}d)` },
    h("strong", {}, String(value)), h("span", {}, label));
  const tiles = [tile(stats.courses, stats.courses === 1 ? "course" : "courses", 1)];
  if (stats.units) tiles.push(tile(stats.units, stats.units === 1 ? "unit" : "units", 3));   // no units entered yet: leave the tile out
  tiles.push(tile(stats.hours, "class hrs / week", 2));
  return h("ul", { class: "sched-stats", style: `--n: ${tiles.length}`, "aria-label": "This semester" }, ...tiles);
}

/** The capybara banner at the top of both pages. */
export function banner(title, term) {
  return h("div", { class: "sched-banner" },
    h("span", { class: "sched-bubble sched-bubble-1", "aria-hidden": "true" }),
    h("span", { class: "sched-bubble sched-bubble-2", "aria-hidden": "true" }),
    h("div", { class: "sched-banner-text" },
      h("span", { class: "sched-cloud", "aria-hidden": "true" }, icon("cloud", 40)),
      h("h1", {}, title),
      h("p", { class: "sched-term" }, termName(term))),
    h("div", { class: "sched-banner-art" }, capybara("study")));
}

export const meetingText = (slot) => `${dayShort(slot.day)} ${formatRange(slot)}`;
export { classesOn };
