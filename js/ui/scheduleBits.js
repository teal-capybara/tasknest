/* Small pieces shared by the Schedule and Courses pages. */

import { h } from "./dom.js";
import { capybara, icon } from "./capybara.js";
import { termName, kindName, formatRange, dayShort } from "../logic/schedule.js";

/** The capybara banner at the top of both pages. */
export function banner(title, term) {
  return h("div", { class: "sched-banner" },
    h("div", { class: "sched-banner-text" },
      h("span", { class: "sched-cloud", "aria-hidden": "true" }, icon("cloud", 40)),
      h("h1", {}, title),
      h("p", { class: "sched-term" }, termName(term))),
    h("div", { class: "sched-banner-art" }, capybara("study")));
}

export const meetingText = (slot) => `${dayShort(slot.day)} ${formatRange(slot)}`;
export const kindLabel = (course) => (course.kind === "laboratory" ? kindName("laboratory") : "");
